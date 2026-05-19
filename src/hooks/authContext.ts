import { createContext } from 'react';
import type { User } from 'firebase/auth';

export type AuthContextValue = {
  user: User | null;
  isAuthed: boolean;
  isAuthReady: boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
