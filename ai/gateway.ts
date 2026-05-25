import { createOpenAI } from '@ai-sdk/openai'
import { Models } from './constants'
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

const freeModelBaseUrl = process.env.FREEMODEL_INVOKE_URL
  ? process.env.FREEMODEL_INVOKE_URL.replace(/\/chat\/completions$/, '')
  : 'https://api.freemodel.dev/v1'

const freeModel = createOpenAI({
  apiKey: process.env.FREEMODEL_API_KEY,
  baseURL: freeModelBaseUrl,
})

export interface ModelOptions {
  model: LanguageModelV3
  topP?: number
}

export function getModelOptions(
  modelId: string,
  _options?: { reasoningEffort?: 'low' | 'medium' | 'high' }
): ModelOptions & { temperature?: number; maxTokens?: number; frequencyPenalty?: number; presencePenalty?: number } {
  const topP = process.env.VITE_NV_TOP_P ? parseFloat(process.env.VITE_NV_TOP_P) : 0.8
  const temperature = 0.7
  const maxTokens = 2048
  const frequencyPenalty = 0
  const presencePenalty = 0

  if (modelId === Models.FreeModelGPT) {
    return {
      model: freeModel.chat(process.env.FREEMODEL_MODEL || 'gpt-5.5'),
      topP,
      temperature,
      maxTokens: 1000,
      frequencyPenalty,
      presencePenalty,
    }
  }

  if (modelId === Models.GroqLlama) {
    return {
      model: groq.chat(process.env.GROQ_API_MODEL || 'llama-3.3-70b-versatile'),
      topP,
      temperature,
      // Lower maxTokens for Groq free tier (12K TPM) to avoid rate-limit exhaustion.
      maxTokens: 1024,
      frequencyPenalty,
      presencePenalty,
    }
  }

  if (modelId === Models.NvidiaQwen) {
    return {
      model: nvidia.chat(process.env.NV_API_FALLBACK_MODELS || 'qwen/qwen3-coder-480b-a35b-instruct'),
      topP,
      temperature,
      maxTokens,
      frequencyPenalty,
      presencePenalty,
    }
  }

  // Default is Models.NvidiaMistral
  return {
    model: nvidia.chat(process.env.NV_API_MODEL || 'mistralai/mistral-large-3-675b-instruct-2512'),
    topP,
    temperature,
    maxTokens,
    frequencyPenalty,
    presencePenalty,
  }
}
