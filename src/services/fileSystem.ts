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
    const matches = content.split(patch.oldString).length - 1;
    if (matches > 1) {
      return { content: content.replaceAll(patch.oldString, patch.newString), changed: true, reason: `Warning: replaced ${matches} occurrences of target text` };
    }
    return { content: content.replace(patch.oldString, patch.newString), changed: true };
  }

  if (typeof patch.insertBefore === 'string' && typeof patch.content === 'string') {
    if (!content.includes(patch.insertBefore)) {
      return { content, changed: false, reason: 'Insert-before anchor was not found.' };
    }
    const matches = content.split(patch.insertBefore).length - 1;
    if (matches > 1) {
      return { content: content.replaceAll(patch.insertBefore, `${patch.content}${patch.insertBefore}`), changed: true, reason: `Warning: inserted before ${matches} occurrences of anchor` };
    }
    return { content: content.replace(patch.insertBefore, `${patch.content}${patch.insertBefore}`), changed: true };
  }

  if (typeof patch.insertAfter === 'string' && typeof patch.content === 'string') {
    if (!content.includes(patch.insertAfter)) {
      return { content, changed: false, reason: 'Insert-after anchor was not found.' };
    }
    const matches = content.split(patch.insertAfter).length - 1;
    if (matches > 1) {
      return { content: content.replaceAll(patch.insertAfter, `${patch.insertAfter}${patch.content}`), changed: true, reason: `Warning: inserted after ${matches} occurrences of anchor` };
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

// ── Conflict Detection ────────────────────────────────────────────

export interface ConflictInfo {
  path: string;
  type: 'concurrent_modify' | 'delete_modify_conflict' | 'create_exists';
  description: string;
  suggestAction: 'skip' | 'overwrite' | 'merge';
}

export function detectConflicts(
  operations: FileOperation[],
  currentFiles: ProjectFile[],
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];
  const opMap = new Map<string, FileOperation[]>();

  for (const op of operations) {
    const path = normalizeProjectPath(op.path);
    if (!opMap.has(path)) opMap.set(path, []);
    opMap.get(path)!.push({ ...op, path });
  }

  for (const [path, ops] of opMap) {
    // Detect creates on existing files
    const creates = ops.filter(o => o.action === 'create' || !o.action);
    if (creates.length > 0 && currentFiles.some(f => f.path === path)) {
      conflicts.push({
        path,
        type: 'create_exists',
        description: `Cannot create ${path} — a file with this path already exists. Using modify action instead.`,
        suggestAction: 'overwrite',
      });
    }

    // Detect delete + modify on same file
    const hasDelete = ops.some(o => o.action === 'delete');
    const hasModify = ops.some(o => o.action === 'modify' || !o.action);
    if (hasDelete && hasModify) {
      conflicts.push({
        path,
        type: 'delete_modify_conflict',
        description: `Both delete and modify operations for ${path}.`,
        suggestAction: 'skip',
      });
    }

    // Detect concurrent modifies
    const modifies = ops.filter(o => o.action === 'modify' || !o.action);
    if (modifies.length > 1) {
      conflicts.push({
        path,
        type: 'concurrent_modify',
        description: `Multiple concurrent modifications to ${path}. Will merge changes.`,
        suggestAction: 'merge',
      });
    }
  }

  return conflicts;
}

// ── Smart File Merge ──────────────────────────────────────────────

export interface MergeResult {
  content: string;
  merged: boolean;
  conflicts: { line: number; ours: string; theirs: string }[];
}

export function smartMerge(
  originalContent: string,
  ourChanges: string[],
  theirChanges: string[],
): MergeResult {
  const result: MergeResult = {
    content: originalContent,
    merged: false,
    conflicts: [],
  };

  if (ourChanges.length === 0 && theirChanges.length === 0) return result;
  if (ourChanges.length === 0) {
    result.content = theirChanges.join('\n');
    result.merged = true;
    return result;
  }
  if (theirChanges.length === 0) {
    result.content = ourChanges.join('\n');
    result.merged = true;
    return result;
  }

  if (ourChanges.join('\n') === theirChanges.join('\n')) {
    result.content = ourChanges.join('\n');
    result.merged = true;
    return result;
  }

  // Try line-by-line merge
  const mergedLines: string[] = [];
  const maxLines = Math.max(ourChanges.length, theirChanges.length);
  for (let i = 0; i < maxLines; i++) {
    const ourLine = i < ourChanges.length ? ourChanges[i] : '';
    const theirLine = i < theirChanges.length ? theirChanges[i] : '';

    if (ourLine === theirLine) {
      mergedLines.push(ourLine);
    } else if (ourLine === '' || ourLine === undefined) {
      mergedLines.push(theirLine);
    } else if (theirLine === '' || theirLine === undefined) {
      mergedLines.push(ourLine);
    } else {
      result.conflicts.push({ line: i + 1, ours: ourLine, theirs: theirLine });
      mergedLines.push(theirLine); // Default: accept their version (AI's version)
    }
  }

  result.content = mergedLines.join('\n');
  result.merged = result.conflicts.length === 0;
  return result;
}

// ── Dependency Analysis ───────────────────────────────────────────

export interface DependencyIssue {
  path: string;
  type: 'missing_import' | 'broken_reference' | 'missing_export' | 'circular_dependency';
  specifier: string;
  line: number;
  severity: 'error' | 'warning';
}

export function analyzeDependencies(
  files: ProjectFile[],
): { issues: DependencyIssue[]; depGraph: Map<string, Set<string>> } {
  const issues: DependencyIssue[] = [];
  const depGraph = new Map<string, Set<string>>();
  const filePaths = new Set(files.map(f => f.path));

  function dirname(p: string): string {
    const parts = p.split('/');
    parts.pop();
    return parts.join('/');
  }

  function resolveImport(sourcePath: string, specifier: string): string | null {
    const base = specifier.startsWith('@/')
      ? `src/${specifier.slice(2)}`
      : specifier.startsWith('.')
        ? resolveRelative(sourcePath, specifier)
        : null;
    if (!base) return null;

    const extensions = ['.tsx', '.ts', '.jsx', '.js', '.css', '.json', ''];

    for (const ext of extensions) {
      const candidate = ext ? `${base}${ext}` : base;
      if (filePaths.has(candidate)) return candidate;
      // Alternative: try path/index.ext
      const pathAlt = `${base}/index${ext}`;
      if (filePaths.has(pathAlt)) return pathAlt;
    }
    return null;
  }

  function resolveRelative(source: string, relative: string): string {
    const dirParts = dirname(source).split('/');
    const relParts = relative.split('/');
    for (const part of relParts) {
      if (part === '..') dirParts.pop();
      else if (part !== '.') dirParts.push(part);
    }
    return dirParts.join('/');
  }

  for (const file of files) {
    if (!/\.(tsx?|jsx?)$/i.test(file.path)) continue;

    const deps = new Set<string>();
    depGraph.set(file.path, deps);

    let lineNum = 0;
    const lines = file.content.split('\n');

    for (const line of lines) {
      lineNum++;

      // Check CSS imports
      const cssImport = line.match(/@import\s+['"]([^'"]+)['"]/);
      if (cssImport) {
        const resolved = resolveImport(file.path, cssImport[1]);
        if (!resolved && !cssImport[1].startsWith('http')) {
          issues.push({
            path: file.path,
            type: 'missing_import',
            specifier: cssImport[1],
            line: lineNum,
            severity: 'warning',
          });
        }
        continue;
      }

      // Check JS/TS imports
      const importMatch = line.match(/(?:from|import)\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        const specifier = importMatch[1];
        if (specifier.startsWith('.') || specifier.startsWith('@/')) {
          deps.add(specifier);
          const resolved = resolveImport(file.path, specifier);
          if (!resolved) {
            issues.push({
              path: file.path,
              type: 'missing_import',
              specifier,
              line: lineNum,
              severity: 'error',
            });
          }
        }
      }
    }
  }

  // Detect circular dependencies
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  function dfs(current: string) {
    if (inStack.has(current)) {
      // Found a cycle: report it
      const cycleStart = path.indexOf(current);
      if (cycleStart >= 0) {
        const cycle = path.slice(cycleStart).concat(current);
        issues.push({
          path: current,
          type: 'circular_dependency',
          specifier: cycle.join(' -> '),
          line: 0,
          severity: 'warning',
        });
      }
      return;
    }
    if (visited.has(current)) return;

    visited.add(current);
    inStack.add(current);
    path.push(current);

    const deps = depGraph.get(current);
    if (deps) {
      for (const dep of deps) {
        // Resolve dep to a file path
        for (const fp of filePaths) {
          if (fp.endsWith(dep.replace('@/', 'src/')) || dep.includes(fp.split('/').pop()?.replace(/\.[^.]+$/, '') || '')) {
            dfs(fp);
            break;
          }
        }
      }
    }

    path.pop();
    inStack.delete(current);
  }

  for (const [filePath] of depGraph) {
    dfs(filePath);
  }

  return { issues, depGraph };
}

// ── Change Tracking ───────────────────────────────────────────────

export interface FileChangeRecord {
  path: string;
  action: 'create' | 'modify' | 'delete';
  previousContent?: string;
  newContent?: string;
  timestamp: number;
  summary: string;
}

export class ChangeTracker {
  private changes: Map<string, FileChangeRecord[]> = new Map();

  recordAction(action: Omit<FileChangeRecord, 'timestamp'>): void {
    const record: FileChangeRecord = {
      ...action,
      timestamp: Date.now(),
    };
    if (!this.changes.has(action.path)) {
      this.changes.set(action.path, []);
    }
    this.changes.get(action.path)!.push(record);

    // Keep only last 50 changes per file
    const fileChanges = this.changes.get(action.path)!;
    if (fileChanges.length > 50) {
      this.changes.set(action.path, fileChanges.slice(-50));
    }
  }

  getChanges(path?: string): FileChangeRecord[] {
    if (path) return this.changes.get(path) || [];
    const all: FileChangeRecord[] = [];
    for (const records of this.changes.values()) {
      all.push(...records);
    }
    return all.sort((a, b) => a.timestamp - b.timestamp);
  }

  getLatestChange(path: string): FileChangeRecord | null {
    const records = this.changes.get(path);
    if (!records || records.length === 0) return null;
    return records[records.length - 1];
  }

  getModifiedFiles(): string[] {
    return Array.from(this.changes.keys());
  }

  clear(): void {
    this.changes.clear();
  }
}

export const changeTracker = new ChangeTracker();

// ── Orphan File Detection ─────────────────────────────────────────

export function findOrphanFiles(files: ProjectFile[]): ProjectFile[] {
  const referencedPaths = new Set<string>();
  const referencedNames = new Set<string>();

  for (const file of files) {
    const content = file.content;
    // Check for direct references
    const refRegex = /(?:from|import|require|href|src)\s*['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = refRegex.exec(content)) !== null) {
      referencedPaths.add(m[1]);
    }

    // Extract component/function names for cross-referencing
    const exportRegex = /export\s+(?:default\s+)?(?:function|const|class)\s+([A-Za-z_$][\w$]*)/g;
    while ((m = exportRegex.exec(content)) !== null) {
      referencedNames.add(m[1]);
    }
  }

  return files.filter(file => {
    const baseName = file.path.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
    const isEntryPoint = /^(index|main|app|package\.json|index\.html|vite\.config|\.env)/i.test(baseName);
    const isReferenced = Array.from(referencedPaths).some(ref => ref.includes(baseName));
    const isNameReferenced = referencedNames.has(baseName);
    const isCss = file.type === 'css';
    const isConfig = /^\.\w+|(ts|js)config\.json$/.test(file.path);

    return !isEntryPoint && !isReferenced && !isNameReferenced && !isCss && !isConfig;
  });
}

// ── Original functions below ───────────────────────────────────────

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

function dirname(path: string): string {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/');
}

function resolvePreviewImportPath(sourcePath: string, specifier: string): string | null {
  if (specifier.startsWith('@/')) {
    return normalizeProjectPath(`src/${specifier.slice(2)}`);
  }

  if (specifier.startsWith('.')) {
    const resolvedParts: string[] = [];
    for (const part of `${dirname(sourcePath)}/${specifier}`.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') {
        resolvedParts.pop();
        continue;
      }
      resolvedParts.push(part);
    }
    return normalizeProjectPath(resolvedParts.join('/'));
  }

  return null;
}

function inlineJsonImports(content: string, sourcePath: string, files: ProjectFile[]): string {
  return content.replace(
    /^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+\.json)['"];?\s*$/gm,
    (_match, bindingName: string, specifier: string) => {
      const resolvedPath = resolvePreviewImportPath(sourcePath, specifier);
      if (!resolvedPath) {
        return `const ${bindingName} = {};`;
      }

      const jsonFile = files.find(file => file.path === resolvedPath);
      if (!jsonFile) {
        return `const ${bindingName} = {};`;
      }

      try {
        const parsed = JSON.parse(jsonFile.content);
        return `const ${bindingName} = ${JSON.stringify(parsed, null, 2)};`;
      } catch {
        return `const ${bindingName} = {};`;
      }
    },
  );
}

function routePathToFilePath(routePath: string): string {
  const normalized = routePath.trim().replace(/^\/+/, '').replace(/\/+$/, '');
  return normalized ? `${normalized}.html` : 'index.html';
}

function buildPreviewFallbacks(importedNames: string[]): string {
  const routerNames = new Set(['Link', 'Routes', 'Route', 'BrowserRouter', 'MemoryRouter', 'useLocation', 'useNavigate', 'useParams', 'useSearchParams', 'Outlet', 'NavLink', 'useRouteMatch', 'useMatch', 'useHref', 'useLinkClickHandler', 'useResolvedPath']);
  const safeNames = importedNames
    .filter(name => /^[A-Za-z_$][\w$]*$/.test(name))
    .filter(name => !['React', 'useState', 'useEffect', 'useMemo', 'useRef', 'useCallback', 'useReducer', 'useId'].includes(name))
    .filter(name => !routerNames.has(name));

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

function reactRouterPolyfill(): string {
  return `
// react-router-dom polyfill for preview
const RouterCtx = React.createContext({ pathname: '/', navigate: (to) => { try { window.history.pushState({}, '', to); } catch(e) {} } });
function useLocation() { return React.useContext(RouterCtx); }
function useNavigate() { const ctx = React.useContext(RouterCtx); return ctx.navigate; }
function useParams() { return {}; }
function useSearchParams() { const [s, setS] = React.useState(new URLSearchParams()); return [s, setS]; }
function useMatch() { return null; }
function Outlet() { return null; }
function Link({ to, children, className, ...props }) {
  const navigate = useNavigate();
  return React.createElement('a', { href: to, onClick: (e) => { e.preventDefault(); navigate(to); }, className, ...props }, children);
}
function NavLink({ to, children, className, ...props }) {
  return React.createElement(Link, { to, className: typeof className === 'function' ? className({ isActive: false }) : className, ...props }, children);
}
function Routes({ children }) {
  const loc = useLocation();
  const path = loc.pathname;
  const childArr = React.Children.toArray(children);
  const matched = childArr.find(c => c.props?.path === '*' || c.props?.path === path || (c.props?.path && path.startsWith(c.props.path)));
  return matched || React.createElement('div', null, 'No route matched: ' + path);
}
function Route({ element }) { return element || null; }
function MemoryRouter({ children }) {
  const [path, setPath] = React.useState(window.__JOYFUL_PREVIEW_PATH || '/');
  const navigate = React.useCallback((to) => {
    if (typeof to === 'number') { window.history.go(to); return; }
    const p = typeof to === 'string' ? to : to?.pathname || '/';
    setPath(p);
    try { window.history.pushState({}, '', p); } catch(e) {}
  }, []);
  window.addEventListener('popstate', () => setPath(window.location.pathname));
  return React.createElement(RouterCtx.Provider, { value: { pathname: path, navigate } }, children);
}
function BrowserRouter({ children }) { return React.createElement(MemoryRouter, null, children); }`;
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

  const componentSource = stripModuleSyntax(inlineJsonImports(appFile.content, appFile.path, files));
  const needsRouter = /react-router-dom/.test(appFile.content);
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net; img-src 'self' data: https:; connect-src 'self' https:; style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; font-src 'self' data: https:; object-src 'none'; frame-ancestors 'self';">
  <title>Joyful React Preview</title>
  <style>${css}</style>
</head>
<body>
  <div id="root"></div>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script type="text/babel" data-presets="env,react,typescript">
window.__JOYFUL_PREVIEW_PATH = ${JSON.stringify(routePath || '/')};
try {
  if (window.location.origin !== 'null') {
    window.history.replaceState({}, '', window.__JOYFUL_PREVIEW_PATH);
  }
} catch (error) {}
const { useState, useMemo, useEffect, useRef, useCallback, useReducer, useId } = React;
${needsRouter ? reactRouterPolyfill() : ''}
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    const escapedHref = escapeRegExp(href);
    const linkRegex = new RegExp(`<link[^>]*href=["']${escapedHref}["'][^>]*>`, 'i');
    if (linkRegex.test(html)) {
      html = html.replace(linkRegex, `<style>${css.content}</style>`);
    } else if (!htmlFile.content.includes(css.path)) {
      html = html.replace('</head>', `<style>${css.content}</style></head>`);
    }
  }

  // Inject JS files
  const jsFiles = files.filter(f => f.type === 'js');
  for (const js of jsFiles) {
    const src = js.path;
    const escapedSrc = escapeRegExp(src);
    const scriptRegex = new RegExp(`<script[^>]*src=["']${escapedSrc}["'][^>]*></script>`, 'i');
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
