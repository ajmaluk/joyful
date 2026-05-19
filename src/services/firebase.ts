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
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDHC_Z4kG3oikomcWvIP_OLDr-_2j9EKPU',
  authDomain: 'joyful-builder.firebaseapp.com',
  projectId: 'joyful-builder',
  storageBucket: 'joyful-builder.firebasestorage.app',
  messagingSenderId: '1030906503773',
  appId: '1:1030906503773:web:49a1bdccf1bd558d41e3b4',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

void setPersistence(auth, browserLocalPersistence);

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
  if (!isGmailAddress(email)) {
    throw new Error('Use a @gmail.com email address to continue.');
  }
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function createAccountWithEmail(name: string, email: string, password: string) {
  if (!isGmailAddress(email)) {
    throw new Error('Use a @gmail.com email address to continue.');
  }
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (name.trim()) {
    await updateProfile(credential.user, { displayName: name.trim() });
  }
  return credential;
}

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function signInWithGithub() {
  return signInWithPopup(auth, githubProvider);
}

export function signOutUser() {
  return signOut(auth);
}
