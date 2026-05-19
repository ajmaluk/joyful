import type { ProjectFile, FileType } from '@/types';

// Detect file type from extension
export function getFileType(path: string): FileType {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const typeMap: Record<string, FileType> = {
    html: 'html', htm: 'html',
    css: 'css',
    js: 'js', mjs: 'js',
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

// Generate a preview HTML from project files
export function generatePreview(files: ProjectFile[]): string {
  const htmlFile = files.find(f => f.path === 'index.html');
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
