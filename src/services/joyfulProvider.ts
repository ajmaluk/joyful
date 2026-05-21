export const joyfulProviderConfig = {
  enabled: String(import.meta.env.VITE_JOYFUL_PROVIDER_ENABLED || '').toLowerCase() === 'true',
  invokeUrl: import.meta.env.VITE_NV_INVOKE_URL || 'https://integrate.api.nvidia.com/v1/chat/completions',
  apiKey: import.meta.env.VITE_NV_API_KEY || '',
  model: import.meta.env.VITE_NV_API_MODEL || 'qwen/qwen3-coder-480b-a35b-instruct',
  fallbackModels: String(import.meta.env.VITE_NV_API_FALLBACK_MODELS || '')
    .split(',')
    .map(model => model.trim())
    .filter(Boolean),
  topP: Number(import.meta.env.VITE_NV_API_TOP_P || 0.8),
};
