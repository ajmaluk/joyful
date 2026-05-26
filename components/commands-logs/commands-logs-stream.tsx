'use client'

import { useEffect, useRef } from 'react'
import { Sandbox } from '@/lib/sandbox'
import { useSandboxStore, syncProjectFiles } from '@/app/state'

export function CommandLogsStream() {
  const { sandboxId, commands, addLog, upsertCommand, addPaths } = useSandboxStore()
  const processedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!sandboxId) return

    const run = async () => {
      const sandbox = await Sandbox.get({ sandboxId })

      for (const command of commands.filter(
        (cmd) => typeof cmd.exitCode === 'undefined'
      )) {
        if (processedRef.current.has(command.cmdId)) continue
        processedRef.current.add(command.cmdId)

        const cmd = sandbox.getCommandSync(command.cmdId)
        if (!cmd) {
          upsertCommand({
            sandboxId,
            cmdId: command.cmdId,
            exitCode: 0,
            command: command.command,
            args: command.args,
          })
          continue
        }

        ;(async () => {
          for await (const log of cmd.logs()) {
            addLog({ sandboxId, cmdId: command.cmdId, log })
          }

          upsertCommand({
            sandboxId,
            cmdId: command.cmdId,
            exitCode: cmd.exitCode ?? 0,
            command: command.command,
            args: command.args,
          })

          const filePaths = Array.from(sandbox.files.keys())
          if (filePaths.length > 0) {
            addPaths(filePaths)
            const pid = useSandboxStore.getState().projectId
            if (pid) {
              syncProjectFiles(pid, sandboxId, filePaths)
            }
          }
        })()
      }
    }

    run()
  }, [sandboxId, commands, addLog, upsertCommand, addPaths])

  return null
}
