import { FirebaseError } from 'firebase/app';

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha inválidos.',
  'auth/wrong-password': 'E-mail ou senha inválidos.',
  'auth/user-not-found': 'E-mail ou senha inválidos.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
  'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
  'auth/network-request-failed': 'Falha de conectividade. Verifique sua internet.',
  'auth/user-token-expired': 'Sua sessão expirou. Faça login novamente.',
  'permission-denied': 'Você não tem permissão para esta ação.',
  unavailable: 'Serviço indisponível. Verifique sua conexão.',
  'storage/unauthorized': 'Sem permissão para enviar a imagem.',
  'storage/canceled': 'Envio da imagem cancelado.',
};

/** Erro com mensagem já adequada ao usuário final. */
export class AppError extends Error {}

/** Converte qualquer erro em uma mensagem compreensível, sem expor detalhes internos. */
export function friendlyError(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof FirebaseError) return MESSAGES[error.code] ?? fallback;
  if (error instanceof Error) {
    if (/PERMISSION_DENIED|permission/i.test(error.message)) return MESSAGES['permission-denied'];
    if (/network|fetch|timeout/i.test(error.message)) return 'Falha de conectividade. Verifique sua internet.';
  }
  return fallback;
}
