// File types for project files
export type FileType = 'html' | 'css' | 'js' | 'ts' | 'json' | 'jsx' | 'tsx' | 'md' | 'other';

// A single file in a project
export interface ProjectFile {
  id: string;
  path: string; // e.g., "index.html", "css/style.css"
  content: string;
  type: FileType;
  isOpen?: boolean;
  isModified?: boolean;
}

// A project
export interface Project {
  id: string;
  name: string;
  description: string;
  files: ProjectFile[];
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  templateId?: string;
  previewUrl?: string;
}

export type ChatMode = 'build' | 'plan';

// Chat message
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  mode?: ChatMode;
  sourcePrompt?: string;
  files?: FileOperation[];
  tasks?: ChatTask[];
  nextSteps?: string[];
  rating?: number;
  actionType?: 'create' | 'modify' | 'delete' | 'generate' | 'plan';
  metadata?: {
    template?: string;
    sections?: string[];
    complexity?: 'simple' | 'medium' | 'complex';
    contextFiles?: string[];
    planSteps?: string[];
  };
}

export interface ChatTask {
  id: string;
  label: string;
  status: 'todo' | 'doing' | 'done';
}

// Chat action for history tracking
export interface ChatAction {
  id: string;
  type: 'create' | 'modify' | 'delete' | 'generate';
  description: string;
  files: string[];
  timestamp: string;
  messageId: string;
}

// File operation from AI
export interface FileOperation {
  path: string;
  action: 'create' | 'modify' | 'delete';
  content?: string;
}

// AI generation response
export interface AIGenerationResponse {
  files: {
    path: string;
    content?: string;
    action?: 'create' | 'modify' | 'delete';
  }[];
  summary: string;
  nextSteps: string[];
  metadata?: {
    template: string;
    sections: string[];
    estimatedComplexity: 'simple' | 'medium' | 'complex';
  };
}

// Streaming chunk from AI
export interface AIStreamChunk {
  type: 'file_start' | 'file_content' | 'file_end' | 'summary' | 'metadata';
  data: {
    path?: string;
    content?: string;
    summary?: string;
    metadata?: AIGenerationResponse['metadata'];
  };
}

// Template
export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  previewImage: string;
  isPremium: boolean;
}

// User settings
export interface UserSettings {
  theme: 'dark' | 'light' | 'system';
  editorFontSize: number;
  editorLineHeight: number;
  autoSave: boolean;
  livePreview: boolean;
  aiProvider: 'local' | 'joyful' | 'openai' | 'anthropic' | 'openrouter' | 'google' | 'mistral' | 'groq';
  aiModel: string;
  aiTemperature: number;
  connectedProviders?: Partial<Record<UserSettings['aiProvider'], boolean>>;
  providerKeys?: Partial<Record<UserSettings['aiProvider'], string>>;
}

export interface UserSkill {
  id: string;
  name: string;
  description: string;
  instructions: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// Toast notification
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

// Sidebar nav item
export interface NavItem {
  icon: string;
  label: string;
  path: string;
}
