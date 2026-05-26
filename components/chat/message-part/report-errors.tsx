import type { DataPart } from '@/ai/messages/data-parts'
import { BugIcon } from 'lucide-react'
import { ToolHeader } from '../tool-header'
import { ToolMessage } from '../tool-message'
import { Streamdown } from 'streamdown'
import { escapeHtmlOutsideCodeBlocks } from '@/lib/utils'

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
          {escapeHtmlOutsideCodeBlocks(message.summary)}
        </Streamdown>
      </div>
    </ToolMessage>
  )
}
