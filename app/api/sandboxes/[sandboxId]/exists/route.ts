import { NextRequest, NextResponse } from 'next/server'
import { Sandbox } from '@/lib/sandbox'

/**
 * Check if a sandbox exists without auto-creating one.
 * Returns { exists: true } if the sandbox is alive, { exists: false } if not.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sandboxId: string }> }
) {
  const { sandboxId } = await params
  const exists = Sandbox.exists(sandboxId)
  return NextResponse.json({ exists })
}
