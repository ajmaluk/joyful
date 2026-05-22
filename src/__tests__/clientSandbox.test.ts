import { describe, it, expect } from 'vitest';
import {
  generateValidationReport,
  validateDOM,
  analyzeFilePerformance,
  checkSizeBudget,
} from '@/services/clientSandbox';

// ─── Validation Report ───────────────────────────────────────────

describe('generateValidationReport', () => {
  it('returns pass for clean code', () => {
    const report = generateValidationReport([
      { path: 'src/App.tsx', content: 'export function App() { return null; }' },
    ]);
    expect(report.passed).toBe(true);
    expect(report.errorCount).toBe(0);
  });

  it('detects unmatched closing bracket', () => {
    const report = generateValidationReport([
      { path: 'src/App.tsx', content: 'function App() { return <div>; } }' },
    ]);
    expect(report.issues.some(i => i.code === 'BRACKET_MISMATCH')).toBe(true);
    expect(report.errorCount).toBeGreaterThan(0);
  });

  it('detects unclosed brackets', () => {
    const report = generateValidationReport([
      { path: 'src/App.tsx', content: 'function App() { const x = {; }' },
    ]);
    expect(report.issues.some(i => i.code === 'UNCLOSED_BRACKET')).toBe(true);
  });

  it('detects console.log statements', () => {
    const report = generateValidationReport([
      { path: 'src/App.tsx', content: 'function App() { console.log("test"); }' },
    ]);
    expect(report.issues.some(i => i.code === 'DEBUG_STATEMENT')).toBe(true);
  });

  it('detects debugger statements', () => {
    const report = generateValidationReport([
      { path: 'src/App.tsx', content: 'function App() { debugger; }' },
    ]);
    expect(report.issues.some(i => i.code === 'DEBUGGER')).toBe(true);
  });

  it('detects missing alt text on images in HTML', () => {
    const report = generateValidationReport([
      { path: 'index.html', content: '<img src="photo.jpg">' },
    ]);
    expect(report.issues.some(i => i.code === 'MISSING_ALT')).toBe(true);
  });

  it('detects buttons without type attribute', () => {
    const report = generateValidationReport([
      { path: 'index.html', content: '<button>Click</button>' },
    ]);
    expect(report.issues.some(i => i.code === 'BUTTON_NO_TYPE')).toBe(true);
  });

  it('skips validation for non-code files', () => {
    const report = generateValidationReport([
      { path: 'README.md', content: 'Just some documentation with console.log()' },
    ]);
    // Non-js files shouldn't be checked for debug statements
    expect(report.passed).toBe(true);
  });

  it('returns appropriate summary messages', () => {
    const clean = generateValidationReport([{ path: 'clean.ts', content: 'const x = 1;' }]);
    expect(clean.summary).toContain('passed');

    const hasWarnings = generateValidationReport([
      { path: 'test.ts', content: 'console.log("test");' },
    ]);
    expect(hasWarnings.summary).toContain('warning');

    const hasErrors = generateValidationReport([
      { path: 'test.ts', content: 'const x = { ;' },
    ]);
    expect(hasErrors.summary).toContain('error');
  });
});

// ─── DOM Validation ───────────────────────────────────────────────

describe('validateDOM', () => {
  it('validates a complete HTML document scores high', () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Page</title>
</head>
<body>
  <header>Header</header>
  <nav>Navigation</nav>
  <main><h1>Main Content</h1><h2>Subsection</h2></main>
  <footer>Footer</footer>
</body>
</html>`;

    const result = validateDOM(html);
    expect(result.hasDoctype).toBe(true);
    expect(result.hasTitle).toBe(true);
    expect(result.hasViewport).toBe(true);
    expect(result.hasCharset).toBe(true);
    expect(result.hasLang).toBe(true);
    expect(result.hasMain).toBe(true);
    expect(result.hasNavigation).toBe(true);
    expect(result.hasFooter).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it('penalizes missing required elements', () => {
    const html = '<html><head></head><body><div>Content</div></body></html>';
    const result = validateDOM(html);
    expect(result.hasDoctype).toBe(false);
    expect(result.hasTitle).toBe(false);
    expect(result.score).toBeLessThan(80);
  });

  it('detects heading order issues', () => {
    const html = `<!DOCTYPE html>
<html><head><title>Test</title></head>
<body><h1>Title</h1><h3>Skipped h2</h3></body></html>`;
    const result = validateDOM(html);
    expect(result.headingIssues.length).toBeGreaterThan(0);
  });

  it('detects semantic elements used', () => {
    const html = `<!DOCTYPE html>
<html><head><title>T</title></head>
<body><header>H</header><nav>N</nav><main>M</main><article>A</article><footer>F</footer></body></html>`;
    const result = validateDOM(html);
    expect(result.semanticElements).toContain('header');
    expect(result.semanticElements).toContain('nav');
    expect(result.semanticElements).toContain('main');
    expect(result.semanticElements).toContain('article');
    expect(result.semanticElements).toContain('footer');
  });

  it('reports missing semantic elements', () => {
    const html = `<!DOCTYPE html><html><head><title>T</title></head><body><div>Content</div></body></html>`;
    const result = validateDOM(html);
    expect(result.missingSemanticElements.length).toBeGreaterThan(0);
  });
});

// ─── Performance Metrics ──────────────────────────────────────────

describe('analyzeFilePerformance', () => {
  it('calculates total size correctly', () => {
    const metrics = analyzeFilePerformance([
      { path: 'index.html', content: '<html><body>Hello</body></html>' },
    ]);
    expect(metrics.totalFiles).toBe(1);
    expect(metrics.totalSizeBytes).toBeGreaterThan(0);
  });

  it('identifies the largest file', () => {
    const metrics = analyzeFilePerformance([
      { path: 'small.ts', content: 'const x = 1;' },
      { path: 'large.ts', content: 'const y = 2;\n'.repeat(100) },
    ]);
    expect(metrics.largestFile?.path).toBe('large.ts');
  });

  it('counts image files', () => {
    const metrics = analyzeFilePerformance([
      { path: 'index.html', content: '<img src="photo.jpg">' },
      { path: 'image.png', content: 'fake-png' },
    ]);
    // image.png counts because of path extension, plus HTML img tag
    expect(metrics.imageCount).toBeGreaterThanOrEqual(1);
  });

  it('counts external scripts from HTML', () => {
    const metrics = analyzeFilePerformance([
      {
        path: 'index.html',
        content: '<script src="https://cdn.example.com/lib.js"></script>',
      },
    ]);
    expect(metrics.externalScripts).toBeGreaterThanOrEqual(1);
  });

  it('produces human-readable size strings', () => {
    const metrics = analyzeFilePerformance([
      { path: 'big.ts', content: 'x'.repeat(2000) },
    ]);
    expect(metrics.totalSizeHuman).toMatch(/KB|MB/);
  });

  it('estimates load time', () => {
    const metrics = analyzeFilePerformance([
      { path: 'page.tsx', content: '<div>Hello</div>' },
    ]);
    expect(metrics.estimatedLoadTime).toBeTruthy();
    expect(metrics.estimatedLoadTime).toMatch(/\d+(ms|\.\ds)/);
  });

  it('estimates DOM complexity', () => {
    const metrics = analyzeFilePerformance([
      { path: 'page.tsx', content: '<div><span><a>link</a></span></div>' },
    ]);
    expect(metrics.domComplexity.elements).toBeGreaterThan(0);
  });
});

// ─── Size Budget Checks ───────────────────────────────────────────

describe('checkSizeBudget', () => {
  it('passes budget for small projects', () => {
    const checks = checkSizeBudget([
      { path: 'index.html', content: '<html><body>Hello</body></html>' },
    ]);
    expect(checks.length).toBeGreaterThanOrEqual(1);
    const totalCheck = checks.find(c => c.metric === 'Total project size');
    expect(totalCheck?.passed).toBe(true);
  });

  it('fails budget for oversized individual files', () => {
    const checks = checkSizeBudget([
      { path: 'huge.ts', content: 'x'.repeat(150 * 1024) }, // 150KB
    ]);
    const fileCheck = checks.find(c => c.metric.includes('huge.ts'));
    expect(fileCheck?.passed).toBe(false);
  });

  it('provides detailed messages', () => {
    const checks = checkSizeBudget([
      { path: 'file.ts', content: 'hello' },
    ]);
    for (const check of checks) {
      expect(check.limit).toBeTruthy();
      expect(check.actual).toBeTruthy();
      expect(check.detail).toBeTruthy();
    }
  });
});
