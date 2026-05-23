interface ProviderConfig {
  id: 'nvidia-nim' | 'groq';
  targetUrl: string;
  apiKey: string;
  model: string;
}

function getProviders(env: Record<string, string>): ProviderConfig[] {
  return [
    {
      id: 'nvidia-nim',
      targetUrl: env.NVIDIA_INVOKE_URL || env.VITE_NV_INVOKE_URL || 'https://integrate.api.nvidia.com/v1/chat/completions',
      apiKey: env.NVIDIA_API_KEY || env.VITE_NV_API_KEY || '',
      model: env.NVIDIA_MODEL || env.VITE_NV_API_MODEL || 'qwen/qwen3-coder-480b-a35b-instruct',
    },
    {
      id: 'groq',
      targetUrl: env.GROQ_INVOKE_URL || env.VITE_GROQ_INVOKE_URL || 'https://api.groq.com/openai/v1/chat/completions',
      apiKey: env.GROQ_API_KEY || env.VITE_GROQ_API_KEY || '',
      model: env.GROQ_MODEL || env.VITE_GROQ_API_MODEL || 'llama-3.1-8b-instant',
    },
  ].filter(p => p.apiKey);
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

const ERROR_RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  ...CORS_HEADERS,
};

function shouldFallback(status: number, bodyText: string): boolean {
  // Always fallback on auth errors (invalid/missing key) — next provider might have valid key
  if ([401, 403].includes(status)) return true;
  // Fallback on server errors, rate limits, timeouts
  if ([408, 425, 429, 500, 502, 503, 504].includes(status)) return true;
  const lower = bodyText.toLowerCase();
  return (
    lower.includes('rate limit') ||
    lower.includes('overloaded') ||
    lower.includes('capacity') ||
    lower.includes('timeout') ||
    lower.includes('temporarily unavailable') ||
    lower.includes('too many requests') ||
    lower.includes('service unavailable') ||
    lower.includes('authorization failed') ||
    lower.includes('invalid credentials') ||
    lower.includes('api key') ||
    lower.includes('unauthorized')
  );
}

async function callProvider(
  provider: ProviderConfig,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Response> {
  const providerBody = {
    ...body,
    model: provider.model,
  };

  try {
    const res = await fetch(provider.targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify(providerBody),
      signal,
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: { message: `Network error: ${message}`, provider: provider.id } }),
      { status: 502, headers: ERROR_RESPONSE_HEADERS },
    );
  }
}

export async function onRequest(context: {
  request: Request;
  env: Record<string, string>;
}): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);

  // Parse request body once
  let body: Record<string, unknown> = {};
  if (request.method === 'POST') {
    try {
      body = await request.clone().json() as Record<string, unknown>;
    } catch {
      body = {};
    }
  }

  const providers = getProviders(env);

  if (providers.length === 0) {
    return new Response(
      JSON.stringify({
        error: {
          message:
            'No AI provider configured. Set NVIDIA_API_KEY (or VITE_NV_API_KEY) in Cloudflare Pages dashboard, or GROQ_API_KEY for fallback.',
        },
      }),
      { status: 401, headers: ERROR_RESPONSE_HEADERS },
    );
  }

  // Determine if streaming
  const isStream = body.stream === true;

  const fallbackErrors: { id: string; status: number; message: string }[] = [];

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];

    // For streaming, only try first provider (mid-stream fallback not supported)
    if (isStream && i > 0) break;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new DOMException('Provider request timed out', 'TimeoutError')), 60000);

    try {
      const response = await callProvider(provider, body, controller.signal);

      if (response.ok) {
        // Success — add provider headers and return
        const responseHeaders = new Headers(response.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        responseHeaders.set('X-Joyful-Provider', provider.id);
        responseHeaders.set('X-Joyful-Fallback-Used', i > 0 ? 'true' : 'false');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        });
      }

      // Collect error for fallback decision
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch {
        errorBody = response.statusText;
      }

      fallbackErrors.push({
        id: provider.id,
        status: response.status,
        message: errorBody.slice(0, 200), // Don't leak full keys
      });

      // Check if this error warrants a fallback
      if (!shouldFallback(response.status, errorBody)) {
        // Non-fallback-worthy error — return it immediately
        const responseHeaders = new Headers({
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'X-Joyful-Provider': provider.id,
          'X-Joyful-Fallback-Used': 'false',
          'X-Joyful-Error': encodeURIComponent(`Non-fallback error from ${provider.id}: ${errorBody.slice(0, 100)}`),
        });

        return new Response(
          JSON.stringify({
            error: {
              message: `Provider ${provider.id} returned ${response.status}: ${errorBody.slice(0, 300)}`,
            },
          }),
          { status: response.status, headers: responseHeaders },
        );
      }

      // Fallback-worthy — try next provider
      continue;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Handle abort/timeout as fallback-worthy
      fallbackErrors.push({
        id: provider.id,
        status: 504,
        message: message.slice(0, 200),
      });
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }

  // All providers failed — return normalized error
  return new Response(
    JSON.stringify({
      error: {
        message: 'All Joyful providers failed.',
        providers: fallbackErrors,
      },
    }),
    {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'X-Joyful-Fallback-Used': 'true',
      },
    },
  );
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
