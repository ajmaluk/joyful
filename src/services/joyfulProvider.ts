import type { UserSettings } from '@/types';

export const joyfulProviderConfig = {
  enabled: String(import.meta.env.VITE_JOYFUL_PROVIDER_ENABLED || '').toLowerCase() === 'true',
  defaultEnabled: String(import.meta.env.VITE_JOYFUL_PROVIDER_DEFAULT || '').toLowerCase() === 'true',
  invokeUrl: import.meta.env.VITE_NV_INVOKE_URL || 'https://integrate.api.nvidia.com/v1/chat/completions',
  apiKey: import.meta.env.VITE_NV_API_KEY || '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',
  model: import.meta.env.VITE_NV_API_MODEL || 'qwen/qwen3-coder-480b-a35b-instruct',
  fallbackModels: String(import.meta.env.VITE_NV_API_FALLBACK_MODELS || '')
    .split(',')
    .map(model => model.trim())
    .filter(Boolean),
  topP: Number(import.meta.env.VITE_NV_API_TOP_P || 0.8),
};

export function getDefaultAIProvider(): Pick<UserSettings, 'aiProvider' | 'aiModel' | 'connectedProviders'> {
  if (joyfulProviderConfig.enabled && joyfulProviderConfig.defaultEnabled) {
    return {
      aiProvider: 'joyful',
      aiModel: joyfulProviderConfig.model,
      connectedProviders: { local: true, joyful: true },
    };
  }

  return {
    aiProvider: 'local',
    aiModel: 'local-lite',
    connectedProviders: { local: true },
  };
}

export function normalizeProvider(provider: UserSettings['aiProvider']): UserSettings['aiProvider'] {
  if (provider === 'joyful' && !joyfulProviderConfig.enabled) return 'local';
  return provider;
}
