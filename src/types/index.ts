// File types for project files
export type FileType = 'html' | 'css' | 'js' | 'json' | 'jsx' | 'tsx' | 'md' | 'other';

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

// Chat message
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  files?: FileOperation[];
  rating?: number;
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
    content: string;
  }[];
  summary: string;
  nextSteps: string[];
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
  aiProvider: 'openai' | 'anthropic' | 'openrouter';
  aiModel: string;
  aiTemperature: number;
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
