export class APIError extends Error {
  json: any
  text?: string

  constructor(message: string, json: any, text?: string) {
    super(message)
    this.name = 'APIError'
    this.json = json
    this.text = text
  }
}

export interface SandboxOptions {
  timeout?: number
  ports?: number[]
}

export interface RunCommandOptions {
  cmd: string
  args?: string[]
  detached?: boolean
  sudo?: boolean
}

export class Command {
  cmdId: string
  startedAt: number
  exitCode: number | null = null
  private _cmd: string
  private _args: string[]

  constructor(cmdId: string, cmd: string, args: string[]) {
    this.cmdId = cmdId
    this.startedAt = Date.now()
    this._cmd = cmd
    this._args = args
  }

  async wait() {
    this.exitCode = 0
    return {
      exitCode: 0,
      stdout: async () => `[sandbox] Executing: ${this._cmd} ${this._args.join(' ')}`,
      stderr: async () => '',
    }
  }

  async *logs() {
    yield {
      data: `[sandbox] Starting: ${this._cmd} ${this._args.join(' ')}\n`,
      stream: 'stdout' as const,
      timestamp: Date.now(),
    }
    yield {
      data: `[sandbox] Completed successfully.\n`,
      stream: 'stdout' as const,
      timestamp: Date.now(),
    }
  }
}

let sandboxCounter = 0
const MAX_SANDBOXES = 20

export class MockSandbox {
  sandboxId: string
  ports: number[]
  files: Map<string, string> = new Map()
  commands: Map<string, Command> = new Map()

  constructor(sandboxId: string, ports: number[] = []) {
    this.sandboxId = sandboxId
    this.ports = ports
  }

  async writeFiles(files: { path: string; content: Buffer }[]) {
    for (const f of files) {
      const normalizedPath = f.path.startsWith('/') ? f.path : '/' + f.path
      this.files.set(normalizedPath, f.content.toString('utf8'))
    }
  }

  async readFile(options: { path: string }) {
    const normalizedPath = options.path.startsWith('/') ? options.path : '/' + options.path
    const content = this.files.get(normalizedPath)
    if (content === undefined) return null
    return Buffer.from(content, 'utf8')
  }

  async runCommand(options: RunCommandOptions) {
    const cmdId = 'cmd_' + Math.random().toString(36).substring(2, 8)
    const cmd = new Command(cmdId, options.cmd, options.args ?? [])
    this.commands.set(cmdId, cmd)

    const fullCmd = [options.cmd, ...(options.args ?? [])].join('\n')
    const filesToWrite: { path: string; content: Buffer }[] = []

    if (fullCmd.includes('files = {') || fullCmd.includes('files={')) {
      const fileRegex = /['"]([^'"]+)['"]\s*:\s*(?:r?'''([\s\S]*?)'''|r?["']([\s\S]*?)["'])/g
      let match
      while ((match = fileRegex.exec(fullCmd)) !== null) {
        filesToWrite.push({
          path: match[1].trim(),
          content: Buffer.from(match[2] || match[3] || '', 'utf8')
        })
      }
    } else if (fullCmd.includes('cat <<') || fullCmd.includes('cat >')) {
      const catRegexA = /cat\s*<<\s*['"]?(\w+)['"]?\s*>\s*(\S+)\n([\s\S]*?)\n\1/g
      let match
      while ((match = catRegexA.exec(fullCmd)) !== null) {
        filesToWrite.push({
          path: match[2].trim().replace(/['"]/g, ''),
          content: Buffer.from(match[3] || '', 'utf8')
        })
      }
      const catRegexB = /cat\s*>\s*(\S+)\s*<<\s*['"]?(\w+)['"]?\n([\s\S]*?)\n\2/g
      while ((match = catRegexB.exec(fullCmd)) !== null) {
        filesToWrite.push({
          path: match[1].trim().replace(/['"]/g, ''),
          content: Buffer.from(match[3] || '', 'utf8')
        })
      }
    } else if (fullCmd.includes('apply_patch') || fullCmd.includes('patch')) {
      const fileBlocks = fullCmd.split(/\*\*\*\s+(?:Add|Modify)\s+File:\s*/i)
      for (let i = 1; i < fileBlocks.length; i++) {
        const block = fileBlocks[i]
        const lines = block.split('\n')
        const filePath = lines[0].trim().replace(/['"]/g, '')
        const contentLines: string[] = []
        const hasPlusPrefixes = lines.slice(1).some(line => line.startsWith('+') && !line.startsWith('+++'))
        for (let j = 1; j < lines.length; j++) {
          const line = lines[j]
          if (line.startsWith('***') || line.includes('*** End Patch') || line.startsWith('PATCH')) break
          if (hasPlusPrefixes) {
            if (line.startsWith('+')) contentLines.push(line.substring(1))
            else if (line.startsWith(' ')) contentLines.push(line.substring(1))
            else if (!line.startsWith('-')) contentLines.push(line)
          } else {
            contentLines.push(line)
          }
        }
        if (filePath) {
          filesToWrite.push({ path: filePath, content: Buffer.from(contentLines.join('\n'), 'utf8') })
        }
      }
    }

    if (filesToWrite.length > 0) {
      await this.writeFiles(filesToWrite)
    }

    return cmd
  }

  async getCommand(cmdId: string) {
    const cmd = this.commands.get(cmdId)
    if (!cmd) throw new Error(`Command not found: ${cmdId}`)
    return cmd
  }

  getCommandSync(cmdId: string) {
    const cmd = this.commands.get(cmdId)
    if (!cmd) return null
    return cmd
  }

  async getURL(_port?: number) {
    return this.buildPreviewHtmlUrl()
  }

  buildPreviewHtmlUrl(): string {
    return URL.createObjectURL(
      new Blob([this.buildPreviewHtml()], { type: 'text/html' })
    )
  }

  buildPreviewHtml(): string {
    const files: Record<string, string> = {}
    for (const [key, value] of this.files.entries()) {
      files[key] = value
    }

    const safeJson = JSON.stringify(files).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Preview</title>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide-react/dist/umd/lucide-react.js"></script>
  <style>body{margin:0;padding:0;background-color:#f9fafb}</style>
</head>
<body><div id="root"></div>
<script>
window.__VFS__ = ${safeJson};
const moduleCache = {};
function resolvePath(importPath, currentDir) {
  if (importPath === 'react' || importPath === 'react-dom' || importPath === 'lucide-react') return importPath;
  let absolute = importPath;
  if (importPath.startsWith('@/')) absolute = '/' + importPath.substring(2);
  else if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const parts = (currentDir||'/').split('/').filter(Boolean);
    if (currentDir.includes('.')) parts.pop();
    for (const p of importPath.split('/')) {
      if (p === '..') parts.pop(); else if (p !== '.' && p !== '') parts.push(p);
    }
    absolute = '/' + parts.join('/');
  } else absolute = importPath.startsWith('/') ? importPath : '/' + importPath;
  for (const c of [absolute, absolute+'.tsx', absolute+'.ts', absolute+'.jsx', absolute+'.js', absolute+'/index.tsx', absolute+'/index.ts', absolute+'/index.jsx', absolute+'/index.js']) {
    if (window.__VFS__[c] !== undefined) return c;
  }
  return absolute;
}
function require(path, currentFile) {
  const np = resolvePath(path, currentFile||'/');
  if (moduleCache[np]) return moduleCache[np].exports;
  if (np === 'react') return window.React;
  if (np === 'react-dom') return window.ReactDOM;
  if (np === 'lucide-react') return new Proxy({},{get:(t,p)=>window.LucideReact?.[p]||(()=>React.createElement('svg',{width:24,height:24,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2},React.createElement('circle',{cx:12,cy:12,r:10})))});
  const fc = window.__VFS__[np];
  if (fc !== undefined) {
    const m = {exports:{}};
    moduleCache[np] = m;
    try {
      const code = Babel.transform(fc,{filename:np,presets:['react','typescript'],plugins:[Babel.availablePlugins['transform-modules-commonjs']]}).code;
      new Function('require','exports','module',code)((p)=>require(p,np),m.exports,m);
    } catch(e) {
      console.error("Compile error in "+np+":",e);
      throw e;
    }
    return m.exports;
  }
  throw new Error('Cannot find module: '+path);
}
window.addEventListener('DOMContentLoaded',()=>{
  try {
    const entryPoints = ['/app/page.tsx','/app/page.jsx','/page.tsx','/src/App.tsx','/src/App.jsx','/App.tsx','/index.tsx','/index.jsx'];
    let entry = null;
    for (const ep of entryPoints) { if (window.__VFS__[ep] !== undefined) { entry = ep; break; } }
    if (entry) {
      const mod = require(entry);
      const App = mod.default||mod.App||mod;
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
    } else {
      const htmlFile = window.__VFS__['/index.html']||window.__VFS__['index.html'];
      if (htmlFile) { document.open(); document.write(htmlFile); document.close(); }
      else { document.getElementById('root').innerHTML = '<div style="padding:40px;font-family:monospace;color:#374151;text-align:center"><h3>Preview</h3><p style="color:#6b7280">No files to preview</p></div>'; }
    }
  } catch(e) {
    document.getElementById('root').innerHTML = '<div style="color:red;padding:20px;font-family:monospace">Compilation Error: '+e.message+'</div>';
  }
});
</script>
</body>
</html>`
  }

  destroy() {
    this.files.clear()
    this.commands.clear()
  }
}

const globalForSandboxes = globalThis as unknown as {
  __sandboxes__?: Map<string, MockSandbox>
}

export const sandboxes = globalForSandboxes.__sandboxes__ ?? new Map<string, MockSandbox>()

if (typeof globalThis !== 'undefined') {
  globalForSandboxes.__sandboxes__ = sandboxes
}

export const Sandbox = {
  async create(options: SandboxOptions = {}) {
    if (sandboxes.size >= MAX_SANDBOXES) {
      const oldest = sandboxes.keys().next().value
      if (oldest) {
        Sandbox.destroy(oldest)
      }
    }
    const sandboxId = 'sb_' + Math.random().toString(36).substring(2, 10)
    const sandbox = new MockSandbox(sandboxId, options.ports)
    sandboxes.set(sandboxId, sandbox)
    sandboxCounter++
    return sandbox
  },

  async get(options: { sandboxId: string }) {
    let sandbox = sandboxes.get(options.sandboxId)
    if (!sandbox) {
      sandbox = new MockSandbox(options.sandboxId)
      sandboxes.set(options.sandboxId, sandbox)
    }
    return sandbox
  },

  exists(sandboxId: string): boolean {
    return sandboxes.has(sandboxId)
  },

  destroy(sandboxId: string) {
    const sandbox = sandboxes.get(sandboxId)
    if (sandbox) {
      sandbox.destroy()
      sandboxes.delete(sandboxId)
    }
  },

  getStats() {
    return {
      total: sandboxes.size,
      limit: MAX_SANDBOXES,
    }
  }
}

export type Sandbox = MockSandbox
