'use client'

import { useEffect, useRef } from 'react'
import { Sandbox } from '@/lib/sandbox'

export function useBackgroundSandboxMonitor(intervalMs = 10_000) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const checkActiveSandboxes = async () => {
      const sandboxKeys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('joyful-sandbox-')) {
          sandboxKeys.push(key)
        }
      }

      if (sandboxKeys.length === 0) return

      for (const key of sandboxKeys) {
        try {
          const raw = localStorage.getItem(key)
          if (!raw) continue

          const parsed = JSON.parse(raw)
          const sandboxId = parsed.sandboxId as string | undefined
          if (!sandboxId) continue

          const projectId = key.replace('joyful-sandbox-', '')
          if (!projectId) continue

          const sandboxAlive = Sandbox.exists(sandboxId)

          const projectRaw = localStorage.getItem(`joyful_project_${projectId}`)
          if (!projectRaw) continue

          const project = JSON.parse(projectRaw)
          const currentStatus = project.buildStatus

          let newStatus: string | undefined

          if (!sandboxAlive) {
            if (currentStatus === 'building') {
              newStatus = 'interrupted'
            } else if (currentStatus === 'running') {
              newStatus = 'idle'
            }
          } else {
            if (currentStatus === 'building') {
              newStatus = 'building'
            } else if (currentStatus === 'idle' || currentStatus === 'complete' || !currentStatus) {
              newStatus = 'running'
            }
          }

          if (newStatus && newStatus !== currentStatus) {
            project.buildStatus = newStatus
            project.updatedAt = new Date().toISOString()
            localStorage.setItem(`joyful_project_${projectId}`, JSON.stringify(project))
            dispatchEvent(new CustomEvent('joyful_projects_changed'))
          }
        } catch {
        }
      }
    }

    checkActiveSandboxes()
    intervalRef.current = setInterval(checkActiveSandboxes, intervalMs)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [intervalMs])
}
