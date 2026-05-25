import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  GithubAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  getRedirectResult,
  signOut,
  updateProfile,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import { setAuthenticated } from './storage';


const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const firebaseConfigRequirements = [
  ['apiKey', firebaseConfig.apiKey],
  ['authDomain', firebaseConfig.authDomain],
  ['projectId', firebaseConfig.projectId],
  ['storageBucket', firebaseConfig.storageBucket],
  ['messagingSenderId', firebaseConfig.messagingSenderId],
  ['appId', firebaseConfig.appId],
] as const;

function isFirebaseConfigReady() {
  return firebaseConfigRequirements.every(([, value]) => Boolean(value));
}

function getFirebaseConfigErrorMessage() {
  const missingFields = firebaseConfigRequirements
    .filter(([, value]) => !value)
    .map(([field]) => field);

  if (!missingFields.length) {
    return '';
  }

  return `Firebase config is incomplete. Missing: ${missingFields.join(', ')}.`;
}

function getAuthErrorCode(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return '';
  }

  if (!('code' in error)) {
    return '';
  }

  return String((error as { code?: unknown }).code || '');
}

export function getFriendlyFirebaseAuthError(error: unknown) {
  const configError = getFirebaseConfigErrorMessage();
  if (configError) {
    return configError;
  }

  const code = getAuthErrorCode(error);
  switch (code) {
    case 'auth/unauthorized-domain':
      return 'Firebase blocked sign-in from this domain. Add localhost and your app domain to Authorized domains in Firebase Auth.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is disabled in Firebase. Enable Google, GitHub, or email/password in the Firebase console.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Try using the provider redirect or enable popups for this site.';
    case 'auth/popup-closed-by-user':
      return 'The sign-in popup was closed before authentication completed. Please try again.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with a different sign-in method. Sign in with your existing provider first, then link accounts in settings.';
    case 'auth/cancelled-popup-request':
      return 'A sign-in request is already in progress. Close any other popup tabs and try again.';
    case 'auth/redirect-cancelled-by-user':
      return 'The sign-in redirect was cancelled. Try again.';
    case 'auth/redirect-operation-pending':
      return 'A redirect sign-in is already in progress. Wait for it to complete.';
    case 'auth/web-context-cancelled':
      return 'The sign-in request was cancelled. Try again.';
    case 'auth/internal-error':
      return 'Firebase could not complete sign-in. Check that Auth is enabled and the authentication provider is configured.';
    default:
      return error instanceof Error && error.message
        ? error.message
        : 'Could not log in. Please try again.';
  }
}

export const firebaseApp = isFirebaseConfigReady() ? initializeApp(firebaseConfig) : undefined;
export const auth = firebaseApp ? getAuth(firebaseApp) : undefined;

// Ensure we attempt to persist auth in the browser if auth is available, but don't fail the app if it errors.
if (auth) {
  void setPersistence(auth, browserLocalPersistence).catch((err) => {
    // Persistence failing is non-fatal for most flows; surface to console for debugging.
    console.warn('Failed to set Firebase persistence:', err);
  });
}

/**
 * After a redirect sign-in this returns the redirect result or null.
 * Kept for backward compatibility — new sign-ins use popup.
 */
export async function handleRedirectResult(): Promise<UserCredential | null> {
  if (!isFirebaseConfigReady() || !auth) return null;
  try {
    const result = await getRedirectResult(auth);
    return result;
  } catch (err) {
    const code = getAuthErrorCode(err);
    if (code === 'auth/redirect-cancelled-by-user' || code === 'auth/redirect-operation-pending') {
      // These are non-fatal — user wasn't mid-redirect or cancelled it
      return null;
    }
    console.warn('Firebase redirect result error', code, err);
    return null;
  }
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const githubProvider = new GithubAuthProvider();
githubProvider.addScope('user:email');

export function isGmailAddress(email: string) {
  return email.trim().toLowerCase().endsWith('@gmail.com');
}

export function observeAuthState(callback: (user: User | null) => void) {
  if (!isFirebaseConfigReady() || !auth) {
    // Return a no-op unsubscribe to keep calling code simple.
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function signInWithEmail(email: string, password: string) {
  if (!isFirebaseConfigReady()) {
    throw new Error(getFirebaseConfigErrorMessage());
  }

  if (!auth) throw new Error('Firebase auth is not initialized.');
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function createAccountWithEmail(name: string, email: string, password: string) {
  if (!isFirebaseConfigReady()) {
    throw new Error(getFirebaseConfigErrorMessage());
  }

  if (!auth) throw new Error('Firebase auth is not initialized.');
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (name.trim()) {
    await updateProfile(credential.user, { displayName: name.trim() });
  }
  return credential;
}

export async function signInWithGoogle() {
  if (!isFirebaseConfigReady()) {
    throw new Error(getFirebaseConfigErrorMessage());
  }

  if (!auth) throw new Error('Firebase auth is not initialized.');
  const result = await signInWithPopup(auth, googleProvider);
  return result;
}

export async function signInWithGithub() {
  if (!isFirebaseConfigReady()) {
    throw new Error(getFirebaseConfigErrorMessage());
  }

  if (!auth) throw new Error('Firebase auth is not initialized.');
  const result = await signInWithPopup(auth, githubProvider);
  return result;
}

export function signOutUser() {
  setAuthenticated(false);
  if (!isFirebaseConfigReady() || !auth) return Promise.resolve();
  return signOut(auth);
}
