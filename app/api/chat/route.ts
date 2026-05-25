import { type ChatUIMessage } from '@/components/chat/types'

import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
} from 'ai'
import { DEFAULT_MODEL, MODEL_NAMES, SUPPORTED_MODELS, Models } from '@/ai/constants'
import { NextResponse } from 'next/server'
import { getModelOptions } from '@/ai/gateway'
import { checkBotId } from 'botid/server'
import { tools } from '@/ai/tools'
import prompt from './prompt.md'

interface BodyData {
  messages: ChatUIMessage[]
  modelId?: string
  reasoningEffort?: 'low' | 'medium'
}

/** Parse a "retry after X seconds" hint from an error message/object. */
function getRetryAfterMs(error: unknown): number {
  const msg = error instanceof Error ? error.message : String(error)
  // Match patterns like "Please try again in 18.705s" or "retry-after: 20"
  const match = msg.match(/(?:try again in|retry.?after[:\s]*)([\d.]+)\s*s/i)
  if (match) {
    return Math.ceil(parseFloat(match[1]) * 1000)
  }
  return 0
}

/** Check if an error is a rate-limit (429) error */
function isRateLimitError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return (
    msg.includes('429') ||
    msg.includes('Too Many Requests') ||
    msg.includes('Rate limit') ||
    msg.includes('rate limit') ||
    msg.includes('TPM') ||
    msg.includes('tokens per minute')
  )
}

/** Sleep for a given number of milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Attempt to stream a model response with automatic retry on rate-limit errors.
 * Uses exponential backoff: 3s → 8s → 20s (with jitter).
 */
async function streamWithRetry(opts: {
  modelId: string
  reasoningEffort?: 'low' | 'medium'
  systemPrompt: string
  formattedMessages: Awaited<ReturnType<typeof convertToModelMessages>>
  writer: Parameters<Parameters<typeof createUIMessageStream>[0]['execute']>[0]['writer']
  maxRetries?: number
}): Promise<void> {
  const { modelId, reasoningEffort, systemPrompt, formattedMessages, writer, maxRetries = 3 } = opts

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = streamText({
        ...getModelOptions(modelId, { reasoningEffort }),
        system: systemPrompt,
        messages: formattedMessages,
        stopWhen: stepCountIs(10),
        tools: tools({ modelId, writer }),
        onError: (error) => {
          console.error(`Model ${modelId} attempt ${attempt + 1} error:`, error)
        },
      })

      const uiStream = result.toUIMessageStream({
        sendReasoning: true,
        sendStart: false,
        messageMetadata: () => ({
          model: MODEL_NAMES[modelId] ?? modelId,
        }),
      })

      const [stream1, stream2] = uiStream.tee()
      const reader = stream1.getReader()
      await reader.read()
      reader.releaseLock()

      await writer.merge(stream2 as any)
      return // Success — exit retry loop
    } catch (error) {
      const isLast = attempt === maxRetries - 1

      if (isRateLimitError(error) && !isLast) {
        // Calculate backoff: use server-suggested retry-after, or exponential backoff
        const retryAfter = getRetryAfterMs(error)
        const exponentialBackoff = Math.min(3000 * Math.pow(2.5, attempt), 30000)
        const jitter = Math.random() * 1000
        const waitMs = Math.max(retryAfter, exponentialBackoff) + jitter

        console.warn(
          `Rate limit hit for ${modelId} (attempt ${attempt + 1}/${maxRetries}). ` +
          `Waiting ${Math.round(waitMs)}ms before retry...`
        )
        await sleep(waitMs)
        continue
      }

      // Non-rate-limit error or last attempt — rethrow
      throw error
    }
  }
}

export async function POST(req: Request) {
  const { messages, modelId = DEFAULT_MODEL, reasoningEffort } = await req.json() as BodyData

  if (process.env.NODE_ENV !== 'development') {
    const checkResult = await checkBotId()
    if (checkResult.isBot) {
      return NextResponse.json({ error: `Bot detected` }, { status: 403 })
    }
  }

  if (!SUPPORTED_MODELS.includes(modelId)) {
    return NextResponse.json(
      { error: `Model ${modelId} not found.` },
      { status: 400 }
    )
  }

  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      originalMessages: messages,
      execute: async ({ writer }) => {
        // Pre-process messages to format report-errors correctly
        const formattedMessages = await convertToModelMessages(
          messages.map((message) => {
            const clonedMessage = { ...message }
            const msgContent = (message as any).content
            if (!clonedMessage.parts) {
              if (msgContent) {
                clonedMessage.parts = [
                  { type: 'text', text: msgContent }
                ]
              } else {
                clonedMessage.parts = []
              }
            } else {
              clonedMessage.parts = clonedMessage.parts.map((part) => {
                if (part.type === 'data-report-errors') {
                  return {
                    type: 'text',
                    text:
                      `There are errors in the generated code. This is the summary of the errors we have:\n` +
                      `\`\`\`${part.data.summary}\`\`\`\n` +
                      (part.data.paths?.length
                        ? `The following files may contain errors:\n` +
                          `\`\`\`${part.data.paths?.join('\n')}\`\`\`\n`
                        : '') +
                      `Fix the errors reported.`,
                  }
                }
                return part
              })
            }
            return clonedMessage
          })
        )

        // Add delay when using Groq to respect TPM limits on free tier (12K TPM).
        // Groq is extremely fast, so without throttling it burns through the token
        // budget in seconds and triggers 429s on follow-up tool calls.
        if (modelId === Models.GroqLlama) {
          await sleep(2000)
        }

        try {
          await streamWithRetry({
            modelId,
            reasoningEffort,
            systemPrompt: prompt,
            formattedMessages,
            writer,
          })
        } catch (error) {
          console.warn(`Selected model ${modelId} failed. Attempting cascade fallbacks...`, error)

          // Determine the order of fallbacks
          const fallbackOrder: string[] = []
          if (modelId === Models.FreeModelGPT) {
            fallbackOrder.push(Models.NvidiaMistral, Models.GroqLlama)
          } else if (modelId === Models.GroqLlama) {
            fallbackOrder.push(Models.FreeModelGPT, Models.NvidiaMistral)
          } else {
            // Selected was Nvidia Mistral or Qwen
            fallbackOrder.push(Models.FreeModelGPT, Models.GroqLlama)
          }

          let succeeded = false
          for (const fallbackModel of fallbackOrder) {
            try {
              console.info(`Attempting fallback to ${fallbackModel}...`)
              // Add a short delay before trying the fallback to let rate limits settle
              await sleep(1500)

              await streamWithRetry({
                modelId: fallbackModel,
                reasoningEffort,
                systemPrompt: prompt,
                formattedMessages,
                writer,
                maxRetries: 2,
              })
              succeeded = true
              break
            } catch (fallbackError) {
              console.error(`Fallback to ${fallbackModel} failed:`, fallbackError)
            }
          }

          if (!succeeded) {
            console.error('All fallback models failed.')
            writer.write({
              id: 'error-' + Date.now(),
              type: 'data-report-errors',
              data: {
                summary:
                  'All AI models are currently rate-limited or unavailable. Please wait 30-60 seconds and try again, or switch to a different model.',
              },
            })
          }
        }
      },
    }),
  })
}
