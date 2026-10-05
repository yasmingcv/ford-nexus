export const MIN_GROUP_LIMIT = 2;
export const MAX_GROUP_LIMIT = 256;

export function parseMemberLimit(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) ? value : null;
}

export function validateGroup(name: string, memberCount: number, limit: number | null): string | null {
  if (name.trim().length < 2) return 'Informe um nome com pelo menos 2 caracteres.';
  if (limit === null) return 'O limite deve ser um número inteiro válido.';
  if (limit < MIN_GROUP_LIMIT || limit > MAX_GROUP_LIMIT)
    return `O limite deve estar entre ${MIN_GROUP_LIMIT} e ${MAX_GROUP_LIMIT}.`;
  if (memberCount < 2) return 'O grupo precisa de pelo menos 2 integrantes (incluindo você).';
  if (memberCount > limit)
    return `O grupo tem ${memberCount} integrantes e o limite é ${limit}. O limite não pode ser menor que a quantidade atual.`;
  return null;
}

export function availableSlots(memberCount: number, limit: number): number {
  return Math.max(limit - memberCount, 0);
}
