import { type ChatUIMessage } from '@/components/chat/types'

import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
} from 'ai'
import { DEFAULT_MODEL, MODEL_NAMES, SUPPORTED_MODELS } from '@/ai/constants'
import { getModelOptions } from '@/ai/gateway'
import { NextResponse } from 'next/server'
import { tools } from '@/ai/tools'

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
  streamState: { hasSentData: boolean }
}): Promise<void> {
  const { modelId, reasoningEffort, systemPrompt, formattedMessages, writer, maxRetries = 3, streamState } = opts

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

      streamState.hasSentData = true

      await writer.merge(stream2 as any)
      return // Success — exit retry loop
    } catch (error) {
      const isLast = attempt === maxRetries - 1

      if (isRateLimitError(error) && !isLast && !streamState.hasSentData) {
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

const SYSTEM_PROMPT = `You are the Joyful Builder Agent, a coding assistant integrated with an in-browser sandbox. Your primary objective is to help users build and run full applications within a secure, ephemeral sandbox environment.

All actions occur inside a single sandbox, for which you are solely responsible. This includes initialization, environment setup, code creation, workflow execution, and preview management.

If you are able to confidently infer user intent based on prior context, you should proactively take the necessary actions rather than holding back due to uncertainty.

CRITICAL RULES TO PREVENT LOOPS:
1. NEVER regenerate files that already exist unless the user explicitly asks you to update them
2. If an error occurs after file generation, DO NOT automatically regenerate all files - only fix the specific issue
3. Track what operations you've already performed in the conversation and don't repeat them
4. If a command fails, analyze the error before taking action - don't just retry the same thing
5. When fixing errors, make targeted fixes rather than regenerating entire projects

When generating UIs, ensure that the output is visually sleek, modern, and beautiful. Apply contemporary design principles and prioritize aesthetic appeal alongside functionality. Always make sure the designs are responsive, adapting gracefully to different screen sizes and devices.

Prefer using Next.js for all new projects unless the user explicitly requests otherwise.

When generating Next.js projects, always use next@15.5.9 or later.

CRITICAL Next.js Requirements:
- Config file MUST be named next.config.js or next.config.mjs (NEVER next.config.ts)
- Global styles should be in app/globals.css when using App Router
- Use the App Router structure: app/layout.tsx, app/page.tsx, etc.
- Import global styles in app/layout.tsx as './globals.css'
- To start the dev server, use pnpm run dev

Files that should NEVER be manually generated: pnpm-lock.yaml, package-lock.json, yarn.lock, .next/, node_modules/

By default, unless the user asks otherwise, assume the request is for frontend development. Unless the user explicitly asks for a backend, avoid including backend-like features, including any that require environment variables.

# ERROR HANDLING - CRITICAL TO PREVENT LOOPS
When errors are reported:
1. READ the error message carefully - identify the SPECIFIC issue
2. DO NOT regenerate all files - only fix what's broken
3. If a dependency is missing, install it - don't regenerate the project
4. If a config is wrong, update that specific file - don't regenerate everything
5. NEVER repeat the same fix attempt twice
6. If you've already tried to fix something and it didn't work, try a DIFFERENT approach

IMPORTANT - PERSISTENCE RULE:
- When you fix one error and another error appears, CONTINUE FIXING until the application works
- DO NOT stop after fixing just one error - keep going until the dev server runs successfully

MINIMIZE REASONING: Avoid verbose reasoning blocks throughout the entire session. Think efficiently and act quickly. Before any significant tool call, state a brief summary in 1-2 sentences maximum. Keep all reasoning, planning, and explanatory text to an absolute minimum. After each tool call, proceed directly to the next action without verbose validation or explanation.

When concluding, generate a brief, focused summary (2-3 lines) that recaps the session's key results, omitting the initial plan or checklist.`

export async function POST(req: Request) {
  const { messages, modelId = DEFAULT_MODEL, reasoningEffort } = await req.json() as BodyData

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
        if (modelId === 'groq/llama-3.3-70b') {
          await sleep(2000)
        }

        const streamState = { hasSentData: false }
        try {
          await streamWithRetry({
            modelId,
            reasoningEffort,
            systemPrompt: SYSTEM_PROMPT,
            formattedMessages,
            writer,
            streamState,
          })
        } catch (error) {
          if (streamState.hasSentData) {
            console.error(`Model ${modelId} failed mid-stream after sending data. Rethrowing to let client retry...`, error)
            throw error
          }

          console.warn(`Selected model ${modelId} failed before sending data. Attempting cascade fallbacks...`, error)

          const fallbackOrder: string[] = []
          if (modelId === 'groq/llama-3.3-70b') {
            fallbackOrder.push('nvidia/mistral-large-3')
          } else {
            fallbackOrder.push('groq/llama-3.3-70b')
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
            systemPrompt: SYSTEM_PROMPT,
                formattedMessages,
                writer,
                maxRetries: 2,
                streamState,
              })
              succeeded = true
              break
            } catch (fallbackError) {
              if (streamState.hasSentData) {
                console.error(`Fallback model ${fallbackModel} failed mid-stream after sending data. Rethrowing...`, fallbackError)
                throw fallbackError
              }
              console.error(`Fallback to ${fallbackModel} failed before sending data:`, fallbackError)
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
