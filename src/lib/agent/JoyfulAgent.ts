import { virtualFS } from '@/lib/vfs/VirtualFileSystem';
import { ClaudeClient, type Message, type ToolCall } from '@/lib/agent/ClaudeClient';
import { buildSystemPrompt, type ProjectContext, type TodoSummary } from '@/lib/agent/SystemPrompt';
import { TOOL_DEFINITIONS } from '@/lib/agent/tools';
import { storageManager } from '@/engine/storage';
import { SafetyMonitor, StaleReadDetector } from '@/engine/safety';

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export type AgentObserver = {
  onToken?: (token: string) => void;
  onToolCall?: (name: string, input: unknown) => void;
  onToolResult?: (name: string, result: ToolResult) => void;
  onTodoUpdate?: (todos: TodoSummary[]) => void;
  onStatusChange?: (status: string, message: string) => void;
  onError?: (error: string) => void;
  onCompileRequest?: (entryPoint: string) => Promise<ToolResult>;
};

export class JoyfulAgent {
  private client: ClaudeClient;
  private messages: Message[] = [];
  private todos: TodoSummary[] = [];
  private observer: AgentObserver = {};
  private maxIterations = 50;
  private projectId: string | null = null;
  private sessionMemory: string[] = [];
  private safety = new SafetyMonitor();
  private staleRead = new StaleReadDetector();

  constructor(config: { apiKey: string; model?: string; baseUrl?: string }) {
    this.client = new ClaudeClient(config);
  }

  setProjectId(id: string | null): void {
    this.projectId = id;
  }

  getProjectId(): string | null {
    return this.projectId;
  }

  setObserver(observer: AgentObserver): void {
    this.observer = observer;
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  getTodos(): TodoSummary[] {
    return [...this.todos];
  }

  async loadProjectState(projectId: string): Promise<void> {
    this.projectId = projectId;
    try {
      const meta = await storageManager.getMeta(`agent_todos_${projectId}`);
      if (meta && Array.isArray(meta)) {
        this.todos = meta as TodoSummary[];
        this.observer.onTodoUpdate?.(this.todos);
      }
    } catch { /* storage not ready */ }
  }

  async saveProjectState(): Promise<void> {
    if (!this.projectId) return;
    try {
      await storageManager.setMeta(`agent_todos_${this.projectId}`, this.todos);
      if (this.sessionMemory.length > 0) {
        const existing = (await storageManager.getMeta(`agent_memory_${this.projectId}`)) as string[] || [];
        const merged = [...existing, ...this.sessionMemory].slice(-50);
        await storageManager.setMeta(`agent_memory_${this.projectId}`, merged);
      }
    } catch { /* storage not ready */ }
  }

  async runTask(userRequest: string): Promise<void> {
    this.messages.push({ role: 'user', content: userRequest });
    this.observer.onStatusChange?.('running', 'Starting task...');

    const projectContext = await this.buildProjectContext();

    for (let i = 0; i < this.maxIterations; i++) {
      const systemPrompt = buildSystemPrompt(projectContext, this.todos);

      this.observer.onStatusChange?.('running', `Iteration ${i + 1}...`);

      const response = await this.client.sendMessage(
        systemPrompt,
        this.messages,
        TOOL_DEFINITIONS,
        this.observer.onToken,
      );

      if (response.text) {
        if (this.messages[this.messages.length - 1]?.role === 'assistant') {
          this.messages[this.messages.length - 1].content += response.text;
        } else {
          this.messages.push({ role: 'assistant', content: response.text });
        }
      }

      if (response.toolCalls.length === 0) {
        this.observer.onStatusChange?.('done', 'Task complete.');
        await this.saveProjectState();
        break;
      }

      let allSuccessful = true;
      const toolResultMessages: string[] = [];

      for (const toolCall of response.toolCalls) {
        this.observer.onToolCall?.(toolCall.name, toolCall.input);
        const result = await this.executeToolCall(toolCall);
        this.observer.onToolResult?.(toolCall.name, result);

        if (!result.success) {
          allSuccessful = false;
        }

        toolResultMessages.push(
          `[Tool: ${toolCall.name}] ${result.success ? 'OK' : 'ERROR'}: ${result.data || result.error || 'Done'}`,
        );
      }

      const resultContent = toolResultMessages.join('\n');
      this.messages.push({ role: 'user', content: resultContent });

      // Safety: check for progress
      const progressCheck = this.safety.checkProgress(resultContent);
      if (progressCheck) {
        this.messages.push({ role: 'user', content: `[SAFETY] ${progressCheck}` });
        this.observer.onError?.(progressCheck);
        break;
      }

      if (!allSuccessful) {
        continue;
      }
    }

    await this.saveProjectState();
    this.observer.onStatusChange?.('done', 'Completed.');
  }

  private async executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
    const { name, input } = toolCall;

    try {
      switch (name) {
        case 'read_file': {
          const path = input.path as string;
          const startLine = input.start_line as number | undefined;
          const endLine = input.end_line as number | undefined;
          const content = await virtualFS.readFile(path);
          this.staleRead.recordRead(path, content);
          const lines = content.split('\n');
          if (startLine && endLine) {
            const selected = lines.slice(startLine - 1, endLine).join('\n');
            return {
              success: true,
              data: `Lines ${startLine}-${endLine} of ${path} (${lines.length} total):\n${selected}`,
            };
          }
          if (lines.length > 300) {
            const head = lines.slice(0, 100).join('\n');
            const tail = lines.slice(-50).join('\n');
            return {
              success: true,
              data: `WARNING: Large file (${lines.length} lines). Showing first 100 + last 50 lines. Use start_line/end_line for targeted reads.\n\n${head}\n\n... (${lines.length - 150} lines omitted) ...\n\n${tail}`,
            };
          }
          return { success: true, data: content };
        }

        case 'write_file': {
          const path = input.path as string;
          const content = input.content as string;
          const staleWarning = this.staleRead.checkStale(path, await virtualFS.readFile(path).catch(() => ''));
          if (staleWarning) {
            return { success: false, error: staleWarning };
          }
          const doomWarning = this.safety.recordEdit(path, content);
          if (doomWarning) {
            return { success: false, error: doomWarning };
          }
          await virtualFS.writeFile(path, content);
          this.staleRead.clearPath(path);
          return { success: true, data: `Written ${path} (${content.length} chars)` };
        }

        case 'edit_file': {
          const path = input.path as string;
          const oldText = input.old_text as string;
          const newText = input.new_text as string;
          const currentContent = await virtualFS.readFile(path);
          const staleWarning = this.staleRead.checkStale(path, currentContent);
          if (staleWarning) {
            return { success: false, error: staleWarning };
          }
          if (!currentContent.includes(oldText)) {
            const similar = this.findSimilarText(currentContent, oldText);
            const hint = similar ? ` Did you mean: "${similar.slice(0, 100)}..."?` : '';
            return { success: false, error: `Text not found in ${path}.${hint}` };
          }
          const updated = currentContent.replace(oldText, newText);
          if (updated === currentContent) {
            return { success: false, error: `Replacement produced no change. Check that old_text matches exactly.` };
          }
          await virtualFS.writeFile(path, updated);
          this.staleRead.clearPath(path);
          return { success: true, data: `Edited ${path} successfully` };
        }

        case 'list_directory': {
          const dirPath = (input.path as string) || '/';
          const entries = await virtualFS.listDirectory(dirPath);
          if (entries.length === 0) {
            return { success: true, data: `(empty directory: ${dirPath})` };
          }
          const listing = entries.map(e => {
            const icon = e.type === 'directory' ? '📁' : '📄';
            const size = e.type === 'file' ? ` (${e.size}b)` : '';
            return `  ${icon} ${e.name}${size}`;
          }).join('\n');
          return { success: true, data: `Contents of ${dirPath}:\n${listing}` };
        }

        case 'search_files': {
          const query = input.query as string;
          const pattern = input.file_pattern as string | undefined;
          const results = await virtualFS.searchContent(query, pattern);
          if (results.length === 0) {
            return { success: true, data: `No matches for "${query}"` };
          }
          const MAX_RESULTS = 50;
          const limited = results.slice(0, MAX_RESULTS);
          const formatted = limited.map(r => `  ${r.path}:${r.line}  ${r.content}`).join('\n');
          const extra = results.length > MAX_RESULTS ? `\n  ... and ${results.length - MAX_RESULTS} more matches` : '';
          return { success: true, data: `${results.length} matches for "${query}":\n${formatted}${extra}` };
        }

        case 'create_directory': {
          const dirPath = input.path as string;
          await virtualFS.ensureDir(dirPath);
          return { success: true, data: `Created directory ${dirPath}` };
        }

        case 'delete_file': {
          const delPath = input.path as string;
          await virtualFS.deleteFile(delPath);
          return { success: true, data: `Deleted ${delPath}` };
        }

        case 'update_todos': {
          const newTodos = input.todos as Array<{
            id: string;
            task: string;
            status: string;
            notes?: string;
          }>;
          this.todos = newTodos.map(t => ({
            id: t.id,
            task: t.task,
            status: t.status,
          }));
          this.observer.onTodoUpdate?.(this.todos);
          return { success: true, data: `Todos updated: ${this.todos.filter(t => t.status === 'done').length}/${this.todos.length} done` };
        }

        case 'compile_and_preview': {
          const entryPoint = (input.entry_point as string) || '/src/main.tsx';
          this.observer.onStatusChange?.('running', 'Compiling...');
          if (this.observer.onCompileRequest) {
            const result = await this.observer.onCompileRequest(entryPoint);
            return result;
          }
          return { success: true, data: 'Compile requested' };
        }

        case 'write_message': {
          const message = input.message as string;
          this.sessionMemory.push(message);
          this.observer.onStatusChange?.('message', message);
          return { success: true, data: message };
        }

        default:
          return { success: false, error: `Unknown tool: ${name}` };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  private async buildProjectContext(): Promise<ProjectContext> {
    const tree = await virtualFS.getProjectTree('/');
    const treeString = this.renderTreeNode(tree, '');

    let framework = 'React';
    let entryPoint = '/src/main.tsx';
    const language = 'TypeScript';
    const dependencies: string[] = [];

    try {
      const pkgContent = await virtualFS.readFile('/package.json');
      const pkg = JSON.parse(pkgContent);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      Object.keys(allDeps || {}).forEach(d => dependencies.push(d));

      if (allDeps?.next) framework = 'Next.js';
      else if (allDeps?.vue) framework = 'Vue';
      else if (allDeps?.react) framework = 'React';
    } catch {
      // no package.json
    }

    for (const candidate of ['/src/main.tsx', '/src/index.tsx', '/src/App.tsx', '/index.html']) {
      try {
        await virtualFS.readFile(candidate);
        entryPoint = candidate;
        break;
      } catch {
        // not found
      }
    }

    let notes = '';
    if (this.projectId) {
      try {
        const memory = await storageManager.getMeta(`agent_memory_${this.projectId}`);
        if (Array.isArray(memory) && memory.length > 0) {
          notes = memory.slice(-10).join('\n');
        }
      } catch { /* storage not ready */ }
    }

    return {
      framework,
      entryPoint,
      language,
      dependencies,
      treeString,
      notes,
    };
  }

  private renderTreeNode(
    node: { name: string; path: string; type: string; children: { name: string; path: string; type: string; children: unknown[] }[] },
    indent: string,
  ): string {
    if (node.type === 'file') {
      return `${indent}📄 ${node.name}`;
    }
    let result = `${indent}📁 ${node.name}/\n`;
    for (const child of node.children) {
      result += this.renderTreeNode(child as Parameters<typeof this.renderTreeNode>[0], indent + '  ') + '\n';
    }
    return result.trimEnd();
  }

  private findSimilarText(content: string, search: string): string | null {
    const searchLines = search.split('\n').filter(l => l.trim());
    if (searchLines.length === 0) return null;

    const contentLines = content.split('\n');
    const keyLine = searchLines[0].trim();

    for (let i = 0; i < contentLines.length; i++) {
      if (contentLines[i].trim().includes(keyLine.slice(0, 40))) {
        return contentLines.slice(Math.max(0, i - 2), i + 5).join('\n');
      }
    }
    return null;
  }
}
