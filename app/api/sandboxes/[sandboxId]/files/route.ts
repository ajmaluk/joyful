import { NextResponse, type NextRequest } from 'next/server'
import { Sandbox } from '@/lib/sandbox'
import z from 'zod'

export const runtime = 'edge'


const FileParamsSchema = z.object({
  sandboxId: z.string(),
  path: z.string(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sandboxId: string }> }
) {
  const { sandboxId } = await params
  const path = request.nextUrl.searchParams.get('path')

  const sandbox = await Sandbox.get({ sandboxId })

  if (!path) {
    const filePaths = Array.from(sandbox.files.keys())
    return NextResponse.json({ paths: filePaths })
  }

  const fileParams = FileParamsSchema.safeParse({
    path,
    sandboxId,
  })

  if (fileParams.success === false) {
    return NextResponse.json(
      { error: 'Invalid parameters. You must pass a `path` as query' },
      { status: 400 }
    )
  }

  const fileBuffer = await sandbox.readFile(fileParams.data)
  if (!fileBuffer) {
    return NextResponse.json(
      { error: 'File not found in the Sandbox' },
      { status: 404 }
    )
  }

  return new NextResponse(fileBuffer)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sandboxId: string }> }
) {
  const { sandboxId } = await params
  try {
    const body = await request.json()
    const { files } = body

    if (!Array.isArray(files)) {
      return NextResponse.json({ error: 'files must be an array' }, { status: 400 })
    }

    const sandbox = await Sandbox.get({ sandboxId })
    await sandbox.writeFiles(
      files.map((file: any) => ({
        path: file.path,
        content: Buffer.from(file.content || '', 'utf8'),
      }))
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to write files to sandbox:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
