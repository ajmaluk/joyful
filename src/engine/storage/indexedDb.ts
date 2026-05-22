import { openDB, type IDBPDatabase } from 'idb';
import type {
  StorageAdapter,
  StorageQuota,
  ProjectRecord,
  ChatRecord,
  GenerationStateRecord,
  UserSkillRecord,
} from './types';

const DB_NAME = 'joyful-engine';
const DB_VERSION = 1;

const STORES = {
  PROJECTS: 'projects',
  CHAT_MESSAGES: 'chat_messages',
  GENERATION_STATES: 'generation_states',
  SETTINGS: 'settings',
  SKILLS: 'skills',
  AUTH: 'auth',
  META: 'meta',
} as const;

export class IndexedDbAdapter implements StorageAdapter {
  private db: IDBPDatabase | null = null;

  async init(): Promise<void> {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, _transaction) {
        if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
          db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.CHAT_MESSAGES)) {
          const store = db.createObjectStore(STORES.CHAT_MESSAGES, { keyPath: 'id' });
          store.createIndex('projectId', 'projectId');
        }
        if (!db.objectStoreNames.contains(STORES.GENERATION_STATES)) {
          const store = db.createObjectStore(STORES.GENERATION_STATES, { keyPath: 'id' });
          store.createIndex('projectId', 'projectId');
        }
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORES.SKILLS)) {
          db.createObjectStore(STORES.SKILLS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.AUTH)) {
          db.createObjectStore(STORES.AUTH, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORES.META)) {
          db.createObjectStore(STORES.META, { keyPath: 'key' });
        }
      },
    });
  }

  private assertDb(): IDBPDatabase {
    if (!this.db) throw new Error('IndexedDB not initialized. Call init() first.');
    return this.db;
  }

  // ── Projects ──

  async getProject(id: string): Promise<ProjectRecord | undefined> {
    return this.assertDb().get(STORES.PROJECTS, id);
  }

  async listProjects(): Promise<ProjectRecord[]> {
    return this.assertDb().getAll(STORES.PROJECTS);
  }

  async saveProject(project: ProjectRecord): Promise<void> {
    await this.assertDb().put(STORES.PROJECTS, project);
  }

  async deleteProject(id: string): Promise<void> {
    const db = this.assertDb();
    await db.delete(STORES.PROJECTS, id);

    const chatMessages = await db.getAllFromIndex(STORES.CHAT_MESSAGES, 'projectId', id);
    for (const msg of chatMessages) {
      await db.delete(STORES.CHAT_MESSAGES, msg.id);
    }

    const genStates = await db.getAllFromIndex(STORES.GENERATION_STATES, 'projectId', id);
    for (const state of genStates) {
      await db.delete(STORES.GENERATION_STATES, state.id);
    }
  }

  // ── Chat Messages ──

  async getChatMessages(projectId: string): Promise<ChatRecord[]> {
    return this.assertDb().getAllFromIndex(STORES.CHAT_MESSAGES, 'projectId', projectId);
  }

  async saveChatMessages(projectId: string, messages: ChatRecord[]): Promise<void> {
    const db = this.assertDb();
    const existing = await db.getAllFromIndex(STORES.CHAT_MESSAGES, 'projectId', projectId);
    for (const msg of existing) {
      await db.delete(STORES.CHAT_MESSAGES, msg.id);
    }
    for (const msg of messages) {
      await db.put(STORES.CHAT_MESSAGES, msg);
    }
  }

  // ── Generation States ──

  async getGenerationState(projectId: string): Promise<GenerationStateRecord | undefined> {
    const states = await this.assertDb().getAllFromIndex(STORES.GENERATION_STATES, 'projectId', projectId);
    return states[states.length - 1];
  }

  async saveGenerationState(_projectId: string, state: GenerationStateRecord): Promise<void> {
    await this.assertDb().put(STORES.GENERATION_STATES, state);
  }

  async deleteGenerationState(projectId: string): Promise<void> {
    const db = this.assertDb();
    const states = await db.getAllFromIndex(STORES.GENERATION_STATES, 'projectId', projectId);
    for (const state of states) {
      await db.delete(STORES.GENERATION_STATES, state.id);
    }
  }

  // ── Settings ──

  async getSettings(): Promise<Record<string, unknown>> {
    const records = await this.assertDb().getAll(STORES.SETTINGS);
    const settings: Record<string, unknown> = {};
    for (const rec of records) {
      settings[rec.key] = rec.value;
    }
    return settings;
  }

  async saveSettings(settings: Record<string, unknown>): Promise<void> {
    const db = this.assertDb();
    for (const [key, value] of Object.entries(settings)) {
      await db.put(STORES.SETTINGS, { key, value });
    }
  }

  // ── Skills ──

  async getUserSkills(): Promise<UserSkillRecord[]> {
    return this.assertDb().getAll(STORES.SKILLS);
  }

  async saveUserSkills(skills: UserSkillRecord[]): Promise<void> {
    const db = this.assertDb();
    await db.clear(STORES.SKILLS);
    for (const skill of skills) {
      await db.put(STORES.SKILLS, skill);
    }
  }

  // ── Auth ──

  async isAuthenticated(): Promise<boolean> {
    const record = await this.assertDb().get(STORES.AUTH, 'session');
    return record?.value === 'true';
  }

  async setAuthenticated(value: boolean): Promise<void> {
    await this.assertDb().put(STORES.AUTH, { key: 'session', value: value ? 'true' : 'false' });
  }

  // ── Meta ──

  async getMeta(key: string): Promise<unknown> {
    const record = await this.assertDb().get(STORES.META, key);
    return record?.value;
  }

  async setMeta(key: string, value: unknown): Promise<void> {
    await this.assertDb().put(STORES.META, { key, value });
  }

  // ── Quota ──

  async getQuota(): Promise<StorageQuota> {
    if (!navigator.storage?.estimate) {
      return { usedBytes: 0, totalBytes: 0, percentage: 0 };
    }
    const estimate = await navigator.storage.estimate();
    const usedBytes = estimate.usage ?? 0;
    const totalBytes = estimate.quota ?? 0;
    return {
      usedBytes,
      totalBytes,
      percentage: totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0,
    };
  }

  // ── Clear / Destroy ──

  async clear(): Promise<void> {
    const db = this.assertDb();
    for (const store of Object.values(STORES)) {
      await db.clear(store);
    }
  }

  async destroy(): Promise<void> {
    this.db?.close();
    this.db = null;
  }
}
