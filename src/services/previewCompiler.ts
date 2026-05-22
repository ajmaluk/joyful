import * as esbuild from 'esbuild-wasm';

let initialized = false;
let initPromise: Promise<void> | null = null;

export async function initPreviewCompiler(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;
  initPromise = esbuild.initialize({
    wasmURL: 'https://unpkg.com/esbuild-wasm@0.28.0/esbuild.wasm',
    worker: true,
  });
  await initPromise;
  initialized = true;
}

export async function transpilePreviewCode(
  code: string,
): Promise<{ code: string; error: string | null }> {
  try {
    await initPreviewCompiler();
    const result = await esbuild.transform(code, {
      loader: 'tsx',
      jsx: 'transform',
      target: 'es2020',
    });
    return { code: result.code, error: null };
  } catch (err) {
    return {
      code,
      error: err instanceof Error ? `Preview transpilation failed: ${err.message}` : String(err),
    };
  }
}
