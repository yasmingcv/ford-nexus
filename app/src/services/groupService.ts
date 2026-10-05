import {
  arrayRemove,
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';

import { apiRequest } from './apiService';
import { firestore } from './firebase';
import { uploadImage } from './storageService';
import type { ChatGroup, GroupInput } from '../types/group';
import type { NotificationPolicy } from '../types/notification';
import { AppError } from '../utils/errors';
import { validateGroup } from '../utils/groupValidation';

const groupsCollection = collection(firestore, 'groups');

function toGroup(id: string, data: DocumentData): ChatGroup {
  return {
    id,
    name: String(data.name ?? ''),
    photoUrl: String(data.photoUrl ?? ''),
    ownerId: String(data.ownerId ?? ''),
    memberIds: Array.isArray(data.memberIds) ? data.memberIds.map(String) : [],
    memberLimit: Number(data.memberLimit ?? 0),
    notificationPolicy: data.notificationPolicy as NotificationPolicy,
    createdAt: Number(data.createdAt ?? 0),
    updatedAt: Number(data.updatedAt ?? 0),
  };
}

/** Pede à API que replique a lista de integrantes no Realtime Database (usada pelas regras das mensagens). */
export async function syncGroupMembers(groupId: string): Promise<void> {
  await apiRequest<{ ok: boolean }>(`/groups/${encodeURIComponent(groupId)}/sync`, { method: 'POST' });
}

export async function createGroup(ownerId: string, input: GroupInput): Promise<string> {
  const memberIds = Array.from(new Set([ownerId, ...input.memberIds]));
  const error = validateGroup(input.name, memberIds.length, input.memberLimit);
  if (error) throw new AppError(error);

  const groupRef = doc(groupsCollection);
  const now = Date.now();
  const group: Omit<ChatGroup, 'id'> = {
    name: input.name.trim(),
    photoUrl: '',
    ownerId,
    memberIds,
    memberLimit: input.memberLimit,
    notificationPolicy: input.notificationPolicy,
    createdAt: now,
    updatedAt: now,
  };
  // As regras do Firestore também validam dono, tamanho e limite.
  await setDoc(groupRef, group);

  if (input.photoUri) {
    const photoUrl = await uploadImage(input.photoUri, `images/groups/${groupRef.id}/photo.jpg`);
    await updateDoc(groupRef, { photoUrl, updatedAt: Date.now() });
  }
  await syncGroupMembers(groupRef.id);
  return groupRef.id;
}

/**
 * Atualiza o grupo dentro de uma transação: lê o estado atual do servidor,
 * valida dono e capacidade e só então grava. Se outra escrita concorrente
 * alterar o documento, a transação é repetida com os dados novos.
 * As regras do Firestore rejeitam qualquer escrita com memberIds.size() > memberLimit.
 */
export async function updateGroup(
  groupId: string,
  requesterId: string,
  changes: { name: string; memberIds: string[]; memberLimit: number; notificationPolicy: NotificationPolicy; photoUri: string | null },
): Promise<void> {
  const groupRef = doc(firestore, 'groups', groupId);
  await runTransaction(firestore, async (tx) => {
    const snapshot = await tx.get(groupRef);
    if (!snapshot.exists()) throw new AppError('Grupo não encontrado.');
    const current = toGroup(snapshot.id, snapshot.data());
    if (current.ownerId !== requesterId) throw new AppError('Somente o proprietário pode editar o grupo.');

    const memberIds = Array.from(new Set([current.ownerId, ...changes.memberIds]));
    const error = validateGroup(changes.name, memberIds.length, changes.memberLimit);
    if (error) throw new AppError(error);

    tx.update(groupRef, {
      name: changes.name.trim(),
      memberIds,
      memberLimit: changes.memberLimit,
      notificationPolicy: changes.notificationPolicy,
      updatedAt: Date.now(),
    });
  });

  if (changes.photoUri) {
    const photoUrl = await uploadImage(changes.photoUri, `images/groups/${groupId}/photo.jpg`);
    await updateDoc(groupRef, { photoUrl, updatedAt: Date.now() });
  }
  await syncGroupMembers(groupId);
}

/** Adiciona um integrante respeitando o limite, protegido por transação + regras. */
export async function addMember(groupId: string, requesterId: string, memberId: string): Promise<void> {
  const groupRef = doc(firestore, 'groups', groupId);
  await runTransaction(firestore, async (tx) => {
    const snapshot = await tx.get(groupRef);
    if (!snapshot.exists()) throw new AppError('Grupo não encontrado.');
    const group = toGroup(snapshot.id, snapshot.data());
    if (group.ownerId !== requesterId) throw new AppError('Somente o proprietário pode adicionar integrantes.');
    if (group.memberIds.includes(memberId)) return;
    if (group.memberIds.length >= group.memberLimit) throw new AppError('O grupo atingiu o limite de integrantes.');
    tx.update(groupRef, { memberIds: [...group.memberIds, memberId], updatedAt: Date.now() });
  });
  await syncGroupMembers(groupId);
}

export async function removeMember(groupId: string, requesterId: string, memberId: string): Promise<void> {
  const groupRef = doc(firestore, 'groups', groupId);
  await runTransaction(firestore, async (tx) => {
    const snapshot = await tx.get(groupRef);
    if (!snapshot.exists()) throw new AppError('Grupo não encontrado.');
    const group = toGroup(snapshot.id, snapshot.data());
    if (memberId === group.ownerId) throw new AppError('O proprietário não pode ser removido.');
    if (group.ownerId !== requesterId && requesterId !== memberId)
      throw new AppError('Somente o proprietário pode remover integrantes.');
    if (group.memberIds.length <= 2 && requesterId === group.ownerId)
      throw new AppError('O grupo precisa manter pelo menos 2 integrantes.');
    tx.update(groupRef, { memberIds: group.memberIds.filter((id) => id !== memberId), updatedAt: Date.now() });
  });
  await syncGroupMembers(groupId);
}

export async function leaveGroup(groupId: string, uid: string): Promise<void> {
  await updateDoc(doc(firestore, 'groups', groupId), { memberIds: arrayRemove(uid), updatedAt: Date.now() });
  await syncGroupMembers(groupId);
}

export async function changeNotificationPolicy(
  groupId: string,
  requesterId: string,
  policy: NotificationPolicy,
): Promise<void> {
  const groupRef = doc(firestore, 'groups', groupId);
  await runTransaction(firestore, async (tx) => {
    const snapshot = await tx.get(groupRef);
    if (!snapshot.exists()) throw new AppError('Grupo não encontrado.');
    if (snapshot.data().ownerId !== requesterId) throw new AppError('Somente o proprietário pode alterar notificações.');
    tx.update(groupRef, { notificationPolicy: policy, updatedAt: Date.now() });
  });
}

export function listenMyGroups(
  uid: string,
  onData: (groups: ChatGroup[]) => void,
  onError: (error: Error) => void,
): () => void {
  const q = query(groupsCollection, where('memberIds', 'array-contains', uid));
  return onSnapshot(q, (snapshot) => onData(snapshot.docs.map((d) => toGroup(d.id, d.data()))), onError);
}

export function listenGroup(
  groupId: string,
  onData: (group: ChatGroup | null) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    doc(firestore, 'groups', groupId),
    (snapshot) => onData(snapshot.exists() ? toGroup(snapshot.id, snapshot.data()) : null),
    onError,
  );
}
