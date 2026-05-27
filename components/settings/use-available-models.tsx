import { useMemo } from 'react'
import { SUPPORTED_MODELS, MODEL_NAMES } from '@/ai/constants'

interface DisplayModel {
  id: string
  label: string
}

const MODEL_SHORT_LABELS: Record<string, string> = {
  'nvidia/mistral-large-3': 'Mistral',
  'nvidia/qwen-3-coder-fallback': 'Qwen3',
  'groq/llama-3.3-70b': 'Llama 3.3',
}

export function useAvailableModels() {
  const models = useMemo<DisplayModel[]>(() =>
    SUPPORTED_MODELS.map(id => ({
      id,
      label: MODEL_SHORT_LABELS[id] ?? MODEL_NAMES[id] ?? id,
    })),
  [])

  return { models, isLoading: false, error: null }
}
