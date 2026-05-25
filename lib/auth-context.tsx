'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { firebaseApp, observeAuthState } from '@/lib/firebase'

export type AuthContextValue = {
  user: User | null
  isAuthed: boolean
  isAuthReady: boolean
  authError: string
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeLocalStorageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch (e) {
    console.warn('Failed to write localStorage', key, e)
  }
}

function safeLocalStorageRemove(key: string) {
  try {
    localStorage.removeItem(key)
  } catch (e) {
    console.warn('Failed to remove localStorage key', key, e)
  }
}

function isLocallyAuthenticated() {
  if (typeof window === 'undefined') return false
  return safeLocalStorageGet('joyful_auth_session') === 'true'
}

function setLocallyAuthenticated(value: boolean) {
  if (typeof window === 'undefined') return
  if (value) {
    safeLocalStorageSet('joyful_auth_session', 'true')
  } else {
    safeLocalStorageRemove('joyful_auth_session')
  }
  try {
    window.dispatchEvent(new CustomEvent('joyful_auth_changed', { detail: value }))
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [localDemoAuthed, setLocalDemoAuthed] = useState(() =>
    typeof window !== 'undefined' && process.env.NODE_ENV === 'development'
      ? isLocallyAuthenticated()
      : false
  )
  const [isAuthReady, setIsAuthReady] = useState(false)

  // Dev-mode local auth via URL param
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('devAuth') === '1') {
      setLocallyAuthenticated(true)
      setLocalDemoAuthed(true)
    }
  }, [])

  // Firebase auth observer
  useEffect(() => {
    return observeAuthState((nextUser) => {
      setUser(nextUser)
      setIsAuthReady(true)
    })
  }, [])

  // If firebase is not configured, mark auth as ready immediately
  useEffect(() => {
    if (!firebaseApp) {
      setIsAuthReady(true)
    }
  }, [])

  // Listen for local auth changes (dev mode)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    const handler = () => setLocalDemoAuthed(isLocallyAuthenticated())
    window.addEventListener('joyful_auth_changed', handler)
    return () => window.removeEventListener('joyful_auth_changed', handler)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthed: Boolean(user) || localDemoAuthed,
    isAuthReady,
    authError: '',
  }), [isAuthReady, localDemoAuthed, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
