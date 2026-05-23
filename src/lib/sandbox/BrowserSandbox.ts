import * as esbuild from 'esbuild-wasm';
import { virtualFS, normalizePath } from '@/lib/vfs/VirtualFileSystem';
import { errorCollector } from '@/engine/errors';

export interface CompileResult {
  success: boolean;
  code?: string;
  css?: string;
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
  private compileId = 0;
  private lastGoodCode = '';
  private lastGoodCss = '';

  async init(): Promise<void> {
    if (esbuildInitialized) return;
    try {
      await esbuild.initialize({
        wasmURL: 'https://unpkg.com/esbuild-wasm@0.28.0/esbuild.wasm',
        worker: true,
      });
      esbuildInitialized = true;
    } catch (e) {
      // esbuild rejects repeated initialize() calls (even with the flag guard,
      // HMR / Vite hot reloads can reset the module-level variable).
      if (e instanceof Error && e.message.includes('Cannot call initialize more than once')) {
        esbuildInitialized = true;
      } else {
        throw e;
      }
    }

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

      const jsFiles = result.outputFiles.filter(f => f.path.endsWith('.js'));
      const cssFiles = result.outputFiles.filter(f => f.path.endsWith('.css'));

      const code = jsFiles.map(f => new TextDecoder().decode(f.contents)).join('\n');
      const css = cssFiles.map(f => new TextDecoder().decode(f.contents)).join('\n');
      return { success: true, code, css, errors, warnings };

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, errors: [message], warnings: [] };
    }
  }

  async updatePreview(code: string, css = ''): Promise<void> {
    if (!this.iframe) return;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
    ${css}
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    var send = function(level, args) {
      parent.postMessage({
        type: '__joyful_console__',
        level: level,
        message: Array.from(args).map(function(a) {
          try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
          catch(e) { return String(a); }
        }).join(' ')
      }, '*');
    };

    ['log','info','warn','error'].forEach(function(level) {
      var original = console[level];
      console[level] = function() {
        original.apply(console, arguments);
        send(level, arguments);
      };
    });

    window.onerror = function(message, source, line, column) {
      send('error', ['Runtime error:', message, 'line:', line, 'column:', column]);
      return false;
    };

    window.addEventListener('unhandledrejection', function(event) {
      send('error', ['Unhandled promise rejection:', event.reason]);
    });
  </script>
  <script type="module">
    ${code}
  </script>
</body>
</html>`;

    this.iframe.srcdoc = html;
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
    this.compileId++;
    const currentCompileId = this.compileId;
    const result = await this.compile(entryPoint);
    if (currentCompileId !== this.compileId) return result;
    if (result.success && result.code) {
      this.lastGoodCode = result.code;
      this.lastGoodCss = result.css || '';
      await this.updatePreview(result.code, result.css || '');
    } else if (this.lastGoodCode) {
      await this.updatePreview(this.lastGoodCode, this.lastGoodCss);
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
