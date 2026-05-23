import { AgentOrchestrator } from './AgentOrchestrator';
import { agentEventBus } from './eventBus';
import { virtualFS } from '@/lib/vfs/VirtualFileSystem';
import { type ToolResult } from './ToolExecutor';

export interface AgentObserver {
  onToken?: (token: string) => void;
  onToolCall?: (name: string, input: unknown) => void;
  onToolResult?: (name: string, result: ToolResult) => void;
  onTodoUpdate?: (todos: any[]) => void;
  onStatusChange?: (status: string, message: string) => void;
  onError?: (error: string) => void;
  onCompileRequest?: (entryPoint: string) => Promise<ToolResult>;
}

export class JoyfulAgentV2 {
  private orchestrator: AgentOrchestrator | null = null;
  private observer: AgentObserver = {};
  private projectId: string | null = null;
  private config: { apiKey: string; model?: string; baseUrl?: string };

  constructor(config: { apiKey: string; model?: string; baseUrl?: string }) {
    this.config = config;
  }

  setObserver(observer: AgentObserver): void {
    this.observer = observer;
  }

  setProjectId(id: string | null): void {
    this.projectId = id;
  }

  getProjectId(): string | null {
    return this.projectId;
  }

  async runTask(userRequest: string): Promise<void> {
    if (!this.projectId) {
      this.observer.onError?.('No project selected');
      return;
    }

    agentEventBus.emit({
      type: 'agent:start',
      runId: `run_${Date.now()}`,
      userRequest,
    });

    let framework = 'react';
    let entryPoint = '/src/App.tsx';
    try {
      const pkg = await virtualFS.readFile('/package.json');
      const parsed = JSON.parse(pkg);
      if (parsed.dependencies) {
        const deps = Object.keys(parsed.dependencies);
        if (deps.includes('next')) { framework = 'next'; entryPoint = '/src/App.tsx'; }
        else if (deps.includes('vue')) { framework = 'vue'; }
        else if (deps.includes('svelte')) { framework = 'svelte'; }
      }
    } catch {
      // default react
    }

    try {
      this.orchestrator = new AgentOrchestrator({
        apiKey: this.config.apiKey,
        model: this.config.model,
        baseUrl: this.config.baseUrl,
        projectId: this.projectId,
        entryPoint,
        framework,
      });

      this.orchestrator.onError = (error) => {
        this.observer.onError?.(error);
      };

      const unsub = agentEventBus.subscribe((event) => {
        if (event.type === 'agent:status') {
          this.observer.onStatusChange?.(event.status, event.message);
        }
        if (event.type === 'todo:created' || event.type === 'todo:updated') {
          this.observer.onTodoUpdate?.(event.todos);
        }
      });

      try {
        const result = await this.orchestrator.run(userRequest);
        if (!result.success) {
          this.observer.onError?.(result.summary);
        }
      } finally {
        unsub();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.observer.onError?.(msg);
      agentEventBus.emit({ type: 'agent:failed', error: msg });
    }
  }

  cancelTask(): void {
    this.orchestrator?.cancel();
  }

  async loadProjectState(projectId: string): Promise<void> {
    try {
      await virtualFS.getMeta('joyful_project_info');
      void projectId; // used for future state restoration
    } catch {
      // no saved state
    }
  }

  async saveProjectState(): Promise<void> {
    // Saved by orchestrator during phaseSaving
  }
}
