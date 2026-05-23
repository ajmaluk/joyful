import { openDB, type IDBPDatabase } from 'idb';
import JSZip from 'jszip';

const DB_NAME = 'joyful-vfs';
const DB_VERSION = 2;
const FILES_STORE = 'files';
const FILES_V2_STORE = 'files_v2';
const META_STORE = 'meta';

interface FileRecordV2 {
  id: string;
  projectId: string;
  path: string;
  content: string;
  type: 'file' | 'directory';
  createdAt: number;
  updatedAt: number;
  version: number;
}

interface OldFileRecord {
  id?: string;
  projectId: string;
  path: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  type?: 'file' | 'directory';
  version?: number;
}

function makeKey(projectId: string, path: string): string {
  const normalized = normalizePath(path);
  return `${projectId}:${normalized}`;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion) {
        // V1 stores
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          db.createObjectStore(FILES_STORE, { keyPath: 'path' });
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'key' });
        }

        // V2: project-scoped store
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains(FILES_V2_STORE)) {
            const v2Store = db.createObjectStore(FILES_V2_STORE, { keyPath: 'id' });
            v2Store.createIndex('projectId', 'projectId');
            v2Store.createIndex('updatedAt', 'updatedAt');
          }

          // Migrate old records to v2 format
          if (db.objectStoreNames.contains(FILES_STORE)) {
            const oldStore = db.transaction(FILES_STORE).objectStore(FILES_STORE);
            const oldRecords = await oldStore.getAll();
            const v2Tx = db.transaction(FILES_V2_STORE, 'readwrite');
            for (const oldRec of oldRecords) {
              const pid = (oldRec as OldFileRecord).projectId || 'default';
              const id = `${pid}:${(oldRec as OldFileRecord).path}`;
              const exists = await v2Tx.store.get(id);
              if (!exists) {
                v2Tx.store.add({
                  id,
                  projectId: pid,
                  path: (oldRec as OldFileRecord).path,
                  content: (oldRec as OldFileRecord).content,
                  type: (oldRec as OldFileRecord).type || 'file',
                  createdAt: (oldRec as OldFileRecord).createdAt || Date.now(),
                  updatedAt: (oldRec as OldFileRecord).updatedAt || Date.now(),
                  version: (oldRec as OldFileRecord).version || 1,
                } as FileRecordV2);
              }
            }
            await v2Tx.done;
          }
        }
      },
    });
  }
  return dbPromise;
}

export function normalizePath(path: string): string {
  const raw = String(path || '').trim().replace(/\\/g, '/');

  if (!raw) {
    throw new Error('Path cannot be empty.');
  }

  if (raw.split('/').includes('..')) {
    throw new Error(`Unsafe path traversal is not allowed: ${path}`);
  }

  const collapsed = raw.replace(/\/+/g, '/');
  const noLeading = collapsed.replace(/^\/+/, '');
  const noTrailing = noLeading.replace(/\/+$/, '');

  return '/' + noTrailing;
}

export function validateSafePath(path: string): boolean {
  try {
    normalizePath(path);
    return true;
  } catch {
    return false;
  }
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
  private fileCache = new Map<string, FileRecordV2>();
  private loaded = false;
  private listeners = new Map<FSEventType, Set<FSEventHandler>>();
  private projectId = 'default';

  setProjectId(projectId: string): void {
    this.projectId = projectId || 'default';
  }

  async init(): Promise<void> {
    if (this.loaded) return;
    const db = await getDb();
    // Load from v2 store (preferred)
    const all = await db.getAll(FILES_V2_STORE);
    for (const rec of all) {
      this.fileCache.set(rec.id, rec);
    }
    // Also load from old v1 store as fallback for migration compatibility
    if (db.objectStoreNames.contains(FILES_STORE)) {
      try {
        const oldAll = await db.getAll(FILES_STORE);
        for (const oldRec of oldAll) {
          const pid = (oldRec as OldFileRecord).projectId || 'default';
          const oldId = `${pid}:${(oldRec as OldFileRecord).path}`;
          if (!this.fileCache.has(oldId)) {
            this.fileCache.set(oldId, {
              id: oldId,
              projectId: pid,
              path: (oldRec as OldFileRecord).path,
              content: (oldRec as OldFileRecord).content,
              type: (oldRec as OldFileRecord).type || 'file',
              createdAt: (oldRec as OldFileRecord).createdAt || Date.now(),
              updatedAt: (oldRec as OldFileRecord).updatedAt || Date.now(),
              version: (oldRec as OldFileRecord).version || 1,
            });
          }
        }
      } catch {
        // V1 store may not exist or be empty
      }
    }
    this.loaded = true;
  }

  private isOwnProject(record: FileRecordV2): boolean {
    return record.projectId === this.projectId;
  }

  private async loadOneFromDb(id: string): Promise<FileRecordV2 | undefined> {
    const db = await getDb();
    const rec = await db.get(FILES_V2_STORE, id);
    if (rec) return rec;
    // Fallback to v1 store
    if (db.objectStoreNames.contains(FILES_STORE)) {
      // Extract path from id (id = projectId:path)
      const colonIdx = id.indexOf(':');
      if (colonIdx >= 0) {
        const path = id.slice(colonIdx + 1);
        const oldRec = await db.get(FILES_STORE, path);
        if (oldRec) {
          const pid = (oldRec as OldFileRecord).projectId || 'default';
          return {
            id: `${pid}:${(oldRec as OldFileRecord).path}`,
            projectId: pid,
            path: (oldRec as OldFileRecord).path,
            content: (oldRec as OldFileRecord).content,
            type: (oldRec as OldFileRecord).type || 'file',
            createdAt: (oldRec as OldFileRecord).createdAt || Date.now(),
            updatedAt: (oldRec as OldFileRecord).updatedAt || Date.now(),
            version: (oldRec as OldFileRecord).version || 1,
          };
        }
      }
    }
    return undefined;
  }

  private getAllOwnRecords(): FileRecordV2[] {
    return Array.from(this.fileCache.values()).filter(r => this.isOwnProject(r));
  }

  isDirectoryPath(path: string): boolean {
    const normalized = normalizePath(path);
    if (normalized === '/') return true;

    const id = makeKey(this.projectId, normalized);
    const record = this.fileCache.get(id);
    if (record) {
      if (record.type === 'directory') return true;
      if (record.type === 'file') return false;
    }

    const prefix = normalized + '/';
    for (const [cacheId, rec] of this.fileCache) {
      if (!this.isOwnProject(rec)) continue;
      const recPath = cacheId.includes(':') ? cacheId.slice(cacheId.indexOf(':') + 1) : cacheId;
      if (recPath.startsWith(prefix)) {
        return true;
      }
    }
    return false;
  }

  isFile(path: string): boolean {
    const normalized = normalizePath(path);
    const id = makeKey(this.projectId, normalized);
    const record = this.fileCache.get(id);
    if (record) {
      if (record.type === 'file') return true;
      if (record.type === 'directory') return false;
    }
    return this.fileCache.has(id) && !this.isDirectoryPath(normalized);
  }

  async readFile(path: string): Promise<string> {
    await this.init();
    const normalized = normalizePath(path);
    const id = makeKey(this.projectId, normalized);
    const record = this.fileCache.get(id) || await this.loadOneFromDb(id);
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

    const id = makeKey(this.projectId, normalized);
    const existing = this.fileCache.get(id);
    const isNew = !existing;

    const record: FileRecordV2 = {
      id,
      projectId: this.projectId,
      path: normalized,
      content,
      type: 'file',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      version: (existing?.version ?? 0) + 1,
    };

    this.fileCache.set(id, record);
    const db = await getDb();
    await db.put(FILES_V2_STORE, record);

    this.emit(isNew ? 'create' : 'change', normalized);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('joyful_vfs_changed', { detail: { path: normalized } }));
    }
  }

  async deleteFile(path: string): Promise<void> {
    await this.init();
    const normalized = normalizePath(path);
    const id = makeKey(this.projectId, normalized);
    const record = this.fileCache.get(id);
    if (!record || record.type === 'directory') {
      throw new Error(`File not found: ${normalized}`);
    }
    this.fileCache.delete(id);
    const db = await getDb();
    await db.delete(FILES_V2_STORE, id);
    this.emit('delete', normalized);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('joyful_vfs_changed', { detail: { path: normalized, type: 'delete' } }));
    }
  }

  async fileExists(path: string): Promise<boolean> {
    await this.init();
    const normalized = normalizePath(path);
    const id = makeKey(this.projectId, normalized);
    return this.fileCache.has(id) || !!(await this.loadOneFromDb(id));
  }

  async ensureDir(path: string): Promise<void> {
    await this.init();
    const normalized = normalizePath(path);
    if (normalized === '/') return;
    const dirs = getAllParentDirs(normalized);

    for (const dir of dirs) {
      const dirId = makeKey(this.projectId, dir);
      if (this.fileCache.get(dirId)?.type === 'file') {
        throw new Error(`Directory collision: Cannot create directory at "${dir}" because it is currently a file.`);
      }
    }

    const db = await getDb();
    for (const dir of dirs) {
      const dirId = makeKey(this.projectId, dir);
      if (!this.fileCache.has(dirId)) {
        const record: FileRecordV2 = {
          id: dirId,
          projectId: this.projectId,
          path: dir,
          content: '',
          type: 'directory',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
        };
        this.fileCache.set(dirId, record);
        await db.put(FILES_V2_STORE, record);
      }
    }
  }

  async listDirectory(dirPath: string): Promise<FileEntry[]> {
    await this.init();
    const normalized = normalizePath(dirPath);
    const prefix = normalized === '/' ? '/' : normalized + '/';
    const entries = new Map<string, FileEntry>();

    for (const [, record] of this.fileCache) {
      if (!this.isOwnProject(record)) continue;
      const filePath = record.path;
      if (!filePath.startsWith(prefix)) continue;
      const relative = filePath.slice(prefix.length);
      if (!relative) continue;
      const firstName = relative.split('/')[0];
      const childPath = normalized === '/'
        ? '/' + firstName
        : normalized + '/' + firstName;

      if (!entries.has(firstName)) {
        const isDir = relative.includes('/');
        const type = isDir ? 'directory' : record.type;

        entries.set(firstName, {
          name: firstName,
          path: childPath,
          type: type as 'file' | 'directory',
          size: type === 'directory' ? 0 : record.content.length,
          updatedAt: record.updatedAt,
        });
      } else if (relative.includes('/')) {
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
    const ownRecords = this.getAllOwnRecords();

    for (const record of ownRecords) {
      if (record.type === 'file') {
        const zipPath = record.path.startsWith('/') ? record.path.slice(1) : record.path;
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
      if (file.dir) continue;
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
    const ownRecords = this.getAllOwnRecords();

    for (const record of ownRecords) {
      if (record.type !== 'file') continue;
      if (filePattern) {
        const parts = record.path.split('/');
        const name = parts[parts.length - 1];
        const pattern = filePattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
        if (!new RegExp(pattern, 'i').test(name)) continue;
      }
      const lines = record.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(lowerQuery)) {
          results.push({ path: record.path, line: i + 1, content: lines[i].trim() });
        }
      }
    }

    return results;
  }

  async findFiles(pattern: string): Promise<string[]> {
    await this.init();
    const safePattern = pattern || '*';
    const regex = new RegExp(
      safePattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.'),
      'i',
    );
    return this.getAllOwnRecords()
      .filter(record => record.type === 'file')
      .map(record => record.path)
      .filter(path => regex.test(path.split('/').pop() || path) || regex.test(path));
  }

  async writeMultipleFiles(files: { path: string; content: string }[]): Promise<void> {
    for (const file of files) {
      await this.writeFile(file.path, file.content);
    }
  }

  async clearProject(projectId?: string): Promise<void> {
    const pid = projectId || this.projectId;
    const db = await getDb();
    const idsToDelete: string[] = [];

    for (const [id, record] of this.fileCache) {
      if (record.projectId === pid) {
        idsToDelete.push(id);
      }
    }

    for (const id of idsToDelete) {
      this.fileCache.delete(id);
      await db.delete(FILES_V2_STORE, id);
    }
  }

  async deleteDirectory(path: string, recursive = false): Promise<void> {
    await this.init();
    const normalized = normalizePath(path);
    const prefix = normalized + '/';

    const toDelete: string[] = [];
    for (const [id, record] of this.fileCache) {
      if (!this.isOwnProject(record)) continue;
      if (record.path === normalized || record.path.startsWith(prefix)) {
        toDelete.push(id);
      }
    }

    if (!recursive && toDelete.length > 1) {
      throw new Error(`Directory not empty: ${normalized}. Use recursive=true to delete.`);
    }

    const db = await getDb();
    for (const id of toDelete) {
      this.fileCache.delete(id);
      await db.delete(FILES_V2_STORE, id);
      const path = id.includes(':') ? id.slice(id.indexOf(':') + 1) : id;
      this.emit('delete', path);
    }
  }

  async getAllFiles(projectId?: string): Promise<{ path: string; content: string }[]> {
    await this.init();
    const pid = projectId || this.projectId;
    return Array.from(this.fileCache.values())
      .filter(record => record.type === 'file' && record.projectId === pid)
      .map(record => ({
        path: record.path,
        content: record.content,
      }));
  }

  async getFileCount(): Promise<number> {
    await this.init();
    return this.getAllOwnRecords().filter(r => r.type === 'file').length;
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
