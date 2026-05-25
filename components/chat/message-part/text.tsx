import type { TextUIPart } from 'ai'
import { Streamdown } from 'streamdown'
import { escapeHtmlOutsideCodeBlocks } from '@/lib/utils'

export function Text({ part }: { part: TextUIPart }) {
  let cleanedText = part.text
  try {
    cleanedText = cleanedText
      .replace(/(?:\*\*··|\|''|\|'|`{0,2}··|`{0,2}·{1,2})\s*(?:createSandbox|generateFiles|getSandboxURL|runCommand)[\s\S]*?(?:\n|$)/gi, '')
      .trim()
  } catch {
    cleanedText = cleanedText.trim()
  }

  if (!cleanedText) return null

  return (
    <div className="text-sm px-3.5 py-3 border bg-secondary/90 text-secondary-foreground border-gray-300 rounded-md font-mono">
      <Streamdown>{escapeHtmlOutsideCodeBlocks(cleanedText)}</Streamdown>
    </div>
  )
}

