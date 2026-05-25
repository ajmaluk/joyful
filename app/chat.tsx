'use client'

import type { ChatUIMessage } from '@/components/chat/types'
import { TEST_PROMPTS } from '@/ai/constants'
import { MessageCircleIcon, SendIcon, Loader2, AlertCircle, PlayIcon, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { Input } from '@/components/ui/input'
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

export function Chat({ className }: Props) {
  const [input, setInput] = useLocalStorageValue('prompt-input')
  const { chat } = useSharedChatContext()
  const { modelId, reasoningEffort } = useSettings()
  const { messages, sendMessage, status, regenerate, error, resumeStream } = useChat<ChatUIMessage>({ chat })
  const { setChatStatus } = useSandboxStore()
  const searchParams = useSearchParams()
  const params = useParams()
  const projectId = params?.projectId as string | undefined
  const [hydrated, setHydrated] = useState(false)
  const submittingRef = useRef(false)

  const statusText = statusLabels[status] || ''

  const statusSyncedRef = useRef(false)
  useEffect(() => {
    if (!statusSyncedRef.current) {
      statusSyncedRef.current = true
      return
    }
    setChatStatus(status)
  }, [status, setChatStatus])

  useEffect(() => {
    if (projectId && messages.length > 0) {
      setHydrated(true)
    }
  }, [projectId, messages.length])

  useEffect(() => {
    if (hydrated) return
    const initialPrompt = searchParams.get('prompt')?.trim()
    if (initialPrompt && status === 'ready' && messages.length === 0 && projectId) {
      setHydrated(true)
    }
  }, [hydrated, searchParams, status, messages.length, projectId])

  const validateAndSubmitMessage = useCallback(
    (text: string) => {
      if (!text.trim() || submittingRef.current) return
      submittingRef.current = true
      sendMessage({ text }, { body: { modelId, reasoningEffort } })
      setInput('')
    },
    [sendMessage, modelId, setInput, reasoningEffort]
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

    validateAndSubmitMessage(initialPrompt)

    const url = new URL(window.location.href)
    url.searchParams.delete('prompt')
    url.searchParams.delete('mode')
    const next = `${url.pathname}${url.search}${url.hash}`
    window.history.replaceState({}, '', next)
  }, [searchParams, status, messages.length, projectId, validateAndSubmitMessage])

  const isBusy = status === 'streaming' || status === 'submitted'

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
            {!hydrated ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <>
                <p className="flex items-center font-semibold">
                  Click and try one of these prompts:
                </p>
                <ul className="p-4 space-y-1 text-center">
                  {TEST_PROMPTS.map((prompt, idx) => (
                    <li
                      key={idx}
                      className="px-4 py-2 rounded-sm border border-dashed shadow-sm cursor-pointer border-border hover:bg-secondary/50 hover:text-primary"
                      onClick={() => validateAndSubmitMessage(prompt)}
                    >
                      {prompt}
                    </li>
                  ))}
                </ul>
              </>
            )}
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
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center p-3 mb-2 mx-3 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive text-sm font-mono">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span>Connection lost or error occurred.</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => regenerate()}>
              <RefreshCw className="w-3 h-3 mr-2" />
              Retry Last Message
            </Button>
            <Button size="sm" onClick={() => resumeStream()}>
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
        <ModelSelector />
        <Input
          className="w-full font-mono text-sm rounded-lg border border-border/50 bg-background shadow-inner focus-visible:ring-1 focus-visible:ring-primary/50"
          disabled={isBusy}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isBusy ? 'Waiting for AI response...' : 'Type your message...'}
          value={input}
        />
        <Button
          className={cn(
            'rounded-lg shadow-sm transition-all',
            isBusy && 'opacity-70 cursor-not-allowed'
          )}
          type="submit"
          disabled={status !== 'ready' || !input.trim()}
        >
          {isBusy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <SendIcon className="w-4 h-4" />
          )}
        </Button>
      </form>
    </Panel>
  )
}
