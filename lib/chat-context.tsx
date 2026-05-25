'use client'

import { type ChatUIMessage } from '@/components/chat/types'
import { type ReactNode } from 'react'
import { Chat } from '@ai-sdk/react'
import { DataPart } from '@/ai/messages/data-parts'
import { DataUIPart } from 'ai'
import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useDataStateMapper, useProjectPersistence } from '@/app/state'
import { toast } from 'sonner'

interface ChatContextValue {
  chat: Chat<ChatUIMessage>
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined)

let initialMessagesCache = new Map<string, ChatUIMessage[]>()

function getInitialMessages(projectId: string): ChatUIMessage[] {
  if (initialMessagesCache.has(projectId)) {
    return initialMessagesCache.get(projectId)!
  }
  try {
    const saved = localStorage.getItem(`vibe-chat-${projectId}`)
    if (saved) {
      const parsed = JSON.parse(saved)
      initialMessagesCache.set(projectId, parsed)
      return parsed
    }
  } catch (e) {
    console.error('Failed to load chat messages', e)
  }
  return []
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const mapDataToState = useDataStateMapper()
  const mapDataToStateRef = useRef(mapDataToState)
  mapDataToStateRef.current = mapDataToState

  const params = useParams()
  const projectId = params?.projectId as string | undefined

  useProjectPersistence(projectId)

  const chat = useMemo(() => {
    const initialMessages = projectId ? getInitialMessages(projectId) : []
    return new Chat<ChatUIMessage>({
      id: projectId,
      messages: initialMessages,
      onData: (data: DataUIPart<DataPart>) => mapDataToStateRef.current(data),
      onError: (error) => {
        const message = (error && (error as any).message) || String(error)
        const statusCode = (error && (error as any).statusCode) as number | undefined

        if (statusCode === 429 || message?.includes?.('Too Many Requests') || message?.includes?.('Rate limit') || message?.includes?.('rate limit') || message?.includes?.('TPM')) {
          // Try to extract retry-after time from the error message
          const retryMatch = message.match(/(?:try again in|retry.?after[:\s]*)([\d.]+)\s*s/i)
          const waitTime = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 30
          toast.error(`Rate limit reached. Please wait ~${waitTime}s before trying again.`, {
            duration: Math.min(waitTime * 1000, 15000),
          })
          console.debug('AI rate limit error:', error)
        } else if (message?.includes?.('Failed after') && message?.includes?.('attempts')) {
          toast.error('AI is temporarily busy. Please wait a moment and try again.')
          console.warn('Retry exhaustion error:', error)
        } else if (message?.includes?.('401') || message?.includes?.('Unauthorized')) {
          toast.error('Authentication failed. Check your API key.')
          console.error('Auth error:', error)
        } else if (message?.includes?.('timeout') || message?.includes?.('timed out')) {
          toast.error('AI request timed out. Please try a shorter prompt.')
          console.error('Timeout error:', error)
        } else if (message?.includes?.('Tool result is missing')) {
          toast.error('The AI response was interrupted mid-stream. Please try again.')
          console.warn('Tool result missing - stream interrupted:', error)
        } else {
          toast.error(`Communication error: ${message}`)
          console.error('Error sending message:', error)
        }
      },
    })
  }, [projectId])

  useEffect(() => {
    if (!projectId) return

    const chatKey = `vibe-chat-${projectId}`

    const unsub = chat['~registerMessagesCallback'](() => {
      try {
        localStorage.setItem(chatKey, JSON.stringify(chat.messages))
      } catch (e) {
        console.warn('Failed to save chat messages', e)
      }
    }, 1000)

    return () => unsub()
  }, [projectId, chat])

  return (
    <ChatContext.Provider value={{ chat }}>{children}</ChatContext.Provider>
  )
}

export function useSharedChatContext() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useSharedChatContext must be used within a ChatProvider')
  }
  return context
}
