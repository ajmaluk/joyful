import type { UserSettings } from '@/types';

export const joyfulProviderConfig = {
  enabled: String(import.meta.env.VITE_JOYFUL_PROVIDER_ENABLED || '').toLowerCase() === 'true',
  defaultEnabled: String(import.meta.env.VITE_JOYFUL_PROVIDER_DEFAULT || '').toLowerCase() === 'true',
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  model: import.meta.env.VITE_GEMINI_API_MODEL || 'gemini-2.5-flash',
  topP: Number(import.meta.env.VITE_GEMINI_API_TOP_P || 1),
  thinkingLevel: String(import.meta.env.VITE_GEMINI_API_THINKING_LEVEL || 'MINIMAL').toUpperCase(),
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
