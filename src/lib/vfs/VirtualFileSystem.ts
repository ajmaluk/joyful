import { openDB, type IDBPDatabase } from 'idb';
import JSZip from 'jszip';

const DB_NAME = 'joyful-vfs';
const DB_VERSION = 1;
const FILES_STORE = 'files';
const META_STORE = 'meta';

interface FileRecord {
  path: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  type?: 'file' | 'directory';
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          const store = db.createObjectStore(FILES_STORE, { keyPath: 'path' });
          store.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export function normalizePath(path: string): string {
  // Convert backslashes to forward slashes and collapse duplicate slashes
  let p = path.replace(/\\/g, '/').replace(/\/+/g, '/');
  
  // Split the path into segments
  const parts = p.split('/');
  const resolvedParts: string[] = [];
  
  for (const part of parts) {
    if (part === '.' || part === '') {
      continue;
    }
    if (part === '..') {
      resolvedParts.pop();
    } else {
      resolvedParts.push(part);
    }
  }
  
  return '/' + resolvedParts.join('/');
}

function getParentDir(path: string): string {
  const normalized = normalizePath(path);
  const idx = normalized.lastIndexOf('/');
  return idx <= 0 ? '/' : normalized.slice(0, idx) || '/';
}

function getAllParentDirs(path: string): string[] {
  const dirs: string[] = [];
  const normalized = normalizePath(path);
  const parts = normalized.split('/').filter(Boolean);
  let current = '';
  for (const part of parts) {
    current = current ? `${current}/${part}` : `/${part}`;
    dirs.push(current);
  }
  return dirs;
}

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  updatedAt: number;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  children: FileTreeNode[];
}

export type FSEventType = 'change' | 'create' | 'delete';
type FSEventHandler = (path: string, type: FSEventType) => void;

export class VirtualFileSystem {
  private fileCache = new Map<string, FileRecord>();
  private loaded = false;
  private listeners = new Map<FSEventType, Set<FSEventHandler>>();

  async init(): Promise<void> {
    if (this.loaded) return;
    const db = await getDb();
    const all = await db.getAll(FILES_STORE);
    for (const rec of all) {
      this.fileCache.set(rec.path, rec);
    }
    this.loaded = true;
  }

  isDirectoryPath(path: string): boolean {
    const normalized = normalizePath(path);
    if (normalized === '/') return true;
    
    const record = this.fileCache.get(normalized);
    if (record) {
      if (record.type === 'directory') return true;
      if (record.type === 'file') return false;
    }
    
    const prefix = normalized + '/';
    for (const [filePath] of this.fileCache) {
      if (filePath.startsWith(prefix)) {
        return true;
      }
    }
    return false;
  }

  isFile(path: string): boolean {
    const normalized = normalizePath(path);
    const record = this.fileCache.get(normalized);
    if (record) {
      if (record.type === 'file') return true;
      if (record.type === 'directory') return false;
    }
    return this.fileCache.has(normalized) && !this.isDirectoryPath(normalized);
  }

  async readFile(path: string): Promise<string> {
    await this.init();
    const normalized = normalizePath(path);
    const record = this.fileCache.get(normalized);
    if (!record || record.type === 'directory') {
      throw new Error(`File not found: ${normalized}`);
    }
    return record.content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.init();
    const normalized = normalizePath(path);
    const now = Date.now();
    
    if (this.isDirectoryPath(normalized)) {
      throw new Error(`File collision: Cannot write file at "${normalized}" because it is currently a directory.`);
    }

    const parent = getParentDir(normalized);
    if (parent !== '/') {
      await this.ensureDir(parent);
    }

    const existing = this.fileCache.get(normalized);
    const isNew = !existing;

    const record: FileRecord = {
      path: normalized,
      content,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      type: 'file',
    };

    this.fileCache.set(normalized, record);
    const db = await getDb();
    await db.put(FILES_STORE, record);

    this.emit(isNew ? 'create' : 'change', normalized);
  }

  async deleteFile(path: string): Promise<void> {
    await this.init();
    const normalized = normalizePath(path);
    const record = this.fileCache.get(normalized);
    if (!record || record.type === 'directory') {
      throw new Error(`File not found: ${normalized}`);
    }
    this.fileCache.delete(normalized);
    const db = await getDb();
    await db.delete(FILES_STORE, normalized);
    this.emit('delete', normalized);
  }

  async fileExists(path: string): Promise<boolean> {
    await this.init();
    const normalized = normalizePath(path);
    return this.isFile(normalized);
  }

  async ensureDir(path: string): Promise<void> {
    await this.init();
    const normalized = normalizePath(path);
    if (normalized === '/') return;
    const dirs = getAllParentDirs(normalized);
    
    for (const dir of dirs) {
      if (this.isFile(dir)) {
        throw new Error(`Directory collision: Cannot create directory at "${dir}" because it is currently a file.`);
      }
    }

    const db = await getDb();
    for (const dir of dirs) {
      if (!this.fileCache.has(dir)) {
        const record: FileRecord = {
          path: dir,
          content: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          type: 'directory',
        };
        this.fileCache.set(dir, record);
        await db.put(FILES_STORE, record);
      }
    }
  }

  async listDirectory(dirPath: string): Promise<FileEntry[]> {
    await this.init();
    const normalized = normalizePath(dirPath);
    const prefix = normalized === '/' ? '/' : normalized + '/';
    const entries = new Map<string, FileEntry>();

    for (const [filePath] of this.fileCache) {
      if (!filePath.startsWith(prefix)) continue;
      const relative = filePath.slice(prefix.length);
      if (!relative) continue;
      const parts = relative.split('/');
      const firstName = parts[0];
      const childPath = normalized === '/'
        ? '/' + firstName
        : normalized + '/' + firstName;

      if (!entries.has(firstName)) {
        const isDir = parts.length > 1;
        const record = this.fileCache.get(filePath);
        const type = isDir ? 'directory' : (record?.type ?? 'file');
        
        entries.set(firstName, {
          name: firstName,
          path: childPath,
          type: type as 'file' | 'directory',
          size: type === 'directory' ? 0 : (record?.content.length ?? 0),
          updatedAt: record?.updatedAt ?? 0,
        });
      } else if (parts.length > 1) {
        // Was previously marked as file but it's actually a directory
        entries.set(firstName, {
          name: firstName,
          path: childPath,
          type: 'directory',
          size: 0,
          updatedAt: entries.get(firstName)!.updatedAt,
        });
      }
    }

    return Array.from(entries.values()).sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  async exportAsZip(): Promise<Blob> {
    await this.init();
    const zip = new JSZip();
    
    for (const [filePath, record] of this.fileCache) {
      if (this.isFile(filePath)) {
        const zipPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
        zip.file(zipPath, record.content);
      }
    }
    
    return await zip.generateAsync({ type: 'blob' });
  }

  async importFromZip(zipBlob: Blob): Promise<void> {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(zipBlob);
    
    await this.clearProject();
    
    for (const [relPath, file] of Object.entries(loadedZip.files)) {
      if (file.dir) {
        continue;
      }
      
      const content = await file.async('string');
      const absPath = '/' + relPath;
      const normalized = normalizePath(absPath);
      
      await this.writeFile(normalized, content);
    }
  }

  async getProjectTree(rootPath = '/'): Promise<FileTreeNode> {
    await this.init();
    const normalized = normalizePath(rootPath);
    const root: FileTreeNode = {
      name: normalized === '/' ? 'project' : normalized.split('/').pop()!,
      path: normalized,
      type: 'directory',
      size: 0,
      children: [],
    };

    const entries = await this.listDirectory(normalized);
    for (const entry of entries) {
      if (entry.type === 'directory') {
        root.children.push(await this.getProjectTree(entry.path));
      } else {
        root.children.push({
          name: entry.name,
          path: entry.path,
          type: 'file',
          size: entry.size,
          children: [],
        });
      }
    }

    return root;
  }

  async searchContent(query: string, filePattern?: string): Promise<{ path: string; line: number; content: string }[]> {
    await this.init();
    const results: { path: string; line: number; content: string }[] = [];
    const lowerQuery = query.toLowerCase();

    for (const [path, record] of this.fileCache) {
      if (filePattern) {
        const parts = path.split('/');
        const name = parts[parts.length - 1];
        const pattern = filePattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
        if (!new RegExp(pattern, 'i').test(name)) continue;
      }
      const lines = record.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(lowerQuery)) {
          results.push({ path, line: i + 1, content: lines[i].trim() });
        }
      }
    }

    return results;
  }

  async findFiles(pattern: string): Promise<string[]> {
    await this.init();
    const regex = new RegExp(
      pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.'),
      'i',
    );
    return Array.from(this.fileCache.keys()).filter(p => {
      if (p.startsWith('/')) return false; // skip directory markers
      const name = p.split('/').pop()!;
      return regex.test(name);
    });
  }

  async writeMultipleFiles(files: { path: string; content: string }[]): Promise<void> {
    for (const file of files) {
      await this.writeFile(file.path, file.content);
    }
  }

  async clearProject(): Promise<void> {
    const db = await getDb();
    await db.clear(FILES_STORE);
    this.fileCache.clear();
  }

  async deleteDirectory(path: string, recursive = false): Promise<void> {
    await this.init();
    const normalized = normalizePath(path);
    const prefix = normalized === '/' ? '/' : normalized + '/';

    const toDelete: string[] = [];
    for (const [filePath] of this.fileCache) {
      if (filePath === normalized || filePath.startsWith(prefix)) {
        toDelete.push(filePath);
      }
    }

    if (!recursive && toDelete.length > 1) {
      throw new Error(`Directory not empty: ${normalized}. Use recursive=true to delete.`);
    }

    const db = await getDb();
    for (const fp of toDelete) {
      this.fileCache.delete(fp);
      await db.delete(FILES_STORE, fp);
      this.emit('delete', fp);
    }
  }

  async getAllFiles(): Promise<{ path: string; content: string }[]> {
    await this.init();
    return Array.from(this.fileCache.values())
      .filter(r => !r.path.startsWith('/') || !this.fileCache.has(r.path + '/.gitkeep'))
      .map(r => ({ path: r.path, content: r.content }));
  }

  async getFileCount(): Promise<number> {
    await this.init();
    return Array.from(this.fileCache.values()).filter(r => {
      const name = r.path.split('/').pop()!;
      return name.includes('.');
    }).length;
  }

  on(event: FSEventType, handler: FSEventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: FSEventType, handler: FSEventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  private emit(event: FSEventType, path: string): void {
    this.listeners.get(event)?.forEach(h => h(path, event));
  }

  async getMeta(key: string): Promise<unknown> {
    const db = await getDb();
    const record = await db.get(META_STORE, key);
    return record?.value;
  }

  async setMeta(key: string, value: unknown): Promise<void> {
    const db = await getDb();
    await db.put(META_STORE, { key, value });
  }

  // For testing
  _resetForTest(): void {
    this.fileCache.clear();
    this.loaded = false;
    this.listeners.clear();
  }
}

export const virtualFS = new VirtualFileSystem();
