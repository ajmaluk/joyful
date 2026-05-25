'use client'

import type { ChatUIMessage } from '@/components/chat/types'
import { TEST_PROMPTS } from '@/ai/constants'
import { MessageCircleIcon, SendIcon, Loader2, AlertCircle, PlayIcon, RefreshCw, Clock, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { Input } from '@/components/ui/input'
import { ThinkingBubble } from '@/components/chat/thinking-bubble'
import { Message } from '@/components/chat/message'
import { ModelSelector } from '@/components/settings/model-selector'
import { Panel, PanelHeader } from '@/components/panels/panels'
import { Settings } from '@/components/settings/settings'
import { useChat } from '@ai-sdk/react'
import { useLocalStorageValue } from '@/lib/use-local-storage-value'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSharedChatContext } from '@/lib/chat-context'
import { useSettings } from '@/components/settings/use-settings'
import { useSandboxStore } from './state'
import { useParams, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Props {
  className: string
}

const statusLabels: Record<string, string> = {
  ready: '',
  submitted: 'Sending...',
  streaming: 'AI is responding...',
  error: 'Connection error',
}

/** Minimum time (ms) between user message submissions to prevent rapid-fire duplicates */
const SUBMIT_COOLDOWN_MS = 2000

export function Chat({ className }: Props) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [input, setInput] = useLocalStorageValue('prompt-input')
  const { chat } = useSharedChatContext()
  const { modelId, reasoningEffort } = useSettings()
  const { messages, sendMessage, status, regenerate, error, resumeStream, stop, setMessages } = useChat<ChatUIMessage>({ chat })
  const { setChatStatus } = useSandboxStore()
  const searchParams = useSearchParams()
  const params = useParams()
  const projectId = params?.projectId as string | undefined
  const submittingRef = useRef(false)
  const initialSubmitRef = useRef(false)
  const lastSubmitTime = useRef(0)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)


  const statusText = statusLabels[status] || ''

  const statusSyncedRef = useRef(false)
  useEffect(() => {
    if (!statusSyncedRef.current) {
      statusSyncedRef.current = true
      return
    }
    setChatStatus(status)
  }, [status, setChatStatus])

  // Load messages from localStorage on client-side mount
  useEffect(() => {
    if (projectId) {
      try {
        const saved = localStorage.getItem(`vibe-chat-${projectId}`)
        if (saved) {
          const parsed = JSON.parse(saved)
          setMessages(parsed)
        } else {
          setMessages([])
        }
      } catch (e) {
        console.warn('Failed to load chat messages from localStorage', e)
      }
    } else {
      setMessages([])
    }
    setIsLoaded(true)
  }, [projectId, setMessages])

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (projectId && messages.length > 0) {
        try {
          localStorage.setItem(`vibe-chat-${projectId}`, JSON.stringify(messages))
        } catch (e) {
          console.warn('Failed to save chat messages on unload', e)
        }
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [projectId, messages])


  // Clean up cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current)
      }
    }
  }, [])

  const startCooldown = useCallback(() => {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current)
    }
    setCooldownRemaining(SUBMIT_COOLDOWN_MS)
    cooldownTimerRef.current = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 100) {
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current)
            cooldownTimerRef.current = null
          }
          return 0
        }
        return prev - 100
      })
    }, 100)
  }, [])

  const validateAndSubmitMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      // Prevent rapid-fire submissions
      if (submittingRef.current) return

      const now = Date.now()
      const elapsed = now - lastSubmitTime.current
      if (elapsed < SUBMIT_COOLDOWN_MS) {
        // Still in cooldown — don't submit
        return
      }

      submittingRef.current = true
      lastSubmitTime.current = now
      sendMessage({ text: trimmed }, { body: { modelId, reasoningEffort } })
      setInput('')
      startCooldown()
    },
    [sendMessage, modelId, setInput, reasoningEffort, startCooldown]
  )

  useEffect(() => {
    if (status === 'ready' || status === 'error') {
      submittingRef.current = false
    }
  }, [status])

  useEffect(() => {
    const initialPrompt = searchParams.get('prompt')?.trim()
    if (!initialPrompt || status !== 'ready' || messages.length > 0 || !projectId) {
      return
    }

    if (initialSubmitRef.current) return
    initialSubmitRef.current = true

    // Prevent duplicate submission across multiple mounted Chat components (mobile + desktop layout)
    const chatRaw = chat as any
    if (chatRaw.__initialPromptSubmitted) return
    chatRaw.__initialPromptSubmitted = true

    validateAndSubmitMessage(initialPrompt)


    const url = new URL(window.location.href)
    url.searchParams.delete('prompt')
    url.searchParams.delete('mode')
    const next = `${url.pathname}${url.search}${url.hash}`
    window.history.replaceState({}, '', next)
  }, [searchParams, status, messages.length, projectId, validateAndSubmitMessage])


  const isBusy = status === 'streaming' || status === 'submitted'
  const isOnCooldown = cooldownRemaining > 0

  // Detect rate-limit errors for a special UI treatment
  const isRateLimitError =
    error &&
    (String(error).includes('429') ||
      String(error).includes('Rate limit') ||
      String(error).includes('rate limit') ||
      String(error).includes('Too Many Requests') ||
      String(error).includes('TPM'))

  const lastMessage = messages[messages.length - 1]
  const showThinking = (isBusy || !!isRateLimitError) && messages.length > 0
  const thinkingMode = lastMessage?.role === 'user' ? 'thinking' : 'working'


  if (!isLoaded) {
    return (
      <Panel className={className}>
        <PanelHeader>
          <div className="flex items-center font-mono font-semibold uppercase">
            <MessageCircleIcon className="mr-2 w-4" />
            Chat
          </div>
        </PanelHeader>
        <div className="flex-1 min-h-0" />
      </Panel>
    )
  }

  return (

    <Panel className={className}>
      <PanelHeader>
        <div className="flex items-center font-mono font-semibold uppercase">
          <MessageCircleIcon className="mr-2 w-4" />
          Chat
        </div>
        <div className="ml-auto flex items-center gap-2">
          {statusText && (
            <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              {isBusy && <Loader2 className="h-3 w-3 animate-spin" />}
              {statusText}
            </span>
          )}
          <span className="font-mono text-xs opacity-50">[{status}]</span>
        </div>
      </PanelHeader>

      {/* Messages Area */}
      {messages.length === 0 ? (
        <div className="flex-1 min-h-0">
          <div className="flex flex-col justify-center items-center h-full font-mono text-sm text-muted-foreground">
            <p className="flex items-center font-semibold">
              Click and try one of these prompts:
            </p>
            <ul className="p-4 space-y-1 text-center">
              {TEST_PROMPTS.map((prompt, idx) => (
                <li
                  key={idx}
                  className={cn(
                    "px-4 py-2 rounded-sm border border-dashed shadow-sm shadow-black cursor-pointer border-border hover:bg-secondary/50 hover:text-primary transition-opacity",
                    (isBusy || isOnCooldown) && "opacity-50 pointer-events-none"
                  )}
                  onClick={() => validateAndSubmitMessage(prompt)}
                >
                  {prompt}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <Conversation className="relative w-full">
          <ConversationContent className="space-y-4">
            {messages
              .filter((msg, idx, self) => self.findIndex((m) => m.id === msg.id) === idx)
              .map((message) => (
                <Message key={message.id} message={message} />
              ))}
            {showThinking && <ThinkingBubble isRateLimited={!!isRateLimitError} mode={thinkingMode} />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}


      {/* Rate Limit Error — special treatment with countdown */}
      {isRateLimitError && (
        <div className="flex flex-col items-center justify-center p-3 mb-2 mx-3 rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-200 text-sm font-mono animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 animate-pulse" />
            <span>Rate limit reached. The AI will automatically retry — please wait a moment.</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => regenerate({ body: { modelId, reasoningEffort } })}>
              <RefreshCw className="w-3 h-3 mr-2" />
              Retry Now
            </Button>
          </div>
        </div>
      )}

      {/* Generic Error — non-rate-limit errors */}
      {error && !isRateLimitError && (
        <div className="flex flex-col items-center justify-center p-3 mb-2 mx-3 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive text-sm font-mono animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span>Connection lost or error occurred.</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => regenerate({ body: { modelId, reasoningEffort } })}>
              <RefreshCw className="w-3 h-3 mr-2" />
              Retry Last Message
            </Button>
            <Button size="sm" onClick={() => resumeStream({ body: { modelId, reasoningEffort } })}>
              <PlayIcon className="w-3 h-3 mr-2" />
              Continue
            </Button>
          </div>
        </div>
      )}

      <form
        className="flex items-center p-3 gap-2 border-t border-border/40 bg-background/50 backdrop-blur-md"
        onSubmit={async (event) => {
          event.preventDefault()
          validateAndSubmitMessage(input)
        }}
      >
        <Settings />
        <ModelSelector disabled={isBusy} />
        <Input
          className="w-full font-mono text-sm rounded-lg border border-border/50 bg-background shadow-inner focus-visible:ring-1 focus-visible:ring-primary/50"
          disabled={isBusy}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isBusy
              ? 'Waiting for AI response...'
              : isOnCooldown
                ? `Cooldown... ${Math.ceil(cooldownRemaining / 1000)}s`
                : 'Type your message...'
          }
          value={input}
        />
        {isBusy ? (
          <Button
            className="rounded-lg shadow-sm transition-all bg-destructive text-destructive-foreground hover:bg-destructive/90"
            type="button"
            onClick={() => {
              console.log('Stopping chat stream manually...')
              stop()
              if (projectId) {
                try {
                  localStorage.setItem(`vibe-chat-${projectId}`, JSON.stringify(messages))
                } catch (e) {
                  console.warn('Failed to save chat messages on stop', e)
                }
              }
            }}
            title="Stop generating"
          >
            <Square className="w-4 h-4 fill-current" />
          </Button>
        ) : (
          <Button
            className={cn(
              'rounded-lg shadow-sm transition-all',
              isOnCooldown && 'opacity-70 cursor-not-allowed'
            )}
            type="submit"
            disabled={status !== 'ready' || !input.trim() || isOnCooldown}
          >
            {isOnCooldown ? (
              <Clock className="w-4 h-4 animate-pulse" />
            ) : (
              <SendIcon className="w-4 h-4" />
            )}
          </Button>
        )}
      </form>
    </Panel>
  )
}
