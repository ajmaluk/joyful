export const joyfulProviderConfig = {
  enabled: String(process.env.NEXT_PUBLIC_JOYFUL_PROVIDER_ENABLED || '').toLowerCase() === 'true',
  invokeUrl: process.env.NEXT_PUBLIC_NV_INVOKE_URL || 'https://integrate.api.nvidia.com/v1/chat/completions',
  apiKey: process.env.NEXT_PUBLIC_NV_API_KEY || '',
  model: process.env.NEXT_PUBLIC_NV_API_MODEL || 'qwen/qwen3-coder-480b-a35b-instruct',
  fallbackModels: String(process.env.NEXT_PUBLIC_NV_API_FALLBACK_MODELS || '')
    .split(',')
    .map(model => model.trim())
    .filter(Boolean),
  topP: Number(process.env.NEXT_PUBLIC_NV_TOP_P || process.env.NEXT_PUBLIC_NV_API_TOP_P || 0.8),
};
