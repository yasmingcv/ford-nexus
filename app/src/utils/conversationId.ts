/** Id determinístico para o par de usuários: nunca existem duas conversas para o mesmo par. */
export function directConversationId(uidA: string, uidB: string): string {
  if (uidA === uidB) throw new Error('Não é possível conversar consigo mesmo.');
  const [first, second] = [uidA, uidB].sort();
  return `dm_${first}_${second}`;
}

export function otherParticipant(conversationId: string, myUid: string): string {
  const [, a, b] = conversationId.split('_');
  return a === myUid ? b : a;
}
