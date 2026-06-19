import { createOpenAI } from '@ai-sdk/openai';

const DEFAULT_MODEL_NAME = 'qwen3-235b';
const DEFAULT_BASE_URL = 'https://api.llm7.io/v1';

const NVIDIA_MODEL_NAME = 'meta/llama-3.3-70b-instruct';
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

export { DEFAULT_MODEL_NAME, NVIDIA_MODEL_NAME };

/**
 * Returns the requested model. Uses LLM7_API_KEY for qwen3-235b,
 * and NV_API_KEY for nvidia models.
 */
export function getModel(modelName: string, env: Env) {
  if (modelName === 'qwen3-235b') {
    const apiKey = env.LLM7_API_KEY ?? (typeof process !== 'undefined' ? process.env?.LLM7_API_KEY : undefined);

    if (!apiKey) {
      throw new Error('Missing LLM7 API key. Set LLM7_API_KEY environment variable.');
    }

    const openai = createOpenAI({ apiKey, baseURL: DEFAULT_BASE_URL });
    return openai(modelName);
  } else {
    const apiKey = env.NV_API_KEY ?? (typeof process !== 'undefined' ? process.env?.NV_API_KEY : undefined);

    if (!apiKey) {
      throw new Error('Missing NVIDIA API key. Set NV_API_KEY environment variable.');
    }

    const openai = createOpenAI({ apiKey, baseURL: NVIDIA_BASE_URL });
    return openai(modelName);
  }
}

