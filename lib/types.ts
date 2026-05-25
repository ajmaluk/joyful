export interface UserSkill {
  id: string;
  name: string;
  description: string;
  instructions: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  skills: UserSkill[];
  autoSave: boolean;
  livePreview: boolean;
  editorFontSize: number;
  editorLineHeight: number;
  editorFontFamily: string;
  editorMinimap: boolean;
  editorWordWrap: boolean;
  editorLineNumbers: boolean;
  explorerDensity: 'compact' | 'comfortable';
  aiTemperature: number;
  aiProvider?: string;
  aiModel?: string;
}

export interface ProjectFile {
  path: string;
  content: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  files: ProjectFile[];
  updatedAt?: string;
  buildStatus?: 'building' | 'interrupted' | 'complete' | 'idle';
}

export type ChatMode = 'build' | 'plan';

export interface ChatAttachment {
  name: string;
  url?: string;
  type?: string;
  dataUrl?: string;
  file?: File;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: ChatAttachment[];
}

export interface SavedGenerationState {
  files: ProjectFile[];
  messages: ChatMessage[];
}
