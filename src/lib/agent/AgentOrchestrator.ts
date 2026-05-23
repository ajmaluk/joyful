import { ToolExecutor, type ToolResult, TOOL_ALIASES } from './ToolExecutor';
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
import { classifyTask, type TaskClassification, type AgentCallBudget } from './AgentRunPolicy';
import { snapshotManager } from './SnapshotManager';
import { uniqueId } from '@/utils/ids';
import { ContextCache } from './ContextCache';

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
  return uniqueId('run');
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

  private plan: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  private userRequest: string = '';
  private recentOperations: string[] = [];
  private compileErrors: BuildError[] = [];
  private changedFiles: Set<string> = new Set();
  private iterationCount = 0;
  private maxIterations = 50;
  private cancelled = false;
  private messages: Message[] = [];

  // Budget / doom-loop tracking
  private taskClassification!: TaskClassification;
  private budget!: AgentCallBudget;
  private apiCallCount = 0;
  private noOpResponseCount = 0;
  private maxNoOpRetries = 1;
  private contextCache = new ContextCache();
  private lastContextHash = '';
  private sameContextCallCount = 0;
  private lastErrorSignature = '';
  private sameErrorCount = 0;
  private abortController = new AbortController();

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
    this.apiCallCount = 0;
    this.noOpResponseCount = 0;
    this.compileErrors = [];
    this.changedFiles = new Set();
    this.recentOperations = [];
    this.lastErrorSignature = '';
    this.sameErrorCount = 0;
    this.abortController = new AbortController();

    // Clear cross-run state
    this.todoManager.clear();

    // Classify task and set budget
    this.taskClassification = classifyTask(userRequest);
    this.budget = { ...this.taskClassification.budget };

    agentEventBus.emit({
      type: 'agent:status',
      status: 'understanding',
      message: `Classified as: ${this.taskClassification.taskClass} (budget: ${this.budget.maxTotalCalls} AI calls)`,
    });

    agentEventBus.emit({ type: 'agent:start', runId, userRequest });

    const startTime = Date.now();

    try {
      await this.buildRepoMap();
      await this.phasePlanning();

      if (this.cancelled) return this.cancelResult();

      const planData = this.plan?.plan || [];
      const needsExplorerAI = this.taskClassification.needsExplorerAI;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const needsBuilding = planData.some((s: any) => s.mode === 'builder' || s.mode === 'debugger');

      if (needsExplorerAI && needsBuilding) {
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

        if (this.taskClassification.needsReviewerAI) {
          await this.phaseReviewing();
          if (this.cancelled) return this.cancelResult();
        }
      }

      if (this.taskClassification.needsMemoryAI) {
        await this.phaseSaving();
      } else {
        await this.localSaveMemory();
      }

      const durationMs = Date.now() - startTime;
      const allCompleted = this.todoManager.isAllCompleted();
      const blockedTodos = this.todoManager.getTodos().filter(t => t.status === 'blocked');

      let summaryText: string;
      if (blockedTodos.length > 0) {
        summaryText = `Finished with ${blockedTodos.length} blocked todo(s) — ${blockedTodos.map(t => t.blockedReason || t.title).join('; ')}`;
      } else if (allCompleted) {
        summaryText = `Task completed in ${(durationMs / 1000).toFixed(1)}s (${this.apiCallCount} AI calls used of ${this.budget.maxTotalCalls})`;
      } else {
        summaryText = `Task finished with ${this.todoManager.estimateRemaining()} remaining todo(s) in ${(durationMs / 1000).toFixed(1)}s`;
      }

      const summary = {
        summary: summaryText,
        changedFiles: Array.from(this.changedFiles).map(p => ({
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    if (!this.taskClassification.needsPlannerAI) {
      // Local plan — no AI call
      const planData = this.createLocalPlan();
      agentEventBus.emit({
        type: 'agent:plan_created',
        plan: planData.map((s: Record<string, unknown>, i: number) => ({
          id: `step_${i + 1}`,
          title: (s.title as string) || `Step ${i + 1}`,
          description: s.description as string,
          status: 'pending' as const,
        })),
      });
      for (const step of planData) {
        this.todoManager.createTodo(
          step.title || 'Untitled step',
          (step.mode as TodoItem['mode']) || 'builder',
          step.files,
          step.description,
        );
      }
      this.plan = { plan: planData, explorationNeeded: false };
      return;
    }

    const systemPrompt = buildPlannerPrompt(
      this.userRequest,
      repoMapStr,
      projectContext,
      memoryContext,
    );

    const response = await this.guardedModelCall(
      'planning',
      systemPrompt,
      this.messages,
    );

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
      ...(response.toolCalls.length > 0
        ? response.toolCalls[0].input || {}
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
      plan: planSteps.map((s: Record<string, unknown>, i: number) => ({
        id: `step_${i + 1}`,
        title: (s.step as string) || (s.title as string) || `Step ${i + 1}`,
        description: s.description as string,
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

    const response = await this.guardedModelCall('exploring', systemPrompt, this.messages);

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
      // Check budget before each iteration
      if (this.apiCallCount >= this.budget.maxTotalCalls) {
        agentEventBus.emit({
          type: 'agent:status',
          status: 'completed',
          message: `AI call budget reached (${this.apiCallCount}/${this.budget.maxTotalCalls}). Stopping builder loop.`,
        });
        break;
      }

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

      const response = await this.guardedModelCall(
        'building',
        systemPrompt,
        this.messages,
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

      let meaningfulChanges = false;
      const perToolResults: string[] = [];
      for (const tc of response.toolCalls) {
        const result = await this.executeAgentTool(tc.name, tc.input);
        this.recordOperation(tc.name, result);
        const normalizedName = TOOL_ALIASES[tc.name] || tc.name;
        if (result.success && ['writeFile', 'createFile', 'patchFile', 'multiPatchFile', 'deleteFile', 'renameFile'].includes(normalizedName)) {
          meaningfulChanges = true;
        }
        perToolResults.push(result.summary || result.error || 'OK');
      }

      // --- No-op detection ---
      if (!meaningfulChanges && response.toolCalls.length > 0) {
        this.noOpResponseCount++;
        if (this.noOpResponseCount > this.maxNoOpRetries) {
          const reason = `No meaningful file changes after ${this.noOpResponseCount} consecutive builder calls for "${activeTodo.title}". Blocking todo.`;
          agentEventBus.emit({
            type: 'agent:status',
            status: 'completed' as const,
            message: reason,
          });
          this.todoManager.blockTodo(activeTodo.id, reason);
          this.todoManager.advanceToNext();
          continue;
        }
        // Retry with correction message
        this.messages.push({
          role: 'user',
          content: 'Your previous response made no file changes. Please provide actual file operations this time.',
        });
        // Don't advance; let the loop retry
        continue;
      }
      this.noOpResponseCount = 0;

      const toolSummary = response.toolCalls
        .map((tc, i) => `[${tc.name}] ${perToolResults[i] || ''}`)
        .join('\n');

      // Limit tool result context to avoid wasting tokens
      const maxChars = 1000;
      const truncated = toolSummary.length > maxChars
        ? toolSummary.slice(0, maxChars) + `\n... (${toolSummary.length - maxChars} more chars truncated)`
        : toolSummary;

      if (truncated) {
        this.messages.push({ role: 'user', content: truncated });
      }

      if (response.toolCalls.length === 0) {
        this.todoManager.advanceToNext();
      }

      const hasCompileCall = response.toolCalls.some(
        tc => tc.name === 'compile_and_preview' || tc.name === 'compileProject',
      );

      // Compile after meaningful changes or every 3 iterations
      if (meaningfulChanges || hasCompileCall || this.iterationCount % 3 === 0) {
        await this.checkCompileErrors();
        if (this.compileErrors.length > 0 && this.taskClassification.taskClass !== 'bugfix') {
          // Add a debug step for the current todo
          agentEventBus.emit({
            type: 'agent:status',
            status: 'debugging' as const,
            message: `Found ${this.compileErrors.length} error(s) after build step for "${activeTodo.title}"`,
          });
        }
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

    const budgetedAICall = async (systemPrompt: string, msgs: Message[]) => {
      if (this.apiCallCount >= this.budget.maxTotalCalls) {
        return { text: '', operations: [], needsMoreContext: false, contextRequests: [] };
      }
      this.apiCallCount++;
      const result = await this.aiClient.sendMessageJSON(systemPrompt, msgs);
      return {
        text: result.text,
        operations: result.operations,
        needsMoreContext: result.needsMoreContext,
        contextRequests: result.contextRequests,
      };
    };

    const repairResult = await this.repairLoop.repair(
      this.compileErrors,
      this.options.entryPoint,
      this.repoMap,
      this.memoryManager,
      async (tool: string, input: Record<string, unknown>) => {
        return this.toolExecutor.execute(tool, input);
      },
      budgetedAICall,
      this.taskClassification.maxRepairAttempts,
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
        // Doom-loop detection: check if errors match previous signature
        const errorSignature = this.compileErrors
          .map(e => `${e.file}:${e.line}:${e.message}`)
          .join('|');

        if (errorSignature === this.lastErrorSignature) {
          this.sameErrorCount++;
        } else {
          this.sameErrorCount = 0;
        }
        this.lastErrorSignature = errorSignature;

        if (this.sameErrorCount >= 3) {
          agentEventBus.emit({
            type: 'agent:status',
            status: 'completed' as const,
            message: `Same compile error repeated ${this.sameErrorCount} times. Stopping repair loop.`,
          });
          return;
        }

        const systemPrompt = buildDebuggerPrompt(
          this.compileErrors.map(e => `${e.file}:${e.line} — ${e.message}`).join('\n'),
          this.recentOperations.slice(-10).join('\n'),
          this.repoMap.formatCompact(),
          '',
          '',
        );

        const response = await this.guardedModelCall(
          'debugging',
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
      Array.from(this.changedFiles).join('\n'),
      compileResult,
    );

    const response = await this.guardedModelCall('reviewing', systemPrompt, this.messages.slice(-5));

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

    const response = await this.guardedModelCall('saving', systemPrompt, this.messages.slice(-3));

    if (response.text) {
      this.messages.push({ role: 'assistant', content: response.text });
    }

    const todoSummary = this.todoManager.getTodos()
      .map(t => `[${t.status}] ${t.title}`)
      .join('\n');

    if (todoSummary) {
      await this.memoryManager.saveNote(this.options.projectId, todoSummary);
    }

    if (this.changedFiles.size > 0) {
      await this.memoryManager.saveNote(
        this.options.projectId,
        `Changed files: ${Array.from(this.changedFiles).join(', ')}`,
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
    const result = await this.executeAgentTool('compileAndPreview', {
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
      this.changedFiles.add(result.path);
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
    this.abortController.abort();
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createLocalPlan(): any[] {
    // Generate a basic plan from the user request using heuristics
    const steps: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Check for common patterns
    const request = this.userRequest.toLowerCase();

    const hasComponentCreate = /create|add|new|build|make/.test(request);
    const hasComponentModify = /change|update|modify|edit|fix|refactor/.test(request);
    const hasStyleChange = /style|css|color|layout|responsive|dark mode|theme/.test(request);
    const hasFeatureAdd = /feature|page|route|section|dashboard|component/.test(request);

    if (hasComponentCreate || hasFeatureAdd) {
      steps.push({
        title: 'Create the requested files',
        description: 'Generate and write the new files needed.',
        mode: 'builder',
        files: [],
      });
    }

    if (hasComponentModify || hasStyleChange) {
      steps.push({
        title: hasStyleChange ? 'Apply style/theme changes' : 'Modify existing files',
        description: 'Edit the existing files to match the request.',
        mode: 'builder',
        files: [],
      });
    }

    // Default: one generic build step
    if (steps.length === 0) {
      steps.push({
        title: 'Implement requested changes',
        description: this.userRequest.slice(0, 200),
        mode: 'builder',
        files: [],
      });
    }

    // Note: compile is automatic after each todo (in builder loop),
    // so we don't add a separate compile step here.

    return steps;
  }

  private async localSaveMemory() {
    const memoryContent = this.changedFiles.size > 0
      ? `Modified files: ${Array.from(this.changedFiles).join(', ')}`
      : 'No files were modified.';
    await this.memoryManager.saveNote(this.options.projectId, memoryContent);

    // Save a snapshot
    if (this.changedFiles.size > 0) {
      await snapshotManager.createSnapshot(
        this.options.projectId,
        `After: ${this.userRequest.slice(0, 50)}`,
        'Automatic snapshot after task completion',
      ).catch(() => {});
    }
  }

  private cachedResponseToModelResponse(cached: { text: string; operations: { tool: string; input: Record<string, unknown> }[]; cachedAt: number }) {
    return {
      text: cached.text,
      needsMoreContext: false,
      contextRequests: [] as string[],
      toolCalls: cached.operations.map(op => ({ name: op.tool, input: op.input })),
    };
  }

  private async guardedModelCall(phase: string, systemPrompt: string, messages: Message[], onStreamToken?: (token: string) => void) {
    // Check context hash to prevent duplicate calls with same context
    const contextHash = this.contextCache.hashPrompt(systemPrompt, messages.map(m => m.content).join('|'));

    if (contextHash === this.lastContextHash) {
      this.sameContextCallCount++;
    } else {
      this.sameContextCallCount = 0;
    }

    if (this.sameContextCallCount >= 1) {
      // Same context repeated - use cached response or return empty
      const cached = this.contextCache.get(contextHash);
      if (cached) {
        agentEventBus.emit({
          type: 'context:selected',
          files: [],
          chunks: [],
          memoryUsed: true,
          repoMapUsed: true,
          estimatedTokens: 0,
        });
        return this.cachedResponseToModelResponse(cached);
      }
      agentEventBus.emit({
        type: 'agent:status',
        status: 'completed' as const,
        message: `Duplicate AI call detected in ${phase}: context did not change. Stopping.`,
      });
      return {
        text: '',
        needsMoreContext: false,
        contextRequests: [],
        toolCalls: [],
      };
    }

    this.lastContextHash = contextHash;

    // Check cache first
    const cached = this.contextCache.get(contextHash);
    if (cached) {
      agentEventBus.emit({
        type: 'context:selected',
        files: [],
        chunks: [],
        memoryUsed: true,
        repoMapUsed: true,
        estimatedTokens: 0,
      });
      return this.cachedResponseToModelResponse(cached);
    }

    // Check budget
    if (this.apiCallCount >= this.budget.maxTotalCalls) {
      // Graceful budget exhaustion: return an empty response that signals stop
      agentEventBus.emit({
        type: 'agent:status',
        status: 'completed' as const,
        message: `AI call budget reached (${this.apiCallCount}/${this.budget.maxTotalCalls}) in ${phase}. Stopping.`,
      });
      return {
        text: '',
        needsMoreContext: false,
        contextRequests: [],
        toolCalls: [],
      };
    }

    this.apiCallCount++;

    agentEventBus.emit({
      type: 'context:selected',
      files: [],
      chunks: [],
      memoryUsed: true,
      repoMapUsed: true,
      estimatedTokens: systemPrompt.length + messages.reduce((sum, m) => sum + m.content.length, 0),
    });

    const result = await this.aiClient.sendMessageJSON(systemPrompt, messages, onStreamToken, this.abortController.signal);

    const response = {
      text: result.text,
      needsMoreContext: result.needsMoreContext,
      contextRequests: result.contextRequests,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toolCalls: result.operations.map((op: any) => ({
        name: op.tool,
        input: op.input,
      })),
    };

    // Cache the response for potential reuse
    this.contextCache.set(contextHash, {
      text: response.text,
      operations: response.toolCalls.map(tc => ({ tool: tc.name, input: tc.input })),
    });

    return response;
  }
}
