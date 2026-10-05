import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { colors } from '../components/theme';
import { useCurrentUid } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroups';
import { usePublicProfiles } from '../hooks/usePublicProfiles';
import { leaveGroup } from '../services/groupService';
import type { AppStackParamList } from '../types/navigation';
import { POLICY_LABELS } from '../types/notification';
import { friendlyError } from '../utils/errors';
import { availableSlots } from '../utils/groupValidation';

type Props = NativeStackScreenProps<AppStackParamList, 'GroupMembers'>;

export function GroupMembersScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const uid = useCurrentUid();
  const { group, loading, error } = useGroup(groupId);
  const { byId } = usePublicProfiles();
  const [actionError, setActionError] = useState<string | null>(null);

  const handleLeave = useCallback(() => {
    Alert.alert('Sair do grupo', 'Você deixará de receber mensagens deste grupo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          leaveGroup(groupId, uid)
            .then(() => navigation.popToTop())
            .catch((err: unknown) => setActionError(friendlyError(err, 'Não foi possível sair do grupo.')));
        },
      },
    ]);
  }, [groupId, uid, navigation]);

  if (loading) return <Loading />;
  if (!group) return <ErrorMessage message={error ?? 'Grupo não encontrado.'} />;

  const isOwner = group.ownerId === uid;
  const slots = availableSlots(group.memberIds.length, group.memberLimit);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Avatar uri={group.photoUrl} name={group.name} size={88} isGroup />
        <Text style={styles.name}>{group.name}</Text>
        <Text style={styles.meta}>
          {group.memberIds.length}/{group.memberLimit} integrantes · {slots === 0 ? 'sem vagas' : `${slots} vaga(s)`}
        </Text>
        <Text style={styles.meta}>Notificações: {POLICY_LABELS[group.notificationPolicy]}</Text>
      </View>
      <ErrorMessage message={actionError} />
      <FlatList
        data={group.memberIds}
        keyExtractor={(id) => id}
        renderItem={({ item }) => (
          <GroupMemberItem
            name={byId.get(item)?.name ?? 'Usuário'}
            photoUrl={byId.get(item)?.photoUrl ?? ''}
            isOwner={item === group.ownerId}
            isMe={item === uid}
            onPress={() => navigation.navigate('Profile', { uid: item })}
          />
        )}
      />
      <View style={styles.footer}>
        {isOwner ? (
          <Button title="Editar grupo" onPress={() => navigation.navigate('GroupForm', { groupId })} />
        ) : (
          <Button title="Sair do grupo" variant="danger" onPress={handleLeave} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { alignItems: 'center', padding: 20, gap: 4 },
  name: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 8 },
  meta: { color: colors.muted },
  footer: { padding: 12 },
});
