import type { ConversationContext, StoredMessage } from '../types';

/**
 * Calcula no servidor quem deve receber o push. Nunca confia em listas vindas do app.
 * - Conversa individual: o outro participante.
 * - Grupo: depende da política configurada pelo proprietário.
 * Em todos os casos: remetente excluído e apenas participantes atuais.
 */
export function resolveRecipients(context: ConversationContext, message: StoredMessage): string[] {
  const exclude = (ids: string[], participants: string[]) =>
    Array.from(new Set(ids)).filter((id) => id !== message.senderId && participants.includes(id));

  if (context.type === 'direct') {
    return exclude(context.participantIds, context.participantIds);
  }

  const members = context.group.memberIds;
  switch (context.group.notificationPolicy) {
    case 'all_group_messages':
      return exclude(members, members);
    case 'mentioned_members': {
      const targeted = message.target.type === 'member' ? [message.target.memberId] : [];
      return exclude([...targeted, ...(message.mentionedUserIds ?? [])], members);
    }
    case 'direct_messages_only':
    case 'disabled':
    default:
      return [];
  }
}
