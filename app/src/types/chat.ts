export type ConversationType = 'direct' | 'group';

export type DirectConversation = {
  id: string;
  type: 'direct';
  participants: [string, string];
  createdAt: number;
};

export type MessageTarget =
  | { type: 'conversation' }
  | { type: 'member'; memberId: string };

export type ChatMessage = {
  id: string;
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
  createdAt: number;
};

/** Formato gravado no Realtime Database (o id é a chave do nó). */
export type StoredMessage = Omit<ChatMessage, 'id'>;

export type ConversationListItem =
  | { kind: 'direct'; id: string; otherUid: string; createdAt: number }
  | { kind: 'group'; id: string; name: string; photoUrl: string; memberCount: number; createdAt: number };
