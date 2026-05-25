import type { DataPart } from '@/ai/messages/data-parts'
import { CheckIcon, SquareChevronRightIcon, XIcon, ChevronDown, ChevronRight } from 'lucide-react'
import { Spinner } from './spinner'
import { ToolHeader } from '../tool-header'
import { ToolMessage } from '../tool-message'
import { useState } from 'react'

export function RunCommand({ message }: { message: DataPart['run-command'] }) {
  const [expanded, setExpanded] = useState(false)
  const fullCommand = `${message.command} ${message.args.join(' ')}`.trim()
  const isMultiLine = fullCommand.includes('\n') || fullCommand.length > 50

  const summary = isMultiLine
    ? fullCommand.split('\n')[0].substring(0, 50) + '...'
    : fullCommand

  return (
    <ToolMessage>
      <div className="flex items-center justify-between">
        <ToolHeader>
          <SquareChevronRightIcon className="w-3.5 h-3.5" />
          {message.status === 'executing' && 'Executing'}
          {message.status === 'waiting' && 'Waiting'}
          {message.status === 'running' && 'Running in background'}
          {message.status === 'done' && message.exitCode !== 1 && 'Finished'}
          {message.status === 'done' && message.exitCode === 1 && 'Errored'}
          {message.status === 'error' && 'Errored'}
        </ToolHeader>
        {isMultiLine && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary font-mono transition-colors border border-border/40 rounded px-1.5 py-0.5 bg-secondary/30"
          >
            {expanded ? (
              <>
                <span>Hide details</span>
                <ChevronDown className="w-3 h-3" />
              </>
            ) : (
              <>
                <span>Show details</span>
                <ChevronRight className="w-3 h-3" />
              </>
            )}
          </button>
        )}
      </div>
      <div className="relative pl-6 mt-2">
        <Spinner
          className="absolute left-0 top-0.5"
          loading={['executing', 'waiting'].includes(message.status)}
        >
          {(typeof message.exitCode === 'number' && message.exitCode > 0) ||
          message.status === 'error' ? (
            <XIcon className="w-4 h-4 text-red-700" />
          ) : (
            <CheckIcon className="w-4 h-4" />
          )}
        </Spinner>
        <div className="font-mono text-xs">
          {expanded ? (
            <pre className="overflow-x-auto whitespace-pre-wrap bg-secondary/40 p-2.5 border border-border/50 rounded-md max-h-60 text-muted-foreground select-all">
              {fullCommand}
            </pre>
          ) : (
            <code className="px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground break-all">
              {summary}
            </code>
          )}
        </div>
      </div>
    </ToolMessage>
  )
}
