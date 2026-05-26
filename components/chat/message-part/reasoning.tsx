import type { ReasoningUIPart } from 'ai'
import { MessageSpinner } from '../message-spinner'
import { useReasoningContext } from '../message'

function renderInline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code class="rounded bg-black/10 px-1 text-xs">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 underline hover:text-blue-300">$1</a>')
}

function renderMarkdown(text: string): string {
  const lines = text.split('\n')
  const result: string[] = []
  let inList = false

  for (const line of lines) {
    if (!line.trim()) {
      if (inList) { result.push('</ul>'); inList = false }
      result.push('<br/>')
      continue
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) { result.push('<ul class="list-disc pl-4 my-2">'); inList = true }
      result.push(`<li>${line.slice(2)}</li>`)
      continue
    }
    if (inList) { result.push('</ul>'); inList = false }
    result.push(`<div class="mb-2 last:mb-0">${renderInline(line)}</div>`)
  }
  if (inList) result.push('</ul>')
  return result.join('\n')
}

export function Reasoning({
  part,
  partIndex,
}: {
  part: ReasoningUIPart
  partIndex: number
}) {
  const context = useReasoningContext()
  const isExpanded = context?.expandedReasoningIndex === partIndex

  if (part.state === 'done' && !part.text) {
    return null
  }

  const text = part.text || '_Thinking_'
  const isStreaming = part.state === 'streaming'
  const firstLine = text.split('\n')[0].replace(/\*\*/g, '')
  const hasMoreContent = text.includes('\n') || text.length > 80

  const handleClick = () => {
    if (hasMoreContent && context) {
      const newIndex = isExpanded ? null : partIndex
      context.setExpandedReasoningIndex(newIndex)
    }
  }

  return (
    <div
      className="text-sm border border-border bg-background rounded-md cursor-pointer hover:bg-accent/30 transition-colors"
      onClick={handleClick}
    >
      <div className="px-3 py-2">
        <div className="text-secondary-foreground font-mono leading-normal">
          {isExpanded || !hasMoreContent ? (
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
          ) : (
            <div className="overflow-hidden">{firstLine}</div>
          )}
          {isStreaming && isExpanded && <MessageSpinner />}
        </div>
      </div>
    </div>
  )
}
