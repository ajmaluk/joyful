import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SafetyMonitor, StaleReadDetector, ErrorTracker, RateLimiter } from '@/engine/safety';

describe('SafetyMonitor', () => {
  let monitor: SafetyMonitor;

  beforeEach(() => {
    monitor = new SafetyMonitor({ maxIdenticalEdits: 3, maxFileChangesPerRun: 10, maxIterationsWithoutProgress: 3, staleReadThresholdMs: 30_000 });
  });

  it('allows normal edits', () => {
    const warning = monitor.recordEdit('src/main.ts', 'content');
    expect(warning).toBeNull();
  });

  it('detects doom-loop on identical content', () => {
    monitor.recordEdit('src/main.ts', 'same');
    monitor.recordEdit('src/main.ts', 'same');
    const warning = monitor.recordEdit('src/main.ts', 'same');
    expect(warning).toContain('Doom-loop');
    expect(warning).toContain('src/main.ts');
  });

  it('allows different content for same file', () => {
    monitor.recordEdit('src/main.ts', 'v1');
    monitor.recordEdit('src/main.ts', 'v2');
    const warning = monitor.recordEdit('src/main.ts', 'v3');
    expect(warning).toBeNull();
  });

  it('tracks total file changes across all files', () => {
    for (let i = 0; i < 5; i++) {
      expect(monitor.recordEdit(`file${i}.ts`, `content${i}`)).toBeNull();
    }
    expect(monitor.getFileChangeCount()).toBe(5);
  });

  it('thresholds at maxFileChanges', () => {
    for (let i = 0; i < 10; i++) {
      expect(monitor.recordEdit(`file${i}.ts`, `content${i}`)).toBeNull();
    }
    const warning = monitor.recordEdit('another.ts', 'x');
    expect(warning).toContain('Too many file changes');
  });

  it('detects stalled progress', () => {
    const snap = 'workspace-snapshot-v1';
    expect(monitor.checkProgress(snap)).toBeNull();
    expect(monitor.checkProgress(snap)).toBeNull();
    expect(monitor.checkProgress(snap)).toBeNull();
    const warning = monitor.checkProgress(snap);
    expect(warning).toContain('No progress');
    expect(warning).toContain('3 iterations');
  });

  it('resets progress when snapshot changes', () => {
    expect(monitor.checkProgress('snap1')).toBeNull();
    expect(monitor.checkProgress('snap2')).toBeNull();
    expect(monitor.checkProgress('snap2')).toBeNull();
    expect(monitor.checkProgress('snap2')).toBeNull();
    const warning = monitor.checkProgress('snap2');
    expect(warning).toContain('No progress');
  });

  it('resets all state', () => {
    monitor.recordEdit('src/main.ts', 'x');
    monitor.checkProgress('snap');
    monitor.reset();
    expect(monitor.getFileChangeCount()).toBe(0);
    expect(monitor.checkProgress('snap')).toBeNull();
  });
});

describe('StaleReadDetector', () => {
  let detector: StaleReadDetector;

  beforeEach(() => {
    detector = new StaleReadDetector();
  });

  it('allows editing after a fresh read', () => {
    detector.recordRead('src/main.ts', 'old content');
    const warning = detector.checkStale('src/main.ts', 'old content');
    expect(warning).toBeNull();
  });

  it('warns when content changed since last read', () => {
    detector.recordRead('src/main.ts', 'old content');
    const warning = detector.checkStale('src/main.ts', 'new content');
    expect(warning).toContain('has been modified since');
    expect(warning).toContain('src/main.ts');
  });

  it('returns null for never-read files', () => {
    expect(detector.checkStale('unknown.ts', 'x')).toBeNull();
  });

  it('clears path after edit', () => {
    detector.recordRead('src/main.ts', 'old');
    detector.clearPath('src/main.ts');
    expect(detector.checkStale('src/main.ts', 'anything')).toBeNull();
  });

  it('clears all paths', () => {
    detector.recordRead('a.ts', '1');
    detector.recordRead('b.ts', '2');
    detector.clear();
    expect(detector.checkStale('a.ts', 'x')).toBeNull();
    expect(detector.checkStale('b.ts', 'x')).toBeNull();
  });
});

describe('ErrorTracker', () => {
  let tracker: ErrorTracker;

  beforeEach(() => {
    tracker = new ErrorTracker();
  });

  it('records errors and returns attempt count', () => {
    const attempt1 = tracker.record('compile', 'Syntax error');
    expect(attempt1).toBe(1);

    const attempt2 = tracker.record('compile', 'Syntax error');
    expect(attempt2).toBe(2);
  });

  it('distinguishes different error messages', () => {
    tracker.record('compile', 'Error A');
    const attempt = tracker.record('compile', 'Error B');
    expect(attempt).toBe(1);
  });

  it('provides recovery suggestion on repeated failures', () => {
    tracker.record('compile', 'fail');
    expect(tracker.getRecoverySuggestion('compile')).toBeNull();

    tracker.record('compile', 'fail');
    const suggestion2 = tracker.getRecoverySuggestion('compile');
    expect(suggestion2).toContain('Retrying');

    tracker.record('compile', 'fail');
    const suggestion3 = tracker.getRecoverySuggestion('compile');
    expect(suggestion3).toContain('switching strategies');
  });

  it('returns null for unknown operations', () => {
    expect(tracker.getRecoverySuggestion('unknown')).toBeNull();
  });

  it('clears all errors', () => {
    tracker.record('compile', 'fail');
    tracker.clear();
    expect(tracker.getRecoverySuggestion('compile')).toBeNull();
  });

  it('caps stored errors', () => {
    for (let i = 0; i < 30; i++) {
      tracker.record(`op${i}`, `err${i}`);
    }
    // 30 records, cap is 20 — oldest should be evicted
    const trackerAny = tracker as unknown as { errors: unknown[] };
    expect(trackerAny.errors.length).toBeLessThanOrEqual(20);
  });
});

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows consumption within limit', () => {
    const limiter = new RateLimiter(10);
    for (let i = 0; i < 10; i++) {
      expect(limiter.tryConsume()).toBe(true);
    }
  });

  it('blocks when exhausted', () => {
    const limiter = new RateLimiter(3);
    limiter.tryConsume();
    limiter.tryConsume();
    limiter.tryConsume();
    expect(limiter.tryConsume()).toBe(false);
  });

  it('refills over time', () => {
    const limiter = new RateLimiter(60);
    // drain
    limiter.tryConsume();
    // Advance 1 second (1/60th of the refill period = 1 token)
    vi.advanceTimersByTime(1_000);
    expect(limiter.tryConsume()).toBe(true);
  });

  it('supports multi-token consumption', () => {
    const limiter = new RateLimiter(5);
    expect(limiter.tryConsume(3)).toBe(true);
    expect(limiter.tryConsume(3)).toBe(false);
    vi.advanceTimersByTime(60_000); // full refill
    expect(limiter.tryConsume(3)).toBe(true);
  });
});
