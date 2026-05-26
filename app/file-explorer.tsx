'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'
import { FileExplorer as FileExplorerComponent } from '@/components/file-explorer/file-explorer'
import { useSandboxStore } from './state'
import { useSandboxHealthCheck, runSandboxHealthCheck } from '@/hooks/use-sandbox-health-check'
import { getSettings } from '@/lib/services/storage'
import { toast } from 'sonner'

interface Props {
  className: string
}

export function FileExplorer({ className }: Props) {
  const { sandboxId, status, paths, projectId } = useSandboxStore()
  const [healthCheckRunning, setHealthCheckRunning] = useState(false)

  // Reactive read of health check interval from settings
  const healthCheckInterval = useSyncExternalStore(
    (callback) => {
      window.addEventListener('joyful_settings_changed', callback)
      return () => window.removeEventListener('joyful_settings_changed', callback)
    },
    () => getSettings().healthCheckInterval,
    () => getSettings().healthCheckInterval
  )

  // Periodic health check logs path mismatches and provides sync status indicator
  const { syncStatus } = useSandboxHealthCheck(healthCheckInterval)

  const handleHealthCheck = useCallback(async () => {
    if (!sandboxId || healthCheckRunning) return

    setHealthCheckRunning(true)
    try {
      const result = await runSandboxHealthCheck(sandboxId, projectId)

      if (result.healthy) {
        toast.success('Sandbox health check passed', {
          description: `${result.sandboxPaths} files in sandbox · ${result.storePaths} in store · ${result.localStoragePaths} in localStorage`,
          duration: 4000,
        })
      } else {
        const issues: string[] = []
        if (result.inSandboxNotInStore.length > 0) {
          issues.push(`${result.inSandboxNotInStore.length} files in sandbox missing from store`)
        }
        if (result.inStoreNotInSandbox.length > 0) {
          issues.push(`${result.inStoreNotInSandbox.length} files in store missing from sandbox`)
        }
        if (result.inLocalStorageNotInSandbox.length > 0) {
          issues.push(`${result.inLocalStorageNotInSandbox.length} files in localStorage missing from sandbox`)
        }

        toast.warning('Sandbox health check found issues', {
          description: issues.join(' · '),
          duration: 6000,
        })

        console.group('[SandboxHealthCheck] Manual check results')
        console.log('Result:', result)
        console.groupEnd()
      }
    } catch (err) {
      toast.error('Health check failed', {
        description: String(err),
        duration: 5000,
      })
    } finally {
      setHealthCheckRunning(false)
    }
  }, [sandboxId, projectId, healthCheckRunning])

  return (
    <FileExplorerComponent
      className={className}
      disabled={status === 'stopped'}
      sandboxId={sandboxId}
      paths={paths}
      onHealthCheck={handleHealthCheck}
      healthCheckRunning={healthCheckRunning}
      syncStatus={syncStatus}
    />
  )
}
