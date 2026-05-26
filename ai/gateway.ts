import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModelV3 } from '@ai-sdk/provider'

const nvBaseUrl = process.env.NV_INVOKE_URL
  ? process.env.NV_INVOKE_URL.replace(/\/chat\/completions$/, '')
  : 'https://integrate.api.nvidia.com/v1'

const nvidia = createOpenAI({
  apiKey: process.env.NV_API_KEY,
  baseURL: nvBaseUrl,
})

const groqBaseUrl = process.env.GROQ_INVOKE_URL
  ? process.env.GROQ_INVOKE_URL.replace(/\/chat\/completions$/, '')
  : 'https://api.groq.com/openai/v1'

const groq = createOpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: groqBaseUrl,
})

export interface ModelOptions {
  model: LanguageModelV3
  topP?: number
}

export function getModelOptions(
  modelId: string,
  _options?: { reasoningEffort?: 'low' | 'medium' | 'high' }
): ModelOptions & { temperature?: number; maxTokens?: number; frequencyPenalty?: number; presencePenalty?: number } {
  const topP = process.env.NV_TOP_P ? parseFloat(process.env.NV_TOP_P) : 0.8
  const temperature = 0.7
  const maxTokens = 4096
  const frequencyPenalty = 0
  const presencePenalty = 0

  if (modelId === 'groq/llama-3.3-70b') {
    return {
      model: groq.chat(process.env.GROQ_API_MODEL || 'llama-3.3-70b-versatile'),
      topP,
      temperature,
      maxTokens: 8192,
      frequencyPenalty,
      presencePenalty,
    }
  }

  if (modelId === 'nvidia/qwen-3-coder-fallback') {
    return {
      model: nvidia.chat(process.env.NV_API_FALLBACK_MODELS || 'qwen/qwen3-coder-480b-a35b-instruct'),
      topP,
      temperature,
      maxTokens,
      frequencyPenalty,
      presencePenalty,
    }
  }

  return {
    model: nvidia.chat(process.env.NV_API_MODEL || 'mistralai/mistral-large-3-675b-instruct-2512'),
    topP,
    temperature,
    maxTokens,
    frequencyPenalty,
    presencePenalty,
  }
}
