import type { DataPart } from '@/ai/messages/data-parts'
import { BugIcon } from 'lucide-react'
import { ToolHeader } from '../tool-header'
import { ToolMessage } from '../tool-message'

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

export function ReportErrors({
  message,
}: {
  message: DataPart['report-errors']
}) {
  return (
    <ToolMessage>
      <ToolHeader>
        <BugIcon className="w-3.5 h-3.5" />
        <span>Auto-detected errors</span>
      </ToolHeader>
      <div className="relative min-h-5">
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(message.summary) }} />
      </div>
    </ToolMessage>
  )
}
