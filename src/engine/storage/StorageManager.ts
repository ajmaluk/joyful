import type { StorageAdapter, StorageQuota } from './types';
import { IndexedDbAdapter } from './indexedDb';
import { runMigrations } from './migrations';

export type StorageEventType = 'project_changed' | 'settings_changed' | 'skills_changed' | 'auth_changed' | 'quota_exceeded';
type StorageEventHandler = (detail: unknown) => void;

export class StorageManager {
  private adapter: StorageAdapter;
  private initialized = false;
  private listeners = new Map<StorageEventType, Set<StorageEventHandler>>();

  constructor(adapter?: StorageAdapter) {
    this.adapter = adapter ?? new IndexedDbAdapter();
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    await this.adapter.init();
    await runMigrations(this.adapter);
    this.initialized = true;
  }

  private assertReady(): void {
    if (!this.initialized) throw new Error('StorageManager not initialized. Call init() first.');
  }

  // ── Events ──

  on(event: StorageEventType, handler: StorageEventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: StorageEventType, handler: StorageEventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  private emit(event: StorageEventType, detail: unknown): void {
    this.listeners.get(event)?.forEach(h => h(detail));
  }

  // ── Projects ──

  async listProjects(): Promise<import('./types').ProjectRecord[]> {
    this.assertReady();
    return this.adapter.listProjects();
  }

  async getProject(id: string): Promise<import('./types').ProjectRecord | undefined> {
    this.assertReady();
    return this.adapter.getProject(id);
  }

  async saveProject(project: import('./types').ProjectRecord): Promise<void> {
    this.assertReady();
    await this.adapter.saveProject(project);
    this.emit('project_changed', { id: project.id, action: 'save' });
  }

  async deleteProject(id: string): Promise<void> {
    this.assertReady();
    await this.adapter.deleteProject(id);
    this.emit('project_changed', { id, action: 'delete' });
  }

  // ── Chat ──

  async getChatMessages(projectId: string): Promise<import('./types').ChatRecord[]> {
    this.assertReady();
    return this.adapter.getChatMessages(projectId);
  }

  async saveChatMessages(projectId: string, messages: import('./types').ChatRecord[]): Promise<void> {
    this.assertReady();
    await this.adapter.saveChatMessages(projectId, messages);
  }

  // ── Generation State ──

  async getGenerationState(projectId: string): Promise<import('./types').GenerationStateRecord | undefined> {
    this.assertReady();
    return this.adapter.getGenerationState(projectId);
  }

  async saveGenerationState(projectId: string, state: import('./types').GenerationStateRecord): Promise<void> {
    this.assertReady();
    await this.adapter.saveGenerationState(projectId, state);
  }

  async deleteGenerationState(projectId: string): Promise<void> {
    this.assertReady();
    await this.adapter.deleteGenerationState(projectId);
  }

  // ── Settings ──

  async getSettings(): Promise<Record<string, unknown>> {
    this.assertReady();
    const defaults: Record<string, unknown> = {
      theme: 'system',
      editorFontSize: 14,
      editorLineHeight: 1.6,
      editorFontFamily: 'jetbrains-mono',
      editorMinimap: false,
      editorWordWrap: true,
      editorLineNumbers: true,
      explorerDensity: 'compact',
      autoSave: true,
      livePreview: true,
      aiTemperature: 0.7,
    };
    const stored = await this.adapter.getSettings();
    return { ...defaults, ...stored };
  }

  async saveSettings(settings: Record<string, unknown>): Promise<void> {
    this.assertReady();
    await this.adapter.saveSettings(settings);
    this.emit('settings_changed', settings);
  }

  // ── Skills ──

  async getUserSkills(): Promise<import('./types').UserSkillRecord[]> {
    this.assertReady();
    return this.adapter.getUserSkills();
  }

  async saveUserSkills(skills: import('./types').UserSkillRecord[]): Promise<void> {
    this.assertReady();
    await this.adapter.saveUserSkills(skills);
    this.emit('skills_changed', skills);
  }

  // ── Auth ──

  async isAuthenticated(): Promise<boolean> {
    this.assertReady();
    return this.adapter.isAuthenticated();
  }

  async setAuthenticated(value: boolean): Promise<void> {
    this.assertReady();
    await this.adapter.setAuthenticated(value);
    this.emit('auth_changed', value);
  }

  // ── Meta ──

  async getMeta(key: string): Promise<unknown> {
    this.assertReady();
    return this.adapter.getMeta(key);
  }

  async setMeta(key: string, value: unknown): Promise<void> {
    this.assertReady();
    await this.adapter.setMeta(key, value);
  }

  // ── Quota ──

  async getQuota(): Promise<StorageQuota> {
    this.assertReady();
    const quota = await this.adapter.getQuota();
    if (quota.percentage > 90) {
      this.emit('quota_exceeded', quota);
    }
    return quota;
  }

  // ── Maintenance ──

  async clear(): Promise<void> {
    this.assertReady();
    await this.adapter.clear();
  }
}

export const storageManager = new StorageManager();
