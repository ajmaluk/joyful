'use client'

import { useEffect, useRef } from 'react'
import { useSandboxStore, syncProjectFiles } from '@/app/state'
import stripAnsi from 'strip-ansi'
import z from 'zod'

type StreamingCommandLogs = Record<
  string,
  Awaited<ReturnType<typeof getCommandLogs>>
>

export function CommandLogsStream() {
  const { sandboxId, commands, addLog, upsertCommand, addPaths } = useSandboxStore()
  const ref = useRef<StreamingCommandLogs>({})

  useEffect(() => {
    if (sandboxId) {
      for (const command of commands.filter(
        (command) => typeof command.exitCode === 'undefined'
      )) {
        if (!ref.current[command.cmdId]) {
          const iterator = getCommandLogs(sandboxId, command.cmdId)
          ref.current[command.cmdId] = iterator
          ;(async () => {
            for await (const log of iterator) {
              addLog({
                sandboxId: sandboxId,
                cmdId: command.cmdId,
                log: log,
              })
            }

            const log = await getCommand(sandboxId, command.cmdId)
            if (log) {
              upsertCommand({
                sandboxId: log.sandboxId,
                cmdId: log.cmdId,
                exitCode: log.exitCode ?? 0,
                command: command.command,
                args: command.args,
              })

              try {
                const res = await fetch(`/api/sandboxes/${sandboxId}/files`)
                if (res.ok) {
                  const data = await res.json()
                  if (data.paths) {
                    addPaths(data.paths)
                    const pid = useSandboxStore.getState().projectId
                    if (pid) {
                      syncProjectFiles(pid, sandboxId, data.paths)
                    }
                  }
                }
              } catch (e) {
                console.warn('Failed to sync files after command:', e)
              }
            }
          })()
        }
      }
    }
  }, [sandboxId, commands, addLog, upsertCommand, addPaths])

  return null
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
            const parsed = logSchema.parse(logEntry)
            yield {
              data: stripAnsi(parsed.data),
              stream: parsed.stream,
              timestamp: parsed.timestamp,
            }
          } catch (parseErr) {
            console.warn('Failed to parse log entry line', parseErr)
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
  const response = await fetch(`/api/sandboxes/${sandboxId}/cmds/${cmdId}`)
  if (!response.ok) {
    console.warn('getCommand failed', response.status, response.statusText)
    return null
  }
  const text = await response.text()
  if (!text) return null
  try {
    return cmdSchema.parse(JSON.parse(text))
  } catch {
    console.warn('getCommand parse error for', cmdId)
    return null
  }
}
