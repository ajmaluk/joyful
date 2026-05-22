// ── Agent Modes ────────────────────────────────────────────────────
export type AgentMode =
  | 'architect'
  | 'builder'
  | 'debugger'
  | 'explorer'
  | 'reviewer'
  | 'memory';

// ── File Operations ────────────────────────────────────────────────
export type FileAction =
  | 'create_file'
  | 'update_file'
  | 'patch_file'
  | 'delete_file'
  | 'rename_file'
  | 'create_folder'
  | 'delete_folder';

export interface FileOperation {
  action: FileAction;
  path: string;
  content?: string;
  oldPath?: string;
  patches?: TextPatch[];
}

export interface TextPatch {
  search: string;
  replace: string;
}

// ── Agent Response ─────────────────────────────────────────────────
export interface AgentResponse {
  message: string;
  actions: FileOperation[];
  tasks: ParsedTask[];
  mode: AgentMode;
  thinking?: string;
  status?: 'continue' | 'done' | 'error';
}

export interface ParsedTask {
  content: string;
  priority: 'high' | 'medium' | 'low';
  status?: 'pending' | 'in_progress' | 'done' | 'blocked' | 'failed';
}

// ── Agent State (runtime tracking) ─────────────────────────────────
export interface AgentState {
  mode: AgentMode;
  status: 'idle' | 'running' | 'done' | 'error';
  currentTask: string | null;
  iteration: number;
  filesCreated: number;
  filesUpdated: number;
  errors: number;
}

// ── Task / Todo ────────────────────────────────────────────────────
export interface TaskTodo {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'done' | 'blocked' | 'failed';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  updatedAt: string;
}

// ── Agent Context (prompt building) ────────────────────────────────
export interface AgentContext {
  userMessage: string;
  mode: string;
  currentFiles: string;
  projectTree: string;
  repoMap: string;
  recentChanges: string;
  sessionMemory: string;
  projectMemory: string;
  sandboxState: string;
  taskContext: string;
}

// ── Repo Map ───────────────────────────────────────────────────────
export interface RepoMapEntry {
  path: string;
  purpose: string;
  exports: string[];
  imports: string[];
  dependencies: string[];
  lastModified: string;
  summary: string;
}

// ── Project Tree Entry ─────────────────────────────────────────────
export interface ProjectTreeEntry {
  path: string;
  type: 'file' | 'folder';
  size?: number;
}

// ── File Change ────────────────────────────────────────────────────
export interface FileChange {
  path: string;
  action: 'create' | 'update' | 'delete' | 'rename';
  timestamp: string;
  summary: string;
}

// ── Memory Entry ───────────────────────────────────────────────────
export interface MemoryEntryData {
  type: 'decision' | 'pattern' | 'issue' | 'lesson' | 'reference';
  content: string;
  files: string[];
  timestamp: number;
}

// ── Model Config ───────────────────────────────────────────────────
export interface ModelConfig {
  provider: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

// ── Sandbox ────────────────────────────────────────────────────────
export interface SandboxCommand {
  command: string;
  args?: string[];
  cwd?: string;
  timeout?: number;
  expectedExitCode?: number;
}

// ── Validation ─────────────────────────────────────────────────────
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ── Builder Output ─────────────────────────────────────────────────
export interface BuilderOutput {
  files: { path: string; content: string }[];
  command: string;
  success: boolean;
  output: string;
  error?: string;
  timestamp: string;
}

// ── File Operation Group (structured plan output) ──────────────────
export interface FileOperationGroup {
  type: 'file_operations';
  operations: FileOperation[];
  reasoning_summary: string;
  todos_update: TodoUpdate[];
}

export interface TodoUpdate {
  id: string;
  status: 'pending' | 'in_progress' | 'done' | 'blocked' | 'failed';
}
