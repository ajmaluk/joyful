'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export function useRedirectIfAuthed(targetPath?: string) {
  const router = useRouter()
  const { isAuthed, isAuthReady } = useAuth()

  useEffect(() => {
    if (!isAuthReady || !isAuthed || !targetPath) return
    router.replace(targetPath)
  }, [isAuthed, isAuthReady, router, targetPath])

  return {
    isRedirecting: isAuthReady && isAuthed && !!targetPath,
  }
}
