import { agentEventBus } from './eventBus';
import { enhancedErrorCollector, type BuildError } from './ErrorCollector';
import type { Reflection } from './MemoryManager';
import type { ToolResult } from './ToolExecutor';

export interface RepairAttempt {
  attempt: number;
  error: BuildError;
  action: string;
  result: 'fixed' | 'failed' | 'retrying';
}

import type { Message } from './AIClient';

export type BudgetedAICall = (
  systemPrompt: string,
  messages: Message[],
) => Promise<{
  text: string;
  operations: { tool: string; input: Record<string, unknown> }[];
  needsMoreContext: boolean;
  contextRequests: string[];
}>;

function generateId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export class SelfRepairLoop {
  private alreadyAttempted = new Set<string>();

  async repair(
    errors: BuildError[],
    entryPoint: string,
    _repoMap: any,
    memoryManager: any,
    executeTool: (tool: string, input: Record<string, unknown>) => Promise<ToolResult>,
    aiCallFn: BudgetedAICall,
    maxAttempts = 3,
  ): Promise<{
    fixed: boolean;
    attempts: RepairAttempt[];
    remainingErrors: BuildError[];
    savedReflections: string[];
  }> {
    const attempts: RepairAttempt[] = [];
    const savedReflections: string[] = [];

    if (errors.length === 0) {
      return { fixed: true, attempts, remainingErrors: [], savedReflections };
    }

    agentEventBus.emit({
      type: 'repair:started',
      errors: errors.map(e => ({ file: e.file, line: e.line, message: e.message })),
    });

    const groups = this.groupErrors(errors);
    let remainingErrors = [...errors];

    for (const group of groups) {
      const primaryError = group.errors[0];

      if (!this.isNewError(primaryError)) {
        continue;
      }

      this.alreadyAttempted.add(this.errorSignature(primaryError));

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        agentEventBus.emit({
          type: 'repair:attempt',
          attempt,
          error: primaryError.message,
          action: `Attempt ${attempt} to fix: ${group.rootCause}`,
        });

        const reflections = await this.loadRelevantReflections(primaryError, memoryManager);
        const fileContext = await this.getFileContext(primaryError);
        const repairPrompt = this.buildRepairPrompt(
          primaryError,
          reflections,
          fileContext,
          group.errors,
        );

        const patchResult = await this.applyRepair(
          repairPrompt,
          primaryError,
          executeTool,
          aiCallFn,
        );

        if (!patchResult.success) {
          const result: 'retrying' | 'failed' = attempt < maxAttempts ? 'retrying' : 'failed';
          attempts.push({
            attempt,
            error: primaryError,
            action: patchResult.action,
            result,
          });
          continue;
        }

        const compileResult = await executeTool('compileProject', { entryPoint });
        const allErrors: BuildError[] = [];

        if (compileResult.success) {
          remainingErrors = [];
        } else {
          const compileData = compileResult.data as { errors: BuildError[] } | undefined;
          if (compileData?.errors) {
            allErrors.push(...compileData.errors);
          }
          const newErrors = allErrors.filter(
            e => !this.alreadyAttempted.has(this.errorSignature(e)),
          );
          remainingErrors = newErrors;
        }

        if (compileResult.success || remainingErrors.length === 0) {
          attempts.push({
            attempt,
            error: primaryError,
            action: patchResult.action,
            result: 'fixed',
          });
          savedReflections.push(
            await this.saveReflection(
              primaryError,
              group.rootCause,
              patchResult.action,
              memoryManager,
            ),
          );
          agentEventBus.emit({ type: 'repair:fixed' });
          break;
        }

        const retryResult: 'retrying' | 'failed' = attempt < maxAttempts ? 'retrying' : 'failed';
        attempts.push({
          attempt,
          error: primaryError,
          action: patchResult.action,
          result: retryResult,
        });
      }
    }

    if (remainingErrors.length > 0) {
      agentEventBus.emit({ type: 'repair:failed', remainingErrors: remainingErrors.length });
    }

    return {
      fixed: remainingErrors.length === 0,
      attempts,
      remainingErrors,
      savedReflections,
    };
  }

  private groupErrors(errors: BuildError[]): { rootCause: string; errors: BuildError[]; count: number }[] {
    return enhancedErrorCollector.groupByRootCause(errors);
  }

  private isNewError(error: BuildError): boolean {
    return !this.alreadyAttempted.has(this.errorSignature(error));
  }

  private errorSignature(error: BuildError): string {
    return `${error.file}:${error.line}:${error.message.slice(0, 80)}`;
  }

  private async loadRelevantReflections(
    error: BuildError,
    memoryManager: any,
  ): Promise<Reflection[]> {
    try {
      const errorSig = `${error.message} ${error.file}`;
      const reflections = await memoryManager.loadRelevantReflections(errorSig, 3);
      return reflections;
    } catch {
      return [];
    }
  }

  private async getFileContext(error: BuildError): Promise<string> {
    if (!error.file || error.line <= 0) return '(no file context)';
    try {
      return await enhancedErrorCollector.getCodeContext(error.file, error.line, 8);
    } catch {
      return `(could not read file: ${error.file})`;
    }
  }

  private buildRepairPrompt(
    error: BuildError,
    reflections: Reflection[],
    fileContext: string,
    allErrors: BuildError[],
  ): string {
    const parts: string[] = [];

    parts.push('You are a code repair assistant. Fix the following compilation error with a minimal, targeted change.');
    parts.push('');
    parts.push('=== Error ===');
    parts.push(`Type: ${error.type}`);
    parts.push(`File: ${error.file}`);
    parts.push(`Line: ${error.line}, Column: ${error.column}`);
    parts.push(`Message: ${error.message}`);
    if (error.likelyCause) {
      parts.push(`Likely cause: ${error.likelyCause}`);
    }
    if (error.code) {
      parts.push(`Error code context:\n${error.code}`);
    }
    parts.push('');

    if (allErrors.length > 1) {
      parts.push(`Note: ${allErrors.length - 1} other related error(s) may share the same root cause.`);
      parts.push('');
    }

    parts.push('=== Code Context ===');
    parts.push(fileContext);
    parts.push('');

    if (reflections.length > 0) {
      parts.push('=== Matching Past Reflections ===');
      for (const ref of reflections) {
        parts.push(`- Previous error: ${ref.errorSignature}`);
        parts.push(`  Root cause: ${ref.rootCause}`);
        parts.push(`  Fix: ${ref.successfulFix}`);
        parts.push(`  Lesson: ${ref.lesson}`);
        parts.push('');
      }
    }

    parts.push('=== Instructions ===');
    parts.push('1. Analyze the error and code context');
    parts.push('2. Determine the minimal change needed to fix it');
    parts.push('3. Use read_file to confirm the current file content');
    parts.push(`4. Use edit_file to apply the fix to ${error.file}`);
    parts.push('5. Do NOT rewrite unrelated code');
    parts.push('6. Focus only on the root cause');
    parts.push('');

    if (reflections.length > 0) {
      parts.push('Apply the lessons from matching past reflections if applicable.');
    }

    return parts.join('\n');
  }

  private async applyRepair(
    repairPrompt: string,
    error: BuildError,
    executeTool: (tool: string, input: Record<string, unknown>) => Promise<ToolResult>,
    aiCallFn: BudgetedAICall,
  ): Promise<{ success: boolean; action: string }> {
    try {
      await executeTool('readFile', { path: error.file });

      const response = await aiCallFn(repairPrompt, [
        { role: 'user', content: `Fix the error in ${error.file}:${error.line}` },
      ]);

      if (response.needsMoreContext) {
        for (const ctxReq of response.contextRequests) {
          const parts = ctxReq.split(':');
          if (parts[0] === 'read_file' && parts[1]) {
            await executeTool('readFile', { path: parts[1] });
          }
        }
        return { success: false, action: `Needed more context: ${response.contextRequests.join(', ')}` };
      }

      let appliedCount = 0;
      for (const op of response.operations) {
        if (op.tool === 'edit_file' || op.tool === 'patchFile') {
          const result = await executeTool('patchFile', {
            path: op.input.path || error.file,
            oldText: op.input.oldText || op.input.old_text,
            newText: op.input.newText || op.input.new_text,
          });
          if (result.success) appliedCount++;
        } else if (op.tool === 'write_file' || op.tool === 'createFile') {
          const result = await executeTool('createFile', {
            path: op.input.path,
            content: op.input.content,
          });
          if (result.success) appliedCount++;
        }
      }

      if (appliedCount > 0) {
        return { success: true, action: `Applied ${appliedCount} fix(es)` };
      }

      return { success: false, action: 'No fix operations were generated' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, action: `Error applying fix: ${msg}` };
    }
  }

  private async saveReflection(
    error: BuildError,
    rootCause: string,
    fixAction: string,
    memoryManager: any,
  ): Promise<string> {
    const reflectionId = generateId();
    try {
      const trigger = this.mapErrorTypeToTrigger(error.type);

      await memoryManager.saveReflection({
        trigger,
        errorSignature: `${error.file}:${error.line} - ${error.message}`,
        rootCause,
        successfulFix: fixAction,
        lesson: `Fixed ${error.type} in ${error.file}: ${error.message.slice(0, 100)}`,
        relatedFiles: [error.file],
        projectId: 'default',
      });
    } catch {
      // reflection save failure is non-critical
    }
    return reflectionId;
  }

  private mapErrorTypeToTrigger(
    errorType: string,
  ): 'compile_error' | 'runtime_error' | 'build_failure' | 'lint_error' | 'type_error' | 'missing_import' {
    switch (errorType) {
      case 'missing_import': return 'missing_import';
      case 'type_error': return 'type_error';
      case 'syntax_error': return 'compile_error';
      case 'runtime_error': return 'runtime_error';
      case 'lint_error': return 'lint_error';
      default: return 'build_failure';
    }
  }
}

export const selfRepairLoop = new SelfRepairLoop();
