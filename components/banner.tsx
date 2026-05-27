'use client'

import { XIcon } from 'lucide-react'
import { useState } from 'react'

interface Props {
  defaultOpen: boolean
  onDismiss: () => void
}

export function Banner({ defaultOpen, onDismiss }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  if (!open) {
    return null
  }

  return (
    <div className="relative w-full text-xs border border-dashed border-amber-500/50 bg-amber-500/10 py-2 pl-2 pr-8 backdrop-blur-sm">
      <strong className="text-amber-700 dark:text-amber-400">Joyful Builder</strong>{' '}
      <span className="text-amber-600/80 dark:text-amber-300/60">
        Build anything with AI — describe, iterate, preview. All AI runs through
        NVIDIA, Groq, and Freemodel providers with a fully local sandbox.
      </span>
      <button
        aria-label="Close Banner"
        className="absolute top-2 right-2 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 transition-colors cursor-pointer"
        onClick={() => {
          onDismiss()
          setOpen(false)
        }}
      >
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
