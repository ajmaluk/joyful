import { useMemo } from 'react'
import { SUPPORTED_MODELS, MODEL_NAMES } from '@/ai/constants'

interface DisplayModel {
  id: string
  label: string
}

export function useAvailableModels() {
  const models = useMemo<DisplayModel[]>(() =>
    SUPPORTED_MODELS.map(id => ({
      id,
      label: MODEL_NAMES[id] ?? id,
    })),
  [])

  return { models, isLoading: false, error: null }
}
