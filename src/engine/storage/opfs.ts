import type { StorageAdapter, StorageQuota } from './types';
import { IndexedDbAdapter } from './indexedDb';

export class OpfsAdapter implements StorageAdapter {
  private indexedDb: IndexedDbAdapter;
  private opfsRoot: FileSystemDirectoryHandle | null = null;
  private initialized = false;

  constructor() {
    this.indexedDb = new IndexedDbAdapter();
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    await this.indexedDb.init();
    if (navigator.storage?.getDirectory) {
      this.opfsRoot = await navigator.storage.getDirectory();
    }
    this.initialized = true;
  }

  private assertReady(): void {
    if (!this.initialized) throw new Error('OpfsAdapter not initialized. Call init() first.');
  }

  async getProject(id: string) {
    this.assertReady();
    return this.indexedDb.getProject(id);
  }

  async listProjects() {
    this.assertReady();
    return this.indexedDb.listProjects();
  }

  async saveProject(project: import('./types').ProjectRecord): Promise<void> {
    this.assertReady();
    await this.indexedDb.saveProject(project);
  }

  async deleteProject(id: string): Promise<void> {
    this.assertReady();
    await this.indexedDb.deleteProject(id);
  }

  async getChatMessages(projectId: string) {
    this.assertReady();
    return this.indexedDb.getChatMessages(projectId);
  }

  async saveChatMessages(projectId: string, messages: import('./types').ChatRecord[]) {
    this.assertReady();
    await this.indexedDb.saveChatMessages(projectId, messages);
  }

  async getGenerationState(projectId: string) {
    this.assertReady();
    return this.indexedDb.getGenerationState(projectId);
  }

  async saveGenerationState(projectId: string, state: import('./types').GenerationStateRecord) {
    this.assertReady();
    await this.indexedDb.saveGenerationState(projectId, state);
  }

  async deleteGenerationState(projectId: string) {
    this.assertReady();
    await this.indexedDb.deleteGenerationState(projectId);
  }

  async getSettings() {
    this.assertReady();
    return this.indexedDb.getSettings();
  }

  async saveSettings(settings: Record<string, unknown>) {
    this.assertReady();
    await this.indexedDb.saveSettings(settings);
  }

  async getUserSkills() {
    this.assertReady();
    return this.indexedDb.getUserSkills();
  }

  async saveUserSkills(skills: import('./types').UserSkillRecord[]) {
    this.assertReady();
    await this.indexedDb.saveUserSkills(skills);
  }

  async isAuthenticated() {
    this.assertReady();
    return this.indexedDb.isAuthenticated();
  }

  async setAuthenticated(value: boolean) {
    this.assertReady();
    await this.indexedDb.setAuthenticated(value);
  }

  async getMeta(key: string) {
    this.assertReady();
    return this.indexedDb.getMeta(key);
  }

  async setMeta(key: string, value: unknown) {
    this.assertReady();
    await this.indexedDb.setMeta(key, value);
  }

  async getQuota(): Promise<StorageQuota> {
    this.assertReady();
    return this.indexedDb.getQuota();
  }

  async clear(): Promise<void> {
    this.assertReady();
    await this.indexedDb.clear();
    if (this.opfsRoot) {
      try {
        // OPFS iteration not fully typed in TS DOM lib, use safe approach
        const opfsDir = this.opfsRoot as FileSystemDirectoryHandle & { values(): AsyncIterableIterator<FileSystemFileHandle & { name: string }> };
        for await (const entry of opfsDir.values()) {
          await this.opfsRoot.removeEntry(entry.name, { recursive: true });
        }
      } catch { /* ignore */ }
    }
  }

  async destroy(): Promise<void> {
    this.opfsRoot = null;
    this.initialized = false;
    await this.indexedDb.destroy();
  }
}

export function createOpfsAdapter(): OpfsAdapter {
  return new OpfsAdapter();
}
