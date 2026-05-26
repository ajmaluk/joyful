'use client'

import { X } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

const CHAT_STORAGE_PREFIX = 'vibe-chat-'

export function WorkspaceHeader() {
  const params = useParams()
  const projectId = params?.projectId as string | undefined
  const [hasMessages, setHasMessages] = useState(false)

  useEffect(() => {
    if (!projectId) return
    try {
      const saved = localStorage.getItem(`${CHAT_STORAGE_PREFIX}${projectId}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        setHasMessages(Array.isArray(parsed) && parsed.length > 0)
      }
    } catch (e) {
      console.warn('Failed to load chat messages for workspace header', e)
    }
  }, [projectId])

  return (
    <div className="flex items-center justify-between px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-500 dark:text-[#aaa69d]">
          {hasMessages ? 'Workspace' : 'New Project'}
        </span>
      </div>
      <Link
        href="/builder"
        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label="Close workspace and return to builder"
        title="Close workspace"
      >
        <X className="h-4 w-4" />
      </Link>
    </div>
  )
}
