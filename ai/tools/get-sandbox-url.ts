import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { Sandbox } from '@/lib/sandbox'
import { tool } from 'ai'
import z from 'zod'

const description = `Get the URL to preview the application running in the sandbox. Retrieves a preview URL for the sandbox that allows users to see generated HTML/JS apps. The URL provides a live preview of the built application.`

interface Params {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  isGroq?: boolean
}

export const getSandboxURL = ({ writer, isGroq }: Params) =>
  tool({
    description: isGroq ? 'Get the URL to preview the application running in the sandbox.' : description,
    inputSchema: z.object({
      sandboxId: z
        .string()
        .describe(
          "The unique identifier of the Vercel Sandbox (e.g., 'sbx_abc123xyz'). This ID is returned when creating a Vercel Sandbox and is used to reference the specific sandbox instance."
        ),
      port: z
        .number()
        .describe(
          'The port number where a service is running inside the Vercel Sandbox (e.g., 3000 for Next.js dev server, 8000 for Python apps, 5000 for Flask). The port must have been exposed when the sandbox was created or when running commands.'
        ),
    }),
    execute: async ({ sandboxId, port }, { toolCallId }) => {
      writer.write({
        id: toolCallId,
        type: 'data-get-sandbox-url',
        data: { status: 'loading' },
      })

      const sandbox = await Sandbox.get({ sandboxId })
      const url = await sandbox.getURL(port)

      writer.write({
        id: toolCallId,
        type: 'data-get-sandbox-url',
        data: { url, status: 'done' },
      })

      return { url }
    },
  })
