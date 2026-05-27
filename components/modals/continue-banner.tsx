'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Loader2, PlayIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSharedChatContext } from '@/lib/chat-context'
import { useChat } from '@ai-sdk/react'
import { useSettings } from '@/components/settings/use-settings'

const CHAT_STORAGE_PREFIX = 'joyful-chat-'

export function ContinueBanner() {
  const params = useParams()
  const router = useRouter()
  const projectId = params?.projectId as string | undefined
  const [show, setShow] = useState(false)

  const { chat } = useSharedChatContext()
  const { resumeStream, regenerate, status } = useChat({ chat })
  const { modelId, reasoningEffort } = useSettings()

  useEffect(() => {
    if (!projectId) return
    try {
      // Check if project is already complete
      const projectSaved = localStorage.getItem(`joyful_project_${projectId}`)
      if (projectSaved) {
        const project = JSON.parse(projectSaved)
        if (project.buildStatus === 'complete') {
          setShow(false)
          return
        }
      }

      const saved = localStorage.getItem(`${CHAT_STORAGE_PREFIX}${projectId}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setShow(true)
        }
      }
    } catch {
    }
  }, [projectId])

  const isBusy = status === 'streaming' || status === 'submitted'

  if (!show || isBusy) return null

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
        <Loader2 className="h-4 w-4" />
        <span className="font-medium">Existing session found</span>
        <span className="text-amber-600/70 dark:text-amber-400/70">
          — you can continue where you left off
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
        onClick={async () => {
          setShow(false)
          if (typeof resumeStream === 'function') {
            try {
              await resumeStream({ body: { modelId, reasoningEffort } })
            } catch (e) {
              console.warn('Failed to resume stream, falling back to regenerate:', e)
              if (typeof regenerate === 'function') {
                try {
                  await regenerate({ body: { modelId, reasoningEffort } })
                } catch (re) {
                  console.error('Failed to regenerate:', re)
                }
              }
            }
          } else if (typeof regenerate === 'function') {
            try {
              await regenerate({ body: { modelId, reasoningEffort } })
            } catch (re) {
              console.error('Failed to regenerate:', re)
            }
          }
        }}
      >
        <PlayIcon className="mr-1.5 h-3.5 w-3.5" />
        Continue
      </Button>
    </div>
  )
}
