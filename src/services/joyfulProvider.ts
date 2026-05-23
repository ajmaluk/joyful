let invokeUrl: string;

if (typeof window !== 'undefined') {
  const { protocol, hostname, port } = window.location;
  const origin = port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`;
  const base = import.meta.env.DEV ? origin : origin;
  invokeUrl = `${base}/api/ai/chat/completions`;
} else {
  invokeUrl = '/api/ai/chat/completions';
}

const API_KEY = import.meta.env.VITE_NV_API_KEY || '';

export const joyfulProviderConfig = {
  apiKey: API_KEY,
  enabled: API_KEY.length > 0,
  invokeUrl,
  model: 'qwen/qwen3-coder-480b-a35b-instruct',
  topP: 0.8,
  fallbackModels: [] as string[],
};
