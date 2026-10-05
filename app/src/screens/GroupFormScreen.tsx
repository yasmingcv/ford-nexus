import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { PhotoPicker } from '../components/PhotoPicker';
import { TextField } from '../components/TextField';
import { colors } from '../components/theme';
import { useCurrentUid } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroups';
import { usePublicProfiles } from '../hooks/usePublicProfiles';
import { createGroup, removeMember, updateGroup } from '../services/groupService';
import type { AppStackParamList } from '../types/navigation';
import { POLICIES, POLICY_LABELS, type NotificationPolicy } from '../types/notification';
import { friendlyError } from '../utils/errors';
import { availableSlots, parseMemberLimit, validateGroup } from '../utils/groupValidation';

type Props = NativeStackScreenProps<AppStackParamList, 'GroupForm'>;

export function GroupFormScreen({ navigation, route }: Props) {
  const uid = useCurrentUid();
  const { groupId, pickedMemberIds } = route.params;
  const isEditing = Boolean(groupId);
  const { group, loading: loadingGroup, error: groupError } = useGroup(groupId);
  const { byId } = usePublicProfiles();

  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [memberIds, setMemberIds] = useState<string[]>([uid]);
  const [limitText, setLimitText] = useState('5');
  const [policy, setPolicy] = useState<NotificationPolicy>('all_group_messages');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(!isEditing);

  // Preenche o formulário com os dados do grupo (uma única vez).
  useEffect(() => {
    if (!group || initialized) return;
    setName(group.name);
    setMemberIds(group.memberIds);
    setLimitText(String(group.memberLimit));
    setPolicy(group.notificationPolicy);
    setInitialized(true);
  }, [group, initialized]);

  // Recebe os integrantes escolhidos na tela de Usuários.
  useEffect(() => {
    if (!pickedMemberIds) return;
    const owner = group?.ownerId ?? uid;
    setMemberIds(Array.from(new Set([owner, ...pickedMemberIds])));
  }, [pickedMemberIds, group?.ownerId, uid]);

  const limit = useMemo(() => parseMemberLimit(limitText), [limitText]);
  const slots = useMemo(() => (limit === null ? null : availableSlots(memberIds.length, limit)), [limit, memberIds.length]);
  const validation = useMemo(() => validateGroup(name, memberIds.length, limit), [name, memberIds.length, limit]);
  const isOwner = !isEditing || group?.ownerId === uid;

  const selectMembers = useCallback(() => {
    navigation.navigate('Users', {
      mode: 'select',
      selectedIds: memberIds.filter((id) => id !== uid),
      groupId,
    });
  }, [navigation, memberIds, uid, groupId]);

  const handleRemove = useCallback(
    (memberId: string) => {
      if (!groupId) {
        setMemberIds((prev) => prev.filter((id) => id !== memberId));
        return;
      }
      Alert.alert('Remover integrante', 'O integrante deixará de receber e enviar mensagens do grupo.', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            removeMember(groupId, uid, memberId)
              .then(() => setMemberIds((prev) => prev.filter((id) => id !== memberId)))
              .catch((err: unknown) => setError(friendlyError(err, 'Não foi possível remover o integrante.')));
          },
        },
      ]);
    },
    [groupId, uid],
  );

  const handleSave = useCallback(async () => {
    if (validation || limit === null) {
      setError(validation);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (groupId) {
        await updateGroup(groupId, uid, { name, memberIds, memberLimit: limit, notificationPolicy: policy, photoUri });
        navigation.goBack();
      } else {
        const newId = await createGroup(uid, { name, photoUri, memberIds, memberLimit: limit, notificationPolicy: policy });
        navigation.replace('Chat', { conversationId: newId, conversationType: 'group' });
      }
    } catch (err) {
      setError(friendlyError(err, 'Não foi possível salvar o grupo.'));
    } finally {
      setSaving(false);
    }
  }, [validation, limit, groupId, uid, name, memberIds, policy, photoUri, navigation]);

  if (isEditing && (loadingGroup || !initialized)) {
    return groupError ? <ErrorMessage message={groupError} /> : <Loading label="Carregando grupo..." />;
  }
  if (!isOwner) return <ErrorMessage message="Somente o proprietário pode editar este grupo." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <PhotoPicker uri={photoUri ?? group?.photoUrl ?? null} name={name} isGroup onPick={setPhotoUri} />
      <TextField label="Nome do grupo" value={name} onChangeText={setName} maxLength={60} />
      <TextField label="Limite máximo de integrantes" value={limitText} onChangeText={setLimitText} keyboardType="number-pad" />

      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {memberIds.length} integrante(s){limit !== null ? ` de ${limit}` : ''}
        </Text>
        <Text style={[styles.counterText, slots === 0 && styles.full]}>
          {slots === null ? '—' : slots === 0 ? 'Grupo sem vagas' : `${slots} vaga(s) disponível(is)`}
        </Text>
      </View>

      <Text style={styles.section}>Política de notificações</Text>
      {POLICIES.map((option) => (
        <Pressable key={option} style={styles.option} onPress={() => setPolicy(option)}>
          <View style={[styles.radio, policy === option && styles.radioOn]} />
          <Text style={styles.optionText}>{POLICY_LABELS[option]}</Text>
        </Pressable>
      ))}

      <Text style={styles.section}>Integrantes</Text>
      {memberIds.map((id) => {
        const p = byId.get(id);
        const ownerId = group?.ownerId ?? uid;
        return (
          <GroupMemberItem
            key={id}
            name={p?.name ?? 'Usuário'}
            photoUrl={p?.photoUrl ?? ''}
            isOwner={id === ownerId}
            isMe={id === uid}
            actionLabel={id !== ownerId ? 'Remover' : undefined}
            onAction={id !== ownerId ? () => handleRemove(id) : undefined}
          />
        );
      })}
      <Button title="Selecionar integrantes" variant="secondary" onPress={selectMembers} />

      <ErrorMessage message={error ?? (name ? validation : null)} />
      <Button title={isEditing ? 'Salvar alterações' : 'Criar grupo'} onPress={handleSave} loading={saving} disabled={Boolean(validation)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  counter: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  counterText: { color: colors.muted, fontWeight: '600' },
  full: { color: colors.danger },
  section: { fontSize: 16, fontWeight: '700', marginTop: 16, marginBottom: 6, color: colors.text },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.primary },
  radioOn: { backgroundColor: colors.primary },
  optionText: { color: colors.text },
});
