import {
  limitToLast,
  off,
  onChildAdded,
  orderByChild,
  push,
  query,
  ref,
  set,
  type DataSnapshot,
} from 'firebase/database';
import { collection, onSnapshot, query as fsQuery, where } from 'firebase/firestore';

import { apiRequest } from './apiService';
import { database, firestore } from './firebase';
import type { ChatMessage, ConversationType, DirectConversation, MessageTarget, StoredMessage } from '../types/chat';
import { directConversationId } from '../utils/conversationId';
import { AppError } from '../utils/errors';

const MESSAGE_PAGE = 200;

/**
 * Cria (ou localiza, se já existir) a conversa individual. A API grava o documento em
 * Firestore e os participantes no Realtime Database, garantindo exatamente dois
 * participantes distintos e um único id por par.
 */
export async function getOrCreateDirectConversation(myUid: string, otherUid: string): Promise<string> {
  if (myUid === otherUid) throw new AppError('Você não pode conversar consigo mesmo.');
  const expectedId = directConversationId(myUid, otherUid);
  const result = await apiRequest<{ conversationId: string }>('/conversations/direct', {
    method: 'POST',
    body: { otherUserId: otherUid },
  });
  return result.conversationId || expectedId;
}

export function listenMyDirectConversations(
  uid: string,
  onData: (conversations: DirectConversation[]) => void,
  onError: (error: Error) => void,
): () => void {
  const q = fsQuery(collection(firestore, 'directConversations'), where('participantIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snapshot) =>
      onData(
        snapshot.docs.map((d) => {
          const ids = (d.data().participantIds as string[]) ?? [];
          return {
            id: d.id,
            type: 'direct',
            participants: [ids[0] ?? '', ids[1] ?? ''],
            createdAt: Number(d.data().createdAt ?? 0),
          };
        }),
      ),
    onError,
  );
}

function toMessage(snapshot: DataSnapshot): ChatMessage | null {
  const value = snapshot.val() as StoredMessage | null;
  if (!value || !snapshot.key) return null;
  return {
    id: snapshot.key,
    conversationId: value.conversationId,
    conversationType: value.conversationType,
    senderId: value.senderId,
    text: value.text,
    target: value.target ?? { type: 'conversation' },
    mentionedUserIds: value.mentionedUserIds ?? [],
    createdAt: value.createdAt,
  };
}

/** Listener em tempo real das mensagens. Retorna a função que remove o listener. */
export function listenMessages(
  conversationId: string,
  onMessage: (message: ChatMessage) => void,
  onError: (error: Error) => void,
): () => void {
  const messagesQuery = query(
    ref(database, `messages/${conversationId}`),
    orderByChild('createdAt'),
    limitToLast(MESSAGE_PAGE),
  );
  const unsubscribe = onChildAdded(
    messagesQuery,
    (snapshot) => {
      const message = toMessage(snapshot);
      if (message) onMessage(message);
    },
    onError,
  );
  return () => {
    unsubscribe();
    off(messagesQuery);
  };
}

export async function sendMessage(params: {
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
}): Promise<string> {
  const text = params.text.trim();
  if (!text) throw new AppError('Digite uma mensagem.');

  const messageRef = push(ref(database, `messages/${params.conversationId}`));
  if (!messageRef.key) throw new AppError('Não foi possível gerar a mensagem.');

  const message: StoredMessage = {
    conversationId: params.conversationId,
    conversationType: params.conversationType,
    senderId: params.senderId,
    text,
    target: params.target,
    mentionedUserIds: params.mentionedUserIds,
    createdAt: Date.now(),
  };
  // 1) Persiste no Realtime Database (as regras validam participante e senderId).
  await set(messageRef, message);
  return messageRef.key;
}

/** 2) Após persistir, solicita o push à API online. Os destinatários são calculados no servidor. */
export async function requestPush(conversationId: string, messageId: string): Promise<void> {
  await apiRequest<{ sent: number }>('/notifications/messages', {
    method: 'POST',
    body: { conversationId, messageId },
  });
}
