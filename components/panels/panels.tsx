import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
  children: ReactNode
}

export function Panel({ className, children }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col relative border border-border/40 bg-background/80 backdrop-blur-xl w-full h-full shadow-xl shadow-black/5 rounded-2xl overflow-hidden',
        className
      )}
    >
      {children}
    </div>
  )
}

export function PanelHeader({ className, children }: Props) {
  return (
    <div
      className={cn(
        'text-xs font-bold uppercase tracking-wider flex items-center border-b border-border/40 px-4 py-2.5 text-muted-foreground bg-accent/40',
        className
      )}
    >
      {children}
    </div>
  )
}
