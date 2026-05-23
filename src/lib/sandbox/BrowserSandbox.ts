import * as esbuild from 'esbuild-wasm';
import { virtualFS, normalizePath } from '@/lib/vfs/VirtualFileSystem';
import { errorCollector } from '@/engine/errors';
import { htmlToBlobUrl } from '@/utils/blob';

export interface CompileResult {
  success: boolean;
  code?: string;
  errors: string[];
  warnings: string[];
}

export interface ConsoleCapture {
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  count?: number;
}

let esbuildInitialized = false;

export class BrowserSandbox {
  private iframe: HTMLIFrameElement | null = null;
  private consoleListeners: Array<(msg: ConsoleCapture) => void> = [];
  private currentAbortController: AbortController | null = null;
  private lastConsoleMessage = '';
  private consoleRepeatCount = 0;
  private pendingBlobUrls: string[] = [];

  async init(): Promise<void> {
    if (esbuildInitialized) return;
    await esbuild.initialize({
      wasmURL: 'https://unpkg.com/esbuild-wasm@0.28.0/esbuild.wasm',
      worker: true,
    });
    esbuildInitialized = true;

    // Wire up error collector's file reader to the virtual FS
    errorCollector.setFileReader(async (path: string) => {
      return virtualFS.readFile(path);
    });
  }

  setIframe(iframe: HTMLIFrameElement | null): void {
    this.iframe = iframe;
    if (iframe) {
      window.addEventListener('message', this.handleMessage);
    } else {
      window.removeEventListener('message', this.handleMessage);
    }
  }

  onConsole(cb: (msg: ConsoleCapture) => void): () => void {
    this.consoleListeners.push(cb);
    return () => {
      this.consoleListeners = this.consoleListeners.filter(l => l !== cb);
    };
  }

  async compile(entryPoint: string): Promise<CompileResult> {
    await this.init();

    this.currentAbortController?.abort();
    this.currentAbortController = new AbortController();

    try {
      const result = await esbuild.build({
        entryPoints: [entryPoint],
        bundle: true,
        write: false,
        format: 'iife',
        platform: 'browser',
        target: 'es2020',
        loader: {
          '.tsx': 'tsx',
          '.ts': 'ts',
          '.jsx': 'jsx',
          '.js': 'js',
          '.css': 'css',
          '.svg': 'text',
          '.png': 'dataurl',
          '.json': 'json',
        },
        plugins: [this.createVFSPlugin()],
        define: {
          'process.env.NODE_ENV': '"development"',
        },
        logLevel: 'warning',
      });

      const errors = await Promise.all(
        (result.errors || []).map(async e =>
          (await errorCollector.formatCompileErrors([e])).join('\n') ||
          `${e.location?.file}:${e.location?.line}:${e.location?.column} — ${e.text}`,
        ),
      );
      const warnings = (result.warnings || []).map(w =>
        `${w.location?.file}:${w.location?.line}:${w.location?.column} — ${w.text}`,
      );

      if (errors.length > 0) {
        errorCollector.reset();
        return { success: false, errors, warnings };
      }

      if (!result.outputFiles || result.outputFiles.length === 0) {
        return { success: false, errors: ['No output files generated'], warnings };
      }

      const code = new TextDecoder().decode(result.outputFiles[0].contents);
      return { success: true, code, errors, warnings };

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, errors: [message], warnings: [] };
    }
  }

  async updatePreview(compiledCode: string): Promise<void> {
    if (!this.iframe) return;

    for (const url of this.pendingBlobUrls) {
      URL.revokeObjectURL(url);
    }
    this.pendingBlobUrls = [];

    const bridgeCode = `
const origLog = console.log;
const origError = console.error;
const origWarn = console.warn;
const origInfo = console.info;
function send(level, args) {
  window.parent.postMessage({
    type: '__joyful_console__',
    level: level,
    message: args.map(a =>
      typeof a === 'object' ? JSON.stringify(a, null, 2)
      : typeof a === 'undefined' ? 'undefined'
      : String(a)
    ).join(' ')
  }, '*');
}
console.log = function() { origLog.apply(console, arguments); send('log', arguments); };
console.error = function() { origError.apply(console, arguments); send('error', arguments); };
console.warn = function() { origWarn.apply(console, arguments); send('warn', arguments); };
console.info = function() { origInfo.apply(console, arguments); send('info', arguments); };
window.onerror = function(msg, src, line, col, error) {
  send('error', ['Runtime error: ' + msg + ' at line ' + line]);
  return false;
};
window.addEventListener('unhandledrejection', function(e) {
  send('error', ['Unhandled Promise rejection: ' + e.reason]);
});`;

    const bridgeBlob = new Blob([bridgeCode], { type: 'application/javascript' });
    const bridgeUrl = URL.createObjectURL(bridgeBlob);
    const codeBlob = new Blob([compiledCode], { type: 'application/javascript' });
    const codeUrl = URL.createObjectURL(codeBlob);
    this.pendingBlobUrls = [bridgeUrl, codeUrl];

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="${bridgeUrl}"></script>
  <script src="${codeUrl}"></script>
</body>
</html>`;

    this.iframe.src = htmlToBlobUrl(html);
  }

  private handleMessage = (event: MessageEvent): void => {
    if (event.data?.type === '__joyful_console__') {
      const msg = event.data.message;
      let capture: ConsoleCapture;

      if (msg === this.lastConsoleMessage) {
        this.consoleRepeatCount++;
        capture = { level: event.data.level, message: msg, count: this.consoleRepeatCount + 1 };
      } else {
        this.consoleRepeatCount = 0;
        capture = { level: event.data.level, message: msg };
      }
      this.lastConsoleMessage = msg;

      this.consoleListeners.forEach(cb => cb(capture));
    }
  };

  async compileAndPreview(entryPoint: string): Promise<CompileResult> {
    await this.init();
    const result = await this.compile(entryPoint);
    if (result.success && result.code) {
      await this.updatePreview(result.code);
    }
    return result;
  }

  cleanup(): void {
    this.currentAbortController?.abort();
    window.removeEventListener('message', this.handleMessage);
    this.consoleListeners = [];
    this.iframe = null;
  }

  private createVFSPlugin(): esbuild.Plugin {
    return {
      name: 'joyful-vfs',
      setup(build) {
        build.onResolve({ filter: /.*/ }, async (args) => {
          if (args.path.startsWith('https://') || args.path.startsWith('http://')) {
            return { path: args.path, external: true };
          }

          let resolved = '';

          if (args.path.startsWith('@/')) {
            // Alias resolution: map '@/...' to '/src/...'
            resolved = args.path.replace(/^@\//, '/src/');
          } else if (args.path.startsWith('.') || args.path.startsWith('/')) {
            // Relative or absolute local path
            if (args.path.startsWith('/')) {
              resolved = args.path;
            } else {
              const importerDir = args.importer === '<stdin>'
                ? ''
                : args.importer.substring(0, args.importer.lastIndexOf('/'));
              resolved = importerDir
                ? importerDir + '/' + args.path
                : args.path;
            }
          } else {
            // Bare module import (e.g. 'react', 'lucide-react') -> CDN external
            return { path: `https://esm.sh/${args.path}`, external: true };
          }

          // Normalize path: resolve relative segments like . and ..
          const normalized = normalizePath(resolved);

          // Try with extensions
          for (const ext of ['', '.tsx', '.ts', '.jsx', '.js', '.css', '.json']) {
            const fullPath = normalized + ext;
            try {
              await virtualFS.readFile(fullPath);
              return { path: fullPath, namespace: 'vfs' };
            } catch {
              // not found
            }
          }

          return { path: normalized, namespace: 'vfs' };
        });

        build.onLoad({ filter: /.*/, namespace: 'vfs' }, async (args) => {
          try {
            const content = await virtualFS.readFile(args.path);
            const ext = args.path.split('.').pop() || 'js';
            const loaderMap: Record<string, esbuild.Loader> = {
              tsx: 'tsx', ts: 'ts', jsx: 'jsx', js: 'js',
              css: 'css', json: 'json', svg: 'text',
            };
            return {
              contents: content,
              loader: loaderMap[ext] || 'text',
            };
          } catch {
            return { errors: [{ text: `File not found: ${args.path}` }] };
          }
        });
      },
    };
  }
}

export const browserSandbox = new BrowserSandbox();
