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
      stdout: async () => `[mock-sandbox] Executing command: ${this._cmd} ${this._args.join(' ')}`,
      stderr: async () => '',
    }
  }

  async *logs() {
    yield {
      data: `[mock-sandbox] Starting process: ${this._cmd} ${this._args.join(' ')}\n`,
      stream: 'stdout' as const,
      timestamp: Date.now(),
    }
    yield {
      data: `[mock-sandbox] Process completed successfully.\n`,
      stream: 'stdout' as const,
      timestamp: Date.now(),
    }
  }
}

// Global in-memory map of active sandboxes persisted in globalThis to survive HMR reloads
const globalForSandboxes = globalThis as unknown as {
  __sandboxes__?: Map<string, MockSandbox>
}

export const sandboxes = globalForSandboxes.__sandboxes__ ?? new Map<string, MockSandbox>()

if (process.env.NODE_ENV !== 'production') {
  globalForSandboxes.__sandboxes__ = sandboxes
}

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
    if (content === undefined) {
      return null
    }
    return Buffer.from(content, 'utf8')
  }


  async runCommand(options: RunCommandOptions) {
    const cmdId = 'cmd_' + Math.random().toString(36).substring(2, 8)
    const cmd = new Command(cmdId, options.cmd, options.args ?? [])
    this.commands.set(cmdId, cmd)

    // Intercept file creations in mock commands
    // Use newline separator to preserve multi-line content in args
    const fullCmd = [options.cmd, ...(options.args ?? [])].join('\n')
    const filesToWrite: { path: string; content: Buffer }[] = []

    if (fullCmd.includes('files = {') || fullCmd.includes('files={')) {
      const fileRegex = /['"]([^'"]+)['"]\s*:\s*(?:r?'''([\s\S]*?)'''|r?["']([\s\S]*?)["'])/g
      let match
      while ((match = fileRegex.exec(fullCmd)) !== null) {
        const filePath = match[1].trim()
        const fileContent = match[2] || match[3] || ''
        filesToWrite.push({
          path: filePath,
          content: Buffer.from(fileContent, 'utf8')
        })
      }
    } else if (fullCmd.includes('cat <<') || fullCmd.includes('cat  <<') || fullCmd.includes('cat >') || fullCmd.includes('cat  >')) {
      // Loop for: cat <<'EOF' > filepath
      const catRegexA = /cat\s*<<\s*['"]?(\w+)['"]?\s*>\s*(\S+)\n([\s\S]*?)\n\1/g
      let match
      while ((match = catRegexA.exec(fullCmd)) !== null) {
        const filePath = match[2].trim().replace(/['"]/g, '')
        const fileContent = match[3] || ''
        filesToWrite.push({
          path: filePath,
          content: Buffer.from(fileContent, 'utf8')
        })
      }

      // Loop for: cat > filepath <<'EOF'
      const catRegexB = /cat\s*>\s*(\S+)\s*<<\s*['"]?(\w+)['"]?\n([\s\S]*?)\n\2/g
      while ((match = catRegexB.exec(fullCmd)) !== null) {
        const filePath = match[1].trim().replace(/['"]/g, '')
        const fileContent = match[3] || ''
        filesToWrite.push({
          path: filePath,
          content: Buffer.from(fileContent, 'utf8')
        })
      }
    } else if (fullCmd.includes('apply_patch') || fullCmd.includes('patch')) {
      const fileBlocks = fullCmd.split(/\*\*\*\s+(?:Add|Modify)\s+File:\s*/i)
      for (let i = 1; i < fileBlocks.length; i++) {
        const block = fileBlocks[i]
        const lines = block.split('\n')
        const filePath = lines[0].trim().replace(/['"]/g, '')

        const contentLines: string[] = []
        // Check if there are any lines starting with '+' that look like additions
        const hasPlusPrefixes = lines.slice(1).some(line => line.startsWith('+') && !line.startsWith('+++'))

        for (let j = 1; j < lines.length; j++) {
          const line = lines[j]
          if (line.startsWith('***') || line.includes('*** End Patch') || line.startsWith('PATCH')) {
            break
          }
          
          if (hasPlusPrefixes) {
            if (line.startsWith('+')) {
              contentLines.push(line.substring(1))
            } else if (line.startsWith(' ')) {
              contentLines.push(line.substring(1))
            } else if (!line.startsWith('-')) {
              // Fallback for lines where prefix was missed
              contentLines.push(line)
            }
          } else {
            // Fallback: no '+' prefixes in the block, just capture raw text lines
            contentLines.push(line)
          }
        }

        if (filePath) {
          filesToWrite.push({
            path: filePath,
            content: Buffer.from(contentLines.join('\n'), 'utf8')
          })
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
    if (!cmd) {
      throw new Error(`Command not found: ${cmdId}`)
    }
    return cmd
  }

  async getURL(_port?: number) {
    return `/api/sandboxes/${this.sandboxId}/preview`
  }

  destroy() {
    this.files.clear()
    this.commands.clear()
  }
}

export const Sandbox = {
  async create(options: SandboxOptions = {}) {
    const sandboxId = 'sb_' + Math.random().toString(36).substring(2, 10)
    const sandbox = new MockSandbox(sandboxId, options.ports)
    sandboxes.set(sandboxId, sandbox)
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
  }
}

export type Sandbox = MockSandbox

