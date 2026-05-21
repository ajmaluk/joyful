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

export interface ChatAttachment {
  id: string;
  type: 'image';
  name: string;
  mimeType: string;
  dataUrl: string;
  size: number;
}

// Chat message
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  mode?: ChatMode;
  attachments?: ChatAttachment[];
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
    agentPlan?: AgentPlanStep[];
    sandboxCommands?: SandboxCommandRequest[];
    sandboxResults?: SandboxCommandResult[];
    previewIssues?: PreviewIssue[];
  };
}

export interface SavedGenerationState {
  id: string;
  projectId: string;
  prompt: string;
  mode: ChatMode;
  status: 'in_progress' | 'failed';
  savedAt: string;
  updatedAt: string;
  filesSnapshot: ProjectFile[];
  messageCount: number;
  contextFiles?: string[];
  attachments?: ChatAttachment[];
  error?: string;
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
  patches?: FilePatchOperation[];
  summary: string;
  nextSteps: string[];
  metadata?: {
    template?: string;
    sections?: string[];
    estimatedComplexity?: 'simple' | 'medium' | 'complex';
    agentPlan?: AgentPlanStep[];
    sandboxCommands?: SandboxCommandRequest[];
    sandboxResults?: SandboxCommandResult[];
    pendingFileOps?: PendingFileOperation[];
    toolResults?: unknown[];
  };
}

export interface AgentPlanStep {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'done' | 'error';
  detail?: string;
}

export interface SandboxCommandRequest {
  command: string;
  args?: string[];
  wait?: boolean;
  reason?: string;
}

export interface SandboxCommandResult {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  status: 'done' | 'error';
}

export interface PendingFileOperation {
  name: 'create_file' | 'modify_file' | 'delete_file';
  args: {
    path?: string;
    content?: string;
  };
}

export interface FilePatchOperation {
  path: string;
  action: 'patch';
  oldString?: string;
  newString?: string;
  insertBefore?: string;
  insertAfter?: string;
  content?: string;
  lineStart?: number;
  lineEnd?: number;
  reason?: string;
}

export interface PreviewIssue {
  id: string;
  severity: 'error' | 'warning';
  message: string;
  source?: 'console' | 'network' | 'sandbox';
  path?: string;
  line?: number;
  column?: number;
  selector?: string;
  timestamp: number;
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
  editorFontFamily: 'jetbrains-mono' | 'fira-code' | 'source-code-pro' | 'ibm-plex-mono';
  editorMinimap: boolean;
  editorWordWrap: boolean;
  editorLineNumbers: boolean;
  explorerDensity: 'comfortable' | 'compact';
  autoSave: boolean;
  livePreview: boolean;
  aiProvider: 'joyful';
  aiModel: string;
  aiTemperature: number;
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
