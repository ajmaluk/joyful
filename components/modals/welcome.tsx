'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { InfoIcon } from 'lucide-react'
import { create } from 'zustand'
import { useEffect } from 'react'

interface State {
  open: boolean | undefined
  setOpen: (open: boolean) => void
}

export const useWelcomeStore = create<State>((set) => ({
  open: undefined,
  setOpen: (open) => set({ open }),
}))

export function Welcome(props: {
  onDismissAction(): void
  defaultOpen: boolean
}) {
  const { open, setOpen } = useWelcomeStore()

  useEffect(() => {
    setOpen(props.defaultOpen)
  }, [setOpen, props.defaultOpen])

  if (!(typeof open === 'undefined' ? props.defaultOpen : open)) {
    return null
  }

  const handleDismiss = () => {
    props.onDismissAction()
    setOpen(false)
  }

  return (
    <div className="fixed w-screen h-screen z-10">
      <div className="absolute w-full h-full bg-secondary opacity-60" />
      <div
        className="relative w-full h-full flex items-center justify-center"
        onClick={handleDismiss}
      >
        <div
          className="bg-background max-w-xl mx-4 rounded-lg shadow overflow-hidden"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="p-6 space-y-4 ">
            <h1 className="text-2xl sans-serif font-semibold tracking-tight mb-7">
              Joyful Builder Workspace
            </h1>
            <p className="text-base text-primary">
              Build full websites by describing what you want, iterating with the AI assistant, and previewing changes in real time.
            </p>
            <p className="text-base text-secondary-foreground">
              This workspace uses{' '}
              <ExternalLink href="https://build.nvidia.com/">
                NVIDIA AI
              </ExternalLink>
              ,{' '}
              <ExternalLink href="https://console.groq.com/">
                Groq
              </ExternalLink>
              , and{' '}
              <ExternalLink href="https://freemodel.ai/">
                Freemodel
              </ExternalLink>{' '}
              for AI model inference, a fully local in-memory sandbox for code
              execution, and is built with{' '}
              <ExternalLink href="https://nextjs.org/">Next.js</ExternalLink>{' '}
              and the{' '}
              <ExternalLink href="https://ai-sdk.dev/docs/introduction">
                AI SDK
              </ExternalLink>
              .
            </p>
          </div>
          <footer className="bg-secondary flex justify-end p-4 border-t border-border">
            <Button className="cursor-pointer" onClick={handleDismiss}>
              Start building
            </Button>
          </footer>
        </div>
      </div>
    </div>
  )
}

export function ToggleWelcome() {
  const { open, setOpen } = useWelcomeStore()
  return (
    <Button
      className="cursor-pointer"
      onClick={() => setOpen(!open)}
      variant="outline"
      size="sm"
    >
      <InfoIcon /> <span className="hidden lg:inline">About workspace</span>
    </Button>
  )
}

function ExternalLink({
  children,
  href,
}: {
  children: ReactNode
  href: string
}) {
  return (
    <a
      className="underline underline-offset-3 text-primary"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  )
}
