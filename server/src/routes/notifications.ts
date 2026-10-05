import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';

import { loadConversation, participantsOf } from '../services/conversationService';
import { database, firestore } from '../services/firebaseAdmin';
import { loadDevices, sendPush } from '../services/notificationSender';
import { resolveRecipients } from '../services/recipientResolver';
import type { StoredMessage } from '../types';

export const notificationsRouter = Router();

const ID_PATTERN = /^[A-Za-z0-9_-]{1,160}$/;
const ALREADY_EXISTS = 6;

/**
 * POST /notifications/messages { conversationId, messageId }
 * 1. valida token (middleware) 2. confirma a mensagem no RTDB e o remetente
 * 3. lê participantes/política/tokens no Firestore 4. calcula destinatários 5. envia.
 */
notificationsRouter.post('/messages', async (req, res) => {
  const { conversationId, messageId } = (req.body ?? {}) as { conversationId?: unknown; messageId?: unknown };
  if (typeof conversationId !== 'string' || typeof messageId !== 'string' || !ID_PATTERN.test(conversationId) || !ID_PATTERN.test(messageId)) {
    res.status(400).json({ error: 'conversationId e messageId são obrigatórios.' });
    return;
  }
  const uid = res.locals.uid;

  const snap = await database.ref(`messages/${conversationId}/${messageId}`).get();
  const message = snap.val() as StoredMessage | null;
  if (!message) {
    res.status(404).json({ error: 'Mensagem não encontrada.' });
    return;
  }
  if (message.senderId !== uid || message.conversationId !== conversationId) {
    res.status(403).json({ error: 'A mensagem não pertence ao usuário autenticado.' });
    return;
  }

  const context = await loadConversation(conversationId);
  if (!context || !participantsOf(context).includes(uid)) {
    res.status(403).json({ error: 'Você não participa desta conversa.' });
    return;
  }

  // Idempotência: create() falha se o documento já existir, então reenvios não geram push repetido.
  const dispatchRef = firestore.collection('notificationDispatches').doc(`${conversationId}__${messageId}`);
  try {
    await dispatchRef.create({ conversationId, messageId, senderId: uid, createdAt: FieldValue.serverTimestamp(), status: 'processing' });
  } catch (error) {
    if ((error as { code?: number }).code === ALREADY_EXISTS) {
      res.json({ sent: 0, duplicate: true });
      return;
    }
    throw error;
  }

  const recipients = resolveRecipients(context, message);
  if (!recipients.length) {
    await dispatchRef.update({ status: 'skipped', recipients: 0 });
    res.json({ sent: 0, recipients: 0 });
    return;
  }

  const senderSnap = await firestore.collection('publicProfiles').doc(uid).get();
  const senderName = (senderSnap.get('name') as string | undefined) ?? 'Alguém';
  const isMention = message.target.type === 'member' || (message.mentionedUserIds?.length ?? 0) > 0;

  // Texto sem o conteúdo da mensagem, para não expor informações sensíveis.
  const content =
    context.type === 'direct'
      ? { title: senderName, body: 'Enviou uma nova mensagem para você.' }
      : { title: context.group.name, body: isMention ? `${senderName} mencionou você.` : `${senderName} enviou uma mensagem.` };

  const devices = await loadDevices(recipients);
  const sent = await sendPush(devices, {
    ...content,
    data: { conversationId, conversationType: context.type },
  });

  await dispatchRef.update({ status: 'sent', recipients: recipients.length, sent });
  res.json({ sent, recipients: recipients.length });
});
