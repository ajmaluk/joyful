'use client'

import { useEffect, useRef } from 'react'

/**
 * Monitors all projects that have active sandboxes by periodically checking
 * sandbox existence on the server. Updates the project's `buildStatus` in
 * localStorage and dispatches a `joyful_projects_changed` event so the hub
 * page re-renders with up-to-date status indicators.
 *
 * This is designed to run on the hub page (/builder) to show real-time
 * background processing status when the user navigates away from a workspace.
 */
export function useBackgroundSandboxMonitor(intervalMs = 10_000) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const checkActiveSandboxes = async () => {
      // Find all projects that have a sandbox stored in localStorage
      const sandboxKeys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('vibe-sandbox-')) {
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

          // Derive projectId from the key: "vibe-sandbox-{projectId}"
          const projectId = key.replace('vibe-sandbox-', '')
          if (!projectId) continue

          // Check if the sandbox exists on the server
          let sandboxAlive = false
          try {
            const res = await fetch(`/api/sandboxes/${sandboxId}/exists`)
            if (res.ok) {
              const data = await res.json()
              sandboxAlive = data.exists === true
            }
          } catch {
            // Network errors shouldn't cause cascading failures
          }

          // Read current project from localStorage
          const projectRaw = localStorage.getItem(`joyful_project_${projectId}`)
          if (!projectRaw) continue

          const project = JSON.parse(projectRaw)
          const currentStatus = project.buildStatus

          let newStatus: string | undefined

          if (!sandboxAlive) {
            // Sandbox was destroyed — if the status was 'building', mark as 'interrupted'
            if (currentStatus === 'building') {
              newStatus = 'interrupted'
            } else if (currentStatus === 'running') {
              newStatus = 'idle'
            }
          } else {
            // Sandbox is alive
            if (currentStatus === 'building') {
              // Still building — keep it
              newStatus = 'building'
            } else if (currentStatus === 'idle' || currentStatus === 'complete' || !currentStatus) {
              // Sandbox exists but no active build — there may be background processes
              // Mark as 'running' (new status we track) to indicate background activity
              newStatus = 'running'
            }
            // 'interrupted' and 'running' stay as-is
          }

          if (newStatus && newStatus !== currentStatus) {
            project.buildStatus = newStatus
            project.updatedAt = new Date().toISOString()
            localStorage.setItem(`joyful_project_${projectId}`, JSON.stringify(project))
            dispatchEvent(new CustomEvent('joyful_projects_changed'))
          }
        } catch {
          // Ignore per-project parse errors — continue checking others
        }
      }
    }

    // Run immediately on mount, then periodically
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
