import { createOpenAI } from '@ai-sdk/openai';

export function getOpenAIModel(apiKey: string) {
  const openai = createOpenAI({
    apiKey,
    baseURL: 'https://integrate.api.nvidia.com/v1',
  });

  return openai('meta/llama-3.3-70b-instruct');
}
