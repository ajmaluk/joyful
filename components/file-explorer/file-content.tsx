import { SyntaxHighlighter } from './syntax-highlighter'
import { PulseLoader } from 'react-spinners'
import { memo, useEffect, useMemo } from 'react'
import useSWR from 'swr'
import { useSandboxStore } from '@/app/state'

interface Props {
  sandboxId: string
  path: string
}

/**
 * Try to find cached file content from the project store in localStorage.
 * This is used as a fallback when the sandbox API is unavailable.
 */
function getLocalStorageContent(path: string, projectId: string): string | null {
  try {
    // Read the project from localStorage
    const projectRaw = localStorage.getItem(`joyful_project_${projectId}`)
    if (!projectRaw) return null

    const project = JSON.parse(projectRaw)
    if (!project.files || !Array.isArray(project.files)) return null

    // Normalize the search path — localStorage paths come from the AI (no leading `/`)
    const searchPath = path.startsWith('/') ? path.substring(1) : path

    // Try exact match first, then with leading slash
    const file = project.files.find(
      (f: any) => f.path === searchPath || f.path === '/' + searchPath
    )

    return file?.content || null
  } catch {
    return null
  }
}

export const FileContent = memo(function FileContent({
  sandboxId,
  path,
}: Props) {
  const searchParams = new URLSearchParams({ path })
  const { data, error, isLoading, isValidating } = useSWR<string>(
    `/api/sandboxes/${sandboxId}/files?${searchParams.toString()}`,
    async (url: string) => {
      const response = await fetch(url)
      if (!response.ok) {
        if (response.status === 404) {
          // File might still be uploading — returning empty signals revalidation to try again
          return ''
        }
        throw new Error(`Failed to load file: ${response.status} ${response.statusText}`)
      }
      const text = await response.text()
      return text
    },
    { refreshInterval: 1000, revalidateOnFocus: false, revalidateIfStale: true }
  )

  const projectId = useSandboxStore((state) => state.projectId)

  // Memoized localStorage fallback: only recomputes when path, projectId, or SWR state changes.
  // We keep this available even during revalidation to avoid flickering between
  // cached content and empty/error states.
  const localStorageContent = useMemo(
    () =>
      !isLoading && !data && projectId
        ? getLocalStorageContent(path, projectId)
        : null,
    [isLoading, data, path, projectId]
  )

  useEffect(() => {
    if (data) {
      console.debug(`[FileContent] Loaded ${path} (${data.length} chars)`)
    }
  }, [data, path])

  // Loading state (initial fetch)
  if (isLoading) {
    return (
      <div className="absolute w-full h-full flex items-center text-center">
        <div className="flex-1">
          <PulseLoader className="opacity-60" size={8} />
        </div>
      </div>
    )
  }

  // Error state — try localStorage fallback first
  if (error) {
    if (localStorageContent) {
      return (
        <div className="relative w-full h-full">
          <div className="absolute top-0 left-0 right-0 z-10 bg-amber-50 border-b border-amber-200 px-3 py-1 text-xs text-amber-700 font-mono">
            Showing cached content (sandbox unavailable)
          </div>
          <div className="pt-7 h-full">
            <SyntaxHighlighter path={path} code={localStorageContent} />
          </div>
        </div>
      )
    }

    return (
      <div className="absolute w-full h-full flex items-center text-center">
        <div className="flex-1 text-sm text-muted-foreground font-mono">
          <p className="mb-1 underline decoration-wavy decoration-yellow-500/60 underline-offset-2">Unable to load file</p>
          <p className="text-xs opacity-70">{error.message}</p>
          {isValidating && (
            <div className="mt-3">
              <PulseLoader className="opacity-40" size={6} />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Empty content state (file exists but is empty — e.g., still being written)
  if (!data || data.trim().length === 0) {
    // Try localStorage fallback for empty content too
    if (localStorageContent) {
      return (
        <div className="relative w-full h-full">
          <div className="absolute top-0 left-0 right-0 z-10 bg-amber-50 border-b border-amber-200 px-3 py-1 text-xs text-amber-700 font-mono">
            Showing cached content (sandbox unavailable)
          </div>
          <div className="pt-7 h-full">
            <SyntaxHighlighter path={path} code={localStorageContent} />
          </div>
        </div>
      )
    }

    return (
      <div className="absolute w-full h-full flex items-center text-center">
        <div className="flex-1 text-sm text-muted-foreground font-mono">
          <p className="mb-1 opacity-70">Empty file</p>
          {isValidating ? (
            <PulseLoader className="opacity-40" size={6} />
          ) : (
            <p className="text-xs opacity-40">This file contains no content yet</p>
          )}
        </div>
      </div>
    )
  }

  return <SyntaxHighlighter path={path} code={data} />
})
