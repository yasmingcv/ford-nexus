import { Router } from 'express';

import { directConversationId, loadConversation, wasMember, writeMembers } from '../services/conversationService';
import { firestore } from '../services/firebaseAdmin';

export const conversationsRouter = Router();

const UID_PATTERN = /^[A-Za-z0-9]{1,128}$/;

/** Cria ou localiza a conversa individual (exatamente 2 participantes, id único por par). */
conversationsRouter.post('/conversations/direct', async (req, res) => {
  const uid = res.locals.uid;
  const { otherUserId } = (req.body ?? {}) as { otherUserId?: unknown };
  if (typeof otherUserId !== 'string' || !UID_PATTERN.test(otherUserId)) {
    res.status(400).json({ error: 'Usuário inválido.' });
    return;
  }
  if (otherUserId === uid) {
    res.status(400).json({ error: 'Você não pode conversar consigo mesmo.' });
    return;
  }
  const other = await firestore.collection('publicProfiles').doc(otherUserId).get();
  if (!other.exists) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }

  const conversationId = directConversationId(uid, otherUserId);
  const ref = firestore.collection('directConversations').doc(conversationId);
  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) tx.create(ref, { participantIds: [uid, otherUserId].sort(), createdAt: Date.now() });
  });
  await writeMembers(conversationId, [uid, otherUserId]);
  res.json({ conversationId });
});

/**
 * Espelha os integrantes do grupo (Firestore) no Realtime Database.
 * Integrantes removidos perdem imediatamente o acesso às mensagens.
 */
conversationsRouter.post('/groups/:groupId/sync', async (req, res) => {
  const uid = res.locals.uid;
  const { groupId } = req.params;
  if (!/^[A-Za-z0-9]{1,128}$/.test(groupId)) {
    res.status(400).json({ error: 'Grupo inválido.' });
    return;
  }
  const context = await loadConversation(groupId);
  const members = context?.type === 'group' ? context.group.memberIds : [];
  const allowed = members.includes(uid) || (await wasMember(groupId, uid));
  if (!allowed) {
    res.status(403).json({ error: 'Você não participa deste grupo.' });
    return;
  }
  await writeMembers(groupId, members);
  res.json({ ok: true });
});
