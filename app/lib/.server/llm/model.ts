import { createOpenAI } from '@ai-sdk/openai';

const DEFAULT_MODEL_NAME = 'meta/llama-3.3-70b-instruct';
const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1';

export { DEFAULT_MODEL_NAME };

/**
 * Returns the NVIDIA Llama model via the free NVIDIA API.
 * Uses NV_API_KEY from environment or Cloudflare bindings.
 */
export function getModel(modelName: string, env: Env) {
  const apiKey = env.NV_API_KEY ?? (typeof process !== 'undefined' ? process.env?.NV_API_KEY : undefined);

  if (!apiKey) {
    throw new Error('Missing NVIDIA API key. Set NV_API_KEY environment variable.');
  }

  const openai = createOpenAI({ apiKey, baseURL: DEFAULT_BASE_URL });
  return openai(modelName);
}

