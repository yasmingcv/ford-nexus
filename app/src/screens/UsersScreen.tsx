import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { colors } from '../components/theme';
import { useCurrentUid } from '../hooks/useAuth';
import { usePublicProfiles } from '../hooks/usePublicProfiles';
import { getOrCreateDirectConversation } from '../services/chatService';
import type { AppStackParamList } from '../types/navigation';
import type { PublicProfile } from '../types/user';
import { friendlyError } from '../utils/errors';

type Props = NativeStackScreenProps<AppStackParamList, 'Users'>;

export function UsersScreen({ navigation, route }: Props) {
  const uid = useCurrentUid();
  const params = route.params;
  const { profiles, loading, error } = usePublicProfiles();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>(params.mode === 'select' ? params.selectedIds : []);
  const [opening, setOpening] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // O próprio usuário nunca aparece na lista: não é possível selecioná-lo.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return profiles.filter((p) => p.uid !== uid && (!term || p.name.toLowerCase().includes(term)));
  }, [profiles, search, uid]);

  const startConversation = useCallback(
    async (other: PublicProfile) => {
      setOpening(other.uid);
      setActionError(null);
      try {
        const conversationId = await getOrCreateDirectConversation(uid, other.uid);
        navigation.replace('Chat', { conversationId, conversationType: 'direct' });
      } catch (err) {
        setActionError(friendlyError(err, 'Não foi possível abrir a conversa.'));
      } finally {
        setOpening(null);
      }
    },
    [navigation, uid],
  );

  const toggle = useCallback((id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const confirmSelection = useCallback(() => {
    const groupId = params.mode === 'select' ? params.groupId : undefined;
    navigation.popTo('GroupForm', { groupId, pickedMemberIds: selected }, { merge: true });
  }, [navigation, params, selected]);

  const renderItem = useCallback(
    ({ item }: { item: PublicProfile }) =>
      params.mode === 'direct' ? (
        <GroupMemberItem
          name={item.name}
          photoUrl={item.photoUrl}
          disabled={opening !== null}
          onPress={() => void startConversation(item)}
        />
      ) : (
        <GroupMemberItem
          name={item.name}
          photoUrl={item.photoUrl}
          selected={selected.includes(item.uid)}
          onPress={() => toggle(item.uid)}
        />
      ),
    [params.mode, opening, selected, startConversation, toggle],
  );

  if (loading) return <Loading label="Carregando usuários..." />;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Buscar por nome"
        placeholderTextColor={colors.muted}
        value={search}
        onChangeText={setSearch}
      />
      <ErrorMessage message={error ?? actionError} />
      {opening ? <Loading label="Abrindo conversa..." /> : null}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.uid}
        renderItem={renderItem}
        ListEmptyComponent={<EmptyState title="Nenhum usuário disponível" subtitle="Convide alguém para se cadastrar." />}
      />
      {params.mode === 'select' ? (
        <View style={styles.footer}>
          <Button title={`Confirmar (${selected.length} selecionados)`} onPress={confirmSelection} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  search: {
    margin: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  footer: { padding: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
