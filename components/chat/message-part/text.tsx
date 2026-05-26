import type { TextUIPart } from 'ai'
import { escapeHtmlOutsideCodeBlocks } from '@/lib/utils'

function renderMarkdown(text: string): string {
  const escaped = escapeHtmlOutsideCodeBlocks(text)
  const lines = escaped.split('\n')
  const result: string[] = []
  let inList = false

  for (const line of lines) {
    if (!line.trim()) {
      if (inList) { result.push('</ul>'); inList = false }
      result.push('<br/>')
      continue
    }

    const codeMatch = line.match(/^```(\w*)$/)
    if (codeMatch) {
      result.push(`<pre class="rounded bg-black/10 p-2 my-2 overflow-x-auto text-xs">`)
      continue
    }
    if (line === '```') {
      result.push('</pre>')
      continue
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) { result.push('<ul class="list-disc pl-4 my-2">'); inList = true }
      result.push(`<li>${line.slice(2)}</li>`)
      continue
    }

    if (inList) { result.push('</ul>'); inList = false }

    let processed = line
      .replace(/`([^`]+)`/g, '<code class="rounded bg-black/10 px-1 text-xs">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 underline hover:text-blue-300">$1</a>')

    result.push(`<div class="mb-2 last:mb-0">${processed}</div>`)
  }
  if (inList) result.push('</ul>')

  return result.join('\n')
}

export function Text({ part }: { part: TextUIPart }) {
  let cleanedText = part.text
  try {
    cleanedText = cleanedText
      .replace(/(?:\*\*··|\|''|\|'|`{0,2}··|`{0,2}·{1,2})\s*(?:createSandbox|generateFiles|getSandboxURL|runCommand)[\s\S]*?(?:\n|$)/gi, '')
      .trim()
  } catch (e) {
    console.warn('Failed to clean chat text', e)
    cleanedText = cleanedText.trim()
  }

  if (!cleanedText) return null

  return (
    <div
      className="text-sm px-3.5 py-3 border bg-secondary/90 text-secondary-foreground border-gray-300 rounded-md"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(cleanedText) }}
    />
  )
}

