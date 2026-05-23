import { virtualFS } from '@/lib/vfs/VirtualFileSystem';
import { agentEventBus } from './eventBus';
import { enhancedErrorCollector } from './ErrorCollector';
import { todoManager, type TodoItem } from './TodoManager';
import { memoryManager, type Reflection } from './MemoryManager';
import { browserSandbox } from '@/lib/sandbox/BrowserSandbox';
import { repoMapBuilder } from './RepoMap';
import { fileSummarizer } from './FileSummarizer';

export interface ToolResult {
  success: boolean;
  tool: string;
  path?: string;
  data?: unknown;
  error?: string;
  summary?: string;
  suggestedNextTools?: string[];
}

function contentHash(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash + content.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export class ToolExecutor {
  async execute(toolName: string, input: Record<string, unknown>): Promise<ToolResult> {
    const display = this.buildDisplay(toolName, input);
    agentEventBus.emit({
      type: 'tool:started',
      tool: toolName,
      input,
      display,
    });

    try {
      const handler = (this as unknown as Record<string, (input: Record<string, unknown>) => Promise<ToolResult>>)[`${toolName}`];
      if (typeof handler === 'function') {
        const result = await handler.call(this, input);
        agentEventBus.emit({
          type: 'tool:completed',
          tool: toolName,
          result: result.data,
          display,
        });
        return result;
      }
      throw new Error(`Unknown tool: ${toolName}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      agentEventBus.emit({
        type: 'tool:failed',
        tool: toolName,
        error: errorMsg,
        display,
      });
      return {
        success: false,
        tool: toolName,
        error: errorMsg,
      };
    }
  }

  private buildDisplay(toolName: string, input: Record<string, unknown>): string {
    const displayPath = input.path || input.file_pattern || '';
    const verb = toolName.replace(/_/g, ' ');
    return displayPath ? `${verb} ${displayPath}` : `${verb}...`;
  }

  // Navigation

  async listDirectory(input: Record<string, unknown>): Promise<ToolResult> {
    const path = (input.path as string) || '/';
    const entries = await virtualFS.listDirectory(path);
    const tree = await virtualFS.getProjectTree(path);
    return {
      success: true,
      tool: 'listDirectory',
      path,
      data: { entries, tree },
      summary: `Listed ${entries.length} entries in ${path}`,
      suggestedNextTools: entries.filter(e => e.type === 'file').slice(0, 5).map(() => 'read_file'),
    };
  }

  async getProjectTree(input: Record<string, unknown>): Promise<ToolResult> {
    const path = (input.path as string) || '/';
    const tree = await virtualFS.getProjectTree(path);
    return {
      success: true,
      tool: 'getProjectTree',
      path,
      data: tree,
      summary: 'Project tree retrieved',
    };
  }

  async searchFiles(input: Record<string, unknown>): Promise<ToolResult> {
    const pattern = input.pattern as string;
    const results = await virtualFS.findFiles(pattern);
    return {
      success: true,
      tool: 'searchFiles',
      data: results,
      summary: `Found ${results.length} files matching "${pattern}"`,
    };
  }

  async searchContent(input: Record<string, unknown>): Promise<ToolResult> {
    const query = input.query as string;
    const filePattern = input.file_pattern as string | undefined;
    const results = await virtualFS.searchContent(query, filePattern);
    return {
      success: true,
      tool: 'searchContent',
      data: results.slice(0, 100),
      summary: `Found ${results.length} matches for "${query}"`,
    };
  }

  async getRepoMap(_input?: Record<string, unknown>): Promise<ToolResult> {
    const compact = repoMapBuilder.formatCompact();
    return {
      success: true,
      tool: 'getRepoMap',
      data: compact,
      summary: 'Repo map retrieved',
    };
  }

  async getFileSummary(input: Record<string, unknown>): Promise<ToolResult> {
    const path = input.path as string;
    const summary = repoMapBuilder.getFileSummary(path);
    if (!summary) {
      const content = await virtualFS.readFile(path);
      const computed = fileSummarizer.summarizeFile(path, content);
      return {
        success: true,
        tool: 'getFileSummary',
        path,
        data: computed,
        summary: `Summary of ${path} (${computed.lineCount} lines)`,
      };
    }
    return {
      success: true,
      tool: 'getFileSummary',
      path,
      data: summary,
      summary: `Summary of ${path} (${summary.lineCount} lines)`,
    };
  }

  // File viewing

  async readFile(input: Record<string, unknown>): Promise<ToolResult> {
    const path = input.path as string;
    const content = await virtualFS.readFile(path);
    const lines = content.split('\n');
    const lineCount = lines.length;
    const version = await this.getFileVersion(path);

    if (lineCount > 300) {
      const summary = `WARNING: Large file (${lineCount} lines). Use readFileChunk for targeted reads.`;
      return {
        success: true,
        tool: 'readFile',
        path,
        data: { content, totalLines: lineCount, version },
        summary,
        suggestedNextTools: ['readFileChunk'],
      };
    }

    agentEventBus.emit({ type: 'file:read', path });
    return {
      success: true,
      tool: 'readFile',
      path,
      data: { content, totalLines: lineCount, version },
      summary: `Read ${path} (${lineCount} lines)`,
    };
  }

  async readFileChunk(input: Record<string, unknown>): Promise<ToolResult> {
    const path = input.path as string;
    const startLine = (input.startLine as number) || 1;
    const endLine = input.endLine as number;
    const content = await virtualFS.readFile(path);
    const lines = content.split('\n');
    const totalLines = lines.length;
    const version = await this.getFileVersion(path);
    const h = contentHash(content);

    const selected = lines.slice(startLine - 1, endLine).join('\n');

    agentEventBus.emit({
      type: 'file:read_chunk',
      path,
      startLine,
      endLine,
      totalLines,
      reason: 'Reading targeted lines',
    });

    return {
      success: true,
      tool: 'readFileChunk',
      path,
      data: {
        content: selected,
        startLine,
        endLine,
        totalLines,
        version,
        contentHash: h,
      },
      summary: `Read ${path} lines ${startLine}-${endLine} (${totalLines} total)`,
    };
  }

  async readFileAround(input: Record<string, unknown>): Promise<ToolResult> {
    const path = input.path as string;
    const line = (input.line as number) || 1;
    const before = (input.before as number) || 10;
    const after = (input.after as number) || 10;
    const content = await virtualFS.readFile(path);
    const lines = content.split('\n');
    const totalLines = lines.length;
    const startLine = Math.max(1, line - before);
    const endLine = Math.min(totalLines, line + after);

    return this.readFileChunk({
      path,
      startLine,
      endLine,
    } as Record<string, unknown>);
  }

  async readSymbol(input: Record<string, unknown>): Promise<ToolResult> {
    const path = input.path as string;
    const symbolName = input.symbolName as string;
    const content = await virtualFS.readFile(path);
    const summary = fileSummarizer.summarizeFile(path, content);
    const symbol = summary.symbols.find(
      s => s.name === symbolName || s.signature.includes(symbolName),
    );
    if (!symbol) {
      return {
        success: false,
        tool: 'readSymbol',
        path,
        error: `Symbol "${symbolName}" not found in ${path}`,
      };
    }
    return this.readFileChunk({
      path,
      startLine: symbol.startLine,
      endLine: symbol.endLine,
    } as Record<string, unknown>);
  }

  async readImports(input: Record<string, unknown>): Promise<ToolResult> {
    const path = input.path as string;
    const content = await virtualFS.readFile(path);
    const summary = fileSummarizer.summarizeFile(path, content);
    return {
      success: true,
      tool: 'readImports',
      path,
      data: summary.imports,
      summary: `${path} has ${summary.imports.length} imports`,
    };
  }

  async readExports(input: Record<string, unknown>): Promise<ToolResult> {
    const path = input.path as string;
    const content = await virtualFS.readFile(path);
    const summary = fileSummarizer.summarizeFile(path, content);
    return {
      success: true,
      tool: 'readExports',
      path,
      data: summary.exports,
      summary: `${path} has ${summary.exports.length} exports`,
    };
  }

  // File editing

  async createFile(input: Record<string, unknown>): Promise<ToolResult> {
    const path = input.path as string;
    const content = input.content as string;
    const exists = await virtualFS.readFile(path).then(() => true).catch(() => false);
    if (exists) {
      return {
        success: false,
        tool: 'createFile',
        path,
        error: `File already exists: ${path}. Use patchFile to edit.`,
      };
    }
    await virtualFS.writeFile(path, content);
    agentEventBus.emit({ type: 'file:created', path, size: content.length });
    return {
      success: true,
      tool: 'createFile',
      path,
      data: { size: content.length, version: Date.now() },
      summary: `Created ${path} (${content.length} chars)`,
    };
  }

  async createFolder(input: Record<string, unknown>): Promise<ToolResult> {
    const path = input.path as string;
    await virtualFS.ensureDir(path);
    return {
      success: true,
      tool: 'createFolder',
      path,
      summary: `Created directory ${path}`,
    };
  }

  async patchFile(input: Record<string, unknown>): Promise<ToolResult> {
    const path = input.path as string;
    const oldText = input.oldText as string;
    const newText = input.newText as string;
    const currentContent = await virtualFS.readFile(path);
    const normalizedContent = currentContent.replace(/\r\n/g, '\n');
    const normalizedOld = oldText.replace(/\r\n/g, '\n');
    const normalizedNew = newText.replace(/\r\n/g, '\n');

    if (!normalizedContent.includes(normalizedOld)) {
      return {
        success: false,
        tool: 'patchFile',
        path,
        error: `Text not found in ${path}. Check that old_text matches exactly.`,
      };
    }
    const updated = normalizedContent.replace(normalizedOld, normalizedNew);
    if (updated === normalizedContent) {
      return {
        success: false,
        tool: 'patchFile',
        path,
        error: 'Replacement produced no change.',
      };
    }
    await virtualFS.writeFile(path, updated);
    agentEventBus.emit({ type: 'file:updated', path, summary: `Patched ${path}` });
    return {
      success: true,
      tool: 'patchFile',
      path,
      data: { version: Date.now(), contentHash: contentHash(updated) },
      summary: `Patched ${path} successfully`,
    };
  }

  async multiPatchFile(input: Record<string, unknown>): Promise<ToolResult> {
    const path = input.path as string;
    const patches = input.patches as { oldText: string; newText: string }[];
    let content = await virtualFS.readFile(path);
    content = content.replace(/\r\n/g, '\n');

    for (let i = 0; i < patches.length; i++) {
      const p = patches[i];
      const oldNorm = p.oldText.replace(/\r\n/g, '\n');
      const newNorm = p.newText.replace(/\r\n/g, '\n');
      if (!content.includes(oldNorm)) {
        return {
          success: false,
          tool: 'multiPatchFile',
          path,
          error: `Patch #${i + 1}: text not found in ${path}`,
        };
      }
      content = content.replace(oldNorm, newNorm);
    }

    await virtualFS.writeFile(path, content);
    agentEventBus.emit({ type: 'file:updated', path, summary: `Multi-patched ${path}` });
    return {
      success: true,
      tool: 'multiPatchFile',
      path,
      data: { version: Date.now(), patches: patches.length },
      summary: `Applied ${patches.length} patches to ${path}`,
    };
  }

  async renameFile(input: Record<string, unknown>): Promise<ToolResult> {
    const oldPath = input.oldPath as string;
    const newPath = input.newPath as string;
    const content = await virtualFS.readFile(oldPath);
    await virtualFS.writeFile(newPath, content);
    await virtualFS.deleteFile(oldPath);
    agentEventBus.emit({ type: 'file:renamed', oldPath, newPath });
    return {
      success: true,
      tool: 'renameFile',
      path: newPath,
      summary: `Renamed ${oldPath} -> ${newPath}`,
    };
  }

  async deleteFile(input: Record<string, unknown>): Promise<ToolResult> {
    const path = input.path as string;
    await virtualFS.deleteFile(path);
    agentEventBus.emit({ type: 'file:deleted', path });
    return {
      success: true,
      tool: 'deleteFile',
      path,
      summary: `Deleted ${path}`,
    };
  }

  // Execution/validation

  async compileProject(input: Record<string, unknown>): Promise<ToolResult> {
    const entryPoint = (input.entryPoint as string) || '/src/main.tsx';
    agentEventBus.emit({ type: 'compile:started' });
    const startTime = Date.now();
    const result = await browserSandbox.compile(entryPoint);
    if (result.success) {
      agentEventBus.emit({ type: 'compile:succeeded', durationMs: Date.now() - startTime });
      return {
        success: true,
        tool: 'compileProject',
        data: { code: result.code, warnings: result.warnings },
        summary: 'Compilation succeeded',
      };
    }
    const buildErrors = enhancedErrorCollector.collectFromCompileResult(result);
    agentEventBus.emit({
      type: 'compile:failed',
      errors: buildErrors.map(e => ({ file: e.file, line: e.line, column: e.column, message: e.message })),
    });
    return {
      success: false,
      tool: 'compileProject',
      data: { errors: buildErrors },
      error: `Compilation failed with ${buildErrors.length} error(s)`,
      suggestedNextTools: ['collectBuildErrors'],
    };
  }

  async previewProject(input: Record<string, unknown>): Promise<ToolResult> {
    const compiledCode = input.compiledCode as string;
    await browserSandbox.updatePreview(compiledCode);
    agentEventBus.emit({ type: 'preview:updated', url: 'preview' });
    return {
      success: true,
      tool: 'previewProject',
      summary: 'Preview updated',
    };
  }

  async collectBuildErrors(input: Record<string, unknown>): Promise<ToolResult> {
    const entryPoint = (input.entryPoint as string) || '/src/main.tsx';
    const result = await browserSandbox.compile(entryPoint);
    if (result.success) {
      return {
        success: true,
        tool: 'collectBuildErrors',
        data: { errors: [], warnings: result.warnings },
        summary: 'No errors found',
      };
    }
    const buildErrors = enhancedErrorCollector.collectFromCompileResult(result);
    const formatted = enhancedErrorCollector.formatForPrompt(buildErrors);
    return {
      success: buildErrors.length === 0,
      tool: 'collectBuildErrors',
      data: { errors: buildErrors, formatted },
      summary: `Found ${buildErrors.length} error(s)`,
    };
  }

  // Task

  async createTodos(input: Record<string, unknown>): Promise<ToolResult> {
    const todos = input.todos as { title: string; mode: string; relatedFiles?: string[] }[];
    const created: TodoItem[] = [];
    for (const t of todos) {
      const item = todoManager.createTodo(
        t.title,
        t.mode as TodoItem['mode'],
        t.relatedFiles,
      );
      created.push(item);
    }
    return {
      success: true,
      tool: 'createTodos',
      data: created,
      summary: `Created ${created.length} todo(s)`,
    };
  }

  async updateTodo(input: Record<string, unknown>): Promise<ToolResult> {
    const id = input.id as string;
    const updates = input.updates as Record<string, unknown>;
    todoManager.updateTodo(id, updates as Partial<TodoItem>);
    return {
      success: true,
      tool: 'updateTodo',
      data: { id },
      summary: `Updated todo ${id}`,
    };
  }

  async blockTodo(input: Record<string, unknown>): Promise<ToolResult> {
    const id = input.id as string;
    const reason = input.reason as string;
    todoManager.blockTodo(id, reason);
    return {
      success: true,
      tool: 'blockTodo',
      data: { id },
      summary: `Blocked todo ${id}: ${reason}`,
    };
  }

  async completeTodo(input: Record<string, unknown>): Promise<ToolResult> {
    const id = input.id as string;
    todoManager.completeTodo(id);
    return {
      success: true,
      tool: 'completeTodo',
      data: { id },
      summary: `Completed todo ${id}`,
    };
  }

  async addDebugTodo(input: Record<string, unknown>): Promise<ToolResult> {
    const title = input.title as string;
    const relatedFiles = input.relatedFiles as string[] || [];
    const item = todoManager.createTodo(title, 'debugger', relatedFiles);
    return {
      success: true,
      tool: 'addDebugTodo',
      data: item,
      summary: `Created debug todo: ${title}`,
    };
  }

  // Memory

  async saveReflection(input: Record<string, unknown>): Promise<ToolResult> {
    const trigger = input.trigger as string;
    const errorSignature = input.errorSignature as string;
    const rootCause = input.rootCause as string;
    const successfulFix = input.successfulFix as string;
    const lesson = input.lesson as string;
    const relatedFiles = input.relatedFiles as string[] || [];
    const projectId = input.projectId as string || 'default';

    await memoryManager.saveReflection({
      trigger: trigger as Reflection['trigger'],
      errorSignature,
      rootCause,
      successfulFix,
      lesson,
      relatedFiles,
      projectId,
    });
    return {
      success: true,
      tool: 'saveReflection',
      summary: `Saved reflection: ${lesson.slice(0, 80)}`,
    };
  }

  async saveSkill(input: Record<string, unknown>): Promise<ToolResult> {
    const name = input.name as string;
    const description = input.description as string;
    const steps = input.steps as string[];
    const commonMistakes = input.commonMistakes as string[] || [];

    const skill = {
      id: '',
      name,
      description,
      whenToUse: [],
      steps,
      requiredTools: [],
      commonMistakes,
      validation: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      useCount: 0,
    };
    await memoryManager.saveSkill(skill);
    agentEventBus.emit({ type: 'skill:saved', skillName: name });
    return {
      success: true,
      tool: 'saveSkill',
      summary: `Saved skill: ${name}`,
    };
  }

  async saveMemoryNote(input: Record<string, unknown>): Promise<ToolResult> {
    const content = input.content as string;
    const projectId = input.projectId as string || 'default';
    await memoryManager.saveNote(projectId, content);
    agentEventBus.emit({ type: 'memory:saved', summary: content.slice(0, 100) });
    return {
      success: true,
      tool: 'saveMemoryNote',
      summary: `Saved note: ${content.slice(0, 80)}`,
    };
  }

  // Write message

  async writeMessage(input: Record<string, unknown>): Promise<ToolResult> {
    const message = input.message as string;
    agentEventBus.emit({ type: 'agent:message', text: message });
    return {
      success: true,
      tool: 'writeMessage',
      data: { message },
      summary: message.slice(0, 120),
    };
  }

  private async getFileVersion(path: string): Promise<number> {
    try {
      await virtualFS.readFile(path);
      return Date.now();
    } catch {
      return 0;
    }
  }
}

export const toolExecutor = new ToolExecutor();
