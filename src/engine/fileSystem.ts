import type { FileOperation, FileAction } from './types';

// ── Path Utilities ─────────────────────────────────────────────────

const MAX_PATH_LENGTH = 200;

export function normalizePath(path: string): string {
  return path
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');
}

export function getDirectory(path: string): string {
  const parts = normalizePath(path).split('/');
  parts.pop();
  return parts.join('/');
}

export function getFileName(path: string): string {
  return normalizePath(path).split('/').pop() || '';
}

export function getExtension(path: string): string {
  const name = getFileName(path);
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot) : '';
}

// ── Validation ─────────────────────────────────────────────────────

export interface PathValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFilePath(path: string, projectRoot: string = ''): PathValidationResult {
  const normalized = normalizePath(path);

  if (!normalized) {
    return { valid: false, error: 'Path is empty' };
  }

  if (normalized.length > MAX_PATH_LENGTH) {
    return { valid: false, error: `Path exceeds ${MAX_PATH_LENGTH} characters` };
  }

  if (normalized.startsWith('..')) {
    return { valid: false, error: 'Path traversal detected (starts with ..)' };
  }

  if (normalized.includes('/../') || normalized.includes('/..')) {
    return { valid: false, error: 'Path traversal detected (contains /../)' };
  }

  if (normalized.includes('~')) {
    return { valid: false, error: 'Path contains ~ which is not allowed' };
  }

  if (!/^[a-zA-Z0-9_\-./\s]+$/.test(normalized)) {
    return { valid: false, error: 'Path contains invalid characters' };
  }

  if (projectRoot && !normalized.startsWith(normalizePath(projectRoot))) {
    return { valid: false, error: 'Path is outside the project root' };
  }

  return { valid: true };
}

export function validateFileOperation(
  op: FileOperation,
  existingFiles: string[],
  projectRoot: string = '',
): { valid: boolean; error?: string } {
  const pathResult = validateFilePath(op.path, projectRoot);
  if (!pathResult.valid) {
    return { valid: false, error: `Invalid path "${op.path}": ${pathResult.error}` };
  }

  switch (op.action) {
    case 'create_file': {
      if (existingFiles.includes(op.path)) {
        return { valid: false, error: `File already exists: ${op.path}. Use update_file instead.` };
      }
      if (!op.content && op.content !== '') {
        return { valid: false, error: 'create_file requires content' };
      }
      break;
    }
    case 'update_file': {
      if (!existingFiles.includes(op.path)) {
        return { valid: false, error: `File does not exist: ${op.path}. Use create_file instead.` };
      }
      if (!op.content && op.content !== '') {
        return { valid: false, error: 'update_file requires content' };
      }
      break;
    }
    case 'patch_file': {
      if (!existingFiles.includes(op.path)) {
        return { valid: false, error: `File does not exist for patching: ${op.path}` };
      }
      if (!op.patches || op.patches.length === 0) {
        return { valid: false, error: 'patch_file requires at least one patch' };
      }
      break;
    }
    case 'delete_file': {
      if (!existingFiles.includes(op.path)) {
        return { valid: false, error: `File does not exist: ${op.path}` };
      }
      break;
    }
    case 'rename_file': {
      if (!existingFiles.includes(op.path)) {
        return { valid: false, error: `Source file does not exist: ${op.path}` };
      }
      if (!op.oldPath) {
        return { valid: false, error: 'rename_file requires oldPath' };
      }
      const newPathResult = validateFilePath(op.oldPath, projectRoot);
      if (!newPathResult.valid) {
        return { valid: false, error: `Invalid new path "${op.oldPath}": ${newPathResult.error}` };
      }
      if (existingFiles.includes(op.oldPath)) {
        return { valid: false, error: `Target file already exists: ${op.oldPath}` };
      }
      break;
    }
    case 'create_folder': {
      if (existingFiles.includes(op.path)) {
        return { valid: false, error: `Path already exists: ${op.path}` };
      }
      break;
    }
    case 'delete_folder': {
      if (!existingFiles.some(f => f.startsWith(op.path + '/') || f === op.path)) {
        return { valid: false, error: `Folder does not exist or is empty: ${op.path}` };
      }
      break;
    }
  }

  return { valid: true };
}

// ── Apply Operations ───────────────────────────────────────────────

export interface ApplyResult {
  success: boolean;
  results: ApplyOperationResult[];
  errors: ApplyError[];
  files: { path: string; content: string }[];
}

export interface ApplyOperationResult {
  action: FileAction;
  path: string;
  status: 'applied' | 'skipped';
  summary: string;
}

export interface ApplyError {
  path: string;
  action: FileAction;
  error: string;
}

export interface VirtualFileEntry {
  path: string;
  content: string;
}

export function applyFileOperations(
  operations: FileOperation[],
  currentFiles: VirtualFileEntry[],
): ApplyResult {
  const results: ApplyOperationResult[] = [];
  const errors: ApplyError[] = [];
  const fileMap = new Map(currentFiles.map(f => [f.path, f.content]));
  const existingPaths = new Set(fileMap.keys());

  // Process operations in order, skipping invalid ones
  for (const op of operations) {
    const validation = validateFileOperation(op, Array.from(existingPaths));
    if (!validation.valid) {
      errors.push({ path: op.path, action: op.action, error: validation.error! });
      results.push({ action: op.action, path: op.path, status: 'skipped', summary: validation.error! });
      continue;
    }

    try {
      switch (op.action) {
        case 'create_file': {
          const dir = getDirectory(op.path);
          if (dir) {
            ensureParentFolders(dir, fileMap);
          }
          fileMap.set(op.path, op.content || '');
          existingPaths.add(op.path);
          results.push({ action: op.action, path: op.path, status: 'applied', summary: `Created ${op.path}` });
          break;
        }

        case 'update_file': {
          fileMap.set(op.path, op.content || '');
          results.push({ action: op.action, path: op.path, status: 'applied', summary: `Updated ${op.path}` });
          break;
        }

        case 'patch_file': {
          const content = fileMap.get(op.path) || '';
          let patched = content;
          for (const patch of op.patches || []) {
            if (!patch.search) {
              errors.push({ path: op.path, action: op.action, error: 'Patch missing search text' });
              continue;
            }
            if (!patched.includes(patch.search)) {
              errors.push({ path: op.path, action: op.action, error: `Search text not found in ${op.path}: "${patch.search.slice(0, 50)}..."` });
              continue;
            }
            patched = patched.replace(patch.search, patch.replace);
          }
          fileMap.set(op.path, patched);
          results.push({ action: op.action, path: op.path, status: 'applied', summary: `Patched ${op.path} with ${(op.patches || []).length} change(s)` });
          break;
        }

        case 'delete_file': {
          fileMap.delete(op.path);
          existingPaths.delete(op.path);
          results.push({ action: op.action, path: op.path, status: 'applied', summary: `Deleted ${op.path}` });
          break;
        }

        case 'rename_file': {
          const srcContent = fileMap.get(op.path);
          if (srcContent !== undefined) {
            fileMap.delete(op.path);
            existingPaths.delete(op.path);
            fileMap.set(op.oldPath!, srcContent);
            existingPaths.add(op.oldPath!);
          }
          results.push({ action: op.action, path: op.path, status: 'applied', summary: `Renamed ${op.path} to ${op.oldPath}` });
          break;
        }

        case 'create_folder': {
          ensureParentFolders(op.path, fileMap);
          fileMap.set(op.path + '/.gitkeep', '');
          results.push({ action: op.action, path: op.path, status: 'applied', summary: `Created folder ${op.path}` });
          break;
        }

        case 'delete_folder': {
          const prefix = op.path + '/';
          for (const [filePath] of fileMap) {
            if (filePath === op.path || filePath.startsWith(prefix)) {
              fileMap.delete(filePath);
              existingPaths.delete(filePath);
            }
          }
          results.push({ action: op.action, path: op.path, status: 'applied', summary: `Deleted folder ${op.path} and contents` });
          break;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ path: op.path, action: op.action, error: message });
      results.push({ action: op.action, path: op.path, status: 'skipped', summary: message });
    }
  }

  const updatedFiles = Array.from(fileMap.entries())
    .filter(([path]) => !path.endsWith('/.gitkeep'))
    .map(([path, content]) => ({ path, content }));

  return { success: errors.length === 0, results, errors, files: updatedFiles };
}

function ensureParentFolders(dir: string, fileMap: Map<string, string>): void {
  const parts = dir.split('/');
  let current = '';
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (!fileMap.has(current) && !fileMap.has(current + '/.gitkeep')) {
      fileMap.set(current + '/.gitkeep', '');
    }
  }
}

// ── Build File Tree ────────────────────────────────────────────────

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children: FileTreeNode[];
}

export function buildFileTree(paths: string[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  const nodeMap = new Map<string, FileTreeNode>();

  const sorted = [...paths].sort();

  for (const fullPath of sorted) {
    const parts = fullPath.split('/');

    // Build folder structure
    let currentPath = '';
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
      if (!nodeMap.has(currentPath)) {
        const node: FileTreeNode = {
          name: parts[i],
          path: currentPath,
          type: 'folder',
          children: [],
        };
        nodeMap.set(currentPath, node);
      }
    }

    // Add file
    const fileNode: FileTreeNode = {
      name: parts[parts.length - 1],
      path: fullPath,
      type: 'file',
      children: [],
    };
    nodeMap.set(fullPath, fileNode);
  }

  // Build hierarchy
  for (const [, node] of nodeMap) {
    if (node.type === 'folder') {
      const parentPath = getDirectory(node.path);
      if (parentPath && nodeMap.has(parentPath)) {
        nodeMap.get(parentPath)!.children.push(node);
      } else if (!parentPath) {
        root.push(node);
      }
    } else {
      const parentPath = getDirectory(node.path);
      if (parentPath && nodeMap.has(parentPath)) {
        nodeMap.get(parentPath)!.children.push(node);
      } else if (!parentPath) {
        root.push(node);
      }
    }
  }

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

// ── Detect Duplicate Files ─────────────────────────────────────────

export interface DuplicateInfo {
  path: string;
  similarTo: string;
  similarity: number;
}

export function detectDuplicateFiles(
  files: { path: string; content: string }[],
  threshold = 0.85,
): DuplicateInfo[] {
  const duplicates: DuplicateInfo[] = [];

  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      const a = files[i].content;
      const b = files[j].content;

      if (a.length < 50 || b.length < 50) continue;

      // Simple content overlap
      const shorter = a.length < b.length ? a : b;
      const longer = a.length < b.length ? b : a;
      const similarity = levenshteinSimilarity(shorter, longer);

      if (similarity >= threshold) {
        duplicates.push({
          path: files[j].path,
          similarTo: files[i].path,
          similarity,
        });
      }
    }
  }

  return duplicates;
}

function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  // Use a fast approximation for large strings
  if (a.length > 1000 || b.length > 1000) {
    const sampleSize = Math.min(a.length, b.length, 1000);
    const aSample = a.slice(0, sampleSize);
    const bSample = b.slice(0, sampleSize);
    let matches = 0;
    for (let i = 0; i < sampleSize; i++) {
      if (aSample[i] === bSample[i]) matches++;
    }
    return matches / sampleSize;
  }

  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) {
        matrix[i][j] = j;
      } else {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }
  }
  const distance = matrix[a.length][b.length];
  return 1 - distance / maxLen;
}

// ── Convert FileOperations to string for prompt context ────────────

export function describeFileOperations(ops: FileOperation[]): string {
  return ops.map(op => {
    const base = `[${op.action}] ${op.path}`;
    if (op.action === 'rename_file') return `${base} → ${op.oldPath}`;
    if (op.action === 'patch_file') return `${base} (${(op.patches || []).length} patches)`;
    if (op.content !== undefined) return `${base} (${op.content.length} chars)`;
    return base;
  }).join('\n');
}
