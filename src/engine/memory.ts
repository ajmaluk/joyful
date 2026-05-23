// ── Memory Types ───────────────────────────────────────────────────

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  tags: string[];
  timestamp: string;
  source: string;
}

export type MemoryType =
  | 'decision'
  | 'pattern'
  | 'fact'
  | 'command'
  | 'error'
  | 'reference';

// ── Session Memory ─────────────────────────────────────────────────

export class SessionMemory {
  private entries: MemoryEntry[] = [];
  private maxEntries = 200;

  constructor(maxEntries?: number) {
    if (maxEntries) this.maxEntries = maxEntries;
  }

  add(type: MemoryType, content: string, tags: string[] = [], source = 'session'): MemoryEntry {
    const entry: MemoryEntry = {
      id: generateMemoryId(),
      type,
      content,
      tags,
      timestamp: new Date().toISOString(),
      source,
    };
    this.entries.push(entry);

    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    return entry;
  }

  getRecent(count = 20): MemoryEntry[] {
    return this.entries.slice(-count);
  }

  search(query: string, type?: MemoryType): MemoryEntry[] {
    const lower = query.toLowerCase();
    return this.entries.filter(e => {
      const matchesQuery = e.content.toLowerCase().includes(lower) ||
        e.tags.some(t => t.toLowerCase().includes(lower));
      const matchesType = type ? e.type === type : true;
      return matchesQuery && matchesType;
    });
  }

  getAll(): MemoryEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }

  toString(): string {
    if (this.entries.length === 0) return '(no session memory)';
    return this.entries.map(e =>
      `[${e.type}] ${e.content} (${new Date(e.timestamp).toLocaleTimeString()})`
    ).join('\n');
  }

  getSummary(): string {
    if (this.entries.length === 0) return '';

    const recent = this.getRecent(10);
    const types = [...new Set(recent.map(e => e.type))];
    const tags = [...new Set(recent.flatMap(e => e.tags))];

    return [
      `Session entries: ${this.entries.length}`,
      `Recent types: ${types.join(', ')}`,
      `Active tags: ${tags.join(', ')}`,
      `---`,
      ...recent.map(e => `[${e.type}] ${e.content.slice(0, 200)}`),
    ].join('\n');
  }
}

// ── Project Memory (JSON persistence) ──────────────────────────────

export interface ProjectMemoryData {
  version: number;
  description: string;
  techStack: string[];
  patterns: string[];
  decisions: DecisionRecord[];
  errors: ErrorRecord[];
  conventions: string[];
  updatedAt: string;
}

export interface DecisionRecord {
  title: string;
  decision: string;
  alternatives: string[];
  rationale: string;
  date: string;
}

export interface ErrorRecord {
  error: string;
  solution: string;
  frequency: number;
  lastSeen: string;
}

export class ProjectMemory {
  private data: ProjectMemoryData;

  private storage: ProjectMemoryStorage;

  constructor(storage: ProjectMemoryStorage, initial?: Partial<ProjectMemoryData>) {
    this.storage = storage;
    this.data = {
      version: 1,
      description: '',
      techStack: [],
      patterns: [],
      decisions: [],
      errors: [],
      conventions: [],
      updatedAt: new Date().toISOString(),
      ...initial,
    };
  }

  get description(): string { return this.data.description; }
  set description(v: string) { this.data.description = v; this.touch(); }

  get techStack(): string[] { return [...this.data.techStack]; }
  get decisions(): DecisionRecord[] { return [...this.data.decisions]; }
  get errors(): ErrorRecord[] { return [...this.data.errors]; }
  get conventions(): string[] { return [...this.data.conventions]; }
  get patterns(): string[] { return [...this.data.patterns]; }

  addTechnology(tech: string): void {
    if (!this.data.techStack.includes(tech)) {
      this.data.techStack.push(tech);
      this.data.techStack.sort();
      this.touch();
    }
  }

  addPattern(pattern: string): void {
    if (!this.data.patterns.includes(pattern)) {
      this.data.patterns.push(pattern);
      this.touch();
    }
  }

  addDecision(title: string, decision: string, alternatives: string[], rationale: string): void {
    this.data.decisions.push({ title, decision, alternatives, rationale, date: new Date().toISOString() });
    this.touch();
  }

  addError(error: string, solution: string): void {
    const existing = this.data.errors.find(e => e.error === error);
    if (existing) {
      existing.frequency++;
      existing.lastSeen = new Date().toISOString();
    } else {
      this.data.errors.push({ error, solution, frequency: 1, lastSeen: new Date().toISOString() });
    }
    this.touch();
  }

  addConvention(convention: string): void {
    if (!this.data.conventions.includes(convention)) {
      this.data.conventions.push(convention);
      this.touch();
    }
  }

  toString(): string {
    const parts: string[] = [];

    if (this.data.description) parts.push(`Description: ${this.data.description}`);
    if (this.data.techStack.length > 0) parts.push(`Tech Stack: ${this.data.techStack.join(', ')}`);
    if (this.data.patterns.length > 0) parts.push(`Patterns:\n${this.data.patterns.map(p => `  - ${p}`).join('\n')}`);
    if (this.data.conventions.length > 0) parts.push(`Conventions:\n${this.data.conventions.map(c => `  - ${c}`).join('\n')}`);
    if (this.data.decisions.length > 0) {
      parts.push('Decisions:');
      for (const d of this.data.decisions) {
        parts.push(`  - ${d.title}: ${d.decision}`);
      }
    }
    if (this.data.errors.length > 0) {
      parts.push('Known Errors:');
      for (const e of this.data.errors) {
        parts.push(`  - ${e.error} → ${e.solution} (seen ${e.frequency}x)`);
      }
    }

    return parts.join('\n') || '(no project memory)';
  }

  async save(): Promise<void> {
    this.data.updatedAt = new Date().toISOString();
    await this.storage.save(this.data);
  }

  static async load(storage: ProjectMemoryStorage): Promise<ProjectMemory> {
    const data = await storage.load();
    return new ProjectMemory(storage, data);
  }

  private touch(): void {
    this.data.updatedAt = new Date().toISOString();
  }
}

// ── Storage Interface ──────────────────────────────────────────────

export interface ProjectMemoryStorage {
  save(data: ProjectMemoryData): Promise<void>;
  load(): Promise<Partial<ProjectMemoryData> | undefined>;
}

// ── In-Memory Storage (fallback) ───────────────────────────────────

export class InMemoryProjectStorage implements ProjectMemoryStorage {
  private data: Partial<ProjectMemoryData> | undefined;

  async save(data: ProjectMemoryData): Promise<void> {
    this.data = { ...data };
  }

  async load(): Promise<Partial<ProjectMemoryData> | undefined> {
    return this.data;
  }
}

// ── LocalStorage Storage ───────────────────────────────────────────

export class LocalStorageProjectStorage implements ProjectMemoryStorage {
  private key: string;

  constructor(key = 'joyful-project-memory') {
    this.key = key;
  }

  async save(data: ProjectMemoryData): Promise<void> {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save project memory to localStorage:', e);
    }
  }

  async load(): Promise<Partial<ProjectMemoryData> | undefined> {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) return JSON.parse(raw) as ProjectMemoryData;
    } catch (e) {
      console.warn('Failed to load project memory from localStorage:', e);
    }
    return undefined;
  }
}

// ── IndexedDB Storage ──────────────────────────────────────────────
// Preferred over localStorage for larger memory payloads (5MB+ limit).
// Uses the same 'idb' library already present in the project.

import { openDB, type IDBPDatabase } from 'idb';

export class IndexedDbProjectStorage implements ProjectMemoryStorage {
  private dbName: string;
  private storeName = 'project_memory';
  private dbPromise: Promise<IDBPDatabase> | null = null;

  constructor(dbName = 'joyful-engine') {
    this.dbName = dbName;
  }

  private async getDb(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDB(this.dbName, 1, {
        upgrade: (db) => {
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'key' });
          }
        },
      });
    }
    return this.dbPromise;
  }

  async save(data: ProjectMemoryData): Promise<void> {
    try {
      const db = await this.getDb();
      await db.put(this.storeName, { key: 'project_memory', value: data });
    } catch (e) {
      console.warn('Failed to save project memory to IndexedDB:', e);
    }
  }

  async load(): Promise<Partial<ProjectMemoryData> | undefined> {
    try {
      const db = await this.getDb();
      const record = await db.get(this.storeName, 'project_memory');
      return record?.value as ProjectMemoryData | undefined;
    } catch (e) {
      console.warn('Failed to load project memory from IndexedDB:', e);
    }
    return undefined;
  }
}

// ── ID Generation ──────────────────────────────────────────────────

let memoryCounter = 0;

function generateMemoryId(): string {
  memoryCounter++;
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 6);
  return `mem-${timestamp}-${random}-${memoryCounter.toString(36)}`;
}
