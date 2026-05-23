export interface ChatVisibilityPolicy {
  mode: 'normal' | 'developer';
  showFileReads: boolean;
  showToolCalls: boolean;
  showContext: boolean;
  showMemory: boolean;
  showStorage: boolean;
  groupFileChanges: boolean;
  groupToolCalls: boolean;
}

export const NORMAL_POLICY: ChatVisibilityPolicy = {
  mode: 'normal',
  showFileReads: false,
  showToolCalls: false,
  showContext: false,
  showMemory: false,
  showStorage: false,
  groupFileChanges: true,
  groupToolCalls: true,
};

export const DEVELOPER_POLICY: ChatVisibilityPolicy = {
  mode: 'developer',
  showFileReads: true,
  showToolCalls: true,
  showContext: true,
  showMemory: true,
  showStorage: true,
  groupFileChanges: true,
  groupToolCalls: true,
};

export interface CompactedEvent {
  type: string;
  data: Record<string, unknown>;
  shouldShow: boolean;
  category: 'progress' | 'change' | 'compile' | 'summary' | 'debug' | 'error';
}

export class ChatEventCompactor {
  private policy: ChatVisibilityPolicy;

  private runState: {
    compileCardAdded: boolean;
    compileMessageId: string | null;
    fileChanges: Map<string, { path: string; action: string; summary: string }>;
    fileReadCount: number;
    toolCallCount: number;
    startedAt: number;
  };

  constructor(policy: ChatVisibilityPolicy = NORMAL_POLICY) {
    this.policy = policy;
    this.runState = this.freshState();
  }

  private freshState() {
    return {
      compileCardAdded: false,
      compileMessageId: null,
      fileChanges: new Map(),
      fileReadCount: 0,
      toolCallCount: 0,
      startedAt: Date.now(),
    };
  }

  setPolicy(policy: ChatVisibilityPolicy) {
    this.policy = policy;
  }

  getPolicy() {
    return this.policy;
  }

  resetRun() {
    const old = this.runState;
    this.runState = this.freshState();
    this.runState.startedAt = old.startedAt;
  }

  /** Determine whether an agent event should produce a visible UI message */
  shouldShowAsMessage(eventType: string, data?: Record<string, unknown>): boolean {
    if (this.policy.mode === 'developer') return true;

    switch (eventType) {
      // Always show
      case 'agent:start':
      case 'agent:completed':
      case 'agent:failed':
      case 'plan:created':
        return true;

      // Compile — always show (updated in place)
      case 'compile:started':
      case 'compile:succeeded':
      case 'compile:failed':
        return true;

      // File changes — always show (grouped)
      case 'file:created':
      case 'file:updated':
      case 'file:deleted':
      case 'file:renamed':
        return true;

      // Final summary — always show
      case 'final_summary':
        return true;

      // Hide in normal mode
      case 'file:read':
      case 'file:read_chunk':
      case 'context:selected':
      case 'memory:loaded':
      case 'memory:saved':
      case 'storage:updated':
      case 'preview:updated':
        return false;

      // Tool calls — hide reads/searches, show writes
      case 'tool:started':
      case 'tool:completed': {
        if (!data) return false;
        const tool = String(data.tool || '');
        const writeTools = ['writeFile', 'createFile', 'patchFile', 'multiPatchFile', 'deleteFile', 'renameFile', 'createFolder'];
        const compileTools = ['compileAndPreview', 'compileProject'];
        return writeTools.includes(tool) || compileTools.includes(tool);
      }

      // Agent status — only show major transitions
      case 'agent:status': {
        if (!data) return false;
        const status = String(data.status || '');
        return ['planning', 'debugging', 'failed', 'completed', 'blocked'].includes(status);
      }

      // Memory
      case 'memory_update':
        return false;

      // Context
      case 'context_update':
        return false;

      // Storage
      case 'storage_update':
        return this.isStorageWarning(data);

      default:
        return true;
    }
  }

  /** Determine the category for rendering */
  categorizeEvent(eventType: string): CompactedEvent['category'] {
    switch (eventType) {
      case 'agent:start':
      case 'agent:status':
        return 'progress';
      case 'file:created':
      case 'file:updated':
      case 'file:deleted':
      case 'file:renamed':
        return 'change';
      case 'compile:started':
      case 'compile:succeeded':
      case 'compile:failed':
        return 'compile';
      case 'final_summary':
      case 'agent:completed':
        return 'summary';
      case 'agent:failed':
        return 'error';
      default:
        return 'debug';
    }
  }

  /** Track a file read (count only in normal mode) */
  recordFileRead(_path: string) {
    this.runState.fileReadCount++;
  }

  /** Track a file change for grouping */
  recordFileChange(path: string, action: string, summary: string) {
    this.runState.fileChanges.set(path, { path, action, summary });
  }

  /** Get grouped file changes summary */
  getGroupedFileChanges(): { paths: string[]; count: number; items: Array<{ path: string; action: string; summary: string }> } {
    const items = Array.from(this.runState.fileChanges.values());
    return {
      paths: items.map(i => i.path),
      count: items.length,
      items,
    };
  }

  getFileReadCount(): number {
    return this.runState.fileReadCount;
  }

  /** Track compile card ID so we can update in place */
  setCompileMessageId(id: string | null) {
    this.runState.compileMessageId = id;
  }

  getCompileMessageId(): string | null {
    return this.runState.compileMessageId;
  }

  markCompileCardAdded() {
    this.runState.compileCardAdded = true;
  }

  wasCompileCardAdded(): boolean {
    return this.runState.compileCardAdded;
  }

  private isStorageWarning(data?: Record<string, unknown>): boolean {
    if (!data) return false;
    return Boolean(
      String(data.message || '').toLowerCase().includes('warning') ||
      String(data.message || '').toLowerCase().includes('quota') ||
      String(data.message || '').toLowerCase().includes('low')
    );
  }
}
