export interface SandboxEvent {
  type: 'stdout' | 'stderr' | 'exit' | 'error';
  data: string | { code: number };
  timestamp: number;
}

interface VirtualFile {
  content: string;
  modified: number;
}

const ALLOWED_COMMANDS = new Set(['echo', 'ls', 'cat', 'pwd', 'node', 'npm']);
const FORBIDDEN_PATTERNS = ['rm ', 'rm-', 'mv ', 'shutdown', 'reboot', 'mkfs', 'dd ', '>:'];

class VirtualFS {
  private files = new Map<string, VirtualFile>();

  constructor() {
    this.files.set('index.html', { content: '<!DOCTYPE html>\n<html>\n<head><title>Sandbox</title></head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>', modified: Date.now() });
    this.files.set('package.json', { content: '{\n  "name": "sandbox-project",\n  "version": "1.0.0"\n}', modified: Date.now() });
  }

  read(path: string): string | null {
    const file = this.files.get(normalizeSandboxPath(path));
    return file ? file.content : null;
  }

  write(path: string, content: string): void {
    this.files.set(normalizeSandboxPath(path), { content, modified: Date.now() });
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
    return this.files.delete(normalizeSandboxPath(path));
  }

  reset(files: { path: string; content: string }[]): void {
    this.files.clear();
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

const vfs = new VirtualFS();

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
  return clean.replace(/^\/+/, '');
}

function hasProjectEntry(): boolean {
  return Boolean(
    vfs.read('index.html') ||
    vfs.read('src/App.jsx') ||
    vfs.read('src/App.tsx') ||
    vfs.read('app/page.tsx') ||
    vfs.read('pages/index.tsx')
  );
}

function validateJsonFile(path: string): string | null {
  const content = vfs.read(path);
  if (!content) return null;
  try {
    JSON.parse(content);
    return null;
  } catch (error) {
    return `${path}: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function validateBalancedSource(path: string): string | null {
  const content = vfs.read(path);
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

function getPackageScript(scriptName: string): string | null {
  const pkgContent = vfs.read('package.json');
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

  const errors = [
    validateJsonFile('package.json'),
    ...vfs.all()
      .filter(file => /\.(jsx|tsx|js|ts|css)$/i.test(file.path))
      .map(file => validateBalancedSource(file.path)),
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
      const entries = vfs.list(dir);
      yield { type: 'stdout', data: entries.join('  ') + '\n', timestamp: Date.now() };
      break;
    }

    case 'cat': {
      if (args.length === 0) {
        yield { type: 'stderr', data: 'cat: missing operand\n', timestamp: Date.now() };
      } else {
        for (const file of args) {
          const content = vfs.read(file);
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
        const pkgContent = vfs.read('package.json');
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
        const scriptContent = vfs.read(args[0]);
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

  const sandboxConsole = {
    log: (...args: unknown[]) => { logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')); },
    warn: (...args: unknown[]) => { logs.push('[WARN] ' + args.map(a => String(a)).join(' ')); },
    error: (...args: unknown[]) => { errors.push(args.map(a => String(a)).join(' ')); },
    info: (...args: unknown[]) => { logs.push('[INFO] ' + args.map(a => String(a)).join(' ')); },
  };

  try {
    const wrappedScript = `
      (function(require, console, globalThis, setTimeout, setInterval, clearTimeout, clearInterval) {
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

    fn(
      mockRequire,
      sandboxConsole,
      globalThis,
      cappedSetTimeout,
      cappedSetInterval,
      clearTimeout,
      clearInterval,
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

export function loadVirtualFS(files: { path: string; content: string }[]): void {
  vfs.reset(files);
}

export function getVirtualFS(): {
  read: (p: string) => string | null;
  write: (p: string, c: string) => void;
  list: (d?: string) => string[];
  delete: (p: string) => boolean;
  all: () => { path: string; content: string; modified: number }[];
} {
  return {
    read: (p: string) => vfs.read(p),
    write: (p: string, c: string) => vfs.write(p, c),
    list: (d?: string) => vfs.list(d),
    delete: (p: string) => vfs.delete(p),
    all: () => vfs.all(),
  };
}
