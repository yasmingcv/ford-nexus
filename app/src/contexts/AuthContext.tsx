import type { User } from 'firebase/auth';
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as authService from '../services/authService';
import { unregisterCurrentDevice } from '../services/notificationService';
import { getMyProfile } from '../services/userService';
import type { ChatUser, RegisterInput } from '../types/user';

export type AuthContextValue = {
  firebaseUser: User | null;
  profile: ChatUser | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ChatUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Recupera a sessão persistida e acompanha login/logout.
  useEffect(() => {
    return authService.observeSession((user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setInitializing(false);
        return;
      }
      getMyProfile(user.uid)
        .then(setProfile)
        .catch(() => setProfile(null))
        .finally(() => setInitializing(false));
    });
  }, []);

  const login = useCallback((email: string, password: string) => authService.login(email, password), []);

  const register = useCallback(async (input: RegisterInput) => {
    await authService.register(input);
    const uid = authService.currentUid();
    if (uid) setProfile(await getMyProfile(uid));
  }, []);

  const logout = useCallback(async () => {
    const uid = authService.currentUid();
    if (uid) await unregisterCurrentDevice(uid).catch(() => undefined);
    await authService.logout();
    setProfile(null);
    setFirebaseUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ firebaseUser, profile, initializing, login, register, logout }),
    [firebaseUser, profile, initializing, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
