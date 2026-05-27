import type { ChatUIMessage } from './types'
import { MessagePart } from './message-part'
import { BotIcon, UserIcon } from 'lucide-react'
import { memo, createContext, useContext, useState, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  message: ChatUIMessage
}

interface ReasoningContextType {
  expandedReasoningIndex: number | null
  setExpandedReasoningIndex: (index: number | null) => void
}

const ReasoningContext = createContext<ReasoningContextType | null>(null)

export const useReasoningContext = () => {
  const context = useContext(ReasoningContext)
  return context
}

export const Message = memo(function Message({ message }: Props) {
  const [expandedReasoningIndex, setExpandedReasoningIndex] = useState<
    number | null
  >(null)

  const reasoningParts = useMemo(
    () =>
      message.parts
        .map((part, index) => ({ part, index }))
        .filter(({ part }) => part.type === 'reasoning'),
    [message.parts],
  )

  const latestReasoningIndex = reasoningParts.length > 0
    ? reasoningParts[reasoningParts.length - 1].index
    : null

  if (latestReasoningIndex !== null && latestReasoningIndex !== expandedReasoningIndex) {
    setExpandedReasoningIndex(latestReasoningIndex)
  }

  return (
    <ReasoningContext.Provider
      value={{ expandedReasoningIndex, setExpandedReasoningIndex }}
    >
      <div
        className={cn(
          'group',
          message.role === 'assistant' ? 'mr-16' : 'ml-16',
        )}
      >
        <div className="flex items-center gap-2 text-xs font-mono font-medium mb-2">
          {message.role === 'user' ? (
            <>
              <span className="ml-auto flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                <UserIcon className="w-3 h-3" />
                You
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                <BotIcon className="w-3 h-3" />
                {message.metadata?.model ?? 'Assistant'}
              </span>
            </>
          )}
        </div>

        <div className="space-y-1.5">
          {message.parts.map((part, index) => (
            <MessagePart key={index} part={part} partIndex={index} />
          ))}
        </div>
      </div>
    </ReasoningContext.Provider>
  )
})
