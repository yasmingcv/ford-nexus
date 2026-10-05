export type NotificationPolicy =
  | 'all_group_messages'
  | 'mentioned_members'
  | 'direct_messages_only'
  | 'disabled';

export type NotificationSettings = {
  conversationId: string;
  policy: NotificationPolicy;
  updatedBy: string;
  updatedAt: number;
};

export type PushPayloadData = {
  conversationId: string;
  conversationType: 'direct' | 'group';
};

export const POLICY_LABELS: Record<NotificationPolicy, string> = {
  all_group_messages: 'Todas as mensagens do grupo',
  mentioned_members: 'Somente integrantes mencionados',
  direct_messages_only: 'Somente conversas individuais',
  disabled: 'Desativadas',
};

export const POLICIES: NotificationPolicy[] = [
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
];
