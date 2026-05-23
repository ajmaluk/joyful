/**
 * ContextCache — avoid repeated AI calls with identical context.
 *
 * Caches final parsed responses keyed by a hash of phase + context.
 * If the same hash is requested again, reuses cached response or
 * signals a duplicate so the orchestrator can stop instead of
 * making another API call.
 */

export interface CachedModelResponse {
  text: string;
  operations: { tool: string; input: Record<string, unknown> }[];
  cachedAt: number;
}

interface CacheEntry {
  hash: string;
  response: CachedModelResponse;
  expiresAt: number;
}

export class ContextCache {
  private entries = new Map<string, CacheEntry>();
  private maxEntries = 50;
  private ttlMs: number;

  constructor(ttlMs = 60_000) {
    this.ttlMs = ttlMs;
  }

  /**
   * Retrieve a cached response. Returns null if missing or expired.
   */
  get(hash: string): CachedModelResponse | null {
    const entry = this.entries.get(hash);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(hash);
      return null;
    }
    return entry.response;
  }

  /**
   * Store a response under the given hash.
   */
  set(hash: string, response: { text: string; operations: { tool: string; input: Record<string, unknown> }[] }): void {
    // Evict oldest if we're at capacity
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest) this.entries.delete(oldest);
    }

    this.entries.set(hash, {
      hash,
      response: { ...response, cachedAt: Date.now() },
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /**
   * Build a deterministic hash from phase + context components.
   */
  createHash(input: {
    phase: string;
    userRequest: string;
    todoId?: string;
    selectedFiles: string[];
    selectedChunks: { path: string; startLine: number; endLine: number }[];
    errorSignature?: string;
    repoMapHash: string;
    memoryHash: string;
  }): string {
    const parts = [
      input.phase,
      input.userRequest,
      input.todoId || '',
      ...(input.selectedFiles || []).sort(),
      ...(input.selectedChunks || []).map(c => `${c.path}:${c.startLine}-${c.endLine}`).sort(),
      input.errorSignature || '',
      input.repoMapHash || '',
      input.memoryHash || '',
    ];
    return this.simpleHash(parts.join('|'));
  }

  /**
   * Quick hash for system prompt + messages content — used by guardedModelCall.
   */
  hashPrompt(systemPrompt: string, messagesContent: string): string {
    return this.simpleHash(systemPrompt + '||' + messagesContent);
  }

  private simpleHash(content: string): string {
    let hash = 5381;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) + hash + content.charCodeAt(i)) | 0;
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Remove entries older than now.
   */
  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (now > entry.expiresAt) {
        this.entries.delete(key);
      }
    }
  }

  get size(): number {
    return this.entries.size;
  }
}

export const contextCache = new ContextCache(120_000); // 2 min default TTL
