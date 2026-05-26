'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  projectId: string
}

/**
 * Detects when the current project has been deleted (from another tab or the hub page)
 * and redirects to /builder to prevent the user from seeing a broken workspace.
 */
export function ProjectDeletionGuard({ projectId }: Props) {
  const router = useRouter()

  useEffect(() => {
    if (!projectId) return

    function checkProjectExists() {
      try {
        const projectData = localStorage.getItem(`joyful_project_${projectId}`)
        if (!projectData) {
          // Project was deleted — redirect to hub
          router.push('/builder')
        }
      } catch {
        // localStorage unavailable, silently skip
      }
    }

    // Check immediately
    checkProjectExists()

    // Listen for cross-tab storage changes (fired when another tab deletes the project)
    function handleStorageChange(event: StorageEvent) {
      if (
        event.key === `joyful_project_${projectId}` ||
        event.key === 'joyful_projects'
      ) {
        checkProjectExists()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [projectId, router])

  // This component doesn't render anything
  return null
}
