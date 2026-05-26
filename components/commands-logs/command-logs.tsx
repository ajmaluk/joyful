import type { Command, CommandLog } from './types'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Sandbox } from '@/lib/sandbox'

interface Props {
  command: Command
  onLog: (data: { sandboxId: string; cmdId: string; log: CommandLog }) => void
  onCompleted: (data: Command) => void
}

export function CommandLogs({ command, onLog, onCompleted }: Props) {
  const ref = useRef<boolean>(false)

  useEffect(() => {
    if (ref.current) return
    ref.current = true

    const run = async () => {
      const sandbox = await Sandbox.get({ sandboxId: command.sandboxId })
      const cmd = sandbox.getCommandSync(command.cmdId)
      if (!cmd) return

      for await (const log of cmd.logs()) {
        onLog({
          sandboxId: command.sandboxId,
          cmdId: command.cmdId,
          log,
        })
      }

      onCompleted({
        sandboxId: command.sandboxId,
        cmdId: command.cmdId,
        startedAt: cmd.startedAt,
        exitCode: cmd.exitCode ?? 0,
        command: command.command,
        args: command.args,
      })
    }

    run()
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
