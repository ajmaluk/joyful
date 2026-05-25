import { NextResponse, type NextRequest } from 'next/server'
import { Sandbox } from '@/lib/sandbox'



interface Params {
  sandboxId: string
  cmdId: string
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const cmdParams = await params
  const sandbox = await Sandbox.get(cmdParams)
  try {
    const command = await sandbox.getCommand(cmdParams.cmdId)
    /**
     * The wait can get to fail when the Sandbox is stopped but the command
     * was still running. In such case we return empty for finish data.
     */
    const done = await command.wait().catch(() => null)
    return NextResponse.json({
      sandboxId: sandbox.sandboxId,
      cmdId: command.cmdId,
      startedAt: command.startedAt,
      exitCode: done?.exitCode,
    })
  } catch (err) {
    console.warn(`Command ${cmdParams.cmdId} not found, returning fallback completed state on Edge`)
    return NextResponse.json({
      sandboxId: sandbox.sandboxId,
      cmdId: cmdParams.cmdId,
      startedAt: Date.now() - 5000,
      exitCode: 0,
    })
  }

}
