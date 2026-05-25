import { SyntaxHighlighter } from './syntax-highlighter'
import { PulseLoader } from 'react-spinners'
import { memo } from 'react'
import useSWR from 'swr'

interface Props {
  sandboxId: string
  path: string
}

export const FileContent = memo(function FileContent({
  sandboxId,
  path,
}: Props) {
  const searchParams = new URLSearchParams({ path })
  const { data, error, isLoading } = useSWR<string>(
    `/api/sandboxes/${sandboxId}/files?${searchParams.toString()}`,
    async (url: string) => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.status} ${response.statusText}`)
      }
      const text = await response.text()
      return text
    },
    { refreshInterval: 1000, revalidateOnFocus: false }
  )

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
    return (
      <div className="absolute w-full h-full flex items-center text-center">
        <div className="flex-1 text-sm text-muted-foreground font-mono">
          <p className="mb-1">Unable to load file</p>
          <p className="text-xs opacity-60">{error.message}</p>
        </div>
      </div>
    )
  }

  return <SyntaxHighlighter path={path} code={data || ''} />
})
