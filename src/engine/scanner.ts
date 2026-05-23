import type { RepoMapEntry, ProjectTreeEntry, FileChange } from './types';

// ── Project Scanner ────────────────────────────────────────────────

export interface ScanResult {
  tree: ProjectTreeEntry[];
  repoMap: RepoMapEntry[];
  framework: string | null;
  packageJson: Record<string, unknown> | null;
  entryPoints: string[];
  totalSize: number;
}

export function scanProject(
  files: { path: string; content: string }[],
): ScanResult {
  const tree: ProjectTreeEntry[] = [];
  const repoMap: RepoMapEntry[] = [];
  let totalSize = 0;
  let packageJson: Record<string, unknown> | null = null;

  for (const file of files) {
    totalSize += file.content.length;

    tree.push({
      path: file.path,
      type: 'file',
      size: file.content.length,
    });

    if (file.path === 'package.json') {
      try {
        packageJson = JSON.parse(file.content) as Record<string, unknown>;
      } catch {
        packageJson = null;
      }
    }
  }

  // Build repo map
  for (const file of files) {
    const entry = analyzeFile(file, files);
    if (entry) repoMap.push(entry);
  }

  const framework = detectFramework(packageJson, files);
  const entryPoints = findEntryPoints(files, framework);

  return { tree, repoMap, framework, packageJson, entryPoints, totalSize };
}

// ── File Analysis ──────────────────────────────────────────────────

function analyzeFile(
  file: { path: string; content: string },
  allFiles: { path: string; content: string }[],
): RepoMapEntry | null {
  if (!shouldAnalyze(file.path)) return null;

  const imports = extractImports(file.content);
  const exports = extractExports(file.content);
  const dependencies = resolveDependencies(imports, allFiles);
  const purpose = inferPurpose(file.path, exports, allFiles);
  const summary = generateSummary(file.path, exports, purpose);

  return {
    path: file.path,
    purpose,
    exports,
    imports: imports.filter(i => i.startsWith('.') || i.startsWith('@/')),
    dependencies,
    lastModified: '',
    summary,
  };
}

function shouldAnalyze(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase();
  return !!(ext && ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'mts', 'cts', 'css', 'json', 'html'].includes(ext));
}

function extractImports(content: string): string[] {
  const imports: string[] = [];
  const regex = /(?:from|import)\s+['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  // CSS @import
  const cssRegex = /@import\s+['"]([^'"]+)['"]/g;
  while ((match = cssRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

function extractExports(content: string): string[] {
  const exports: string[] = [];
  const regex = /export\s+(?:default\s+)?(?:function|const|class|type|interface)\s+(\w+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    exports.push(match[1]);
  }

  // export { ... }
  const namedRegex = /export\s+\{\s*([^}]+)\s*\}/g;
  while ((match = namedRegex.exec(content)) !== null) {
    const parts = match[1].split(',').map(p => p.trim().split(/\s+as\s+/)[0].trim());
    exports.push(...parts.filter(Boolean));
  }

  return exports;
}

function resolveDependencies(
  imports: string[],
  allFiles: { path: string; content: string }[],
): string[] {
  const deps: string[] = [];
  const filePaths = new Set(allFiles.map(f => f.path));

  for (const imp of imports) {
    if (imp.startsWith('.') || imp.startsWith('@/')) {
      const resolved = resolveImport(imp, filePaths);
      if (resolved) deps.push(resolved);
    } else {
      // npm package
      const pkg = imp.startsWith('@') ? imp.split('/').slice(0, 2).join('/') : imp.split('/')[0];
      deps.push(pkg);
    }
  }

  return [...new Set(deps)];
}

function resolveImport(specifier: string, filePaths: Set<string>): string | null {
  const base = specifier.startsWith('@/')
    ? `src/${specifier.slice(2)}`
    : specifier;

  const extensions = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs', '.mts', '.cts', '.css', '.json', ''];
  for (const ext of extensions) {
    const candidate = ext ? `${base}${ext}` : base;
    if (filePaths.has(candidate)) return candidate;
    const indexCandidate = `${base}/index${ext}`;
    if (filePaths.has(indexCandidate)) return indexCandidate;
  }

  // Strip leading ./ for matching paths that don't use the prefix
  const stripped = base.replace(/^\.\//, '');
  if (stripped !== base && filePaths.has(stripped)) return stripped;

  return null;
}

function inferPurpose(
  path: string,
  exports: string[],
  _allFiles: { path: string; content: string }[],
): string {
  if (path === 'package.json') return 'Project metadata and dependencies';
  if (path === 'index.html') return 'HTML entry point';
  if (path === 'vite.config.ts' || path === 'vite.config.js') return 'Vite build configuration';
  if (/tsconfig/.test(path)) return 'TypeScript configuration';

  if (/main\.tsx?$/.test(path) || /main\.jsx?$/.test(path)) return 'Application entry point';
  if (/App\.tsx?$/.test(path) || /App\.jsx?$/.test(path)) return 'Root application component';

  if (path.startsWith('src/components/')) {
    return 'UI component' + (exports.length ? ` (${exports.join(', ')})` : '');
  }
  if (path.startsWith('src/pages/')) return 'Page component' + (exports.length ? ` (${exports.join(', ')})` : '');
  if (path.startsWith('src/hooks/')) return 'Custom React hook' + (exports.length ? ` (${exports.join(', ')})` : '');
  if (path.startsWith('src/services/')) return 'Service module' + (exports.length ? ` (${exports.join(', ')})` : '');
  if (path.startsWith('src/lib/') || path.startsWith('src/utils/')) return 'Utility module' + (exports.length ? ` (${exports.join(', ')})` : '');
  if (path.startsWith('src/types/')) return 'TypeScript type definitions' + (exports.length ? ` (${exports.join(', ')})` : '');
  if (path.startsWith('src/data/')) return 'Data/mock data module' + (exports.length ? ` (${exports.join(', ')})` : '');

  if (/\.css$/.test(path)) return 'Stylesheet';
  if (/\.svg$/.test(path)) return 'SVG icon/image';

  return 'Source file' + (exports.length ? ` (${exports.join(', ')})` : '');
}

function generateSummary(path: string, exports: string[], purpose: string): string {
  if (exports.length > 0) {
    return `${path}: ${purpose}. Exports: ${exports.join(', ')}.`;
  }
  return `${path}: ${purpose}.`;
}

// ── Framework Detection ────────────────────────────────────────────

function detectFramework(
  packageJson: Record<string, unknown> | null,
  _files: { path: string; content: string }[],
): string | null {
  if (!packageJson) return null;

  const allDeps = {
    ...(packageJson.dependencies as Record<string, string> || {}),
    ...(packageJson.devDependencies as Record<string, string> || {}),
  };

  if (allDeps.next) return 'next.js';
  if (allDeps.react) return 'react';
  if (allDeps.vue) return 'vue';
  if (allDeps['@angular/core']) return 'angular';
  if (allDeps.svelte) return 'svelte';
  if (allDeps.astro) return 'astro';
  if (allDeps.gatsby) return 'gatsby';
  if (allDeps.remix || allDeps['@remix-run/react']) return 'remix';

  // Check for Vite
  if (allDeps.vite) {
    return 'vite' + (allDeps.react ? '+react' : '');
  }

  return null;
}

function findEntryPoints(
  files: { path: string; content: string }[],
  _framework: string | null,
): string[] {
  const candidates: string[] = [];

  if (files.some(f => f.path === 'index.html')) candidates.push('index.html');
  if (files.some(f => f.path === 'src/main.tsx')) candidates.push('src/main.tsx');
  if (files.some(f => f.path === 'src/main.jsx')) candidates.push('src/main.jsx');
  if (files.some(f => f.path === 'src/App.tsx')) candidates.push('src/App.tsx');
  if (files.some(f => f.path === 'src/App.jsx')) candidates.push('src/App.jsx');

  return candidates;
}

// ── Recent Changes ─────────────────────────────────────────────────

export function buildRecentChanges(
  oldFiles: { path: string; content: string }[],
  newFiles: { path: string; content: string }[],
): FileChange[] {
  const changes: FileChange[] = [];
  const oldMap = new Map(oldFiles.map(f => [f.path, f.content]));
  const newMap = new Map(newFiles.map(f => [f.path, f.content]));

  // Deleted files
  for (const [path] of oldMap) {
    if (!newMap.has(path)) {
      changes.push({ path, action: 'delete', timestamp: new Date().toISOString(), summary: 'File deleted' });
    }
  }

  // Created and modified files
  for (const [path, content] of newMap) {
    if (!oldMap.has(path)) {
      changes.push({ path, action: 'create', timestamp: new Date().toISOString(), summary: 'File created' });
    } else if (oldMap.get(path) !== content) {
      const oldLines = oldMap.get(path)!.split('\n').length;
      const newLines = content.split('\n').length;
      const diff = newLines - oldLines;
      changes.push({
        path,
        action: 'update',
        timestamp: new Date().toISOString(),
        summary: `Modified (${diff >= 0 ? '+' : ''}${diff} lines)`,
      });
    }
  }

  return changes;
}

// ── File Chunking ──────────────────────────────────────────────────

export function readFileChunk(
  content: string,
  startLine: number,
  endLine: number,
): string {
  const lines = content.split('\n');
  const start = Math.max(0, startLine - 1);
  const end = Math.min(lines.length, endLine);
  return lines.slice(start, end).join('\n');
}

export function getRelevantChunks(
  content: string,
  searchTerms: string[],
  contextLines = 3,
): string {
  const lines = content.split('\n');
  const relevantLines = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (searchTerms.some(term => line.includes(term.toLowerCase()))) {
      for (let j = Math.max(0, i - contextLines); j <= Math.min(lines.length - 1, i + contextLines); j++) {
        relevantLines.add(j);
      }
    }
  }

  if (relevantLines.size === 0) return '';

  const sorted = Array.from(relevantLines).sort((a, b) => a - b);
  let result = '';
  let prevLine = -1;

  for (const lineNum of sorted) {
    if (prevLine >= 0 && lineNum - prevLine > 1) {
      result += '...\n';
    }
    result += `${lineNum + 1}: ${lines[lineNum]}\n`;
    prevLine = lineNum;
  }

  return result;
}

// ── Build Project Tree String ──────────────────────────────────────

export function buildProjectTree(files: { path: string; content: string }[]): string {
  const tree: string[] = [];
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));

  for (const file of sorted) {
    const depth = file.path.split('/').length - 1;
    const indent = '  '.repeat(depth);
    const icon = getFileIcon(file.path);
    tree.push(`${indent}${icon} ${file.path}`);
  }

  return tree.join('\n');
}

function getFileIcon(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const iconMap: Record<string, string> = {
    ts: '📘', tsx: '⚛️', js: '📒', jsx: '⚛️',
    css: '🎨', json: '📋', html: '🌐', md: '📝',
    svg: '🖼️', png: '🖼️', jpg: '🖼️', jpeg: '🖼️',
    gitignore: '🔒',
  };
  return iconMap[ext || ''] || '📄';
}
