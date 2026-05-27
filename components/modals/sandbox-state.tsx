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

export function SandboxState() {
  const { sandboxId, status, setStatus } = useSandboxStore()

  if (status === 'stopped') {
    return (
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sandbox session expired</DialogTitle>
            <DialogDescription>
              The local sandbox session has ended. Create a new one to continue building.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => window.location.reload()}>
            Start a new session
          </Button>
          <Button variant="ghost" onClick={() => setStatus('running')}>
            Dismiss
          </Button>
        </DialogContent>
      </Dialog>
    )
  }

  return null
}
