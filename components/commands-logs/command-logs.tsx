import type { Command, CommandLog } from './types'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import z from 'zod'

interface Props {
  command: Command
  onLog: (data: { sandboxId: string; cmdId: string; log: CommandLog }) => void
  onCompleted: (data: Command) => void
}

export function CommandLogs({ command, onLog, onCompleted }: Props) {
  const ref = useRef<Awaited<ReturnType<typeof getCommandLogs>>>(null)

  useEffect(() => {
    if (!ref.current) {
      const iterator = getCommandLogs(command.sandboxId, command.cmdId)
      ref.current = iterator
      ;(async () => {
        for await (const log of iterator) {
          onLog({
            sandboxId: command.sandboxId,
            cmdId: command.cmdId,
            log,
          })
        }

        const log = await getCommand(command.sandboxId, command.cmdId)
        if (log) {
          onCompleted({
            sandboxId: log.sandboxId,
            cmdId: log.cmdId,
            startedAt: log.startedAt,
            exitCode: log.exitCode ?? 0,
            command: command.command,
            args: command.args,
          })
        } else {
          onCompleted({
            sandboxId: command.sandboxId,
            cmdId: command.cmdId,
            startedAt: command.startedAt,
            exitCode: 0,
            command: command.command,
            args: command.args,
          })
        }
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <pre className={cn('whitespace-pre-wrap font-mono text-sm', {})}>
      {logContent(command)}
    </pre>
  )
}

function logContent(command: Command) {
  const date = new Date(command.startedAt).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const line = `${command.command} ${command.args.join(' ')}`
  const body = command.logs?.map((log) => log.data).join('') || ''
  return `[${date}] ${line}\n${body}`
}

const logSchema = z.object({
  data: z.string(),
  stream: z.enum(['stdout', 'stderr']),
  timestamp: z.number(),
})

async function* getCommandLogs(sandboxId: string, cmdId: string) {
  try {
    const response = await fetch(
      `/api/sandboxes/${sandboxId}/cmds/${cmdId}/logs`,
      { headers: { 'Content-Type': 'application/json' } }
    )

    if (!response.ok || !response.body) {
      console.warn('getCommandLogs failed', response.status)
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let line = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      line += decoder.decode(value, { stream: true })
      const lines = line.split('\n')
      for (let i = 0; i < lines.length - 1; i++) {
        if (lines[i]) {
          try {
            const logEntry = JSON.parse(lines[i])
            yield logSchema.parse(logEntry)
          } catch (parseErr) {
            console.warn('Failed to parse log entry line in command-logs', parseErr)
          }
        }
      }
      line = lines[lines.length - 1]
    }
  } catch (err) {
    console.error('getCommandLogs connection error', err)
  }
}

const cmdSchema = z.object({
  sandboxId: z.string(),
  cmdId: z.string(),
  startedAt: z.number(),
  exitCode: z.number().optional(),
})

async function getCommand(sandboxId: string, cmdId: string) {
  try {
    const response = await fetch(`/api/sandboxes/${sandboxId}/cmds/${cmdId}`)
    if (!response.ok) {
      console.warn('getCommand failed', response.status)
      return null
    }
    const text = await response.text()
    if (!text) return null
    return cmdSchema.parse(JSON.parse(text))
  } catch (err) {
    console.warn('getCommand failed for', cmdId, err)
    return null
  }
}
