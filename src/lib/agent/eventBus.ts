type AgentStatus =
  | 'idle'
  | 'understanding'
  | 'scanning'
  | 'planning'
  | 'reading'
  | 'writing'
  | 'editing'
  | 'compiling'
  | 'debugging'
  | 'reviewing'
  | 'exploring'
  | 'thinking'
  | 'building'
  | 'saving'
  | 'completed'
  | 'failed'
  | 'cancelled';

type AgentMode =
  | 'architect'
  | 'builder'
  | 'debugger'
  | 'explorer'
  | 'reviewer'
  | 'memory';

interface AgentPlanStep {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

interface Todo {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'failed';
  mode: AgentMode;
  relatedFiles: string[];
  errors?: string[];
  startedAt?: number;
  completedAt?: number;
  blockedReason?: string;
}

interface CompileError {
  file: string;
  line: number;
  column: number;
  message: string;
}

interface FinalSummary {
  summary: string;
  changedFiles: { path: string; action: 'created' | 'updated' | 'deleted' | 'renamed' }[];
  errors: number;
  warnings: number;
  durationMs: number;
  previewStatus: 'success' | 'failed' | 'not_run';
}

interface FileChange {
  path: string;
  action: 'created' | 'updated' | 'deleted' | 'renamed';
  oldPath?: string;
  summary: string;
  additions?: number;
  deletions?: number;
  timestamp: number;
  status: 'success' | 'failed' | 'rolled_back';
}

interface ToolActivity {
  id: string;
  tool: string;
  input?: unknown;
  display: string;
  status: 'running' | 'success' | 'failed';
  result?: unknown;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

type FileReadChunk = {
  path: string;
  startLine: number;
  endLine: number;
  totalLines: number;
  reason: string;
};

type AgentEvent =
  | { type: 'agent:start'; runId: string; userRequest: string }
  | { type: 'agent:status'; status: AgentStatus; message: string }
  | { type: 'agent:mode'; mode: AgentMode }
  | { type: 'agent:plan_created'; plan: AgentPlanStep[] }
  | { type: 'todo:created'; todos: Todo[] }
  | { type: 'todo:updated'; todos: Todo[] }
  | { type: 'tool:started'; tool: string; input: unknown; display: string }
  | { type: 'tool:completed'; tool: string; result: unknown; display: string }
  | { type: 'tool:failed'; tool: string; error: string; display: string }
  | { type: 'file:read'; path: string; lines?: string }
  | { type: 'file:read_chunk'; path: string; startLine: number; endLine: number; totalLines: number; reason: string }
  | { type: 'file:created'; path: string; size?: number }
  | { type: 'file:updated'; path: string; summary?: string }
  | { type: 'file:deleted'; path: string }
  | { type: 'file:renamed'; oldPath: string; newPath: string }
  | { type: 'compile:started' }
  | { type: 'compile:succeeded'; durationMs: number }
  | { type: 'compile:failed'; errors: CompileError[] }
  | { type: 'preview:updated'; url?: string }
  | { type: 'debug:started'; errors: CompileError[] }
  | { type: 'debug:attempt'; attempt: number; error: CompileError; action: string }
  | { type: 'debug:fixed'; errorId: string }
  | { type: 'memory:saved'; summary: string }
  | { type: 'agent:thinking'; text: string }
  | { type: 'agent:message'; text: string }
  | { type: 'agent:completed'; summary: FinalSummary }
  | { type: 'agent:failed'; error: string }
  | { type: 'agent:cancelled' }
  | { type: 'context:selected'; files: string[]; chunks: { path: string; startLine: number; endLine: number }[]; memoryUsed: boolean; repoMapUsed: boolean; estimatedTokens: number }
  | { type: 'memory:loaded'; summary: string }
  | { type: 'reflection:saved'; reflectionId: string; lesson: string }
  | { type: 'reflection:loaded'; count: number; matchingErrors: string[] }
  | { type: 'skill:loaded'; skills: string[] }
  | { type: 'skill:saved'; skillName: string }
  | { type: 'snapshot:created'; snapshotId: string; label: string }
  | { type: 'snapshot:restored'; snapshotId: string; label: string }
  | { type: 'storage:updated'; usage: { usedBytes: number; totalBytes: number; percentage: number }; projectSize: number; fileCount: number }
  | { type: 'repair:started'; errors: { file: string; line: number; message: string }[] }
  | { type: 'repair:attempt'; attempt: number; error: string; action: string }
  | { type: 'repair:fixed' }
  | { type: 'repair:failed'; remainingErrors: number };

type AgentEventHandler = (event: AgentEvent) => void;

class AgentEventBus {
  private handlers: Set<AgentEventHandler> = new Set();
  private history: AgentEvent[] = [];
  private maxHistory = 500;

  subscribe(handler: AgentEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  emit(event: AgentEvent): void {
    this.history.push(event);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch {
        // handler error
      }
    }
  }

  getHistory(): AgentEvent[] {
    return [...this.history];
  }

  clear(): void {
    this.history = [];
  }
}

export const agentEventBus = new AgentEventBus();
export type {
  AgentStatus,
  AgentMode,
  AgentEvent,
  AgentEventHandler,
  AgentPlanStep,
  Todo,
  CompileError,
  FinalSummary,
  FileChange,
  ToolActivity,
  FileReadChunk,
};

// New event type exports for context, memory, reflection, skill, snapshot, storage, and repair events
export type ContextSelectedEvent = { type: 'context:selected'; files: string[]; chunks: { path: string; startLine: number; endLine: number }[]; memoryUsed: boolean; repoMapUsed: boolean; estimatedTokens: number };
export type MemoryLoadedEvent = { type: 'memory:loaded'; summary: string };
export type ReflectionSavedEvent = { type: 'reflection:saved'; reflectionId: string; lesson: string };
export type ReflectionLoadedEvent = { type: 'reflection:loaded'; count: number; matchingErrors: string[] };
export type SkillLoadedEvent = { type: 'skill:loaded'; skills: string[] };
export type SkillSavedEvent = { type: 'skill:saved'; skillName: string };
export type SnapshotCreatedEvent = { type: 'snapshot:created'; snapshotId: string; label: string };
export type SnapshotRestoredEvent = { type: 'snapshot:restored'; snapshotId: string; label: string };
export type StorageUpdatedEvent = { type: 'storage:updated'; usage: { usedBytes: number; totalBytes: number; percentage: number }; projectSize: number; fileCount: number };
export type RepairStartedEvent = { type: 'repair:started'; errors: { file: string; line: number; message: string }[] };
export type RepairAttemptEvent = { type: 'repair:attempt'; attempt: number; error: string; action: string };
export type RepairFixedEvent = { type: 'repair:fixed' };
export type RepairFailedEvent = { type: 'repair:failed'; remainingErrors: number };
