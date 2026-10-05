import { auth } from './firebase';
import { AppError } from '../utils/errors';

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

type ApiErrorBody = { error?: string };

/** Chamada autenticada à API própria: envia o Firebase ID Token no header Authorization. */
export async function apiRequest<T>(path: string, init: { method: 'GET' | 'POST'; body?: object }): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new AppError('Sua sessão expirou. Faça login novamente.');
  if (!API_URL) throw new AppError('URL da API não configurada (EXPO_PUBLIC_API_URL).');

  const token = await user.getIdToken();
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: init.method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new AppError('Falha de conectividade com o servidor.');
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    if (response.status === 401) throw new AppError('Sua sessão expirou. Faça login novamente.');
    if (response.status === 403) throw new AppError(body.error ?? 'Você não tem permissão para esta ação.');
    throw new AppError(body.error ?? 'O servidor não conseguiu concluir a operação.');
  }
  return (await response.json()) as T;
}
