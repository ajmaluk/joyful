'use client'

import { initializeApp, type FirebaseApp } from 'firebase/app'
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
  getAuth,
  type Auth,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const firebaseConfigRequirements = [
  ['apiKey', firebaseConfig.apiKey],
  ['authDomain', firebaseConfig.authDomain],
  ['projectId', firebaseConfig.projectId],
  ['storageBucket', firebaseConfig.storageBucket],
  ['messagingSenderId', firebaseConfig.messagingSenderId],
  ['appId', firebaseConfig.appId],
] as const

function isFirebaseConfigReady() {
  return firebaseConfigRequirements.every(([, value]) => Boolean(value))
}

function getFirebaseConfigErrorMessage() {
  const missingFields = firebaseConfigRequirements
    .filter(([, value]) => !value)
    .map(([field]) => field)

  if (!missingFields.length) return ''
  return `Firebase config is incomplete. Missing: ${missingFields.join(', ')}.`
}

function getAuthErrorCode(error: unknown) {
  if (typeof error !== 'object' || error === null) return ''
  if (!('code' in error)) return ''
  return String((error as { code?: unknown }).code || '')
}

export function getFriendlyFirebaseAuthError(error: unknown) {
  const configError = getFirebaseConfigErrorMessage()
  if (configError) return configError

  const code = getAuthErrorCode(error)
  switch (code) {
    case 'auth/unauthorized-domain':
      return 'Firebase blocked sign-in from this domain. Add localhost and your app domain to Authorized domains in Firebase Auth.'
    case 'auth/operation-not-allowed':
      return 'This sign-in method is disabled in Firebase. Enable Google, GitHub, or email/password in the Firebase console.'
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Try using the provider redirect or enable popups for this site.'
    case 'auth/popup-closed-by-user':
      return 'The sign-in popup was closed before authentication completed. Please try again.'
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with a different sign-in method. Sign in with your existing provider first, then link accounts in settings.'
    case 'auth/cancelled-popup-request':
      return 'A sign-in request is already in progress. Close any other popup tabs and try again.'
    case 'auth/internal-error':
      return 'Firebase could not complete sign-in. Check that Auth is enabled and the authentication provider is configured.'
    default:
      return error instanceof Error && error.message
        ? error.message
        : 'Could not log in. Please try again.'
  }
}

let firebaseApp: FirebaseApp | undefined
let auth: Auth | undefined

if (typeof window !== 'undefined' && isFirebaseConfigReady()) {
  firebaseApp = initializeApp(firebaseConfig)
  auth = getAuth(firebaseApp)
  void setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Failed to set Firebase persistence:', err)
  })
}

export { firebaseApp, auth }
export type { User }

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

const githubProvider = new GithubAuthProvider()
githubProvider.addScope('user:email')

export function observeAuthState(callback: (user: User | null) => void) {
  if (!isFirebaseConfigReady() || !auth) return () => {}
  return onAuthStateChanged(auth, callback)
}

export async function signInWithEmail(email: string, password: string) {
  if (!isFirebaseConfigReady()) throw new Error(getFirebaseConfigErrorMessage())
  if (!auth) throw new Error('Firebase auth is not initialized.')
  return signInWithEmailAndPassword(auth, email.trim(), password)
}

export async function createAccountWithEmail(name: string, email: string, password: string) {
  if (!isFirebaseConfigReady()) throw new Error(getFirebaseConfigErrorMessage())
  if (!auth) throw new Error('Firebase auth is not initialized.')
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)
  if (name.trim()) {
    await updateProfile(credential.user, { displayName: name.trim() })
  }
  return credential
}

export async function signInWithGoogle() {
  if (!isFirebaseConfigReady()) throw new Error(getFirebaseConfigErrorMessage())
  if (!auth) throw new Error('Firebase auth is not initialized.')
  return signInWithPopup(auth, googleProvider)
}

export async function signInWithGithub() {
  if (!isFirebaseConfigReady()) throw new Error(getFirebaseConfigErrorMessage())
  if (!auth) throw new Error('Firebase auth is not initialized.')
  return signInWithPopup(auth, githubProvider)
}

export function signOutUser() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('joyful_auth_session')
    window.dispatchEvent(new CustomEvent('joyful_auth_changed', { detail: false }))
  }
  if (!isFirebaseConfigReady() || !auth) return Promise.resolve()
  return signOut(auth)
}
