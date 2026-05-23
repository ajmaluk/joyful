export interface FileSummary {
  path: string;
  language: string;
  lineCount: number;
  size: number;
  contentHash: string;
  imports: { source: string; symbols: string[]; type: 'named' | 'default' | 'side_effect' }[];
  exports: { name: string; kind: 'component' | 'function' | 'class' | 'interface' | 'type' | 'const' | 'default'; line: number }[];
  symbols: { name: string; kind: 'component' | 'function' | 'class' | 'interface' | 'type' | 'hook' | 'const' | 'route'; startLine: number; endLine: number; signature: string }[];
  purpose: string;
}

const LANGUAGE_MAP: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript React',
  js: 'JavaScript',
  jsx: 'JavaScript React',
  mjs: 'JavaScript (ESM)',
  cjs: 'JavaScript (CommonJS)',
  css: 'CSS',
  scss: 'SCSS',
  less: 'Less',
  html: 'HTML',
  json: 'JSON',
  md: 'Markdown',
  svg: 'SVG',
  xml: 'XML',
  yml: 'YAML',
  yaml: 'YAML',
  toml: 'TOML',
  py: 'Python',
  rs: 'Rust',
  go: 'Go',
  vue: 'Vue',
  svelte: 'Svelte',
  astro: 'Astro',
  graphql: 'GraphQL',
  gql: 'GraphQL',
  prisma: 'Prisma',
  sql: 'SQL',
  sh: 'Shell',
  bash: 'Shell',
  zsh: 'Shell',
  dockerfile: 'Dockerfile',
  tf: 'Terraform',
  lock: 'Lockfile',
};

export class FileSummarizer {
  summarizeFile(path: string, content: string): FileSummary {
    const language = this.detectLanguage(path);
    const lineCount = content === '' ? 0 : content.split('\n').length;
    const size = content.length;
    const contentHash = this.computeContentHash(content);
    const imports = this.parseImports(content);
    const exports = this.parseExports(content, language);
    const symbols = this.parseSymbols(content, language, path);
    const purpose = this.inferPurpose(path, imports, symbols);

    return {
      path,
      language,
      lineCount,
      size,
      contentHash,
      imports,
      exports,
      symbols,
      purpose,
    };
  }

  computeContentHash(content: string): string {
    let hash = 5381;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) + hash + content.charCodeAt(i)) | 0;
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    return LANGUAGE_MAP[ext] || ext.toUpperCase() || 'Unknown';
  }

  private parseImports(content: string): FileSummary['imports'] {
    const imports: FileSummary['imports'] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      const namedImport = trimmed.match(
        /^import\s+(?:\{[^}]*\})\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/,
      );
      if (namedImport) {
        const symbols = (namedImport[0].match(/\{\s*([^}]+)\s*\}/)?.[1] || '')
          .split(',')
          .map(s => s.trim().split(/\s+as\s+/)[0].trim())
          .filter(Boolean);
        imports.push({ source: namedImport[1], symbols, type: 'named' });
        continue;
      }

      const defaultImport = trimmed.match(
        /^import\s+(\w+)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/,
      );
      if (defaultImport) {
        imports.push({ source: defaultImport[2], symbols: [defaultImport[1]], type: 'default' });
        continue;
      }

      const mixedImport = trimmed.match(
        /^import\s+(\w+)\s*,\s*\{(?:[^}]*)\}\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/,
      );
      if (mixedImport) {
        const namedSymbols = (mixedImport[0].match(/\{\s*([^}]+)\s*\}/)?.[1] || '')
          .split(',')
          .map(s => s.trim().split(/\s+as\s+/)[0].trim())
          .filter(Boolean);
        imports.push({
          source: mixedImport[2],
          symbols: [mixedImport[1], ...namedSymbols],
          type: 'named',
        });
        continue;
      }

      const sideEffect = trimmed.match(/^import\s+['"]([^'"]+)['"]\s*;?\s*$/);
      if (sideEffect) {
        imports.push({ source: sideEffect[1], symbols: [], type: 'side_effect' });
        continue;
      }

      const requireImport = trimmed.match(
        /^(?:const|let|var)\s+(?:\{[^}]*\}|(\w+))\s*=\s*require\(['"]([^'"]+)['"]\)\s*;?\s*$/,
      );
      if (requireImport) {
        const symbols = requireImport[1]
          ? [requireImport[1]]
          : (requireImport[0].match(/\{\s*([^}]+)\s*\}/)?.[1] || '')
              .split(',')
              .map(s => s.trim())
              .filter(Boolean);
        imports.push({ source: requireImport[2], symbols, type: 'named' });
        continue;
      }

      const dynamicImportLine = trimmed.match(
        /import\s*\(\s*['"]([^'"]+)['"]\s*\)/,
      );
      if (dynamicImportLine) {
        imports.push({ source: dynamicImportLine[1], symbols: [], type: 'side_effect' });
        continue;
      }

      const exportFromReExport = trimmed.match(
        /^export\s+\{[^}]*\}\s*from\s+['"]([^'"]+)['"]\s*;?\s*$/,
      );
      if (exportFromReExport) {
        const symbols = (trimmed.match(/\{\s*([^}]+)\s*\}/)?.[1] || '')
          .split(',')
          .map(s => s.trim().split(/\s+as\s+/)[0].trim())
          .filter(Boolean);
        imports.push({ source: exportFromReExport[1], symbols, type: 'named' });
        continue;
      }

      const exportDefaultReExport = trimmed.match(
        /^export\s+\{\s*default\s*\}\s*from\s+['"]([^'"]+)['"]\s*;?\s*$/,
      );
      if (exportDefaultReExport) {
        imports.push({ source: exportDefaultReExport[1], symbols: ['default'], type: 'named' });
        continue;
      }

      const exportNamespaceReExport = trimmed.match(
        /^export\s+\*\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/,
      );
      if (exportNamespaceReExport) {
        imports.push({ source: exportNamespaceReExport[1], symbols: ['*'], type: 'named' });
        continue;
      }
    }

    return imports;
  }

  private parseExports(content: string, _language: string): FileSummary['exports'] {
    const exports: FileSummary['exports'] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      const exportDefault = trimmed.match(/^export\s+default\s+(?:function\s+)?(\w+)/);
      if (exportDefault) {
        exports.push({ name: exportDefault[1], kind: 'default', line: i + 1 });
        continue;
      }

      const anonDefault = trimmed.match(/^export\s+default\s*(?:\{|\(|class\s+)/);
      if (anonDefault) {
        const fileName = this.inferDefaultExportName(lines, i);
        exports.push({ name: fileName || 'default', kind: 'default', line: i + 1 });
        continue;
      }

      const exportConst = trimmed.match(/^export\s+const\s+(\w+)/);
      if (exportConst) {
        exports.push({ name: exportConst[1], kind: 'const', line: i + 1 });
        continue;
      }

      const exportFunction = trimmed.match(/^export\s+(?:async\s+)?function\s+(\w+)/);
      if (exportFunction) {
        exports.push({ name: exportFunction[1], kind: 'function', line: i + 1 });
        continue;
      }

      const exportClass = trimmed.match(/^export\s+class\s+(\w+)/);
      if (exportClass) {
        exports.push({ name: exportClass[1], kind: 'class', line: i + 1 });
        continue;
      }

      const exportInterface = trimmed.match(/^export\s+interface\s+(\w+)/);
      if (exportInterface) {
        exports.push({ name: exportInterface[1], kind: 'interface', line: i + 1 });
        continue;
      }

      const exportType = trimmed.match(/^export\s+type\s+(\w+)/);
      if (exportType) {
        exports.push({ name: exportType[1], kind: 'type', line: i + 1 });
        continue;
      }

      const namedExports = trimmed.match(/^export\s+\{\s*([^}]+)\s*\};?\s*$/);
      if (namedExports) {
        const names = namedExports[1]
          .split(',')
          .map(s => s.trim().split(/\s+as\s+/)[0].trim().replace(/\s+as\s+/, ''))
          .filter(Boolean);
        for (const name of names) {
          if (!exports.some(e => e.name === name)) {
            exports.push({ name, kind: 'const', line: i + 1 });
          }
        }
        continue;
      }
    }

    return exports;
  }

  private parseSymbols(content: string, _language: string, path: string): FileSummary['symbols'] {
    const symbols: FileSummary['symbols'] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      const arrowComponent = trimmed.match(
        /^(?:export\s+)?(?:default\s+)?(?:const\s+)?(\w+)\s*(?::\s*(?:React\.)?FC[^=]*)?=\s*(?:\([^)]*\)|(\w+))\s*:\s*(?:React\.)?ReactNode\s*=>/,
      );
      if (arrowComponent && this.isLikelyComponent(i, lines)) {
        symbols.push(this.makeSymbolFromMatch(lines, i, trimmed, arrowComponent[1], 'component'));
        continue;
      }

      const arrowFC = trimmed.match(
        /^(?:export\s+)?(?:default\s+)?(?:const\s+)?(\w+)\s*(?::\s*(?:React\.)?FC\s*)?=\s*(?:\([^)]*\)|(?:async\s+)?\([^)]*\))\s*=>\s*(?:\{|<)/,
      );
      if (arrowFC) {
        symbols.push(this.makeSymbolFromMatch(lines, i, trimmed, arrowFC[1], 'component'));
        continue;
      }

      const hookMatch = trimmed.match(
        /^(?:export\s+)?(?:default\s+)?(?:const\s+)?(use[A-Z]\w*)\s*(?::\s*[^=]+)?=\s*(?:\([^)]*\)|(?:async\s+)?\([^)]*\))\s*=>/,
      );
      if (hookMatch) {
        symbols.push(this.makeSymbolFromMatch(lines, i, trimmed, hookMatch[1], 'hook'));
        continue;
      }

      const functionMatch = trimmed.match(
        /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+(\w+)/,
      );
      if (functionMatch) {
        const name = functionMatch[1];
        const isComponent = /^[A-Z]/.test(name) && (trimmed.includes('JSX') || trimmed.includes('React') || this.hasJsxInBody(lines, i));
        symbols.push(this.makeSymbolFromMatch(lines, i, trimmed, name, isComponent ? 'component' : 'function'));
        continue;
      }

      const classMatch = trimmed.match(
        /^(?:export\s+)?(?:default\s+)?class\s+(\w+)/,
      );
      if (classMatch) {
        symbols.push(this.makeSymbolFromMatch(lines, i, trimmed, classMatch[1], 'class'));
        continue;
      }

      const interfaceMatch = trimmed.match(
        /^(?:export\s+)?(?:default\s+)?interface\s+(\w+)/,
      );
      if (interfaceMatch) {
        symbols.push({
          name: interfaceMatch[1],
          kind: 'interface',
          startLine: i + 1,
          endLine: this.findBlockEnd(lines, i),
          signature: this.extractSignature(lines, i, this.findBlockEnd(lines, i) - 1),
        });
        continue;
      }

      const typeAlias = trimmed.match(
        /^(?:export\s+)?(?:default\s+)?type\s+(\w+)\s*=/,
      );
      if (typeAlias) {
        symbols.push({
          name: typeAlias[1],
          kind: 'type',
          startLine: i + 1,
          endLine: i + 1,
          signature: trimmed,
        });
        continue;
      }

      const constMatch = trimmed.match(
        /^(?:export\s+)?(?:default\s+)?const\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*(?:['"`\[]|true|false|null|\d|new\s+)/,
      );
      if (constMatch && !this.isHookOrComponent(trimmed) && !this.isEnumLike(lines, i)) {
        symbols.push({
          name: constMatch[1],
          kind: 'const',
          startLine: i + 1,
          endLine: i + 1,
          signature: trimmed,
        });
        continue;
      }

      const arrowFunction = trimmed.match(
        /^(?:export\s+)?(?:default\s+)?(?:const\s+)?(\w+)\s*(?::\s*[^=]+)?\s*=\s*(?:async\s+)?(?:\([^)]*\)|\w+)\s*=>/,
      );
      if (arrowFunction && !this.isHookOrComponent(trimmed) && !this.isLikelyConst(i, lines)) {
        symbols.push(this.makeSymbolFromMatch(lines, i, trimmed, arrowFunction[1], 'function'));
        continue;
      }
    }

    const routeNames = this.extractRouteNames(lines, path);
    for (const route of routeNames) {
      if (!symbols.some(s => s.name === route.name)) {
        symbols.push(route);
      }
    }

    return symbols;
  }

  private makeSymbolFromMatch(
    lines: string[], lineIdx: number, _trimmed: string, name: string, kind: FileSummary['symbols'][0]['kind'],
  ): FileSummary['symbols'][0] {
    const endLine = this.findArrowBodyEnd(lines, lineIdx);
    return {
      name,
      kind,
      startLine: lineIdx + 1,
      endLine: endLine,
      signature: this.extractSignature(lines, lineIdx, endLine - 1),
    };
  }

  private isHookOrComponent(trimmed: string): boolean {
    return /^export\s+(?:default\s+)?(?:const\s+)?(use[A-Z]|[A-Z])\w*\s*(?::\s*(?:React\.)?FC)?\s*=\s*(?:\(|async\s*\()/.test(trimmed);
  }

  private isLikelyComponent(lineIdx: number, lines: string[]): boolean {
    for (let j = lineIdx + 1; j < Math.min(lineIdx + 5, lines.length); j++) {
      const t = lines[j].trim();
      if (t.includes('return') && (t.includes('<') || t.includes('jsx') || t.includes('JSX'))) return true;
      if (t.startsWith('<') || t.includes('</')) return true;
    }
    return false;
  }

  private isLikelyConst(_lineIdx: number, _lines: string[]): boolean {
    return false;
  }

  private hasJsxInBody(lines: string[], startLine: number): boolean {
    let depth = 0;
    for (let i = startLine + 1; i < Math.min(startLine + 15, lines.length); i++) {
      const t = lines[i].trim();
      if (t.includes('return') && (t.includes('<') || t.includes('</') || t.includes('/>'))) return true;
      if (t.startsWith('<') && !t.startsWith('<!--')) return true;
      if (t.includes('<') && t.includes('>') && !t.startsWith('//') && !t.startsWith('*')) return true;
      const opens = (t.match(/</g) || []).length;
      const closes = (t.match(/>/g) || []).length;
      depth += opens - closes;
      if (depth > 0) return true;
    }
    return false;
  }

  private findBlockEnd(lines: string[], startLine: number): number {
    let depth = 0;
    let started = false;
    for (let i = startLine; i < lines.length; i++) {
      const stripped = lines[i].replace(/\/\/.*$/, '').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const ch of stripped) {
        if (ch === '{') { depth++; started = true; }
        if (ch === '}') depth--;
      }
      if (started && depth <= 0) return i + 1;
    }
    return lines.length;
  }

  private findArrowBodyEnd(lines: string[], startLine: number): number {
    let i = startLine;
    const firstLine = lines[startLine];

    const opens = (firstLine.match(/\(/g) || []).length;
    const closes = (firstLine.match(/\)/g) || []).length;
    if (opens !== closes) {
      for (i = startLine + 1; i < Math.min(startLine + 10, lines.length); i++) {
        const parensOpen = (lines[i].match(/\(/g) || []).length;
        const parensClose = (lines[i].match(/\)/g) || []).length;
        if (parensOpen !== parensClose) {
          return i + 1;
        }
      }
    }

    const arrowLine = firstLine.includes('=>') ? startLine : startLine + 1;
    const bodyStart = lines.slice(0, arrowLine + 1).join(' ');

    if (bodyStart.includes('=>') && bodyStart.includes('{')) {
      return this.findBlockEnd(lines, arrowLine);
    }

    for (let j = arrowLine; j < lines.length; j++) {
      if (j === arrowLine && firstLine.includes('=>') && !firstLine.includes('{')) {
        if (firstLine.trimEnd().endsWith(';')) return j + 1;
        const exprMatch = firstLine.match(/=>\s*([^;{]+);?$/);
        if (exprMatch) return j + 1;
      }
      if (j > arrowLine) {
        const trimmed = lines[j].trim();
        if (trimmed.startsWith('}') || trimmed === '' || trimmed.startsWith('export') || trimmed.startsWith('import')) {
          return j;
        }
      }
    }
    return Math.min(startLine + 3, lines.length);
  }

  private isEnumLike(lines: string[], lineIdx: number): boolean {
    for (let j = lineIdx + 1; j < Math.min(lineIdx + 30, lines.length); j++) {
      const t = lines[j].trim();
      if (t.match(/^\w+\s*[:=]\s*['"`]/) || t.match(/^\w+\s*[:=]\s*\d/)) {
        if (j > lineIdx + 1) return true;
      } else if (t === '' || t.startsWith('}') || t.startsWith('export') || t.startsWith('//')) {
        continue;
      } else {
        return false;
      }
    }
    return false;
  }

  private extractRouteNames(lines: string[], path: string): FileSummary['symbols'] {
    const routes: FileSummary['symbols'] = [];

    if (path.includes('/routes/') || path.includes('/pages/')) {
      const fileName = path.split('/').pop()?.replace(/\.(tsx|ts|jsx|js)$/, '') || '';
      if (fileName && fileName !== 'index') {
        routes.push({
          name: fileName,
          kind: 'route',
          startLine: 1,
          endLine: lines.length,
          signature: `Route: ${fileName}`,
        });
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      const routeDef = trimmed.match(
        /(?:path|route|pattern|to)\s*[:=]\s*['"`](\/[^'"`]*)['"`]/,
      );
      if (routeDef) {
        const routeName = routeDef[1];
        if (!routes.some(r => r.name === routeName)) {
          routes.push({
            name: routeName,
            kind: 'route',
            startLine: i + 1,
            endLine: i + 1,
            signature: `Route path: ${routeName}`,
          });
        }
      }
    }

    return routes;
  }

  private extractSignature(lines: string[], startIdx: number, endIdx: number): string {
    const relevant = lines.slice(startIdx, endIdx + 1);
    const sig: string[] = [];
    let braceCount = 0;

    for (const line of relevant) {
      sig.push(line);
      for (const ch of line) {
        if (ch === '{') braceCount++;
        if (ch === '}') braceCount--;
      }
      if (braceCount <= 0 && /^\s*[};)]/.test(line)) break;
      if (braceCount > 0 && sig.length > 20) {
        sig.push('  ...');
        break;
      }
    }

    return sig.join('\n').slice(0, 500);
  }

  private inferDefaultExportName(lines: string[], exportLine: number): string {
    for (let j = exportLine + 1; j < Math.min(exportLine + 20, lines.length); j++) {
      const trimmed = lines[j].trim();
      const classDecl = trimmed.match(/^class\s+(\w+)/);
      if (classDecl) return classDecl[1];

      const functionDecl = trimmed.match(/^(?:async\s+)?function\s*\*\s*(\w+)/);
      if (functionDecl) return functionDecl[1];
    }
    return '';
  }

  private inferPurpose(path: string, imports: FileSummary['imports'], symbols: FileSummary['symbols']): string {
    const lower = path.toLowerCase();
    const fileName = path.split('/').pop() || '';
    const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
    if (lower.includes('/components/') || lower.includes('/ui/') || lower.includes('/widgets/')) {
      const comp = symbols.find(s => s.kind === 'component') || symbols[0];
      return `${comp?.name || nameWithoutExt} UI component`;
    }

    if (lower.includes('/pages/') || lower.includes('/routes/') || lower.includes('/views/')) {
      const route = symbols.find(s => s.kind === 'route');
      return `${route?.name || nameWithoutExt} page route`;
    }

    if (lower.includes('/hooks/') || lower.includes('/use-')) {
      const hook = symbols.find(s => s.kind === 'hook');
      return `${hook?.name || nameWithoutExt} React hook`;
    }

    if (lower.includes('/utils/') || lower.includes('/helpers/') || lower.includes('/lib/')) {
      return `${nameWithoutExt} utility module`;
    }

    if (lower.includes('/types/') || lower.includes('/interfaces/') || lower.endsWith('.d.ts')) {
      return `${nameWithoutExt} type definitions`;
    }

    if (lower.includes('/api/') || lower.includes('/services/') || lower.includes('/queries/')) {
      return `${nameWithoutExt} API service`;
    }

    if (lower.includes('/store/') || lower.includes('/state/') || lower.includes('/atoms/')) {
      return `${nameWithoutExt} state management`;
    }

    if (lower.includes('/layouts/') || lower.includes('/templates/')) {
      return `${nameWithoutExt} layout template`;
    }

    if (lower.includes('/styles/') || lower.includes('/themes/') || lower.endsWith('.css')) {
      return `${nameWithoutExt} styles`;
    }

    if (lower.endsWith('.config.ts') || lower.endsWith('.config.js')) {
      return `${nameWithoutExt} configuration`;
    }

    if (lower === '/src/main.tsx' || lower === '/src/main.ts' || lower === '/src/index.tsx' || lower === '/src/index.ts') {
      return 'Application entry point';
    }

    if (lower === '/src/app.tsx' || lower === '/src/app.ts') {
      return 'Root application component';
    }

    if (path.includes('__tests__') || path.includes('.test.') || path.includes('.spec.')) {
      return `${nameWithoutExt} tests`;
    }

    const reactImports = imports.filter(i => i.source === 'react' || i.source.startsWith('react/'));
    const routerImports = imports.filter(i => i.source.includes('router'));
    const dbImports = imports.filter(i => i.source.includes('sql') || i.source.includes('db') || i.source.includes('prisma'));
    const serverImports = imports.filter(i => i.source.includes('server') || i.source.includes('api'));

    if (dbImports.length > 0) return `${nameWithoutExt} data access`;
    if (serverImports.length > 0) return `${nameWithoutExt} server endpoint`;
    if (routerImports.length > 0) return `${nameWithoutExt} routing`;

    const topSymbol = symbols[0];
    if (topSymbol) {
      return `${topSymbol.name} (${topSymbol.kind})`;
    }

    const importNames = imports.map(i => i.source);
    if (reactImports.length > 0) {
      return `${nameWithoutExt} React component`;
    }
    if (importNames.length > 0) {
      return `${nameWithoutExt} module (depends on ${importNames.slice(0, 3).join(', ')})`;
    }

    return `${nameWithoutExt} module`;
  }
}

export const fileSummarizer = new FileSummarizer();
