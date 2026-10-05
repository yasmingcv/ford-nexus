import type { ConversationType } from './chat';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppStackParamList = {
  Conversations: undefined;
  Users: { mode: 'direct' } | { mode: 'select'; selectedIds: string[]; groupId?: string };
  GroupForm: { groupId?: string; pickedMemberIds?: string[] };
  Chat: { conversationId: string; conversationType: ConversationType };
  Profile: { uid: string };
  GroupMembers: { groupId: string };
};
