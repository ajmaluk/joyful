import { env } from 'node:process';

export function getAPIKey(cloudflareEnv: Env) {
  /**
   * The `cloudflareEnv` is only used when deployed or when previewing locally.
   * In development the environment variables are available through `env`.
   */
  const apiKey = env.NV_API_KEY ?? cloudflareEnv.NV_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing NVIDIA OpenAI-compatible API key. Set `NV_API_KEY` (local .env.local) or provide it as a Cloudflare binding.",
    );
  }

  return apiKey;
}
