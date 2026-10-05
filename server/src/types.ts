export type NotificationPolicy =
  | 'all_group_messages'
  | 'mentioned_members'
  | 'direct_messages_only'
  | 'disabled';

export type ConversationType = 'direct' | 'group';

export type MessageTarget = { type: 'conversation' } | { type: 'member'; memberId: string };

export type StoredMessage = {
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds?: string[];
  createdAt: number;
};

export type GroupDoc = {
  name: string;
  photoUrl: string;
  ownerId: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
  createdAt: number;
  updatedAt: number;
};

export type DeviceDoc = {
  token: string;
  tokenType: 'fcm' | 'expo';
  platform: 'android' | 'ios';
  enabled: boolean;
  updatedAt: number;
};

export type DeviceRef = DeviceDoc & { uid: string; path: string };

export type ConversationContext =
  | { type: 'direct'; participantIds: string[] }
  | { type: 'group'; group: GroupDoc };

declare global {
  namespace Express {
    interface Locals {
      uid: string;
    }
  }
}
