import { NextResponse } from 'next/server'

export { POST } from '@/app/api/chat/route'

export async function GET() {
  // Standard Vercel AI SDK response when there is no active stream to resume
  return new Response(null, { status: 204 })
}
