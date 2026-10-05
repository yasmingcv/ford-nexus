import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { ChatInput } from '../components/ChatInput';
import { ChatMessage } from '../components/ChatMessage';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { colors } from '../components/theme';
import { useCurrentUid } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useGroup } from '../hooks/useGroups';
import { usePublicProfiles } from '../hooks/usePublicProfiles';
import type { ChatMessage as ChatMessageType, MessageTarget } from '../types/chat';
import type { AppStackParamList } from '../types/navigation';
import { otherParticipant } from '../utils/conversationId';

type Props = NativeStackScreenProps<AppStackParamList, 'Chat'>;

export function ChatScreen({ navigation, route }: Props) {
  const { conversationId, conversationType } = route.params;
  const uid = useCurrentUid();
  const isGroup = conversationType === 'group';
  const { group, loading: loadingGroup, error: groupError } = useGroup(isGroup ? conversationId : undefined);
  const { byId } = usePublicProfiles();
  const [targetId, setTargetId] = useState<string | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const listRef = useRef<FlatList<ChatMessageType>>(null);

  const otherUid = isGroup ? null : otherParticipant(conversationId, uid);
  const isMember = !isGroup || Boolean(group?.memberIds.includes(uid));
  const { messages, loading, error, sending, sendError, pushWarning, send } = useChat(
    conversationId,
    conversationType,
    uid,
    isMember && (!isGroup || !loadingGroup),
  );

  const title = isGroup ? group?.name ?? 'Grupo' : byId.get(otherUid ?? '')?.name ?? 'Conversa';
  const photoUrl = isGroup ? group?.photoUrl ?? '' : byId.get(otherUid ?? '')?.photoUrl ?? '';

  const openHeaderTarget = useCallback(() => {
    if (isGroup) navigation.navigate('GroupMembers', { groupId: conversationId });
    else if (otherUid) navigation.navigate('Profile', { uid: otherUid });
  }, [isGroup, navigation, conversationId, otherUid]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable style={styles.header} onPress={openHeaderTarget} accessibilityLabel="Ver detalhes">
          <Avatar uri={photoUrl} name={title} size={34} isGroup={isGroup} />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
        </Pressable>
      ),
    });
  }, [navigation, openHeaderTarget, photoUrl, title, isGroup]);

  // Rola até a última mensagem quando chegam novas mensagens.
  useEffect(() => {
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);

  const otherMembers = useMemo(() => (group ? group.memberIds.filter((id) => id !== uid) : []), [group, uid]);

  const handleSend = useCallback(
    async (text: string) => {
      // Menções digitadas no texto (@Nome) também contam como destinatários.
      const typedMentions = otherMembers.filter((id) => {
        const memberName = byId.get(id)?.name;
        return memberName ? text.toLowerCase().includes(`@${memberName.toLowerCase()}`) : false;
      });
      const mentioned = Array.from(new Set([...(targetId ? [targetId] : []), ...typedMentions]));
      const target: MessageTarget = targetId ? { type: 'member', memberId: targetId } : { type: 'conversation' };
      const ok = await send({ text, target, mentionedUserIds: isGroup ? mentioned : [] });
      if (ok) setTargetId(null);
      return ok;
    },
    [otherMembers, byId, targetId, send, isGroup],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatMessageType }) => (
      <ChatMessage
        message={item}
        isMine={item.senderId === uid}
        authorName={isGroup ? byId.get(item.senderId)?.name ?? 'Integrante' : null}
        targetName={item.target.type === 'member' ? byId.get(item.target.memberId)?.name ?? 'integrante' : null}
      />
    ),
    [uid, isGroup, byId],
  );

  if (isGroup && loadingGroup) return <Loading label="Carregando grupo..." />;
  if (isGroup && (groupError || !isMember)) {
    return <ErrorMessage message={groupError ?? 'Você não faz mais parte deste grupo.'} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ErrorMessage message={error} />
      {loading ? (
        <Loading label="Carregando mensagens..." />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState title="Nenhuma mensagem ainda" subtitle="Envie a primeira mensagem!" />}
        />
      )}
      <ErrorMessage message={sendError} />
      <ErrorMessage message={pushWarning} variant="warning" />
      <ChatInput
        sending={sending}
        disabled={Boolean(error)}
        targetLabel={targetId ? byId.get(targetId)?.name ?? 'integrante' : null}
        onClearTarget={() => setTargetId(null)}
        onMentionPress={isGroup ? () => setMentionOpen(true) : undefined}
        onSend={handleSend}
      />

      <Modal visible={mentionOpen} animationType="slide" transparent onRequestClose={() => setMentionOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Direcionar mensagem para</Text>
            <FlatList
              data={otherMembers}
              keyExtractor={(id) => id}
              renderItem={({ item }) => (
                <GroupMemberItem
                  name={byId.get(item)?.name ?? 'Usuário'}
                  photoUrl={byId.get(item)?.photoUrl ?? ''}
                  onPress={() => {
                    setTargetId(item);
                    setMentionOpen(false);
                  }}
                />
              )}
            />
            <Text style={styles.close} onPress={() => setMentionOpen(false)}>
              Fechar
            </Text>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { paddingVertical: 10, flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 240 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.surface, maxHeight: '60%', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', paddingHorizontal: 14, paddingBottom: 8 },
  close: { textAlign: 'center', padding: 16, color: colors.primary, fontWeight: '600' },
});
