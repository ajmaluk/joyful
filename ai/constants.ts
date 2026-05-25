export enum Models {
  FreeModelGPT = 'freemodel/gpt-5.5',
  NvidiaMistral = 'nvidia/mistral-large-3',
  NvidiaQwen = 'nvidia/qwen-3-coder-fallback',
  GroqLlama = 'groq/llama-3.3-70b',
}

export const DEFAULT_MODEL = Models.FreeModelGPT

export const SUPPORTED_MODELS: string[] = [
  Models.FreeModelGPT,
  Models.NvidiaMistral,
  Models.NvidiaQwen,
  Models.GroqLlama,
]

export const MODEL_NAMES: Record<string, string> = {
  [Models.FreeModelGPT]: 'GPT-5.5 (Free)',
  [Models.NvidiaMistral]: 'NVIDIA Mistral Large 3',
  [Models.NvidiaQwen]: 'NVIDIA Qwen3 Coder',
  [Models.GroqLlama]: 'Groq Llama 3.3 70b',
}

export const TEST_PROMPTS = [
  'Generate a Next.js app that allows to list and search Pokemons',
  'Create a `golang` server that responds with "Hello World" to any request',
]
