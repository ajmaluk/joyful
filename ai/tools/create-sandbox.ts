import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { Sandbox } from '@/lib/sandbox'
import { getRichError } from './get-rich-error'
import { tool } from 'ai'
import z from 'zod'

const description = `Create a new local mock sandbox development environment — an ephemeral, in-memory workspace for file generation and command execution. Use this tool once per session when starting a new project. After creation, you can upload files, run commands, and access generated previews.`

interface Params {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  isGroq?: boolean
}

export const createSandbox = ({ writer, isGroq }: Params) =>
  tool({
    description: isGroq ? 'Create a new local mock sandbox development environment.' : description,
    inputSchema: z.object({
      timeout: z
        .number()
        .min(600000)
        .max(2700000)
        .optional()
        .describe(
          'Maximum time in milliseconds the sandbox will remain active before automatically shutting down. Minimum 600000ms (10 minutes), maximum 2700000ms (45 minutes). Defaults to 600000ms (10 minutes).'
        ),
      ports: z
        .array(z.number())
        .max(2)
        .optional()
        .describe(
          'Array of network ports to expose and make accessible from outside the sandbox. Common ports include 3000 (Next.js), 8000 (Python servers), 5000 (Flask), etc.'
        ),
    }),
    execute: async ({ timeout, ports }, { toolCallId }) => {
      writer.write({
        id: toolCallId,
        type: 'data-create-sandbox',
        data: { status: 'loading' },
      })

      try {
        const sandbox = await Sandbox.create({
          timeout: timeout ?? 600000,
          ports,
        })

        writer.write({
          id: toolCallId,
          type: 'data-create-sandbox',
          data: { sandboxId: sandbox.sandboxId, status: 'done' },
        })

        return (
          `Sandbox created with ID: ${sandbox.sandboxId}.` +
          `\nYou can now upload files, run commands, and access services on the exposed ports.`
        )
      } catch (error) {
        const richError = getRichError({
          action: 'Creating Sandbox',
          error,
        })

        writer.write({
          id: toolCallId,
          type: 'data-create-sandbox',
          data: {
            error: { message: richError.error.message },
            status: 'error',
          },
        })

        console.log('Error creating Sandbox:', richError.error)
        return richError.message
      }
    },
  })
