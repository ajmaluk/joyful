import type { TextUIPart } from 'ai'
import { Streamdown } from 'streamdown'
import { escapeHtmlOutsideCodeBlocks } from '@/lib/utils'

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
    <div className="text-sm px-3.5 py-3 border bg-secondary/90 text-secondary-foreground border-gray-300 rounded-md font-mono">
      <Streamdown
        components={{
          p: ({ node, ...props }: any) => (
            <div {...props} className={props.className || 'mb-4 last:mb-0'} />
          ),
          a: ({ node, href, children, ...props }: any) => (
            <a
              {...props}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline hover:text-blue-300"
            >
              {children}
            </a>
          ),
        }}
      >
        {escapeHtmlOutsideCodeBlocks(cleanedText)}
      </Streamdown>
    </div>
  )
}

