import type { UserSettings } from '@/types';

export const joyfulProviderConfig = {
  enabled: String(import.meta.env.VITE_JOYFUL_PROVIDER_ENABLED || '').toLowerCase() === 'true',
  defaultEnabled: String(import.meta.env.VITE_JOYFUL_PROVIDER_DEFAULT || '').toLowerCase() === 'true',
  apiUrl: import.meta.env.VITE_JOYFUL_API_URL || 'https://integrate.api.nvidia.com/v1/chat/completions',
  apiKey: import.meta.env.VITE_JOYFUL_API_KEY || '',
  model: import.meta.env.VITE_JOYFUL_API_MODEL || 'minimaxai/minimax-m2.7',
  temperature: Number(import.meta.env.VITE_JOYFUL_API_TEMPERATURE || 1),
  topP: Number(import.meta.env.VITE_JOYFUL_API_TOP_P || 0.95),
  maxTokens: Number(import.meta.env.VITE_JOYFUL_API_MAX_TOKENS || 8192),
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
