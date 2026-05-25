import { streamText, tool } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import z from 'zod'
import fs from 'fs'

// Simple env parser
const envContent = fs.readFileSync('.env', 'utf-8')
const env: Record<string, string> = {}
envContent.split('\n').forEach(line => {
  const parts = line.split('=')
  if (parts.length >= 2) {
    const key = parts[0].trim()
    const value = parts.slice(1).join('=').trim()
    env[key] = value
  }
})

const nvidia = createOpenAI({
  apiKey: env.NV_API_KEY,
  baseURL: env.NV_INVOKE_URL ? env.NV_INVOKE_URL.replace(/\/chat\/completions$/, '') : 'https://integrate.api.nvidia.com/v1',
})

async function main() {
  console.log("Starting tool call test with model:", env.NV_API_MODEL)
  try {
    const result = streamText({
      model: nvidia.chat(env.NV_API_MODEL || 'mistralai/mistral-large-3-675b-instruct-2512'),
      system: "You must use the createSandbox tool to create a sandbox.",
      messages: [{ role: 'user', content: 'create a saas landing page' }],
      tools: {
        createSandbox: tool({
          description: 'Create a new sandbox environment',
          inputSchema: z.object({
            timeout: z.number().optional(),
            ports: z.array(z.number()).optional(),
          }),
          execute: async ({ timeout, ports }) => {
            console.log("Execute createSandbox called with:", { timeout, ports })
            return "Sandbox created successfully"
          }
        })
      }
    })

    for await (const chunk of result.fullStream) {
      console.log("Chunk type:", chunk.type, JSON.stringify(chunk))
    }
  } catch (error) {
    console.error("Test failed with error:", error)
  }
}

main()
