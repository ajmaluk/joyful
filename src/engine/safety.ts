// ── Doom-Loop Detection ─────────────────────────────────────────

export interface EditRecord {
  path: string;
  content: string;
  timestamp: number;
}

export interface SafetyConfig {
  maxIdenticalEdits: number;
  maxFileChangesPerRun: number;
  maxIterationsWithoutProgress: number;
  staleReadThresholdMs: number;
}

const DEFAULT_CONFIG: SafetyConfig = {
  maxIdenticalEdits: 3,
  maxFileChangesPerRun: 50,
  maxIterationsWithoutProgress: 5,
  staleReadThresholdMs: 30_000,
};

export class SafetyMonitor {
  private editHistory = new Map<string, EditRecord[]>();
  private fileChangeCount = 0;
  private iterationsWithoutProgress = 0;
  private lastFileSnapshot = '';
  private config: SafetyConfig;

  constructor(config?: Partial<SafetyConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  recordEdit(path: string, content: string): string | null {
    const edits = this.editHistory.get(path) || [];
    const recent = edits[edits.length - 1];

    if (recent && recent.content === content) {
      const identicalCount = edits.filter(e => e.content === content).length + 1;
      if (identicalCount >= this.config.maxIdenticalEdits) {
        return `Doom-loop detected: ${path} was written with identical content ${identicalCount} times. Stopping.`;
      }
    }

    edits.push({ path, content, timestamp: Date.now() });
    if (edits.length > 10) edits.shift();
    this.editHistory.set(path, edits);
    this.fileChangeCount++;

    if (this.fileChangeCount > this.config.maxFileChangesPerRun) {
      return `Too many file changes (${this.fileChangeCount}). Maximum is ${this.config.maxFileChangesPerRun}.`;
    }

    return null;
  }

  checkProgress(snapshot: string): string | null {
    if (snapshot === this.lastFileSnapshot) {
      this.iterationsWithoutProgress++;
    } else {
      this.iterationsWithoutProgress = 0;
    }
    this.lastFileSnapshot = snapshot;

    if (this.iterationsWithoutProgress >= this.config.maxIterationsWithoutProgress) {
      return `No progress detected for ${this.iterationsWithoutProgress} iterations. Stopping.`;
    }

    return null;
  }

  getFileChangeCount(): number {
    return this.fileChangeCount;
  }

  reset(): void {
    this.editHistory.clear();
    this.fileChangeCount = 0;
    this.iterationsWithoutProgress = 0;
    this.lastFileSnapshot = '';
  }
}

// ── Stale-Read Detection ───────────────────────────────────────

interface FileReadRecord {
  path: string;
  content: string;
  readAt: number;
}

export class StaleReadDetector {
  private reads = new Map<string, FileReadRecord>();

  recordRead(path: string, content: string): void {
    this.reads.set(path, { path, content, readAt: Date.now() });
  }

  checkStale(path: string, currentContent: string): string | null {
    const record = this.reads.get(path);
    if (!record) return null;

    if (record.content !== currentContent) {
      return `${path} has been modified since you read it at ${new Date(record.readAt).toLocaleTimeString()}. Re-read the file before editing.`;
    }

    return null;
  }

  clear(): void {
    this.reads.clear();
  }

  clearPath(path: string): void {
    this.reads.delete(path);
  }
}

// ── Error Recovery ──────────────────────────────────────────────

export interface ErrorRecord_ {
  operation: string;
  error: string;
  timestamp: number;
  attempt: number;
}

export class ErrorTracker {
  private errors: ErrorRecord_[] = [];
  private maxErrors = 20;

  record(operation: string, error: string): number {
    const similar = this.errors.filter(
      e => e.operation === operation && e.error === error,
    );
    const attempt = similar.length + 1;

    this.errors.push({ operation, error, timestamp: Date.now(), attempt });
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    return attempt;
  }

  getRecent(operation: string, windowMs = 60_000): ErrorRecord_[] {
    const cutoff = Date.now() - windowMs;
    return this.errors.filter(
      e => e.operation === operation && e.timestamp > cutoff,
    );
  }

  getRecoverySuggestion(operation: string): string | null {
    const recent = this.getRecent(operation);
    if (recent.length === 0) return null;

    const attempt = recent.length;
    if (attempt >= 3) {
      return `This operation (${operation}) has failed ${attempt} times. Suggest switching strategies.`;
    }
    if (attempt >= 2) {
      return `Retrying ${operation} (attempt ${attempt + 1}). Verify the file state before retrying.`;
    }

    return null;
  }

  clear(): void {
    this.errors = [];
  }
}

// ── Rate Limiter ────────────────────────────────────────────────

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private maxTokens: number;
  private refillRate: number;
  private refillIntervalMs: number;

  constructor(maxTokensPerMinute: number) {
    this.maxTokens = maxTokensPerMinute;
    this.tokens = maxTokensPerMinute;
    this.lastRefill = Date.now();
    this.refillRate = maxTokensPerMinute;
    this.refillIntervalMs = 60_000;
  }

  tryConsume(count = 1): boolean {
    this.refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = (elapsed / this.refillIntervalMs) * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}
