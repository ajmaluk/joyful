export const SUPPORTED_MODELS: string[] = [
  'nvidia/mistral-large-3',
  'nvidia/qwen-3-coder-fallback',
  'groq/llama-3.3-70b',
]

export const DEFAULT_MODEL = SUPPORTED_MODELS[0]

export const MODEL_NAMES: Record<string, string> = {
  'nvidia/mistral-large-3': 'Mistral Large 3',
  'nvidia/qwen-3-coder-fallback': 'Qwen3 Coder',
  'groq/llama-3.3-70b': 'Llama 3.3 70B',
}

export const TEST_PROMPTS = [
  'Generate a Next.js app that allows to list and search Pokemons',
  'Create a `golang` server that responds with "Hello World" to any request',
]
