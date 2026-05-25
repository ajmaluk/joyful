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

        // Add small delay when using Groq to prevent rate-limit issues with fast responses
        if (modelId === Models.GroqLlama) {
          await new Promise((r) => setTimeout(r, 500))
        }

        try {
          // Attempt selected model (NVIDIA or selected fallback)
          const result = streamText({
            ...getModelOptions(modelId, { reasoningEffort }),
            system: prompt,
            messages: formattedMessages,
            stopWhen: stepCountIs(10),
            tools: tools({ modelId, writer }),
            onError: (error) => {
              console.error('Primary model API call failed, will trigger catch block:', error)
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
        } catch (error) {
          console.warn('Selected model failed or rate-limited. Falling back to Groq Llama 3.3...', error)
          
          try {
            const fallbackModel = Models.GroqLlama
            const fallbackResult = streamText({
              ...getModelOptions(fallbackModel, { reasoningEffort }),
              system: prompt,
              messages: formattedMessages,
              stopWhen: stepCountIs(10),
              tools: tools({ modelId: fallbackModel, writer }),
              onError: (err) => {
                console.error('Fallback model failed too:', err)
              },
            })

            const fallbackUiStream = fallbackResult.toUIMessageStream({
              sendReasoning: true,
              sendStart: false,
              messageMetadata: () => ({
                model: MODEL_NAMES[fallbackModel] ?? fallbackModel,
              }),
            })
            
            const [fallbackStream1, fallbackStream2] = fallbackUiStream.tee()
            const fallbackReader = fallbackStream1.getReader()
            await fallbackReader.read()
            fallbackReader.releaseLock()

            await writer.merge(fallbackStream2 as any)
          } catch (fallbackError) {
            console.error('All models failed:', fallbackError)
            writer.write({
              id: 'error-' + Date.now(),
              type: 'data-report-errors',
              data: {
                summary: 'All API routes (NVIDIA and Groq) failed to respond. Please check your credentials and rate limits.',
              },
            })
          }
        }
      },
    }),
  })
}
