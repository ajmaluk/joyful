'use client'

import { useEffect, useRef, useState } from 'react'
import { useSandboxStore } from '@/app/state'

export interface HealthCheckResult {
  healthy: boolean
  sandboxPaths: number
  storePaths: number
  localStoragePaths: number
  generatedFiles: number
  inSandboxNotInStore: string[]
  inStoreNotInSandbox: string[]
  inLocalStorageNotInSandbox: string[]
}

/**
 * Run a one-shot sandbox health check and return structured results.
 * Compares files in the sandbox vs paths tracked in the zustand store
 * and localStorage project data.
 */
export async function runSandboxHealthCheck(
  sandboxId: string,
  projectId?: string
): Promise<HealthCheckResult> {
  const normalize = (p: string) => (p.startsWith('/') ? p : '/' + p)

  // Read live store state
  const { paths: storePaths, generatedFiles } = useSandboxStore.getState()

  // 1. Fetch file paths from the sandbox API
  const res = await fetch(`/api/sandboxes/${sandboxId}/files`)
  const data: { paths: string[] } = res.ok ? await res.json() : { paths: [] }
  const sandboxPaths = new Set(data.paths || [])

  // 2. Normalize store paths for comparison
  const storePathSet = new Set(storePaths.map(normalize))
  const generatedSet = new Set(Array.from(generatedFiles).map(normalize))

  // 3. Read localStorage project data for additional comparison
  let localStorageFiles: Array<{ path: string; content: string }> = []
  if (projectId) {
    try {
      const raw = localStorage.getItem(`joyful_project_${projectId}`)
      if (raw) {
        const parsed = JSON.parse(raw)
        localStorageFiles = parsed.files || []
      }
    } catch {
      // ignore localStorage parse errors
    }
  }
  const localStoragePaths = new Set(localStorageFiles.map((f) => normalize(f.path)))

  // 4. Compute diffs between the three sources
  const inSandboxNotInStore = new Set<string>()
  for (const p of sandboxPaths) {
    if (!storePathSet.has(p)) {
      inSandboxNotInStore.add(p)
    }
  }

  const inStoreNotInSandbox = new Set<string>()
  for (const p of storePathSet) {
    if (!sandboxPaths.has(p)) {
      inStoreNotInSandbox.add(p)
    }
  }

  const inLocalStorageNotInSandbox = new Set<string>()
  for (const p of localStoragePaths) {
    if (!sandboxPaths.has(p)) {
      inLocalStorageNotInSandbox.add(p)
    }
  }

  const healthy =
    inSandboxNotInStore.size === 0 &&
    inStoreNotInSandbox.size === 0 &&
    inLocalStorageNotInSandbox.size === 0

  return {
    healthy,
    sandboxPaths: sandboxPaths.size,
    storePaths: storePathSet.size,
    localStoragePaths: localStoragePaths.size,
    generatedFiles: generatedSet.size,
    inSandboxNotInStore: Array.from(inSandboxNotInStore).sort(),
    inStoreNotInSandbox: Array.from(inStoreNotInSandbox).sort(),
    inLocalStorageNotInSandbox: Array.from(inLocalStorageNotInSandbox).sort(),
  }
}

export type SyncStatus = 'unknown' | 'synced' | 'out-of-sync'

/**
 * Periodic health check that compares files in the sandbox vs paths tracked in the
 * zustand store and localStorage project data. Logs structured diagnostics to the
 * console to help debug path mismatches between these three sources of truth.
 *
 * Only active when a sandboxId is set.
 *
 * Returns the last health check result and a derived sync status for UI indicators.
 */
export function useSandboxHealthCheck(
  intervalMs = 15_000
): { lastResult: HealthCheckResult | null; syncStatus: SyncStatus } {
  const sandboxId = useSandboxStore((s) => s.sandboxId)
  const projectId = useSandboxStore((s) => s.projectId)

  const [lastResult, setLastResult] = useState<HealthCheckResult | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const syncStatus: SyncStatus =
    !sandboxId || lastResult === null
      ? 'unknown'
      : lastResult.healthy
        ? 'synced'
        : 'out-of-sync'

  useEffect(() => {
    if (!sandboxId) {
      setLastResult(null)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    const check = async () => {
      try {
        const result = await runSandboxHealthCheck(sandboxId, projectId)
        setLastResult(result)

        if (!result.healthy) {
          console.groupCollapsed(
            `[SandboxHealthCheck] Path mismatch detected (sandbox: ${result.sandboxPaths}, store: ${result.storePaths}, localStorage: ${result.localStoragePaths})`
          )
          if (result.inSandboxNotInStore.length > 0) {
            console.log('🟠 In sandbox but NOT in store:', result.inSandboxNotInStore)
          }
          if (result.inStoreNotInSandbox.length > 0) {
            console.log('🔵 In store but NOT in sandbox:', result.inStoreNotInSandbox)
          }
          if (result.inLocalStorageNotInSandbox.length > 0) {
            console.log('🟢 In localStorage but NOT in sandbox:', result.inLocalStorageNotInSandbox)
          }
          console.groupEnd()
        }
      } catch (err) {
        console.warn('[SandboxHealthCheck] Error during check:', err)
      }
    }

    // Run immediately on mount, then periodically
    check()
    intervalRef.current = setInterval(check, intervalMs)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [sandboxId, projectId, intervalMs])

  return { lastResult, syncStatus }
}
