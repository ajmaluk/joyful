import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { observeAuthState } from '@/services/firebase';
import { AuthContext, type AuthContextValue } from '@/hooks/authContext';
import * as storage from '@/services/storage';

const allowLocalDemoAuth = import.meta.env.DEV;

function hasDevAuthParam() {
  return allowLocalDemoAuth && new URLSearchParams(window.location.search).get('devAuth') === '1';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [localDemoAuthed, setLocalDemoAuthed] = useState(() => (
    allowLocalDemoAuth ? storage.isAuthenticated() || hasDevAuthParam() : false
  ));
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    return observeAuthState((nextUser) => {
      setUser(nextUser);
      setIsAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!allowLocalDemoAuth) return undefined;

    const handleLocalAuthChanged = () => {
      setLocalDemoAuthed(storage.isAuthenticated() || hasDevAuthParam());
    };

    window.addEventListener('joyful_auth_changed', handleLocalAuthChanged);

    return () => {
      window.removeEventListener('joyful_auth_changed', handleLocalAuthChanged);
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthed: Boolean(user) || localDemoAuthed,
    isAuthReady,
  }), [isAuthReady, localDemoAuthed, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
