import type { FileOperation, FilePatchOperation, ProjectFile, FileType } from '@/types';

// Detect file type from extension
export function getFileType(path: string): FileType {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const typeMap: Record<string, FileType> = {
    html: 'html', htm: 'html',
    css: 'css',
    js: 'js', mjs: 'js',
    ts: 'ts',
    json: 'json',
    jsx: 'jsx',
    tsx: 'tsx',
    md: 'md', markdown: 'md',
  };
  return typeMap[ext] || 'other';
}

// Get icon color for file type
export function getFileColor(type: FileType): string {
  const colorMap: Record<FileType, string> = {
    html: '#F97316', // orange
    css: '#60A5FA', // blue
    js: '#FBBF24', // yellow
    ts: '#60A5FA', // blue
    json: '#4ADE80', // green
    jsx: '#22D3EE', // cyan
    tsx: '#8183F4', // indigo
    md: '#8A8AA0', // gray
    other: '#8A8AA0',
  };
  return colorMap[type] || '#8A8AA0';
}

// Validate file path (prevent path traversal)
export function validatePath(path: string): boolean {
  // No path traversal
  if (path.includes('..')) return false;
  // No absolute paths
  if (path.startsWith('/')) return false;
  // Valid characters only
  if (!/^[/\w\-. ]+$/.test(path)) return false;
  // Max length
  if (path.length > 200) return false;
  return true;
}

export function normalizeProjectPath(path: string): string {
  return path
    .trim()
    .replace(/^\.\/+/, '')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');
}

export interface ApplyFileOperationsResult {
  files: ProjectFile[];
  applied: (FileOperation | FilePatchOperation)[];
  skipped: { operation: FileOperation | FilePatchOperation; reason: string }[];
}

function applyPatchToContent(content: string, patch: FilePatchOperation): { content: string; changed: boolean; reason?: string } {
  if (typeof patch.oldString === 'string' && typeof patch.newString === 'string') {
    if (!content.includes(patch.oldString)) {
      return { content, changed: false, reason: 'Patch target text was not found.' };
    }
    return { content: content.replace(patch.oldString, patch.newString), changed: true };
  }

  if (typeof patch.insertBefore === 'string' && typeof patch.content === 'string') {
    if (!content.includes(patch.insertBefore)) {
      return { content, changed: false, reason: 'Insert-before anchor was not found.' };
    }
    return { content: content.replace(patch.insertBefore, `${patch.content}${patch.insertBefore}`), changed: true };
  }

  if (typeof patch.insertAfter === 'string' && typeof patch.content === 'string') {
    if (!content.includes(patch.insertAfter)) {
      return { content, changed: false, reason: 'Insert-after anchor was not found.' };
    }
    return { content: content.replace(patch.insertAfter, `${patch.insertAfter}${patch.content}`), changed: true };
  }

  if (typeof patch.lineStart === 'number' && typeof patch.lineEnd === 'number' && typeof patch.content === 'string') {
    const lines = content.split('\n');
    const start = Math.max(1, Math.floor(patch.lineStart));
    const end = Math.max(0, Math.floor(patch.lineEnd));
    if (start > lines.length + 1) {
      return { content, changed: false, reason: 'Patch line range is outside the file.' };
    }
    const replacement = patch.content.split('\n');
    lines.splice(start - 1, Math.max(0, end - start + 1), ...replacement);
    return { content: lines.join('\n'), changed: true };
  }

  return { content, changed: false, reason: 'Patch is missing oldString/newString, insert anchor, or line range.' };
}

export function applyPatchOperations(
  currentFiles: ProjectFile[],
  patches: FilePatchOperation[],
): ApplyFileOperationsResult {
  const files = currentFiles.map(file => ({ ...file }));
  const applied: FilePatchOperation[] = [];
  const skipped: { operation: FilePatchOperation; reason: string }[] = [];

  for (const patch of patches) {
    const path = normalizeProjectPath(patch.path);
    const normalizedPatch: FilePatchOperation = { ...patch, path };

    if (!path || !validatePath(path)) {
      skipped.push({ operation: normalizedPatch, reason: 'Invalid relative file path.' });
      continue;
    }

    const existingIdx = files.findIndex(file => file.path === path);
    if (existingIdx < 0) {
      skipped.push({ operation: normalizedPatch, reason: 'File does not exist for patch operation.' });
      continue;
    }

    const result = applyPatchToContent(files[existingIdx].content, normalizedPatch);
    if (!result.changed) {
      skipped.push({ operation: normalizedPatch, reason: result.reason || 'Patch did not change the file.' });
      continue;
    }

    files[existingIdx] = {
      ...files[existingIdx],
      content: result.content,
      isModified: false,
    };
    applied.push(normalizedPatch);
  }

  return { files, applied, skipped };
}

export function applyFileOperations(
  currentFiles: ProjectFile[],
  operations: FileOperation[],
): ApplyFileOperationsResult {
  const files = currentFiles.map(file => ({ ...file }));
  const applied: FileOperation[] = [];
  const skipped: { operation: FileOperation; reason: string }[] = [];

  for (const operation of operations) {
    const path = normalizeProjectPath(operation.path);
    const normalizedOperation: FileOperation = { ...operation, path };

    if (!path || !validatePath(path)) {
      skipped.push({ operation: normalizedOperation, reason: 'Invalid relative file path.' });
      continue;
    }

    const existingIdx = files.findIndex(file => file.path === path);

    if (operation.action === 'delete') {
      if (existingIdx < 0) {
        skipped.push({ operation: normalizedOperation, reason: 'File does not exist.' });
        continue;
      }
      files.splice(existingIdx, 1);
      applied.push(normalizedOperation);
      continue;
    }

    if (typeof operation.content !== 'string') {
      skipped.push({ operation: normalizedOperation, reason: 'Missing complete file content.' });
      continue;
    }

    const nextFile: ProjectFile = {
      id: existingIdx >= 0 ? files[existingIdx].id : `file_${Date.now()}_${applied.length}_${path}`,
      path,
      content: operation.content,
      type: getFileType(path),
      isModified: false,
      isOpen: files[existingIdx]?.isOpen,
    };

    if (existingIdx >= 0) {
      files[existingIdx] = nextFile;
      applied.push({ ...normalizedOperation, action: operation.action || 'modify' });
    } else {
      files.push(nextFile);
      applied.push({ ...normalizedOperation, action: operation.action || 'create' });
    }
  }

  files.sort((a, b) => a.path.localeCompare(b.path));

  return { files, applied, skipped };
}

// Get file name from path
export function getFileName(path: string): string {
  return path.split('/').pop() || path;
}

// Get directory from path
export function getDirectory(path: string): string {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/') || '';
}

// Build file tree structure
export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  fileType?: FileType;
  children: FileTreeNode[];
  isExpanded?: boolean;
}

export function buildFileTree(files: ProjectFile[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  const nodeMap = new Map<string, FileTreeNode>();

  // First pass: create all folder nodes
  for (const file of files) {
    const parts = file.path.split('/');
    let currentPath = '';
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
      if (!nodeMap.has(currentPath)) {
        const node: FileTreeNode = {
          name: parts[i],
          path: currentPath,
          type: 'folder',
          children: [],
          isExpanded: true,
        };
        nodeMap.set(currentPath, node);
      }
    }
  }

  // Second pass: add file nodes
  for (const file of files) {
    const parts = file.path.split('/');
    const fileName = parts[parts.length - 1];
    const dirPath = parts.slice(0, -1).join('/');
    const node: FileTreeNode = {
      name: fileName,
      path: file.path,
      type: 'file',
      fileType: getFileType(file.path),
      children: [],
    };
    if (dirPath) {
      const parent = nodeMap.get(dirPath);
      if (parent) parent.children.push(node);
    } else {
      root.push(node);
    }
  }

  // Third pass: add folder nodes to their parents
  for (const [, node] of nodeMap) {
    const dirPath = getDirectory(node.path);
    if (dirPath) {
      const parent = nodeMap.get(dirPath);
      if (parent) parent.children.push(node);
    } else {
      root.push(node);
    }
  }

  // Sort: folders first, then alphabetically
  function sortNodes(nodes: FileTreeNode[]) {
    nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });
    for (const node of nodes) {
      if (node.children.length) sortNodes(node.children);
    }
  }
  sortNodes(root);

  return root;
}

function escapeClosingScript(content: string): string {
  return content.replace(/<\/script/gi, '<\\/script');
}

function extractImportedNames(content: string): string[] {
  const names = new Set<string>();
  const importRegex = /import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"];?/g;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(content)) !== null) {
    const specifier = match[1].trim();
    const named = specifier.match(/\{([\s\S]*?)\}/)?.[1] || '';
    for (const part of named.split(',')) {
      const clean = part.trim();
      if (!clean) continue;
      const alias = clean.match(/\bas\s+([A-Za-z_$][\w$]*)$/)?.[1];
      const direct = clean.match(/^([A-Za-z_$][\w$]*)/)?.[1];
      if (alias || direct) names.add(alias || direct || '');
    }
  }

  return Array.from(names).filter(Boolean);
}

function stripModuleSyntax(content: string): string {
  return content
    .replace(/^\s*import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*import\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*export\s+\{[^}]+\};?\s*$/gm, '')
    .replace(/\bexport\s+default\s+function\s+([A-Za-z0-9_$]+)/, 'function $1')
    .replace(/\bexport\s+default\s+function\s*\(/, 'function App(')
    .replace(/\bexport\s+default\s+class\s+([A-Za-z0-9_$]+)/, 'class $1')
    .replace(/\bexport\s+default\s+([A-Za-z0-9_$]+);?/g, 'window.__JoyfulApp = $1;')
    .replace(/\bexport\s+(const|let|var|function|class)\s+/g, '$1 ');
}

function routePathToFilePath(routePath: string): string {
  const normalized = routePath.trim().replace(/^\/+/, '').replace(/\/+$/, '');
  return normalized ? `${normalized}.html` : 'index.html';
}

function buildPreviewFallbacks(importedNames: string[]): string {
  const safeNames = importedNames
    .filter(name => /^[A-Za-z_$][\w$]*$/.test(name))
    .filter(name => !['React', 'useState', 'useEffect', 'useMemo', 'useRef', 'useCallback', 'useReducer', 'useId'].includes(name));

  if (safeNames.length === 0) return '';

  return `\nconst __JoyfulIcon = ({ size = 20, className = '', ...props }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true" {...props}>
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
${safeNames.map(name => `const ${name} = __JoyfulIcon;`).join('\n')}
`;
}

function generateReactPreview(files: ProjectFile[], routePath = '/'): string {
  const appFile =
    files.find(f => /^src\/App\.(jsx|tsx)$/i.test(f.path)) ||
    files.find(f => /^app\/page\.(jsx|tsx)$/i.test(f.path)) ||
    files.find(f => /^pages\/index\.(jsx|tsx)$/i.test(f.path)) ||
    files.find(f => /\.(jsx|tsx)$/i.test(f.path));

  const css = files
    .filter(f => f.type === 'css')
    .map(f => `\n/* ${f.path} */\n${f.content}`)
    .join('\n');

  if (!appFile) {
    return '<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0A0A0F;color:#8A8AA0;font-family:sans-serif;"><div>No React entry found. Create src/App.jsx or app/page.tsx to preview.</div></body></html>';
  }

  const componentSource = stripModuleSyntax(appFile.content);
  const importFallbacks = buildPreviewFallbacks(extractImportedNames(appFile.content));
  const hasNamedApp = /function\s+(App|Page)\s*\(|const\s+(App|Page)\s*=|class\s+(App|Page)\s+/.test(componentSource);
  const appResolver = hasNamedApp
    ? 'const JoyfulApp = window.__JoyfulApp || (typeof App !== "undefined" ? App : Page);'
    : 'const JoyfulApp = window.__JoyfulApp;';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Joyful React Preview</title>
  <style>${css}</style>
</head>
<body>
  <div id="root"></div>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script type="text/babel" data-presets="env,react,typescript">
window.__JOYFUL_PREVIEW_PATH = ${JSON.stringify(routePath || '/')};
try {
  if (window.location.origin !== 'null') {
    window.history.replaceState({}, '', window.__JOYFUL_PREVIEW_PATH);
  }
} catch (error) {}
const { useState, useMemo, useEffect, useRef, useCallback, useReducer, useId } = React;
${importFallbacks}
${escapeClosingScript(componentSource)}
${appResolver}
if (!JoyfulApp) {
  throw new Error('Could not find a default App/Page component to render.');
}
ReactDOM.createRoot(document.getElementById('root')).render(<JoyfulApp />);
  </script>
</body>
</html>`;
}

// Generate a preview HTML from project files
export function generatePreview(files: ProjectFile[], routePath = '/'): string {
  const hasFrameworkEntry = files.some(f =>
    /^src\/App\.(jsx|tsx)$/i.test(f.path) ||
    /^app\/page\.(jsx|tsx)$/i.test(f.path) ||
    /^pages\/index\.(jsx|tsx)$/i.test(f.path)
  );

  if (hasFrameworkEntry) {
    return generateReactPreview(files, routePath);
  }

  const requestedHtmlPath = routePathToFilePath(routePath);
  const htmlFile = files.find(f => f.path === requestedHtmlPath) || files.find(f => f.path === 'index.html');
  if (!htmlFile) {
    return '<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0A0A0F;color:#8A8AA0;font-family:sans-serif;"><div>No index.html found. Create one to see a preview.</div></body></html>';
  }

  let html = htmlFile.content;

  // Inject CSS files
  const cssFiles = files.filter(f => f.type === 'css');
  for (const css of cssFiles) {
    const href = css.path;
    // Replace <link> tags referencing this CSS file
    const linkRegex = new RegExp(`<link[^>]*href=["']${href}["'][^>]*>`, 'i');
    if (linkRegex.test(html)) {
      html = html.replace(linkRegex, `<style>${css.content}</style>`);
    } else if (!htmlFile.content.includes(css.path)) {
      // Append if not already referenced
      html = html.replace('</head>', `<style>${css.content}</style></head>`);
    }
  }

  // Inject JS files
  const jsFiles = files.filter(f => f.type === 'js');
  for (const js of jsFiles) {
    const src = js.path;
    const scriptRegex = new RegExp(`<script[^>]*src=["']${src}["'][^>]*></script>`, 'i');
    if (scriptRegex.test(html)) {
      html = html.replace(scriptRegex, `<script>${js.content}</script>`);
    } else if (!htmlFile.content.includes(js.path)) {
      html = html.replace('</body>', `<script>${js.content}</script></body>`);
    }
  }

  return html;
}

// Export project as ZIP
export async function exportProjectAsZip(project: { name: string; files: ProjectFile[] }): Promise<void> {
  const JSZip = (await import('jszip')).default;
  const { saveAs } = await import('file-saver');
  
  const zip = new JSZip();
  const folderName = project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const rootFolder = zip.folder(folderName);
  
  if (!rootFolder) return;

  for (const file of project.files) {
    rootFolder.file(file.path, file.content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `${folderName}.zip`);
}
