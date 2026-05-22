import type { SandboxCommand, ValidationResult, BuilderOutput } from './types';

// ── Sandbox Abstraction ────────────────────────────────────────────

export interface SandboxConfig {
  type: 'mock' | 'iframe' | 'webcontainer' | 'node';
  files: { path: string; content: string }[];
}

export interface SandboxProvider {
  type: string;
  install(): Promise<SandboxResult>;
  runCommand(command: SandboxCommand): Promise<SandboxResult>;
  getOutput(): Promise<string>;
  getFiles(): Promise<{ path: string; content: string }[]>;
  validate(): Promise<ValidationResult>;
  cleanup(): Promise<void>;
}

export interface SandboxResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  error?: string;
  duration: number;
}

// ── Mock Sandbox (fallback) ────────────────────────────────────────

export class MockSandbox implements SandboxProvider {
  public type = 'mock';
  private files: { path: string; content: string }[];
  private logs: string[] = [];

  constructor(config: SandboxConfig) {
    this.files = config.files;
  }

  async install(): Promise<SandboxResult> {
    const start = Date.now();
    this.logs.push('[mock] npm install completed (simulated)');
    return {
      success: true,
      exitCode: 0,
      stdout: 'npm install completed successfully (mock)',
      stderr: '',
      duration: Date.now() - start,
    };
  }

  async runCommand(command: SandboxCommand): Promise<SandboxResult> {
    const start = Date.now();
    this.logs.push(`[mock] Running: ${command.command}`);

    if (command.command === 'npm run build' || command.command === 'npm run dev') {
      return this.mockBuild();
    }

    if (command.command.startsWith('npm test')) {
      return this.mockTest();
    }

    return {
      success: true,
      exitCode: 0,
      stdout: `[mock] Command "${command.command}" completed`,
      stderr: '',
      duration: Date.now() - start,
    };
  }

  async getOutput(): Promise<string> {
    return this.logs.join('\n');
  }

  async getFiles(): Promise<{ path: string; content: string }[]> {
    return [...this.files];
  }

  async validate(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    for (const file of this.files) {
      if (file.path.endsWith('.tsx') || file.path.endsWith('.ts')) {
        if (file.content.includes('any')) {
          warnings.push(`${file.path}: uses 'any' type`);
        }
      }
      if (file.path.endsWith('.tsx') || file.path.endsWith('.jsx')) {
        if (!file.content.includes('export default') && !file.content.includes('export const')) {
          warnings.push(`${file.path}: no export found`);
        }
      }
    }

    // Check for entry point
    if (!this.files.some(f => f.path === 'src/main.tsx' || f.path === 'src/main.jsx' || f.path === 'index.html')) {
      errors.push('No entry point found (expected src/main.tsx or index.html)');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async cleanup(): Promise<void> {
    this.logs = [];
  }

  private async mockBuild(): Promise<SandboxResult> {
    const validation = await this.validate();
    const hasTypescript = this.files.some(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'));
    const mockDuration = 500 + Math.random() * 1000;

    await new Promise(r => setTimeout(r, mockDuration));

    if (!validation.valid) {
      return {
        success: false,
        exitCode: 1,
        stdout: 'Build starting...',
        stderr: `Build failed:\n${validation.errors.join('\n')}`,
        duration: mockDuration,
      };
    }

    return {
      success: true,
      exitCode: 0,
      stdout: `Build completed successfully (mock)\n${hasTypescript ? 'TypeScript: OK' : ''}\n${this.files.length} files processed`,
      stderr: '',
      duration: mockDuration,
    };
  }

  private async mockTest(): Promise<SandboxResult> {
    const testFiles = this.files.filter(f =>
      f.path.includes('.test.') || f.path.includes('.spec.') || f.path.includes('__tests__')
    );

    await new Promise(r => setTimeout(r, 300));

    if (testFiles.length === 0) {
      return {
        success: true,
        exitCode: 0,
        stdout: 'No test files found — all tests pass (mock)',
        stderr: '',
        duration: 300,
      };
    }

    return {
      success: true,
      exitCode: 0,
      stdout: `Found ${testFiles.length} test file(s) — all pass (mock)`,
      stderr: '',
      duration: 300,
    };
  }
}

// ── Builder Output Macros ──────────────────────────────────────────

export function createBuilderOutput(params: {
  files: { path: string; content: string }[];
  command: string;
  success: boolean;
  output: string;
  error?: string;
}): BuilderOutput {
  return {
    files: params.files,
    command: params.command,
    success: params.success,
    output: params.output,
    error: params.error,
    timestamp: new Date().toISOString(),
  };
}

// ── Sandbox Factory ────────────────────────────────────────────────

export function createSandbox(config: SandboxConfig): SandboxProvider {
  return new MockSandbox(config);
}
