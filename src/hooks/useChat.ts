import { useState, useCallback, useEffect, useRef } from 'react';
import type { ApplyReport, ChatAttachment, ChatMessage, ProjectFile, AIGenerationResponse, ChatMode, SavedGenerationState } from '@/types';
import { generateWithAI } from '@/services/aiService';
import * as storage from '@/services/storage';
import type { BuildTodo } from '@/components/chat/WorkingProcess';
import { buildFileContextGraph, getSkillBrief, getSkillManifest, selectSkillsForPrompt } from '@/services/skills';
import { buildAgentPlanFromContext, buildAgentToolTrace, buildProjectMemorySnapshot } from '@/services/agentRuntime';

const MIN_REQUEST_INTERVAL = 3000;
const lastRequestTimeRef = { current: 0 };

function buildTodosFromResponse(response: AIGenerationResponse): BuildTodo[] {
  const todos: BuildTodo[] = [];
  let index = 0;
  const baseId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const failedCommands = new Set(
    (response.metadata?.sandboxResults || [])
      .filter(result => result.status === 'error')
      .map(result => result.command),
  );

  for (const step of response.metadata?.agentPlan || []) {
    todos.push({
      id: `todo_${baseId}_${index++}`,
      label: step.title,
      status: step.status === 'error' ? 'error' : 'done',
      detail: step.detail,
    });
  }

  for (const file of response.files) {
    const verb = file.action === 'delete' ? 'Delete' : file.action === 'modify' ? 'Update' : 'Create';
    todos.push({
      id: `todo_${baseId}_${index++}`,
      label: `${verb} ${file.path}`,
      status: 'pending',
      detail: file.action === 'modify' ? 'Full file update' : undefined,
    });
  }
  for (const patch of response.patches || []) {
    const range = patch.lineStart ? `lines ${patch.lineStart}-${patch.lineEnd ?? patch.lineStart}` : 'targeted text edit';
    todos.push({
      id: `todo_${baseId}_${index++}`,
      label: `Patch ${patch.path}`,
      status: 'pending',
      detail: patch.reason || range,
    });
  }

  if (todos.length > 0) {
    for (const command of response.metadata?.sandboxCommands || []) {
      todos.push({
        id: `todo_${baseId}_${index++}`,
        label: `Run ${[command.command, ...(command.args || [])].join(' ')}`,
        status: failedCommands.has([command.command, ...(command.args || [])].join(' ').trim()) ? 'error' : 'pending',
        detail: command.reason,
      });
    }

    todos.push({
      id: `todo_${baseId}_${index}`,
      label: 'Refresh preview',
      status: failedCommands.size > 0 ? 'error' : 'pending',
      detail: failedCommands.size > 0 ? 'Validation has errors to review' : 'Preview ready for review',
    });
  }

  return todos;
}

function buildInitialWorkflowTodos(hasExistingFiles: boolean, providerLabel = 'Joyful AI'): BuildTodo[] {
  return [
    {
      id: `todo_${Date.now()}_analyze`,
      label: 'Analyzing your request',
      status: 'active',
      detail: 'Selecting skills, files, and recent conversation context',
    },
    {
      id: `todo_${Date.now()}_plan`,
      label: hasExistingFiles ? 'Planning changes' : 'Planning project structure',
      status: 'pending',
    },
    {
      id: `todo_${Date.now()}_generate`,
      label: `Generating code with ${providerLabel}`,
      status: 'pending',
    },
    {
      id: `todo_${Date.now()}_apply`,
      label: 'Applying changes to files',
      status: 'pending',
    },
    {
      id: `todo_${Date.now()}_validate`,
      label: 'Validating in sandbox',
      status: 'pending',
    },
  ];
}

function buildWalkthrough(response: AIGenerationResponse): string {
  const files = response.files;
  const patches = response.patches || [];
  const creates = files.filter(f => f.action === 'create');
  const modifies = files.filter(f => f.action === 'modify');
  const deletes = files.filter(f => f.action === 'delete');

  const parts: string[] = [];

  if (creates.length > 0) {
    parts.push(`Created ${creates.length} file${creates.length > 1 ? 's' : ''}: ${creates.map(f => f.path).join(', ')}.`);
  }

  if (modifies.length > 0) {
    parts.push(`Updated ${modifies.length} file${modifies.length > 1 ? 's' : ''}: ${modifies.map(f => f.path).join(', ')}.`);
  }

  if (deletes.length > 0) {
    parts.push(`Deleted ${deletes.length} file${deletes.length > 1 ? 's' : ''}: ${deletes.map(f => f.path).join(', ')}.`);
  }

  if (patches.length > 0) {
    parts.push(`Applied ${patches.length} patch${patches.length > 1 ? 'es' : ''}: ${patches.map(p => p.path).join(', ')}.`);
  }

  if (response.summary) {
    parts.push(response.summary);
  }

  const failedChecks = response.metadata?.sandboxResults?.filter(result => result.status === 'error') || [];
  if (failedChecks.length > 0) {
    parts.push(`${failedChecks.length} validation check${failedChecks.length > 1 ? 's need' : ' needs'} attention.`);
  }

  return parts.join(' ');
}

function buildReport(response: AIGenerationResponse) {
  const files = response.files || [];
  const sandboxResults = response.metadata?.sandboxResults || [];
  return {
    filesCreated: files.filter(file => file.action === 'create' || !file.action).length,
    filesModified: files.filter(file => file.action === 'modify').length,
    filesDeleted: files.filter(file => file.action === 'delete').length,
    patchesApplied: response.patches?.length || 0,
    validationPassed: sandboxResults.filter(result => result.status === 'done').length,
    validationFailed: sandboxResults.filter(result => result.status === 'error').length,
    repaired: response.metadata?.repaired,
  };
}

function isObsoleteInternalError(message: ChatMessage) {
  return message.role === 'system' && /buildTodos\d* is not a function/i.test(message.content);
}

function getInitialMessages(projectId: string) {
  const messages = storage.getChatHistory(projectId);
  const cleanedMessages = messages.filter(message => !isObsoleteInternalError(message));
  if (cleanedMessages.length !== messages.length) {
    storage.saveChatHistory(projectId, cleanedMessages);
  }
  return cleanedMessages;
}

function buildConversationContext(messages: ChatMessage[]) {
  return messages.slice(-20).map(message => {
    const notes: string[] = [message.content];
    if (message.metadata?.memory?.recentDecisions?.length) {
      notes.push(`Memory: ${message.metadata.memory.recentDecisions.slice(-3).join('; ')}`);
    }
    if (message.metadata?.contextFiles?.length) {
      notes.push(`Context files: ${message.metadata.contextFiles.slice(0, 5).join(', ')}`);
    }
    if (message.nextSteps?.length) {
      notes.push(`Next steps: ${message.nextSteps.slice(0, 3).join('; ')}`);
    }
    return {
      role: message.role,
      content: notes.filter(Boolean).join('\n'),
    };
  });
}

function buildMemoryNotes(messages: ChatMessage[]) {
  return messages
    .slice(-12)
    .flatMap(message => {
      const memory = message.metadata?.memory;
      const notes: string[] = [];
      if (memory?.selectedSkills?.length) notes.push(`Selected skills: ${memory.selectedSkills.join(', ')}`);
      if (memory?.contextFiles?.length) notes.push(`Recent context: ${memory.contextFiles.slice(0, 5).join(', ')}`);
      if (memory?.recentDecisions?.length) notes.push(...memory.recentDecisions);
      if (memory?.knownIssues?.length) notes.push(`Known issues: ${memory.knownIssues.join('; ')}`);
      return notes;
    })
    .filter((note, index, all) => note && all.indexOf(note) === index)
    .slice(-12);
}

async function enforceRequestDelay(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTimeRef.current;
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - elapsed));
  }
  lastRequestTimeRef.current = Date.now();
}

export function useChat(projectId: string, options?: { onToast?: (type: 'error' | 'success' | 'info', message: string) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => getInitialMessages(projectId));
  const [isGenerating, setIsGenerating] = useState(false);
  const [buildTodos, setBuildTodos] = useState<BuildTodo[]>([]);
  const [savedGeneration, setSavedGeneration] = useState<SavedGenerationState | null>(() => storage.getSavedGenerationState(projectId));
  const abortRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    setMessages(getInitialMessages(projectId));
    setBuildTodos([]);
    setIsGenerating(false);
    setSavedGeneration(storage.getSavedGenerationState(projectId));
    abortRef.current = false;
  }, [projectId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setBuildTodos([]);
    setSavedGeneration(null);
    storage.saveChatHistory(projectId, []);
    storage.clearGenerationState(projectId);
  }, [projectId]);

  const abortGeneration = useCallback(() => {
    abortRef.current = true;
    abortControllerRef.current?.abort();
  }, []);

  const sendMessage = useCallback(async (
    content: string,
    existingFiles: ProjectFile[],
    mode: ChatMode = 'build',
    attachments: ChatAttachment[] = [],
  ): Promise<AIGenerationResponse | null> => {
    abortRef.current = false;

    await enforceRequestDelay();

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      mode,
      attachments,
      timestamp: new Date().toISOString(),
    };

    const currentMessages = messagesRef.current;
    const newMessages = [...currentMessages, userMsg];
    setMessages(newMessages);
    storage.saveChatHistory(projectId, newMessages);

    setIsGenerating(true);
    const contextGraph = buildFileContextGraph(content, existingFiles);
    const selectedSkills = selectSkillsForPrompt(content, existingFiles, attachments).map(skill => skill.name);
    setBuildTodos(buildInitialWorkflowTodos(existingFiles.length > 0));
    setBuildTodos(prev => prev.map(todo =>
      todo.label.includes('Analyzing')
        ? { ...todo, status: 'done' as const, detail: contextGraph.length ? `Selected ${contextGraph.length} context file(s)` : 'No existing files to inspect' }
        : todo.label.includes('Planning')
          ? { ...todo, status: 'active' as const, detail: contextGraph.slice(0, 3).map(node => node.path).join(', ') }
          : todo
    ));
    const checkpoint: SavedGenerationState = {
      id: `generation_${Date.now()}`,
      projectId,
      prompt: content,
      mode,
      status: 'in_progress',
      savedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      filesSnapshot: existingFiles,
      messageCount: newMessages.length,
      contextFiles: contextGraph.map(node => node.path),
      attachments,
    };
    setSavedGeneration(checkpoint);
    storage.saveGenerationState(projectId, checkpoint);

    try {
      if (mode === 'plan') {
        await new Promise(r => setTimeout(r, 800));
        if (abortRef.current) return null;

        const hasFiles = existingFiles.length > 0;
        const agentPlan = buildAgentPlanFromContext(content, contextGraph, selectedSkills, hasFiles);
        const planSteps = agentPlan.map(step => step.title);

        const assistantMsg: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          mode: 'plan',
          actionType: 'plan',
          sourcePrompt: content,
          timestamp: new Date().toISOString(),
          content: `Here's my plan:\n\n${agentPlan.map((step, i) => `${i + 1}. ${step.title}${step.detail ? ` — ${step.detail}` : ''}`).join('\n')}\n\n${selectedSkills.length > 0 ? `Using skills: ${selectedSkills.join(', ')}.` : ''}\n\nReady to build when you are.`,
          metadata: {
            contextFiles: contextGraph.map(node => node.path),
            planSteps,
            agentPlan,
            memory: buildProjectMemorySnapshot(selectedSkills, contextGraph),
            complexity: existingFiles.length > 8 || content.length > 220 ? 'complex' : 'medium',
          },
        };

        const finalMessages = [...newMessages, assistantMsg];
        setMessages(finalMessages);
        storage.saveChatHistory(projectId, finalMessages);
        setSavedGeneration(null);
        storage.clearGenerationState(projectId);
        setBuildTodos(prev => prev.map(todo => ({ ...todo, status: 'done' as const })));
        setTimeout(() => setBuildTodos([]), 3000);
        return null;
      }

      const history = buildConversationContext(newMessages);

      await new Promise(r => setTimeout(r, 500));
      if (abortRef.current) return null;

      setBuildTodos(prev => prev.map(t =>
        t.label.includes('Planning') ? { ...t, status: 'done' as const }
          : t.label.includes('Generating') ? { ...t, status: 'active' as const, detail: 'Request sent with ranked context and active skills' }
          : t
      ));

      abortControllerRef.current = new AbortController();
      const response = await generateWithAI(content, existingFiles, history, {
        skillBrief: getSkillBrief(content, existingFiles, attachments),
        skillManifest: getSkillManifest().map(skill => `${skill.name}: ${skill.description}`),
        contextFiles: contextGraph.map(node => node.path),
        memoryNotes: buildMemoryNotes(currentMessages),
        attachments,
        signal: abortControllerRef.current.signal,
      });

      if (abortRef.current) {
        return null;
      }

      setBuildTodos(prev =>
        prev.map(todo =>
          todo.label.includes('Generating') ? { ...todo, status: 'done' as const }
            : todo.label.includes('Applying') ? { ...todo, status: 'active' as const }
            : todo
        )
      );

      await new Promise(r => setTimeout(r, 400));
      if (abortRef.current) return null;

      const todos = buildTodosFromResponse(response);
      setBuildTodos(todos);

      for (let i = 0; i < todos.length; i++) {
        if (abortRef.current) break;
        await new Promise(r => setTimeout(r, 650));
        setBuildTodos(prev =>
          prev.map((t, idx) => {
            if (t.status === 'error') return t;
            if (idx <= i) return { ...t, status: 'done' as const };
            if (idx === i + 1) return { ...t, status: 'active' as const };
            return t;
          })
        );
      }

      if (abortRef.current) {
        return null;
      }

      setBuildTodos(prev => prev.map(t => t.status === 'error' ? t : { ...t, status: 'done' as const }));

      const walkthrough = buildWalkthrough(response);
      const toolTrace = buildAgentToolTrace(selectedSkills, contextGraph, response);
      const memory = buildProjectMemorySnapshot(selectedSkills, contextGraph, response);

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        mode: 'build',
        content: walkthrough,
        timestamp: new Date().toISOString(),
        nextSteps: response.nextSteps,
        files: [
          ...response.files.map(f => ({
            path: f.path,
            action: f.action || (existingFiles.some(file => file.path === f.path) ? 'modify' as const : 'create' as const),
            content: f.content || '',
          })),
          ...(response.patches || []).map(patch => ({
            path: patch.path,
            action: 'modify' as const,
            content: patch.newString || patch.content || '',
          })),
        ],
        metadata: {
          contextFiles: contextGraph.map(node => node.path),
          complexity: response.metadata?.estimatedComplexity,
          agentPlan: response.metadata?.agentPlan,
          sandboxCommands: response.metadata?.sandboxCommands,
          sandboxResults: response.metadata?.sandboxResults,
          patchDetails: response.patches,
          buildReport: buildReport(response),
          toolTrace,
          memory,
          mediaAssets: response.metadata?.mediaAssets,
        },
      };

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      storage.saveChatHistory(projectId, finalMessages);
      setSavedGeneration(null);
      storage.clearGenerationState(projectId);

      const failedPatches = (response.patches || []).filter(patch => {
        const existing = existingFiles.find(f => f.path === patch.path);
        if (!existing) return false;
        if (patch.oldString && !existing.content.includes(patch.oldString)) return true;
        if (patch.insertBefore && !existing.content.includes(patch.insertBefore)) return true;
        if (patch.insertAfter && !existing.content.includes(patch.insertAfter)) return true;
        return false;
      });

      if (failedPatches.length > 0) {
        optionsRef.current?.onToast?.('error', `${failedPatches.length} patch(es) failed to apply to ${failedPatches.map(p => p.path).join(', ')}`);
      }

      setTimeout(() => setBuildTodos([]), 12000);

      return response;
    } catch (error) {
      console.error(error);
      const detail = error instanceof Error ? error.message : 'Please try again.';
      const failedCheckpoint: SavedGenerationState = {
        ...checkpoint,
        status: 'failed',
        updatedAt: new Date().toISOString(),
        error: detail,
      };
      setSavedGeneration(failedCheckpoint);
      storage.saveGenerationState(projectId, failedCheckpoint);
      const errorMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'system',
        content: `Something went wrong while building. ${detail}`,
        timestamp: new Date().toISOString(),
      };
      const finalMessages = [...newMessages, errorMsg];
      setMessages(finalMessages);
      storage.saveChatHistory(projectId, finalMessages);
      setBuildTodos(prev => prev.length > 0
        ? prev.map(todo => todo.status === 'active' ? { ...todo, status: 'error' as const, detail } : todo)
        : [{ id: `todo_${Date.now()}_error`, label: 'Build failed', status: 'error' as const, detail }]
      );
      return null;
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [projectId]);

  const recordApplyResult = useCallback((report: ApplyReport) => {
    setMessages(prev => {
      const index = [...prev].reverse().findIndex(message => message.role === 'assistant' && message.mode === 'build');
      if (index < 0) return prev;
      const targetIndex = prev.length - 1 - index;
      const next = [...prev];
      const message = next[targetIndex];
      const skippedTrace = report.skippedOperations.map(operation => ({
        id: `trace_apply_skip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        tool: operation.action === 'delete' ? 'delete_file' as const : operation.action === 'patch' ? 'apply_patch' as const : 'write_file' as const,
        label: `Skipped ${operation.path}`,
        status: 'skipped' as const,
        target: operation.path,
        detail: operation.reason,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
      }));
      next[targetIndex] = {
        ...message,
        metadata: {
          ...message.metadata,
          applyReport: report,
          buildReport: message.metadata?.buildReport
            ? {
              ...message.metadata.buildReport,
              filesCreated: message.metadata.buildReport.filesCreated,
            }
            : undefined,
          toolTrace: [
            ...(message.metadata?.toolTrace || []),
            {
              id: `trace_apply_${Date.now()}`,
              tool: 'write_file',
              label: `Applied ${report.applied} operation${report.applied === 1 ? '' : 's'}`,
              status: report.skipped > 0 ? 'skipped' : 'done',
              detail: report.skipped > 0 ? `${report.skipped} operation(s) skipped` : 'All returned operations were committed to the project',
              startedAt: new Date().toISOString(),
              endedAt: new Date().toISOString(),
            },
            ...skippedTrace,
          ],
        },
      };
      storage.saveChatHistory(projectId, next);
      return next;
    });
  }, [projectId]);

  const clearSavedGeneration = useCallback(() => {
    setSavedGeneration(null);
    storage.clearGenerationState(projectId);
  }, [projectId]);

  return { messages, isGenerating, buildTodos, savedGeneration, sendMessage, recordApplyResult, clearMessages, abortGeneration, clearSavedGeneration };
}
