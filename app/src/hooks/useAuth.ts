import { useContext } from 'react';

import { AuthContext, type AuthContextValue } from '../contexts/AuthContext';

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}

/** Uid do usuário autenticado; usado apenas em telas protegidas. */
export function useCurrentUid(): string {
  const { firebaseUser } = useAuth();
  if (!firebaseUser) throw new Error('Usuário não autenticado');
  return firebaseUser.uid;
}
