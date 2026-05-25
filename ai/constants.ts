export enum Models {
  NvidiaMistral = 'nvidia/mistral-large-3',
  NvidiaQwen = 'nvidia/qwen-3-coder-fallback',
  GroqLlama = 'groq/llama-3.3-70b',
}

export const DEFAULT_MODEL = Models.GroqLlama

export const SUPPORTED_MODELS: string[] = [
  Models.NvidiaMistral,
  Models.NvidiaQwen,
  Models.GroqLlama,
]

export const MODEL_NAMES: Record<string, string> = {
  [Models.NvidiaMistral]: 'NVIDIA Mistral Large 3',
  [Models.NvidiaQwen]: 'NVIDIA Qwen3 Coder (Fallback)',
  [Models.GroqLlama]: 'Groq Llama 3.3 70b',
}

export const TEST_PROMPTS = [
  'Generate a Next.js app that allows to list and search Pokemons',
  'Create a `golang` server that responds with "Hello World" to any request',
]
