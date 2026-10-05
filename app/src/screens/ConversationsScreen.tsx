import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useLayoutEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { ConversationItem } from '../components/ConversationItem';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { colors } from '../components/theme';
import { useAuth, useCurrentUid } from '../hooks/useAuth';
import { useConnectivity } from '../hooks/useConnectivity';
import { useConversations } from '../hooks/useConversations';
import { usePublicProfiles } from '../hooks/usePublicProfiles';
import type { ConversationListItem } from '../types/chat';
import type { AppStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<AppStackParamList, 'Conversations'> & { notificationMessage: string | null };

export function ConversationsScreen({ navigation, notificationMessage }: Props) {
  const uid = useCurrentUid();
  const { logout, profile } = useAuth();
  const { items, loading, error } = useConversations(uid);
  const { byId } = usePublicProfiles();
  const connected = useConnectivity();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Text style={styles.logout} onPress={() => void logout()}>
          Sair
        </Text>
      ),
    });
  }, [navigation, logout]);

  const renderItem = useCallback(
    ({ item }: { item: ConversationListItem }) => {
      if (item.kind === 'direct') {
        const other = byId.get(item.otherUid);
        return (
          <ConversationItem
            title={other?.name ?? 'Usuário'}
            subtitle="Conversa individual"
            photoUrl={other?.photoUrl ?? ''}
            isGroup={false}
            onPress={() => navigation.navigate('Chat', { conversationId: item.id, conversationType: 'direct' })}
          />
        );
      }
      return (
        <ConversationItem
          title={item.name}
          subtitle={`${item.memberCount} integrantes`}
          photoUrl={item.photoUrl}
          isGroup
          onPress={() => navigation.navigate('Chat', { conversationId: item.id, conversationType: 'group' })}
        />
      );
    },
    [byId, navigation],
  );

  return (
    <View style={styles.container}>
      {!connected ? <ErrorMessage message="Sem conexão. As mensagens serão sincronizadas ao reconectar." variant="warning" /> : null}
      <ErrorMessage message={notificationMessage} variant="warning" />
      <View style={styles.actions}>
        <View style={styles.flex}>
          <Button title="Nova conversa" onPress={() => navigation.navigate('Users', { mode: 'direct' })} />
        </View>
        <View style={styles.flex}>
          <Button title="Novo grupo" variant="secondary" onPress={() => navigation.navigate('GroupForm', {})} />
        </View>
      </View>
      {profile ? <Text style={styles.hello}>Olá, {profile.name}</Text> : null}
      <ErrorMessage message={error} />
      {loading ? (
        <Loading label="Carregando conversas..." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <EmptyState title="Nenhuma conversa ainda" subtitle="Inicie uma conversa individual ou crie um grupo." />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingTop: 8 },
  flex: { flex: 1 },
  hello: { paddingHorizontal: 14, paddingVertical: 6, color: colors.muted },
  logout: { color: colors.danger, fontWeight: '600', fontSize: 16 },
});
