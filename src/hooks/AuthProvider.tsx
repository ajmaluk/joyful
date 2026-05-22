import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User, UserCredential } from 'firebase/auth';
import { handleRedirectResult, observeAuthState } from '@/services/firebase';
import { AuthContext, type AuthContextValue } from '@/hooks/authContext';
import * as storage from '@/services/storage';

const allowLocalDemoAuth = import.meta.env.DEV;

function hasDevAuthParam() {
  return allowLocalDemoAuth && new URLSearchParams(window.location.search).get('devAuth') === '1';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const hasLocalDevAuth = hasDevAuthParam();
  const [user, setUser] = useState<User | null>(null);
  const [localDemoAuthed, setLocalDemoAuthed] = useState(() => (
    allowLocalDemoAuth ? storage.isAuthenticated() || hasLocalDevAuth : false
  ));
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    if (!allowLocalDemoAuth || !hasLocalDevAuth) return;
    storage.setAuthenticated(true);
  }, [hasLocalDevAuth]);

  useEffect(() => {
    return observeAuthState((nextUser) => {
      setUser(nextUser);
      setIsAuthReady(true);
    });
  }, []);

  // Process any pending redirect result (e.g. from a previous redirect-based sign-in)
  useEffect(() => {
    let isCancelled = false;

    handleRedirectResult().then((result: UserCredential | null) => {
      if (isCancelled) return;
      if (result?.user) {
        // Redirect completed successfully — onAuthStateChanged will also fire
        setUser(result.user);
        setIsAuthReady(true);
      }
    });

    return () => {
      isCancelled = true;
    };
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
    authError: '',
  }), [isAuthReady, localDemoAuthed, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
