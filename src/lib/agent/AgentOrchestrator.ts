import { ToolExecutor, type ToolResult } from './ToolExecutor';
import { TodoManager, todoManager, type TodoItem } from './TodoManager';
import { memoryManager, type MemoryManager } from './MemoryManager';
import { SelfRepairLoop } from './SelfRepairLoop';
import { repoMapBuilder, type RepoMapBuilder } from './RepoMap';
import { ContextManager } from './ContextManager';
import { AIClient, type Message } from './AIClient';
import { type BuildError } from './ErrorCollector';
import { agentEventBus } from './eventBus';
import {
  buildPlannerPrompt,
  buildExplorerPrompt,
  buildBuilderPrompt,
  buildDebuggerPrompt,
  buildReviewerPrompt,
  buildMemoryPrompt,
} from './Prompts';
import { snapshotManager } from './SnapshotManager';

export type OrchestratorPhase =
  | 'planning'
  | 'exploring'
  | 'building'
  | 'debugging'
  | 'reviewing'
  | 'saving'
  | 'cancelled';

export interface OrchestratorOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  projectId: string;
  entryPoint: string;
  framework: string;
  devMode?: boolean;
}

function generateRunId(): string {
  return `run_${Date.now()}`;
}

export class AgentOrchestrator {
  private phase: OrchestratorPhase = 'planning';
  private toolExecutor: ToolExecutor;
  private todoManager: TodoManager;
  private memoryManager: MemoryManager;
  private repoMap: RepoMapBuilder;
  private contextManager: ContextManager;
  private aiClient: AIClient;
  private repairLoop: SelfRepairLoop;
  private options: OrchestratorOptions;

  private plan: any = null;
  private userRequest: string = '';
  private recentOperations: string[] = [];
  private compileErrors: BuildError[] = [];
  private changedFiles: string[] = [];
  private iterationCount = 0;
  private maxIterations = 50;
  private cancelled = false;
  private messages: Message[] = [];

  onStatusChange?: (status: string, message: string) => void;
  onTodoUpdate?: (todos: TodoItem[]) => void;
  onError?: (error: string) => void;

  constructor(options: OrchestratorOptions) {
    this.options = options;
    this.toolExecutor = new ToolExecutor();
    this.todoManager = todoManager;
    this.memoryManager = memoryManager;
    this.repoMap = repoMapBuilder;
    this.contextManager = new ContextManager();
    this.aiClient = new AIClient({
      apiKey: options.apiKey,
      model: options.model,
      baseUrl: options.baseUrl,
    });
    this.repairLoop = new SelfRepairLoop();
  }

  async run(userRequest: string): Promise<{ success: boolean; summary: string }> {
    const runId = generateRunId();
    this.userRequest = userRequest;
    this.cancelled = false;
    this.iterationCount = 0;
    this.messages = [{ role: 'user', content: userRequest }];

    agentEventBus.emit({ type: 'agent:start', runId, userRequest });

    const startTime = Date.now();

    try {
      await this.buildRepoMap();
      await this.phasePlanning();

      if (this.cancelled) return this.cancelResult();

      const planData = this.plan?.plan || [];
      const needsExplore = this.plan?.explorationNeeded !== false;
      const needsBuilding = planData.some((s: any) => s.mode === 'builder' || s.mode === 'debugger');

      if (needsExplore) {
        await this.phaseExploring();
        if (this.cancelled) return this.cancelResult();
      }

      if (needsBuilding) {
        await this.phaseBuilding();
        if (this.cancelled) return this.cancelResult();

        if (this.compileErrors.length > 0) {
          await this.phaseDebugging();
          if (this.cancelled) return this.cancelResult();
        }

        await this.phaseReviewing();
        if (this.cancelled) return this.cancelResult();
      }

      await this.phaseSaving();

      const durationMs = Date.now() - startTime;
      const allCompleted = this.todoManager.isAllCompleted();

      const summary = {
        summary: allCompleted
          ? `Task completed in ${(durationMs / 1000).toFixed(1)}s`
          : `Task finished with ${this.todoManager.estimateRemaining()} remaining todo(s) in ${(durationMs / 1000).toFixed(1)}s`,
        changedFiles: this.changedFiles.map(p => ({
          path: p,
          action: 'updated' as const,
        })),
        errors: this.compileErrors.length,
        warnings: 0,
        durationMs,
        previewStatus: (this.compileErrors.length === 0 ? 'success' : 'failed') as 'success' | 'failed' | 'not_run',
      };

      agentEventBus.emit({ type: 'agent:completed', summary });
      return { success: allCompleted, summary: summary.summary };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      agentEventBus.emit({ type: 'agent:failed', error: errorMsg });
      return {
        success: false,
        summary: `Failed: ${errorMsg}`,
      };
    }
  }

  private emitStatus(status: string, message: string): void {
    agentEventBus.emit({ type: 'agent:status', status: status as any, message });
    this.onStatusChange?.(status, message);
  }

  private async buildRepoMap(): Promise<void> {
    this.emitStatus('scanning', 'Building repo map...');
    await this.repoMap.build(this.options.framework, this.options.entryPoint);
  }

  private async phasePlanning(): Promise<void> {
    this.phase = 'planning';
    this.emitStatus('planning', 'Creating execution plan...');

    const repoMapStr = this.repoMap.formatCompact();
    const memoryContext = await this.memoryManager.formatProjectMemoryForPrompt(
      this.options.projectId,
    );

    const projectContext = `Framework: ${this.options.framework}\nEntry point: ${this.options.entryPoint}`;

    const systemPrompt = buildPlannerPrompt(
      this.userRequest,
      repoMapStr,
      projectContext,
      memoryContext,
    );

    const response = await this.aiClient.sendMessageJSON(systemPrompt, this.messages);

    if (response.needsMoreContext && response.text) {
      this.messages.push({ role: 'assistant', content: response.text });
      return;
    }

    this.plan = {
      goal: '',
      taskType: 'feature',
      complexity: 'medium',
      acceptanceCriteria: [],
      explorationNeeded: true,
      plan: [],
      ...(response.operations.length > 0
        ? response.operations[0].input || {}
        : {}),
    };

    if (response.text) {
      try {
        const parsed = JSON.parse(response.text);
        this.plan = { ...this.plan, ...parsed };
      } catch {
        // use plan from operations
      }
    }

    const planSteps = this.plan.plan || [];
    agentEventBus.emit({
      type: 'agent:plan_created',
      plan: planSteps.map((s: any, i: number) => ({
        id: `step_${i + 1}`,
        title: s.step || s.title || `Step ${i + 1}`,
        description: s.description,
        status: 'pending' as const,
      })),
    });

    for (const step of planSteps) {
      const mode = step.mode || 'builder';
      this.todoManager.createTodo(
        step.step || step.title || 'Untitled step',
        mode as TodoItem['mode'],
        step.files,
        step.description,
      );
    }

    this.messages.push({ role: 'assistant', content: response.text || 'Plan created.' });
  }

  private async phaseExploring(): Promise<void> {
    this.phase = 'exploring';
    this.emitStatus('reading', 'Exploring codebase...');

    agentEventBus.emit({ type: 'agent:mode', mode: 'explorer' });

    const repoMapStr = this.repoMap.formatCompact();
    const systemPrompt = buildExplorerPrompt(this.userRequest, repoMapStr);

    const response = await this.aiClient.sendMessage(systemPrompt, this.messages);

    if (response.text) {
      this.messages.push({ role: 'assistant', content: response.text });
    }

    for (const tc of response.toolCalls) {
      const result = await this.executeAgentTool(tc.name, tc.input);
      this.recordOperation(tc.name, result);
    }
  }

  private async phaseBuilding(): Promise<void> {
    this.phase = 'building';
    agentEventBus.emit({
      type: 'agent:status',
      status: 'writing',
      message: 'Building implementation...',
    });

    agentEventBus.emit({ type: 'agent:mode', mode: 'builder' });

    const pendingTodos = this.todoManager.getTodos().filter(
      t => t.status === 'pending',
    );

    if (pendingTodos.length === 0) {
      const firstTodo = this.todoManager.getTodos()[0];
      if (firstTodo) {
        this.todoManager.advanceToNext();
      }
    }

    while (this.iterationCount < this.maxIterations && !this.cancelled) {
      this.iterationCount++;

      const activeTodo = this.todoManager.getActiveTodo();
      if (!activeTodo && this.todoManager.isAllCompleted()) break;
      if (!activeTodo) {
        this.todoManager.advanceToNext();
        continue;
      }

      agentEventBus.emit({
        type: 'agent:status',
        status: 'editing',
        message: `Building: ${activeTodo.title}`,
      });

      const systemPrompt = await this.buildBuilderContext(activeTodo);

      this.messages = this.contextManager.compressHistory(this.messages);

      const response = await this.aiClient.sendMessage(
        systemPrompt,
        this.messages,
        undefined,
        (token: string) => {
          agentEventBus.emit({ type: 'agent:thinking', text: token });
        },
      );

      if (response.text) {
        if (
          this.messages[this.messages.length - 1]?.role === 'assistant'
        ) {
          this.messages[this.messages.length - 1].content += response.text;
        } else {
          this.messages.push({ role: 'assistant', content: response.text });
        }
      }

      for (const tc of response.toolCalls) {
        const result = await this.executeAgentTool(tc.name, tc.input);
        this.recordOperation(tc.name, result);
      }

      const toolResults = response.toolCalls
        .map(tc => {
          const r = this.recentOperations[this.recentOperations.length - 1] || '';
          return `[${tc.name}] ${r}`;
        })
        .join('\n');

      if (toolResults) {
        this.messages.push({ role: 'user', content: toolResults });
      }

      if (response.toolCalls.length === 0) {
        this.todoManager.advanceToNext();
      }

      const hasCompileCall = response.toolCalls.some(
        tc => tc.name === 'compile_and_preview' || tc.name === 'compileProject',
      );

      if (hasCompileCall || this.iterationCount % 5 === 0) {
        await this.checkCompileErrors();
      }
    }
  }

  private async phaseDebugging(): Promise<void> {
    if (this.compileErrors.length === 0) return;

    this.phase = 'debugging';
    agentEventBus.emit({
      type: 'agent:status',
      status: 'debugging',
      message: `Debugging ${this.compileErrors.length} error(s)...`,
    });

    agentEventBus.emit({
      type: 'debug:started',
      errors: this.compileErrors.map(e => ({
        file: e.file,
        line: e.line,
        column: e.column,
        message: e.message,
      })),
    });

    agentEventBus.emit({ type: 'agent:mode', mode: 'debugger' });

    const repairResult = await this.repairLoop.repair(
      this.compileErrors,
      this.options.entryPoint,
      this.repoMap,
      this.memoryManager,
      async (tool: string, input: Record<string, unknown>) => {
        return this.toolExecutor.execute(tool, input);
      },
      this.aiClient,
    );

    if (repairResult.fixed) {
      this.compileErrors = [];
      agentEventBus.emit({
        type: 'agent:status',
        status: 'debugging',
        message: `Fixed all errors (${repairResult.attempts.length} attempt(s))`,
      });
    } else {
      this.compileErrors = repairResult.remainingErrors;

      if (this.compileErrors.length > 0) {
        const systemPrompt = buildDebuggerPrompt(
          this.compileErrors.map(e => `${e.file}:${e.line} — ${e.message}`).join('\n'),
          this.recentOperations.slice(-10).join('\n'),
          this.repoMap.formatCompact(),
          '',
          '',
        );

        const response = await this.aiClient.sendMessage(
          systemPrompt,
          [],
        );

        for (const tc of response.toolCalls) {
          await this.executeAgentTool(tc.name, tc.input);
        }

        await this.checkCompileErrors();
      }
    }
  }

  private async phaseReviewing(): Promise<void> {
    this.phase = 'reviewing';
    agentEventBus.emit({
      type: 'agent:status',
      status: 'reviewing',
      message: 'Reviewing changes...',
    });

    agentEventBus.emit({ type: 'agent:mode', mode: 'reviewer' });

    const compileResult = this.compileErrors.length === 0 ? 'Compilation succeeded' : 'Compilation failed';

    const systemPrompt = buildReviewerPrompt(
      this.changedFiles.join('\n'),
      compileResult,
    );

    const response = await this.aiClient.sendMessage(systemPrompt, this.messages.slice(-5));

    if (response.text) {
      this.messages.push({ role: 'assistant', content: response.text });
    }

    for (const tc of response.toolCalls) {
      await this.executeAgentTool(tc.name, tc.input);
    }
  }

  private async phaseSaving(): Promise<void> {
    this.phase = 'saving';
    agentEventBus.emit({
      type: 'agent:status',
      status: 'saving',
      message: 'Saving memory and reflections...',
    });

    agentEventBus.emit({ type: 'agent:mode', mode: 'memory' });

    const systemPrompt = buildMemoryPrompt(
      this.userRequest,
      this.recentOperations.join('\n'),
    );

    const response = await this.aiClient.sendMessage(systemPrompt, this.messages.slice(-3));

    if (response.text) {
      this.messages.push({ role: 'assistant', content: response.text });
    }

    const todoSummary = this.todoManager.getTodos()
      .map(t => `[${t.status}] ${t.title}`)
      .join('\n');

    if (todoSummary) {
      await this.memoryManager.saveNote(this.options.projectId, todoSummary);
    }

    if (this.changedFiles.length > 0) {
      await this.memoryManager.saveNote(
        this.options.projectId,
        `Changed files: ${this.changedFiles.join(', ')}`,
      );

      await snapshotManager.createSnapshot(
        this.options.projectId,
        `After: ${this.userRequest.slice(0, 50)}`,
        'Automatic snapshot after build phase',
      );
    }

    const activeDecision = this.plan?.goal || this.userRequest;
    if (activeDecision) {
      await this.memoryManager.saveDecision(
        this.options.projectId,
        `Task: ${activeDecision.slice(0, 100)}`,
        `Completed with ${this.compileErrors.length} error(s)`,
        this.compileErrors.length === 0
          ? 'Task completed successfully'
          : `Task completed with ${this.compileErrors.length} remaining error(s)`,
      );
    }

    agentEventBus.emit({
      type: 'agent:status',
      status: 'completed',
      message: 'Memory saved.',
    });
  }

  private async buildBuilderContext(activeTodo: TodoItem): Promise<string> {
    const repoMapStr = this.repoMap.formatCompact();
    const memoryContext = await this.memoryManager.formatProjectMemoryForPrompt(
      this.options.projectId,
    );

    const reflections = await this.memoryManager.getRecentReflections(
      this.options.projectId,
      3,
    );
    const reflectionContext = reflections
      .map(r => `- [${r.trigger}] ${r.lesson}`)
      .join('\n');

    const skills = await this.memoryManager.loadRelevantSkills(
      activeTodo.title,
      3,
    );
    const skillContext = skills
      .map(s => `- ${s.name}: ${s.description}`)
      .join('\n');

    const errorContext =
      this.compileErrors.length > 0
        ? this.compileErrors.map(e => `${e.file}:${e.line} — ${e.message}`).join('\n')
        : 'No current errors.';

    const planStr = this.plan
      ? JSON.stringify(this.plan, null, 2).slice(0, 2000)
      : 'No plan.';

    const todosStr = this.todoManager
      .getTodos()
      .map(t => `[${t.status}] ${t.title} (id: ${t.id})`)
      .join('\n');

    return buildBuilderPrompt(
      this.userRequest,
      planStr,
      todosStr,
      repoMapStr,
      `Framework: ${this.options.framework}\nEntry point: ${this.options.entryPoint}`,
      memoryContext,
      reflectionContext,
      skillContext,
      errorContext,
    );
  }

  private async checkCompileErrors(): Promise<void> {
    const result = await this.executeAgentTool('compileProject', {
      entryPoint: this.options.entryPoint,
    });

    if (!result.success) {
      const data = result.data as { errors?: BuildError[] } | undefined;
      this.compileErrors = data?.errors || [];
    } else {
      this.compileErrors = [];
    }
  }

  private async executeAgentTool(
    name: string,
    input: Record<string, unknown>,
  ): Promise<ToolResult> {
    const result = await this.toolExecutor.execute(name, input);

    if (result.path && result.success) {
      if (!this.changedFiles.includes(result.path)) {
        this.changedFiles.push(result.path);
      }
    }

    return result;
  }

  private recordOperation(toolName: string, result: ToolResult): void {
    const summary = result.success
      ? `[${toolName}] ${result.summary || 'OK'}`
      : `[${toolName}] ERROR: ${result.error}`;
    this.recentOperations.push(summary);
    if (this.recentOperations.length > 200) {
      this.recentOperations = this.recentOperations.slice(-100);
    }
  }

  cancel(): void {
    this.cancelled = true;
    this.phase = 'cancelled';
    agentEventBus.emit({ type: 'agent:cancelled' });
  }

  getPhase(): OrchestratorPhase {
    return this.phase;
  }

  getTodos(): TodoItem[] {
    return this.todoManager.getTodos();
  }

  private cancelResult(): { success: boolean; summary: string } {
    return {
      success: false,
      summary: 'Task was cancelled by the user.',
    };
  }
}
