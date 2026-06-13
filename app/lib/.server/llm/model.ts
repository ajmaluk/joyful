import { createOpenAI } from '@ai-sdk/openai';

export function getOpenAIModel(apiKey: string) {
  const openai = createOpenAI({
    apiKey,
    baseURL: 'https://integrate.api.nvidia.com/v1',
  });

  return openai('nvidia/nemotron-3-ultra-550b-a55b');
}
