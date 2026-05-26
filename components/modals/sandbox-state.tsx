'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSandboxStore } from '@/app/state'
import { Sandbox } from '@/lib/sandbox'
import { useEffect } from 'react'

export function SandboxState() {
  const { sandboxId, status, setStatus } = useSandboxStore()

  useEffect(() => {
    if (!sandboxId) return
    const interval = setInterval(() => {
      const alive = Sandbox.exists(sandboxId)
      if (!alive) setStatus('stopped')
    }, 1000)
    return () => clearInterval(interval)
  }, [sandboxId, setStatus])

  if (status === 'stopped') {
    return (
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sandbox max. duration reached</DialogTitle>
            <DialogDescription>
              Sandbox max. duration for this demo has been reached.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => window.location.reload()}>
            Start a new session
          </Button>
        </DialogContent>
      </Dialog>
    )
  }

  return null
}
