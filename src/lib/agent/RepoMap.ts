import { virtualFS, type FileTreeNode } from '@/lib/vfs/VirtualFileSystem';
import { FileSummarizer, type FileSummary } from './FileSummarizer';

interface DependencyNode {
  path: string;
  dependsOn: string[];
  usedBy: string[];
}

export interface RepoMapData {
  projectTree: FileTreeNode;
  files: Map<string, FileSummary>;
  dependencyGraph: Record<string, DependencyNode>;
  entryPoints: string[];
  lastUpdated: number;
  totalFiles: number;
  totalLines: number;
}

const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'ico', 'svg', 'webp', 'avif',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  'mp3', 'mp4', 'webm', 'ogg', 'wav',
  'pdf', 'zip', 'gz', 'tar', 'br',
  'ico', 'cur',
]);

const SKIP_DIRECTORIES = new Set([
  'node_modules', '.git', 'dist', '.next', 'build', 'out',
  '.cache', '.turbo', 'coverage', '.nyc_output',
  '.vercel', '.netlify', 'public', 'static',
]);

function isCodeFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  if (BINARY_EXTENSIONS.has(ext)) return false;
  const name = path.split('/').pop() || '';
  return name.includes('.');
}

function normalizeImportSource(importer: string, source: string): string | null {
  if (source.startsWith('.')) {
    const dir = importer.split('/').slice(0, -1).join('/');
    const parts = source.split('/');
    const resolved: string[] = [];
    for (const part of parts) {
      if (part === '.' || part === '') continue;
      if (part === '..') resolved.pop();
      else resolved.push(part);
    }
    const joined = resolved.join('/');
    const resolvedPath = dir ? `${dir}/${joined}` : `/${joined}`;

    const candidates = [
      resolvedPath,
      `${resolvedPath}.ts`,
      `${resolvedPath}.tsx`,
      `${resolvedPath}.js`,
      `${resolvedPath}.jsx`,
      `${resolvedPath}/index.ts`,
      `${resolvedPath}/index.tsx`,
      `${resolvedPath}/index.js`,
      `${resolvedPath}/index.jsx`,
    ];

    for (const c of candidates) {
      if (c.startsWith('//')) return c.slice(1);
      return c;
    }
    return resolvedPath;
  }
  return null;
}

export class RepoMapBuilder {
  private data: RepoMapData | null = null;
  private summarizer = new FileSummarizer();

  async build(framework: string, entryPoint: string): Promise<void> {
    const projectTree = await virtualFS.getProjectTree('/');
    const allFiles = await this.walkFiles(projectTree);
    const files = new Map<string, FileSummary>();

    let totalLines = 0;
    let totalFiles = 0;

    for (const filePath of allFiles) {
      try {
        const content = await virtualFS.readFile(filePath);
        const summary = this.summarizer.summarizeFile(filePath, content);
        files.set(filePath, summary);
        totalLines += summary.lineCount;
        totalFiles++;
      } catch {
        // skip unreadable files
      }
    }

    const entryPoints = this.discoverEntryPoints(files, framework, entryPoint);
    const dependencyGraph = this.buildDependencyGraph(files);

    this.data = {
      projectTree,
      files,
      dependencyGraph,
      entryPoints,
      lastUpdated: Date.now(),
      totalFiles,
      totalLines,
    };
  }

  async updateFile(path: string): Promise<void> {
    if (!this.data) return;
    try {
      const content = await virtualFS.readFile(path);
      const summary = this.summarizer.summarizeFile(path, content);
      this.data.files.set(path, summary);

      const oldSummary = this.data.files.get(path);
      if (oldSummary) {
        this.data.totalLines += summary.lineCount - oldSummary.lineCount;
      } else {
        this.data.totalFiles++;
        this.data.totalLines += summary.lineCount;
      }

      this.data.dependencyGraph = this.buildDependencyGraph(this.data.files);
      this.data.lastUpdated = Date.now();
    } catch {
      // file may have been deleted
    }
  }

  async removeFile(path: string): Promise<void> {
    if (!this.data) return;
    const removed = this.data.files.get(path);
    if (removed) {
      this.data.totalFiles--;
      this.data.totalLines -= removed.lineCount;
      this.data.files.delete(path);
    }

    const newGraph: Record<string, DependencyNode> = {};
    const graph = this.data.dependencyGraph;
    for (const filePath of this.data.files.keys()) {
      newGraph[filePath] = {
        path: filePath,
        dependsOn: (graph[filePath]?.dependsOn || []).filter(d => d !== path),
        usedBy: (graph[filePath]?.usedBy || []).filter(u => u !== path),
      };
    }
    this.data.dependencyGraph = newGraph;
    this.data.lastUpdated = Date.now();
  }

  getFileSummary(path: string): FileSummary | undefined {
    return this.data?.files.get(path);
  }

  getFileDependents(path: string): string[] {
    return this.data?.dependencyGraph[path]?.usedBy || [];
  }

  getFileDependencies(path: string): string[] {
    return this.data?.dependencyGraph[path]?.dependsOn || [];
  }

  getRelevantFiles(query: string, maxFiles = 10): FileSummary[] {
    if (!this.data) return [];
    const lowerQuery = query.toLowerCase();
    const scored: { score: number; summary: FileSummary }[] = [];

    for (const summary of this.data.files.values()) {
      let score = 0;
      const fileName = summary.path.split('/').pop()?.toLowerCase() || '';
      const pathLower = summary.path.toLowerCase();

      if (fileName.includes(lowerQuery) || pathLower.includes(lowerQuery)) {
        score += 10;
      }

      if (lowerQuery.split(/\s+/).some(word => summary.purpose.toLowerCase().includes(word))) {
        score += 5;
      }

      for (const sym of summary.symbols) {
        if (sym.name.toLowerCase().includes(lowerQuery)) {
          score += 8;
        }
      }

      for (const imp of summary.imports) {
        if (imp.source.toLowerCase().includes(lowerQuery)) {
          score += 3;
        }
      }

      if (score > 0) {
        scored.push({ score, summary });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxFiles).map(s => s.summary);
  }

  getRelevantChunks(
    path: string, query: string, contextLines = 5,
  ): { startLine: number; endLine: number; reason: string }[] {
    const summary = this.data?.files.get(path);
    if (!summary) return [];

    const chunks: { startLine: number; endLine: number; reason: string }[] = [];
    const lowerQuery = query.toLowerCase();

    for (const sym of summary.symbols) {
      const matches = sym.name.toLowerCase().includes(lowerQuery) ||
        sym.signature.toLowerCase().includes(lowerQuery);
      if (matches) {
        chunks.push({
          startLine: Math.max(1, sym.startLine - contextLines),
          endLine: Math.min(summary.lineCount, sym.endLine + contextLines),
          reason: `Symbol "${sym.name}" (${sym.kind}) matches query`,
        });
      }
    }

    for (const exp of summary.exports) {
      if (exp.name.toLowerCase().includes(lowerQuery)) {
        const already = chunks.some(c => Math.abs(c.startLine - exp.line) < contextLines * 2);
        if (!already) {
          chunks.push({
            startLine: Math.max(1, exp.line - contextLines),
            endLine: Math.min(summary.lineCount, exp.line + contextLines),
            reason: `Export "${exp.name}" matches query`,
          });
        }
      }
    }

    chunks.sort((a, b) => a.startLine - b.startLine);
    return chunks;
  }

  formatCompact(): string {
    if (!this.data) return '(repo map not built)';

    const lines: string[] = [];
    const root = this.data.projectTree;
    this.renderCompactTree(root, '', lines, 0);

    return lines.join('\n');
  }

  private renderCompactTree(
    node: FileTreeNode, indent: string, output: string[], depth: number,
  ): void {
    if (depth > 4) return;

    const summary = this.data?.files.get(node.path);

    if (node.type === 'file') {
      if (!summary) {
        output.push(`${indent}${node.name}`);
        return;
      }
      const exportsList = summary.exports.map(e => `${e.name}`).join(', ');
      const dependsOn = this.getFileDependencies(node.path).slice(0, 5);
      const tags = [];
      if (exportsList) tags.push(`exports: [${exportsList}]`);
      if (dependsOn.length > 0) {
        tags.push(`depends: [${dependsOn.map(d => d.split('/').pop() || d).join(', ')}]`);
      }
      const tagStr = tags.length > 0 ? ` — ${summary.purpose}, ${tags.join(', ')}` : ` — ${summary.purpose}`;
      output.push(`${indent}${node.name}${tagStr}`);
    } else {
      const children = node.children || [];
      const fileChildren = children.filter(c => c.type === 'file');
      const childSummaries = fileChildren
        .map(c => this.data?.files.get(c.path))
        .filter(Boolean) as FileSummary[];
      const dirLines = childSummaries.reduce((sum, s) => sum + s.lineCount, 0);
      output.push(`${indent}${node.name}/ (${fileChildren.length} files, ${dirLines} lines)`);

      for (const child of children) {
        this.renderCompactTree(child, indent + '  ', output, depth + 1);
      }
    }
  }

  findMissingImports(): { importer: string; missing: string }[] {
    if (!this.data) return [];
    const missing: { importer: string; missing: string }[] = [];

    for (const [path, summary] of this.data.files) {
      for (const imp of summary.imports) {
        if (imp.source.startsWith('.')) {
          const resolved = normalizeImportSource(path, imp.source);
          if (resolved) {
            const fileKey = resolved.replace(/\/index\.(ts|tsx|js|jsx)$/, '').replace(/\.[^.]+$/, '');
            const exists = Array.from(this.data.files.keys()).some(fp =>
              fp === resolved ||
              fp.replace(/\/index\.(ts|tsx|js|jsx)$/, '').replace(/\.[^.]+$/, '') === fileKey ||
              fp.replace(/\.[^.]+$/, '') === resolved.replace(/\.[^.]+$/, ''),
            );
            if (!exists) {
              missing.push({ importer: path, missing: resolved });
            }
          }
        }
      }
    }

    return missing;
  }

  findOrphanFiles(): string[] {
    if (!this.data) return [];
    const imported = new Set<string>();

    for (const node of Object.values(this.data.dependencyGraph)) {
      for (const dep of node.usedBy) {
        imported.add(dep);
      }
    }

    return Array.from(this.data.files.keys())
      .filter(p => {
        const name = p.split('/').pop() || '';
        if (name.startsWith('main.') || name.startsWith('index.') || name === 'App.tsx' || name === 'App.jsx') {
          return false;
        }
        return !imported.has(p);
      })
      .sort();
  }

  findDuplicateSymbols(): { symbol: string; files: string[] }[] {
    if (!this.data) return [];
    const symbolMap = new Map<string, string[]>();

    for (const [path, summary] of this.data.files) {
      for (const sym of summary.symbols) {
        if (!symbolMap.has(sym.name)) {
          symbolMap.set(sym.name, []);
        }
        symbolMap.get(sym.name)!.push(path);
      }
      for (const exp of summary.exports) {
        if (!symbolMap.has(exp.name)) {
          symbolMap.set(exp.name, []);
        }
        const list = symbolMap.get(exp.name)!;
        if (!list.includes(path)) {
          list.push(path);
        }
      }
    }

    const result: { symbol: string; files: string[] }[] = [];
    for (const [symbol, fileList] of symbolMap) {
      if (fileList.length > 1) {
        result.push({ symbol, files: fileList });
      }
    }

    return result.sort((a, b) => b.files.length - a.files.length);
  }

  private async walkFiles(node: FileTreeNode): Promise<string[]> {
    const files: string[] = [];

    if (SKIP_DIRECTORIES.has(node.name)) return files;

    if (node.type === 'file') {
      if (isCodeFile(node.path)) {
        files.push(node.path);
      }
    } else if (node.children) {
      for (const child of node.children) {
        files.push(...await this.walkFiles(child));
      }
    }

    return files;
  }

  private discoverEntryPoints(
    files: Map<string, FileSummary>, framework: string, entryPoint: string,
  ): string[] {
    const candidates: string[] = [entryPoint];

    for (const path of files.keys()) {
      const lower = path.toLowerCase();
      if (
        lower.endsWith('/main.tsx') || lower.endsWith('/main.ts') ||
        lower.endsWith('/index.tsx') || lower.endsWith('/index.ts') ||
        lower.endsWith('/app.tsx') || lower.endsWith('/app.ts') ||
        path === entryPoint
      ) {
        if (!candidates.includes(path)) {
          candidates.push(path);
        }
      }
    }

    if (framework === 'Next.js') {
      for (const path of files.keys()) {
        if (path.includes('/pages/') || path.includes('/app/')) {
          if (!candidates.includes(path)) {
            candidates.push(path);
          }
        }
      }
    }

    return candidates;
  }

  private buildDependencyGraph(files: Map<string, FileSummary>): RepoMapData['dependencyGraph'] {
    const edges: Record<string, DependencyNode> = {};

    for (const path of files.keys()) {
      edges[path] = { path, dependsOn: [], usedBy: [] };
    }

    for (const [path, summary] of files) {
      for (const imp of summary.imports) {
        if (imp.source.startsWith('.')) {
          const resolved = normalizeImportSource(path, imp.source);
          if (resolved) {
            const match = Array.from(files.keys()).find(fp => {
              const normalized = fp.replace(/\/index\.(ts|tsx|js|jsx)$/, '').replace(/\.[^.]+$/, '');
              const resolvedNorm = resolved.replace(/\/index\.(ts|tsx|js|jsx)$/, '').replace(/\.[^.]+$/, '');
              return normalized === resolvedNorm || fp === resolved;
            });

            if (match) {
              edges[path]?.dependsOn.push(match);
              edges[match]?.usedBy.push(path);
            }
          }
        }

        {
          const externalMatch = Array.from(files.keys()).find(fp => {
            const norm = fp.replace('/node_modules/', '');
            return norm === imp.source || fp.endsWith(`/node_modules/${imp.source}/`);
          });
          if (externalMatch) {
            edges[path]?.dependsOn.push(externalMatch);
            edges[externalMatch]?.usedBy.push(path);
          }
        }
      }
    }

    const result: RepoMapData['dependencyGraph'] = {};
    for (const [path, edge] of Object.entries(edges)) {
      result[path] = edge;
    }
    return result;
  }
}

export const repoMapBuilder = new RepoMapBuilder();
