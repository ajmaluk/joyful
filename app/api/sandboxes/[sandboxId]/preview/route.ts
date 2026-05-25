import { NextRequest, NextResponse } from 'next/server'
import { Sandbox } from '@/lib/sandbox'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sandboxId: string }> }
) {
  const { sandboxId } = await params
  const sandbox = await Sandbox.get({ sandboxId })

  // Convert files to a clean Record<string, string> dictionary
  const files: Record<string, string> = {}
  for (const [key, value] of sandbox.files.entries()) {
    files[key] = value
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Local Preview Sandbox</title>
  <!-- Load React and ReactDOM UMD -->
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <!-- Load Babel Standalone -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <!-- Tailwind CSS Play CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Lucide icons -->
  <script src="https://unpkg.com/lucide-react/dist/umd/lucide-react.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f9fafb;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    // Inject the Virtual Filesystem files from Next.js server!
    window.__VFS__ = ${JSON.stringify(files)};
    
    // Simple CommonJS bundler in the browser
    const moduleCache = {};
    
    function resolvePath(importPath, currentDir = '/') {
      if (importPath === 'react' || importPath === 'react-dom' || importPath === 'lucide-react') {
        return importPath;
      }
      
      let absolute = importPath;
      if (importPath.startsWith('@/')) {
        absolute = '/' + importPath.substring(2);
      } else if (importPath.startsWith('./') || importPath.startsWith('../')) {
        const currentParts = currentDir.split('/').filter(Boolean);
        const relativeParts = importPath.split('/');
        
        // Remove current filename if currentDir is a file path
        if (currentDir.includes('.')) {
          currentParts.pop();
        }
        
        for (const part of relativeParts) {
          if (part === '..') {
            currentParts.pop();
          } else if (part !== '.' && part !== '') {
            currentParts.push(part);
          }
        }
        absolute = '/' + currentParts.join('/');
      } else {
        absolute = importPath.startsWith('/') ? importPath : '/' + importPath;
      }
      
      const candidates = [
        absolute,
        absolute + '.tsx',
        absolute + '.ts',
        absolute + '.jsx',
        absolute + '.js',
        absolute + '/index.tsx',
        absolute + '/index.ts',
        absolute + '/index.jsx',
        absolute + '/index.js'
      ];
      
      for (const c of candidates) {
        if (window.__VFS__[c] !== undefined) {
          return c;
        }
      }
      return absolute;
    }
    
    function require(path, currentFile = '/') {
      const normalizedPath = resolvePath(path, currentFile);
      
      if (moduleCache[normalizedPath]) {
        return moduleCache[normalizedPath].exports;
      }
      
      if (normalizedPath === 'react') {
        return window.React;
      }
      if (normalizedPath === 'react-dom') {
        return window.ReactDOM;
      }
      if (normalizedPath === 'lucide-react') {
        const Lucide = window.LucideReact || window.lucide;
        return new Proxy({}, {
          get(target, prop) {
            if (Lucide && Lucide[prop]) {
              return Lucide[prop];
            }
            // Mock icon fallback
            return function MockIcon(props) {
              return React.createElement('svg', {
                width: props.size || props.width || 24,
                height: props.size || props.height || 24,
                viewBox: '0 0 24 24',
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: 2,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                ...props
              }, React.createElement('circle', { cx: 12, cy: 12, r: 10 }));
            }
          }
        });
      }
      
      const fileContent = window.__VFS__[normalizedPath];
      if (fileContent !== undefined) {
        const module = { exports: {} };
        moduleCache[normalizedPath] = module;
        
        try {
          const transformed = Babel.transform(fileContent, {
            filename: normalizedPath,
            presets: ['react', 'typescript'],
            plugins: [
              Babel.availablePlugins['transform-modules-commonjs']
            ]
          }).code;
          
          // Inject custom require bound to the current file's directory
          const customRequire = (p) => require(p, normalizedPath);
          
          const wrapper = new Function('require', 'exports', 'module', transformed);
          wrapper(customRequire, module.exports, module);
        } catch (err) {
          console.error("Compilation error in " + normalizedPath + ":", err);
          throw err;
        }
        
        return module.exports;
      }
      
      throw new Error('Cannot find module: ' + path);
    }
    
    window.addEventListener('DOMContentLoaded', () => {
      try {
        let entry = null;
        const entryPoints = [
          '/app/page.tsx',
          '/app/page.jsx',
          '/app/page.ts',
          '/app/page.js',
          '/page.tsx',
          '/src/App.tsx',
          '/src/App.jsx',
          '/App.tsx',
          '/index.tsx',
          '/index.jsx'
        ];
        
        for (const ep of entryPoints) {
          if (window.__VFS__[ep] !== undefined) {
            entry = ep;
            break;
          }
        }
        
        if (entry) {
          const rootModule = require(entry);
          const App = rootModule.default || rootModule.App || rootModule;
          const root = ReactDOM.createRoot(document.getElementById('root'));
          root.render(React.createElement(App));
        } else {
          // Check for index.html in VFS
          const htmlFile = window.__VFS__['/index.html'] || window.__VFS__['index.html'];
          if (htmlFile) {
            document.open();
            document.write(htmlFile);
            document.close();
          } else {
            const fileList = Object.keys(window.__VFS__);
            if (fileList.length === 0) {
              document.getElementById('root').innerHTML = \`
                <div style="padding: 40px; font-family: monospace; color: #374151; text-align: center;">
                  <h3 style="font-weight: bold; font-size: 1.25rem;">Local Preview Sandbox</h3>
                  <p style="margin-top: 8px; color: #6b7280;">No files have been generated yet. Type a prompt on the left to start building.</p>
                </div>
              \`;
            } else {
              document.getElementById('root').innerHTML = \`
                <div style="padding: 20px; font-family: monospace; color: #374151;">
                  <h3 style="font-weight: bold; font-size: 1.25rem;">Local Preview Sandbox</h3>
                  <p style="margin-top: 8px;">No suitable entry point found. Loaded available files list:</p>
                  <div style="margin-top: 16px; font-size: 0.875rem;">
                    <strong>Available Files:</strong>
                    <ul style="list-style-type: disc; padding-left: 20px; margin-top: 4px;">
                      \${fileList.map(k => \`<li>\${k}</li>\`).join('')}
                    </ul>
                  </div>
                </div>
              \`;
            }
          }
        }
      } catch (err) {
        document.getElementById('root').innerHTML = \`
          <div style="color: red; padding: 20px; font-family: monospace; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 4px;">
            <h3 style="font-weight: bold; font-size: 1.1rem; margin-bottom: 8px;">Runtime Compilation Error</h3>
            <pre style="white-space: pre-wrap; font-size: 0.85rem;">\${err.stack || err.message}</pre>
          </div>
        \`;
      }
    });
  </script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
