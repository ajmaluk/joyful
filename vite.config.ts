import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    ...(process.env.NODE_ENV !== 'production' ? [inspectAttr()] : []),
    react(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api/ai': {
        target: 'https://integrate.api.nvidia.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ai/, '/v1'),
      },
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://unpkg.com https://cdn.jsdelivr.net https://apis.google.com https://accounts.google.com https://static.cloudflareinsights.com; script-src-elem 'self' 'unsafe-inline' blob: https://static.cloudflareinsights.com https://unpkg.com https://cdn.jsdelivr.net https://apis.google.com https://accounts.google.com; worker-src 'self' blob:; img-src 'self' data: https: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://cdn.jsdelivr.net; connect-src 'self' https: ws: blob: https://unpkg.com https://cdn.jsdelivr.net; font-src 'self' data: https://fonts.gstatic.com; frame-src 'self' about: blob: https://accounts.google.com https://apis.google.com https://*.firebaseapp.com; frame-ancestors 'self'; object-src 'none';",
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://unpkg.com https://cdn.jsdelivr.net https://apis.google.com https://accounts.google.com https://static.cloudflareinsights.com; script-src-elem 'self' 'unsafe-inline' blob: https://static.cloudflareinsights.com https://unpkg.com https://cdn.jsdelivr.net https://apis.google.com https://accounts.google.com; worker-src 'self' blob:; img-src 'self' data: https: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://cdn.jsdelivr.net; connect-src 'self' https: ws: blob: https://unpkg.com https://cdn.jsdelivr.net; font-src 'self' data: https://fonts.gstatic.com; frame-src 'self' about: blob: https://accounts.google.com https://apis.google.com https://*.firebaseapp.com; frame-ancestors 'self'; object-src 'none';",
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/monaco-editor') || id.includes('node_modules/@monaco-editor')) {
            return 'editor';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'motion';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
          if (id.includes('node_modules/recharts')) {
            return 'charts';
          }
          if (id.includes('node_modules/firebase')) {
            return 'firebase';
          }
          if (id.includes('node_modules/jszip') || id.includes('node_modules/file-saver')) {
            return 'export-utils';
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom'],
  },
});
