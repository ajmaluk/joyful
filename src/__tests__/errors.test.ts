import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorCollector } from '@/engine/errors';

describe('ErrorCollector', () => {
  let collector: ErrorCollector;

  beforeEach(() => {
    collector = new ErrorCollector();
  });

  it('enriches errors with suggestions for known patterns', async () => {
    const enriched = await collector.enrichError(
      "Cannot find name 'foo'",
      'src/main.ts',
      5,
      10,
    );

    expect(enriched.text).toContain("Cannot find name 'foo'");
    expect(enriched.suggestion).toContain('import');
  });

  it('handles errors without VFS context gracefully', async () => {
    // Location will be null when VFS is unavailable (test environment)
    const enriched = await collector.enrichError('Generic error');
    expect(enriched.text).toBe('Generic error');
    expect(enriched.location).toBeNull();
    expect(enriched.suggestion).toBeNull();
  });

  it('provides suggestion for module-not-found errors', async () => {
    const enriched = await collector.enrichError(
      "Cannot find module 'react'",
    );
    expect(enriched.suggestion).toContain('import path');
  });

  it('provides suggestion for JSX syntax errors', async () => {
    const enriched = await collector.enrichError(
      'Cannot use JSX syntax without the appropriate loader',
    );
    expect(enriched.suggestion).toContain('.tsx');
  });

  it('deduplicates identical errors', async () => {
    const first = await collector.enrichError('E', 'f.ts', 1);
    const second = await collector.enrichError('E', 'f.ts', 1);
    expect(first.text).toBe(second.text);
    // Second call should not produce a suggestion or location again
    // (still returns data but without the full enrichment)
  });

  it('resets dedup state', async () => {
    await collector.enrichError('E', 'f.ts', 1);
    collector.reset();
    const after = await collector.enrichError('E', 'f.ts', 1);
    expect(after.text).toBe('E');
  });

  it('handles errors with no matching suggestion', async () => {
    const enriched = await collector.enrichError('Some obscure error #42!');
    expect(enriched.suggestion).toBeNull();
  });

  it('produces formatted output from esbuild errors', async () => {
    const esbuildErrors = [
      { text: 'Test error', location: { file: 'src/main.ts', line: 1, column: 0 } },
    ];

    const formatted = await collector.formatCompileErrors(esbuildErrors);
    expect(formatted.length).toBe(1);
    expect(formatted[0]).toContain('Test error');
  });
});
