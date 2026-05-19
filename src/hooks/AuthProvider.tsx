import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { observeAuthState } from '@/services/firebase';
import { AuthContext, type AuthContextValue } from '@/hooks/authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    return observeAuthState((nextUser) => {
      setUser(nextUser);
      setIsAuthReady(true);
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthed: Boolean(user),
    isAuthReady,
  }), [isAuthReady, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
