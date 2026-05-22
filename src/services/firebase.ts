import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  GithubAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { getAuth } from 'firebase/auth';

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
      return 'The sign-in popup was closed before authentication completed. Try the provider redirect if this keeps happening.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with a different sign-in method. Use the matching provider or email sign-in.';
    case 'auth/internal-error':
      return 'Firebase could not complete sign-in. Check that Auth is enabled, the provider is configured, and the redirect domains are authorized.';
    default:
      return error instanceof Error && error.message
        ? error.message
        : 'Could not log in. Please try again.';
  }
}

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

// Ensure we attempt to persist auth in the browser, but don't fail the app if it errors.
void setPersistence(auth, browserLocalPersistence).catch((err) => {
  // Persistence failing is non-fatal for most flows; surface to console for debugging.
  console.warn('Failed to set Firebase persistence:', err);
});

/**
 * After a redirect sign-in (signInWithRedirect) this returns the redirect result
 * or null when there was no redirect to process. Call this once on app startup
 * (for example from `AuthProvider`) to surface redirect errors if needed.
 */
export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    return result || null;
  } catch (err) {
    // Re-throw with a friendly message where possible
    const code = getAuthErrorCode(err);
    const friendly = getFriendlyFirebaseAuthError(err);
    console.warn('Firebase redirect result error', code, err);
    throw new Error(friendly || String(err));
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
  return onAuthStateChanged(auth, callback);
}

export async function signInWithEmail(email: string, password: string) {
  if (!isFirebaseConfigReady()) {
    throw new Error(getFirebaseConfigErrorMessage());
  }

  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function createAccountWithEmail(name: string, email: string, password: string) {
  if (!isFirebaseConfigReady()) {
    throw new Error(getFirebaseConfigErrorMessage());
  }

  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (name.trim()) {
    await updateProfile(credential.user, { displayName: name.trim() });
  }
  return credential;
}

export function signInWithGoogle() {
  if (!isFirebaseConfigReady()) {
    throw new Error(getFirebaseConfigErrorMessage());
  }

  return signInWithRedirect(auth, googleProvider);
}

export function signInWithGithub() {
  if (!isFirebaseConfigReady()) {
    throw new Error(getFirebaseConfigErrorMessage());
  }

  return signInWithRedirect(auth, githubProvider);
}

export function signOutUser() {
  return signOut(auth);
}
