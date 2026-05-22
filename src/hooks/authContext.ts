import { createContext } from 'react';
import type { User } from 'firebase/auth';

export type AuthContextValue = {
  user: User | null;
  isAuthed: boolean;
  isAuthReady: boolean;
  authError: string;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
