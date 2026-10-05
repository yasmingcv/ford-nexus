import { database, firestore } from './firebaseAdmin';
import type { ConversationContext, GroupDoc } from '../types';

export function directConversationId(a: string, b: string): string {
  const [first, second] = [a, b].sort();
  return `dm_${first}_${second}`;
}

export function isDirectId(conversationId: string): boolean {
  return conversationId.startsWith('dm_');
}

/** Carrega participantes/configuração da conversa a partir do Firestore. */
export async function loadConversation(conversationId: string): Promise<ConversationContext | null> {
  if (isDirectId(conversationId)) {
    const snap = await firestore.collection('directConversations').doc(conversationId).get();
    if (!snap.exists) return null;
    const participantIds = (snap.get('participantIds') as string[] | undefined) ?? [];
    return { type: 'direct', participantIds };
  }
  const snap = await firestore.collection('groups').doc(conversationId).get();
  if (!snap.exists) return null;
  return { type: 'group', group: snap.data() as GroupDoc };
}

export function participantsOf(context: ConversationContext): string[] {
  return context.type === 'direct' ? context.participantIds : context.group.memberIds;
}

/** Espelha os integrantes no Realtime Database, onde as regras das mensagens os consultam. */
export async function writeMembers(conversationId: string, memberIds: string[]): Promise<void> {
  const map = Object.fromEntries(memberIds.map((id) => [id, true]));
  await database.ref(`conversationMembers/${conversationId}`).set(memberIds.length ? map : null);
}

export async function wasMember(conversationId: string, uid: string): Promise<boolean> {
  const snap = await database.ref(`conversationMembers/${conversationId}/${uid}`).get();
  return snap.val() === true;
}
