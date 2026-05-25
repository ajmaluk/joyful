'use client'

import { type ChatUIMessage } from '@/components/chat/types'
import { type Line } from './schemas'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  useTransition,
  type ReactNode,
} from 'react'
import { getSummary } from './get-summary'
import { useCommandErrorsLogs } from '@/app/state'
import { useMonitorState } from './state'
import { useSettings } from '@/components/settings/use-settings'
import { useSharedChatContext } from '@/lib/chat-context'

interface Props {
  children: ReactNode
  debounceTimeMs?: number
}

export function ErrorMonitor({ children, debounceTimeMs = 10000 }: Props) {
  const [pending, startTransition] = useTransition()
  const { cursor, scheduled, setCursor, setScheduled } = useMonitorState()
  const { errors } = useCommandErrorsLogs()
  const { fixErrors } = useSettings()
  const { chat } = useSharedChatContext()
  const lastMessagesRef = useRef<ChatUIMessage[]>([])
  const lastMessagesKeyRef = useRef<string | undefined>(undefined)
  const getMessagesSnapshot = useCallback(() => {
    const current = chat.messages
    const last = current[current.length - 1]
    const key = `${current.length}:${last ? (last.id ?? JSON.stringify(last)) : ''}`
    if (lastMessagesKeyRef.current === key && lastMessagesRef.current) {
      return lastMessagesRef.current
    }
    lastMessagesKeyRef.current = key
    lastMessagesRef.current = current
    return lastMessagesRef.current
  }, [chat])

  // getServerSnapshot must return a referentially stable value to avoid
  // the "getServerSnapshot should be cached" infinite-loop error.
  const getMessagesServerSnapshot = useCallback(
    () => lastMessagesRef.current,
    [],
  )

  const messages = useSyncExternalStore<ChatUIMessage[]>(
    (onChange: () => void) => chat['~registerMessagesCallback'](onChange),
    getMessagesSnapshot,
    getMessagesServerSnapshot,
  )

  type ChatStatusType = 'ready' | 'submitted' | 'streaming' | 'error'
  const lastStatusRef = useRef<ChatStatusType>('ready')
  const lastStatusKeyRef = useRef<string | undefined>(undefined)
  const getStatusSnapshot = useCallback((): ChatStatusType => {
    const current = chat.status
    const key = String(current)
    if (lastStatusKeyRef.current === key) {
      return lastStatusRef.current
    }
    lastStatusKeyRef.current = key
    lastStatusRef.current = current
    return lastStatusRef.current
  }, [chat])

  const getStatusServerSnapshot = useCallback(
    (): ChatStatusType => lastStatusRef.current,
    [],
  )

  const chatStatus = useSyncExternalStore<ChatStatusType>(
    (onChange: () => void) => chat['~registerStatusCallback'](onChange),
    getStatusSnapshot,
    getStatusServerSnapshot,
  )

  const submitTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inspectedErrors = useRef<number>(0)
  const lastReportedErrors = useRef<string[]>([])
  const errorReportCount = useRef<Map<string, number>>(new Map())
  const lastErrorReportTime = useRef<number>(0)
  const clearSubmitTimeout = useCallback(() => {
    if (submitTimeout.current) {
      setScheduled(false)
      clearTimeout(submitTimeout.current)
      submitTimeout.current = null
    }
  }, [setScheduled])

  const status =
    chatStatus !== 'ready' || fixErrors === false
      ? 'disabled'
      : pending || scheduled
      ? 'pending'
      : 'ready'

  const getErrorKey = useCallback((error: Line) => {
    return `${error.command}-${error.args.join(' ')}-${error.data.slice(0, 100)}`
  }, [])

  const handleErrors = useCallback(
    (errorsToHandle: Line[], prev: Line[]) => {
      const now = Date.now()
      const timeSinceLastReport = now - lastErrorReportTime.current

      if (timeSinceLastReport < 60000) {
        return
      }

      const errorKeys = errorsToHandle.map(getErrorKey)
      const uniqueErrorKeys = [...new Set(errorKeys)]

      const newErrors = uniqueErrorKeys.filter((key) => {
        const count = errorReportCount.current.get(key) || 0
        return count < 1
      })

      if (newErrors.length === 0) {
        return
      }

      startTransition(async () => {
        const summary = await getSummary(errorsToHandle, prev)
        if (summary.shouldBeFixed) {
          newErrors.forEach((key) => {
            errorReportCount.current.set(key, 1)
          })

          lastReportedErrors.current = newErrors
          lastErrorReportTime.current = Date.now()

          chat.sendMessage({
            role: 'user' as const,
            parts: [{ type: 'data-report-errors', data: summary }],
          })
        }
      })
    },
    [chat, getErrorKey, startTransition],
  )

  useEffect(() => {
    if (messages.length === 0) {
      errorReportCount.current.clear()
      lastReportedErrors.current = []
      lastErrorReportTime.current = 0
    }
  }, [messages.length])

  useEffect(() => {
    if (status === 'ready' && inspectedErrors.current < errors.length) {
      const prev = errors.slice(0, cursor)
      const pendingErrors = errors.slice(cursor)
      inspectedErrors.current = errors.length
      setScheduled(true)
      clearSubmitTimeout()
      submitTimeout.current = setTimeout(() => {
        setScheduled(false)
        setCursor(errors.length)
        handleErrors(pendingErrors, prev)
      }, debounceTimeMs)
    } else if (status === 'disabled') {
      clearSubmitTimeout()
    }
  }, [clearSubmitTimeout, cursor, debounceTimeMs, errors, handleErrors, setCursor, setScheduled, status])

  return <Context.Provider value={{ status }}>{children}</Context.Provider>
}

const Context = createContext<{
  status: 'ready' | 'pending' | 'disabled'
} | null>(null)

export function useErrorMonitor() {
  const context = useContext(Context)
  if (!context) {
    throw new Error('useErrorMonitor must be used within a ErrorMonitor')
  }
  return context
}
