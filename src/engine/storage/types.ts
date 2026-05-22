export interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  templateId?: string;
  previewUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatRecord {
  id: string;
  projectId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  mode?: string;
  metadata?: Record<string, unknown>;
}

export interface GenerationStateRecord {
  id: string;
  projectId: string;
  prompt: string;
  status: 'in_progress' | 'failed';
  savedAt: string;
  updatedAt: string;
  messageCount: number;
  filesSnapshot: Array<{ path: string; content: string }>;
}

export interface UserSkillRecord {
  id: string;
  name: string;
  description: string;
  instructions: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SettingsRecord {
  key: string;
  value: unknown;
}

export interface AuthRecord {
  key: string;
  value: string;
}

export interface StorageQuota {
  usedBytes: number;
  totalBytes: number;
  percentage: number;
}

export interface StorageAdapter {
  init(): Promise<void>;
  getProject(id: string): Promise<ProjectRecord | undefined>;
  listProjects(): Promise<ProjectRecord[]>;
  saveProject(project: ProjectRecord): Promise<void>;
  deleteProject(id: string): Promise<void>;
  getChatMessages(projectId: string): Promise<ChatRecord[]>;
  saveChatMessages(projectId: string, messages: ChatRecord[]): Promise<void>;
  getGenerationState(projectId: string): Promise<GenerationStateRecord | undefined>;
  saveGenerationState(projectId: string, state: GenerationStateRecord): Promise<void>;
  deleteGenerationState(projectId: string): Promise<void>;
  getSettings(): Promise<Record<string, unknown>>;
  saveSettings(settings: Record<string, unknown>): Promise<void>;
  getUserSkills(): Promise<UserSkillRecord[]>;
  saveUserSkills(skills: UserSkillRecord[]): Promise<void>;
  isAuthenticated(): Promise<boolean>;
  setAuthenticated(value: boolean): Promise<void>;
  getMeta(key: string): Promise<unknown>;
  setMeta(key: string, value: unknown): Promise<void>;
  getQuota(): Promise<StorageQuota>;
  clear(): Promise<void>;
  destroy(): Promise<void>;
}
