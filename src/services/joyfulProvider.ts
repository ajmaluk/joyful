let invokeUrl: string;

if (typeof window !== 'undefined') {
  const { protocol, hostname, port } = window.location;
  const origin = port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`;
  invokeUrl = `${origin}/api/ai/chat/completions`;
} else {
  invokeUrl = '/api/ai/chat/completions';
}

const DEV_API_KEY = import.meta.env.VITE_NV_API_KEY || '';

/**
 * Joyful provider config — routes through Cloudflare Pages function
 * (/api/ai/chat/completions) which handles NVIDIA→Groq fallback.
 *
 * The Cloudflare function reads provider keys from env variables:
 *   NVIDIA_API_KEY, NVIDIA_INVOKE_URL, NVIDIA_MODEL
 *   GROQ_API_KEY, GROQ_INVOKE_URL, GROQ_MODEL
 *
 * For local dev, VITE_NV_API_KEY and VITE_GROQ_API_KEY are accepted.
 */
export const joyfulProviderConfig = {
  enabled: import.meta.env.VITE_JOYFUL_PROVIDER_ENABLED === 'true' || !import.meta.env.DEV,
  providerId: 'joyful-router',
  /** Frontend always calls the Cloudflare proxy — never external URLs directly */
  invokeUrl,
  /** Model hint sent to the Cloudflare proxy; the function overrides per-provider */
  model: import.meta.env.VITE_NV_API_MODEL || 'qwen/qwen3-coder-480b-a35b-instruct',
  topP: Number(import.meta.env.VITE_NV_TOP_P || 0.8),
  /** Dev-only direct API keys (for AIClient fallback in dev, or proxy auth) */
  apiKey: DEV_API_KEY,
  /** Fallback Groq model for the frontend to display */
  fallbackModel: import.meta.env.VITE_GROQ_API_MODEL || 'llama-3.1-8b-instant',
};

/** Provider metadata for display purposes */
export const providerDisplay = {
  primary: {
    id: 'nvidia-nim',
    name: 'NVIDIA NIM',
    model: import.meta.env.VITE_NV_API_MODEL || 'qwen/qwen3-coder-480b-a35b-instruct',
  },
  fallback: {
    id: 'groq',
    name: 'Groq',
    model: import.meta.env.VITE_GROQ_API_MODEL || 'llama-3.1-8b-instant',
  },
};
