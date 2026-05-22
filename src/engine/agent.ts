import type {
  AgentMode,
  AgentResponse,
  AgentState,
  TaskTodo,
} from './types';
import { getSystemPrompt } from './prompts';
import { buildAgentContext } from './context';
import { applyFileOperations, type VirtualFileEntry } from './fileSystem';
import { scanProject, buildRecentChanges } from './scanner';
import { TaskManager } from './tasks';
import { SessionMemory, ProjectMemory, InMemoryProjectStorage, type ProjectMemoryStorage } from './memory';
import { parseAgentResponse } from './model';
import type { ModelProvider, ModelRequest } from './model';

// ── Agent Orchestrator ─────────────────────────────────────────────

export interface AgentOptions {
  provider: ModelProvider;
  memoryStorage?: ProjectMemoryStorage;
  maxIterations?: number;
}

export class Agent {
  private provider: ModelProvider;
  private storage: ProjectMemoryStorage;
  private state: AgentState;
  private tasks: TaskManager;
  private sessionMemory: SessionMemory;
  private projectMemory: ProjectMemory | null = null;
  private files: VirtualFileEntry[] = [];
  private maxIterations: number;
  private currentIteration = 0;
  private messageHistory: { role: 'user' | 'assistant'; content: string }[] = [];

  constructor(options: AgentOptions) {
    this.provider = options.provider;
    this.storage = options.memoryStorage ?? new InMemoryProjectStorage();
    this.maxIterations = options.maxIterations ?? 25;
    this.state = {
      mode: 'builder',
      status: 'idle',
      currentTask: null,
      iteration: 0,
      filesCreated: 0,
      filesUpdated: 0,
      errors: 0,
    };
    this.tasks = new TaskManager();
    this.sessionMemory = new SessionMemory();
  }

  getState(): AgentState {
    return { ...this.state };
  }

  getTasks(): TaskTodo[] {
    return this.tasks.getAll();
  }

  getFiles(): VirtualFileEntry[] {
    return [...this.files];
  }

  getSessionMemory(): SessionMemory {
    return this.sessionMemory;
  }

  getProjectMemory(): ProjectMemory | null {
    return this.projectMemory;
  }

  async initialize(files: VirtualFileEntry[], initialMemory?: Partial<Record<string, unknown>>): Promise<void> {
    this.files = files;

    this.projectMemory = new ProjectMemory(this.storage);
    if (initialMemory) {
      if (typeof initialMemory.description === 'string') this.projectMemory.description = initialMemory.description;
    }

    this.sessionMemory.add('fact', `Initialized with ${files.length} files`, ['init']);

    const scan = scanProject(files);
    if (scan.framework) {
      this.sessionMemory.add('fact', `Detected framework: ${scan.framework}`, ['framework']);
    }
  }

  async process(userMessage: string): Promise<AgentResponse> {
    this.currentIteration = 0;
    this.state.status = 'running';

    // Run the main agent loop
    while (this.currentIteration < this.maxIterations) {
      this.currentIteration++;
      this.state.iteration = this.currentIteration;

      const response = await this.runIteration(userMessage);
      if (response.status === 'done' || response.status === 'error') {
        this.state.status = response.status;
        return response;
      }

      // Continue if there are pending tasks
      userMessage = 'Continue with the next task.';
    }

    this.state.status = 'done';
    return {
      status: 'done',
      message: `Completed after ${this.currentIteration} iterations.`,
      actions: [],
      tasks: [],
      mode: this.state.mode,
    };
  }

  private async runIteration(userMessage: string): Promise<AgentResponse & { status: string }> {
    const context = buildAgentContext({
      userMessage,
      files: this.files,
      repoMap: scanProject(this.files).repoMap,
      recentChanges: [],
      sessionMemory: this.sessionMemory.toString(),
      projectMemory: this.projectMemory?.toString() || '',
      sandboxState: '',
      mode: this.state.mode,
      taskContext: this.tasks.toPromptString(),
    });

    const systemPrompt = getSystemPrompt(this.state.mode);

    const request: ModelRequest = {
      system: systemPrompt,
      messages: [
        ...this.messageHistory,
        { role: 'user', content: context.userMessage },
      ],
      config: {
        provider: this.provider.name,
        model: '',
        maxTokens: 4096,
        temperature: 0.7,
      },
    };

    const result = await this.provider.complete(request);

    if (result.finishReason === 'error') {
      this.state.status = 'error';
      this.state.errors++;
      return {
        status: 'error',
        message: `Model error: ${result.error}`,
        actions: [],
        tasks: [],
        mode: this.state.mode,
      };
    }

    // Parse response
    const parsed = parseAgentResponse(result.content);
    this.messageHistory.push({ role: 'assistant', content: result.content });

    // Handle mode changes
    if (parsed.mode && parsed.mode !== this.state.mode) {
      this.state.mode = parsed.mode as AgentMode;
      this.sessionMemory.add('decision', `Switched to mode: ${parsed.mode}`, ['mode']);
    }

    // Handle tasks
    if (parsed.tasks.length > 0) {
      for (const task of parsed.tasks) {
        this.tasks.add({
          content: task.content,
          priority: task.priority,
          status: task.status || 'pending',
        });
      }
    }

      // Handle file operations
    if (parsed.actions.length > 0) {
      const oldFiles = [...this.files];
      const applyResult = applyFileOperations(parsed.actions, this.files);

      if (applyResult.errors.length > 0) {
        for (const err of applyResult.errors) {
          this.sessionMemory.add('error', `File operation failed: ${err.path} — ${err.error}`, ['file-error']);
          this.state.errors++;
        }
      }

      // Update file list from result
      this.files = applyResult.files;

      // Track changes
      const changes = buildRecentChanges(oldFiles, this.files);
      for (const change of changes) {
        if (change.action === 'create') this.state.filesCreated++;
        if (change.action === 'update') this.state.filesUpdated++;
      }
    }

    return {
      status: 'continue',
      message: parsed.message,
      actions: parsed.actions,
      tasks: parsed.tasks,
      mode: this.state.mode,
    };
  }
}
