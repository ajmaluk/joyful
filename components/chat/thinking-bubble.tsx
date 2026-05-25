'use client'

import { BotIcon, AlertTriangleIcon, ActivityIcon } from 'lucide-react'
import { MODEL_NAMES } from '@/ai/constants'
import { useSettings } from '../settings/use-settings'
import { cn } from '@/lib/utils'

interface ThinkingBubbleProps {
  isRateLimited?: boolean
  mode?: 'thinking' | 'working'
}

export function ThinkingBubble({ isRateLimited = false, mode = 'thinking' }: ThinkingBubbleProps) {
  const { modelId } = useSettings()
  const modelName = MODEL_NAMES[modelId] ?? modelId

  return (
    <div className="mr-20 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Message Header */}
      <div className="flex items-center gap-2 text-sm font-medium font-mono mb-1.5 transition-colors duration-300">
        {isRateLimited ? (
          <>
            <AlertTriangleIcon className="w-4 h-4 text-amber-500 animate-pulse" />
            <span className="text-amber-500 font-semibold">High traffic on {modelName}... holding</span>
          </>
        ) : mode === 'working' ? (
          <>
            <ActivityIcon className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span className="text-emerald-500 opacity-90">Assistant is building & executing ({modelName})...</span>
          </>
        ) : (
          <>
            <BotIcon className="w-4 h-4 text-primary animate-bounce" />
            <span className="text-primary opacity-80">Assistant is thinking ({modelName})...</span>
          </>
        )}
      </div>

      {/* Message Content - Wave Animation */}
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl border backdrop-blur-sm shadow-inner min-h-[44px] transition-all duration-300',
          isRateLimited
            ? 'bg-amber-500/10 border-amber-500/30 shadow-amber-500/5 animate-pulse'
            : mode === 'working'
            ? 'bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5'
            : 'bg-secondary/30 border-border/40'
        )}
      >
        <span
          className="thinking-wave-dot"
          style={isRateLimited ? { animationName: 'wave-bounce', backgroundColor: 'var(--ring)' } : mode === 'working' ? { animationName: 'wave-bounce', backgroundColor: 'var(--chart-1)' } : undefined}
        ></span>
        <span
          className="thinking-wave-dot"
          style={isRateLimited ? { animationName: 'wave-bounce', backgroundColor: 'var(--ring)' } : mode === 'working' ? { animationName: 'wave-bounce', backgroundColor: 'var(--chart-1)' } : undefined}
        ></span>
        <span
          className="thinking-wave-dot"
          style={isRateLimited ? { animationName: 'wave-bounce', backgroundColor: 'var(--ring)' } : mode === 'working' ? { animationName: 'wave-bounce', backgroundColor: 'var(--chart-1)' } : undefined}
        ></span>
      </div>
    </div>
  )
}


