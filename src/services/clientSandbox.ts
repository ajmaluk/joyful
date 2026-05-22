export interface SandboxEvent {
  type: 'stdout' | 'stderr' | 'exit' | 'error';
  data: string | { code: number };
  timestamp: number;
}

interface VirtualFile {
  content: string;
  modified: number;
}

const VFS_MAX_FILES = 100;
const VFS_MAX_SIZE_BYTES = 5_000_000;
const ALLOWED_COMMANDS = new Set(['echo', 'ls', 'cat', 'pwd', 'npm']);
const FORBIDDEN_PATTERNS = ['rm ', 'rm-', 'mv ', 'shutdown', 'reboot', 'mkfs', 'dd ', '>:'];

class VirtualFS {
  private files = new Map<string, VirtualFile>();
  private totalSize = 0;

  constructor() {
    this.files.set('index.html', { content: '<!DOCTYPE html>\n<html>\n<head><title>Sandbox</title></head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>', modified: Date.now() });
    this.files.set('package.json', { content: '{\n  "name": "sandbox-project",\n  "version": "1.0.0"\n}', modified: Date.now() });
  }

  read(path: string): string | null {
    const file = this.files.get(normalizeSandboxPath(path));
    return file ? file.content : null;
  }

  write(path: string, content: string): boolean {
    const normalizedPath = normalizeSandboxPath(path);
    const existing = this.files.get(normalizedPath);
    const oldSize = existing ? existing.content.length : 0;
    const newSize = content.length;
    const sizeDelta = newSize - oldSize;

    if (this.totalSize + sizeDelta > VFS_MAX_SIZE_BYTES) {
      console.warn(`VFS: write to ${path} exceeds size limit`);
      return false;
    }
    if (!existing && this.files.size >= VFS_MAX_FILES) {
      console.warn(`VFS: max files (${VFS_MAX_FILES}) reached`);
      return false;
    }

    this.totalSize += sizeDelta;
    this.files.set(normalizedPath, { content, modified: Date.now() });
    return true;
  }

  list(dir = '.'): string[] {
    const safeDir = normalizeSandboxPath(dir);
    const prefix = safeDir === '.' ? '' : safeDir + '/';
    const entries = new Set<string>();
    for (const path of this.files.keys()) {
      if (path.startsWith(prefix)) {
        const relative = path.slice(prefix.length);
        const firstSegment = relative.split('/')[0];
        entries.add(firstSegment);
      }
    }
    return Array.from(entries).sort();
  }

  delete(path: string): boolean {
    const normalizedPath = normalizeSandboxPath(path);
    const existing = this.files.get(normalizedPath);
    if (existing) {
      this.totalSize -= existing.content.length;
    }
    return this.files.delete(normalizedPath);
  }

  reset(files: { path: string; content: string }[]): void {
    this.files.clear();
    this.totalSize = 0;
    for (const file of files) {
      this.write(file.path, file.content);
    }
  }

  all(): { path: string; content: string; modified: number }[] {
    return Array.from(this.files.entries()).map(([path, file]) => ({
      path,
      content: file.content,
      modified: file.modified,
    }));
  }
}

const vfsMap = new Map<string, VirtualFS>();

function getVFS(projectId = 'default'): VirtualFS {
  if (!vfsMap.has(projectId)) {
    vfsMap.set(projectId, new VirtualFS());
  }
  return vfsMap.get(projectId)!;
}

export function deleteVFS(projectId = 'default'): void {
  vfsMap.delete(projectId);
}

function isForbidden(command: string): string | null {
  const lowered = command.toLowerCase();
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (lowered.includes(pattern)) return `Command not allowed: contains '${pattern}'`;
  }
  return null;
}

function parseCommand(cmd: string): { command: string; args: string[] } {
  const parts = cmd.trim().match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  return {
    command: parts[0] || '',
    args: parts.slice(1).map(arg => arg.replace(/^"|"$/g, '')),
  };
}

function normalizeSandboxPath(path: string): string {
  const clean = path.trim().replace(/^\.\/+/, '').replace(/\/+/g, '/');
  if (!clean || clean === '/') return '.';
  const segments = clean.replace(/^\/+/, '').split('/');
  const resolved: string[] = [];
  for (const segment of segments) {
    if (segment === '..' || segment === '.' || segment === '') continue;
    resolved.push(segment);
  }
  return resolved.join('/');
}

function hasProjectEntry(): boolean {
  const v = getVFS();
  return Boolean(
    v.read('index.html') ||
    v.read('src/App.jsx') ||
    v.read('src/App.tsx') ||
    v.read('app/page.tsx') ||
    v.read('pages/index.tsx')
  );
}

function validateJsonFile(path: string): string | null {
  const content = getVFS().read(path);
  if (!content) return null;
  try {
    JSON.parse(content);
    return null;
  } catch (error) {
    return `${path}: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function validateBalancedSource(path: string): string | null {
  const content = getVFS().read(path);
  if (!content) return null;
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const closers = new Set(Object.values(pairs));
  const stack: string[] = [];
  let quote: string | null = null;
  let escaped = false;
  let line = 1;
  let column = 0;

  for (const char of content) {
    column += 1;
    if (char === '\n') {
      line += 1;
      column = 0;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (pairs[char]) {
      stack.push(pairs[char]);
    } else if (closers.has(char) && stack.pop() !== char) {
      return `${path}:${line}:${column}: unbalanced ${char}`;
    }
  }

  if (quote) return `${path}:${line}:${column}: unterminated string`;
  if (stack.length > 0) return `${path}:${line}:${column}: unclosed ${stack[stack.length - 1]}`;
  return null;
}

function getPackageDependencies(): Set<string> {
  const pkgContent = getVFS().read('package.json');
  if (!pkgContent) return new Set();
  try {
    const pkg = JSON.parse(pkgContent);
    return new Set([
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ]);
  } catch {
    return new Set();
  }
}

function dirname(path: string): string {
  const clean = normalizeSandboxPath(path);
  const parts = clean.split('/');
  parts.pop();
  return parts.join('/');
}

function resolveImportPath(sourcePath: string, specifier: string): string | null {
  const v = getVFS();
  const base = specifier.startsWith('@/')
    ? `src/${specifier.slice(2)}`
    : specifier.startsWith('.')
      ? normalizeSandboxPath(`${dirname(sourcePath)}/${specifier}`)
      : specifier;
  const candidates = [
    base,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.css`,
    `${base}.json`,
    `${base}/index.js`,
    `${base}/index.jsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ];
  return candidates.find(candidate => v.read(candidate) !== null) || null;
}

function packageNameFromSpecifier(specifier: string): string {
  if (specifier.startsWith('@')) {
    return specifier.split('/').slice(0, 2).join('/');
  }
  return specifier.split('/')[0];
}

function validateSourceImports(path: string): string[] {
  const content = getVFS().read(path);
  if (!content || !/\.(jsx|tsx|js|ts)$/i.test(path)) return [];
  const dependencies = getPackageDependencies();
  const errors: string[] = [];
  const importRegex = /(?:import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?|export\s+[\s\S]*?\s+from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(content)) !== null) {
    const specifier = match[1];
    if (!specifier) continue;

    if (specifier.startsWith('.') || specifier.startsWith('@/')) {
      if (!resolveImportPath(path, specifier)) {
        errors.push(`${path}: missing import "${specifier}"`);
      }
      continue;
    }

    const pkgName = packageNameFromSpecifier(specifier);
    if (!dependencies.has(pkgName) && !['react', 'react-dom'].includes(pkgName)) {
      errors.push(`${path}: package "${pkgName}" is imported but not listed in package.json`);
    }
  }

  return errors;
}

function getPackageScript(scriptName: string): string | null {
  const pkgContent = getVFS().read('package.json');
  if (!pkgContent) return null;
  try {
    const pkg = JSON.parse(pkgContent);
    return typeof pkg?.scripts?.[scriptName] === 'string' ? pkg.scripts[scriptName] : null;
  } catch {
    return null;
  }
}

async function* validateProjectBuild(scriptName: string): AsyncGenerator<SandboxEvent> {
  const script = getPackageScript(scriptName);
  if (!script) {
    yield { type: 'stderr', data: `npm error: missing script "${scriptName}"\n`, timestamp: Date.now() };
    yield { type: 'exit', data: { code: 1 }, timestamp: Date.now() };
    return;
  }

  yield { type: 'stdout', data: `> sandbox-project ${scriptName}\n> ${script}\n\n`, timestamp: Date.now() };

  const v = getVFS();
  const errors = [
    validateJsonFile('package.json'),
    ...v.all()
      .filter(file => /\.(jsx|tsx|js|ts|css)$/i.test(file.path))
      .map(file => validateBalancedSource(file.path)),
    ...v.all()
      .flatMap(file => validateSourceImports(file.path)),
  ].filter(Boolean) as string[];

  if (!hasProjectEntry()) {
    errors.push('No preview entry found. Add index.html or a React entry file.');
  }

  if (errors.length > 0) {
    for (const error of errors) {
      yield { type: 'stderr', data: `${error}\n`, timestamp: Date.now() };
    }
    yield { type: 'exit', data: { code: 1 }, timestamp: Date.now() };
    return;
  }

  yield {
    type: 'stdout',
    data: scriptName === 'lint' ? 'Lint check passed in browser sandbox.\n' : 'Build check passed in browser sandbox.\n',
    timestamp: Date.now(),
  };
}

async function* executeCommand(cmd: string): AsyncGenerator<SandboxEvent> {
  const forbidden = isForbidden(cmd);
  if (forbidden) {
    yield { type: 'error', data: forbidden, timestamp: Date.now() };
    return;
  }

  const { command, args } = parseCommand(cmd);

  if (!ALLOWED_COMMANDS.has(command)) {
    yield { type: 'error', data: `Command '${command}' not allowed in sandbox`, timestamp: Date.now() };
    return;
  }

  switch (command) {
    case 'echo':
      yield { type: 'stdout', data: args.join(' ') + '\n', timestamp: Date.now() };
      break;

    case 'pwd':
      yield { type: 'stdout', data: '/sandbox\n', timestamp: Date.now() };
      break;

    case 'ls': {
      const dir = args[0] || '.';
      const entries = getVFS().list(dir);
      yield { type: 'stdout', data: entries.join('  ') + '\n', timestamp: Date.now() };
      break;
    }

    case 'cat': {
      if (args.length === 0) {
        yield { type: 'stderr', data: 'cat: missing operand\n', timestamp: Date.now() };
      } else {
        for (const file of args) {
          const content = getVFS().read(file);
          if (content !== null) {
            yield { type: 'stdout', data: content + '\n', timestamp: Date.now() };
          } else {
            yield { type: 'stderr', data: `cat: ${file}: No such file or directory\n`, timestamp: Date.now() };
          }
        }
      }
      break;
    }

    case 'npm':
      if (args[0] === 'install' || args[0] === 'i') {
        yield { type: 'stdout', data: 'Simulating npm install...\n', timestamp: Date.now() };
        const pkgContent = getVFS().read('package.json');
        if (pkgContent) {
          try {
            const pkg = JSON.parse(pkgContent);
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };
            const depNames = Object.keys(deps);
            if (depNames.length > 0) {
              for (const dep of depNames.slice(0, 10)) {
                yield { type: 'stdout', data: `added ${dep}@${deps[dep]}\n`, timestamp: Date.now() };
              }
              yield { type: 'stdout', data: `\nadded ${depNames.length} packages\n`, timestamp: Date.now() };
            } else {
              yield { type: 'stdout', data: 'up to date, audited 0 packages\n', timestamp: Date.now() };
            }
          } catch {
            yield { type: 'stderr', data: 'npm error: invalid package.json\n', timestamp: Date.now() };
          }
        } else {
          yield { type: 'stdout', data: 'up to date, audited 0 packages\n', timestamp: Date.now() };
        }
      } else if (args[0] === 'run' && args[1]) {
        yield* validateProjectBuild(args[1]);
        return;
      } else if (args[0] === '-v' || args[0] === '--version') {
        yield { type: 'stdout', data: '10.8.1\n', timestamp: Date.now() };
      } else {
        yield { type: 'stderr', data: `npm: '${args[0]}' is not a supported npm command in sandbox\n`, timestamp: Date.now() };
      }
      break;

    case 'node': {
      if (args[0] === '-v' || args[0] === '--version') {
        yield { type: 'stdout', data: 'v22.14.0\n', timestamp: Date.now() };
      } else if (args[0] && args[0].endsWith('.js')) {
        const scriptContent = getVFS().read(args[0]);
        if (scriptContent === null) {
          yield { type: 'stderr', data: `node: ${args[0]}: No such file\n`, timestamp: Date.now() };
        } else {
          yield* executeNodeScript(scriptContent);
        }
      } else if (args[0] && args[0].endsWith('.ts')) {
        yield { type: 'stderr', data: 'node: TypeScript files must be compiled first. Use .js files in sandbox.\n', timestamp: Date.now() };
      } else {
        yield { type: 'stderr', data: 'node: usage: node <script.js>\n', timestamp: Date.now() };
      }
      break;
    }
  }

  yield { type: 'exit', data: { code: 0 }, timestamp: Date.now() };
}

async function* executeNodeScript(script: string): AsyncGenerator<SandboxEvent> {
  const logs: string[] = [];
  const errors: string[] = [];
  const EXECUTION_TIMEOUT = 5000;

  const sandboxConsole = {
    log: (...args: unknown[]) => { logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')); },
    warn: (...args: unknown[]) => { logs.push('[WARN] ' + args.map(a => String(a)).join(' ')); },
    error: (...args: unknown[]) => { errors.push(args.map(a => String(a)).join(' ')); },
    info: (...args: unknown[]) => { logs.push('[INFO] ' + args.map(a => String(a)).join(' ')); },
  };

  try {
    const wrappedScript = `
      'use strict';
      (function(require, console, restrictedGlobal, setTimeout, setInterval, clearTimeout, clearInterval, __timeout) {
        var __checkTimeout = function() { if (Date.now() - __timeout.start > __timeout.max) throw new Error('Script execution timeout'); };
        ${script}
      })
    `;

    const fn = new Function(wrappedScript)();

    const mockRequire = (moduleName: string) => {
      if (moduleName === 'fs' || moduleName === 'path' || moduleName === 'os') {
        return {};
      }
      throw new Error(`Cannot find module '${moduleName}' in sandbox`);
    };

    const cappedSetTimeout = (cb: () => void, ms: number) => {
      if (ms > 5000) ms = 5000;
      return setTimeout(cb, ms);
    };
    const cappedSetInterval = (cb: () => void, ms: number) => {
      if (ms > 5000) ms = 5000;
      return setInterval(cb, ms);
    };

    const restrictedGlobal = Object.freeze({
      Math,
      JSON,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      Error,
      TypeError,
      RangeError,
      SyntaxError,
      ReferenceError,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURI,
      decodeURI,
      encodeURIComponent,
      decodeURIComponent,
      Infinity,
      NaN,
      undefined,
    });

    const timeoutCtx = { start: Date.now(), max: EXECUTION_TIMEOUT };

    fn(
      mockRequire,
      sandboxConsole,
      restrictedGlobal,
      cappedSetTimeout,
      cappedSetInterval,
      clearTimeout,
      clearInterval,
      timeoutCtx,
    );

    for (const log of logs) {
      yield { type: 'stdout', data: log + '\n', timestamp: Date.now() };
    }
    for (const error of errors) {
      yield { type: 'stderr', data: error + '\n', timestamp: Date.now() };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield { type: 'stderr', data: `Error: ${message}\n`, timestamp: Date.now() };
  }
}

export async function executeInSandbox(command: string): Promise<SandboxEvent[]> {
  const events: SandboxEvent[] = [];
  for await (const event of executeCommand(command)) {
    events.push(event);
  }
  return events;
}

export async function* streamSandboxCommand(command: string): AsyncGenerator<SandboxEvent> {
  for await (const event of executeCommand(command)) {
    yield event;
  }
}

export function loadVirtualFS(files: { path: string; content: string }[], projectId = 'default'): void {
  const v = getVFS(projectId);
  v.reset(files);
}

export function getVirtualFS(projectId = 'default'): {
  read: (p: string) => string | null;
  write: (p: string, c: string) => void;
  list: (d?: string) => string[];
  delete: (p: string) => boolean;
  all: () => { path: string; content: string; modified: number }[];
} {
  const v = getVFS(projectId);
  return {
    read: (p: string) => v.read(p),
    write: (p: string, c: string) => v.write(p, c),
    list: (d?: string) => v.list(d),
    delete: (p: string) => v.delete(p),
    all: () => v.all(),
  };
}
