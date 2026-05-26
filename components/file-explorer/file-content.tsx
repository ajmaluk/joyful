import { SyntaxHighlighter } from './syntax-highlighter'
import { PulseLoader } from 'react-spinners'
import { memo, useEffect, useMemo, useState, useRef } from 'react'
import { Sandbox } from '@/lib/sandbox'
import { useSandboxStore } from '@/app/state'

interface Props {
  sandboxId: string
  path: string
}

function getLocalStorageContent(path: string, projectId: string): string | null {
  try {
    const projectRaw = localStorage.getItem(`joyful_project_${projectId}`)
    if (!projectRaw) return null
    const project = JSON.parse(projectRaw)
    if (!project.files || !Array.isArray(project.files)) return null
    const searchPath = path.startsWith('/') ? path.substring(1) : path
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
  const projectId = useSandboxStore((state) => state.projectId)
  const [data, setData] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    let cancelled = false
    setIsLoading(true)
    setError(null)

    const load = async () => {
      try {
        const sandbox = await Sandbox.get({ sandboxId })
        if (cancelled) return
        const result = await sandbox.readFile({ path })
        if (cancelled) return
        if (!result) {
          if (mountedRef.current) setData('')
        } else {
          if (mountedRef.current) setData(result.toString('utf8'))
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()

    const interval = setInterval(load, 1000)

    return () => {
      cancelled = true
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [sandboxId, path])

  const localStorageContent = useMemo(
    () => !isLoading && !data && projectId ? getLocalStorageContent(path, projectId) : null,
    [isLoading, data, path, projectId]
  )

  useEffect(() => {
    if (data) console.debug(`[FileContent] Loaded ${path} (${data.length} chars)`)
  }, [data, path])

  if (isLoading) {
    return (
      <div className="absolute w-full h-full flex items-center text-center">
        <div className="flex-1">
          <PulseLoader className="opacity-60" size={8} />
        </div>
      </div>
    )
  }

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
        </div>
      </div>
    )
  }

  if (!data || data.trim().length === 0) {
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
        </div>
      </div>
    )
  }

  return <SyntaxHighlighter path={path} code={data} />
})
