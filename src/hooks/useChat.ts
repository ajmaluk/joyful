import { useState, useCallback, useEffect, useRef } from 'react';
import type { ChatMessage, ProjectFile, AIGenerationResponse, ChatMode, SavedGenerationState } from '@/types';
import { generateWithAI } from '@/services/aiService';
import * as storage from '@/services/storage';
import type { BuildTodo } from '@/components/chat/WorkingProcess';
import { buildFileContextGraph, defaultBuilderSkills, getActiveUserSkills, getSkillBrief } from '@/services/skills';

function buildTodosFromResponse(response: AIGenerationResponse): BuildTodo[] {
  const todos: BuildTodo[] = [];
  let index = 0;

  for (const file of response.files) {
    const verb = file.action === 'delete' ? 'Delete' : file.action === 'modify' ? 'Update' : 'Create';
    todos.push({
      id: `todo_${Date.now()}_${index++}`,
      label: `${verb} ${file.path}`,
      status: 'pending',
    });
  }
  for (const patch of response.patches || []) {
    todos.push({
      id: `todo_${Date.now()}_${index++}`,
      label: `Patch ${patch.path}`,
      status: 'pending',
    });
  }

  if (todos.length > 0) {
    for (const command of response.metadata?.sandboxCommands || []) {
      todos.push({
        id: `todo_${Date.now()}_${index++}`,
        label: `Run ${[command.command, ...(command.args || [])].join(' ')}`,
        status: 'pending',
      });
    }

    todos.push({
      id: `todo_${Date.now()}_${index}`,
      label: 'Refresh preview',
      status: 'pending',
    });
  }

  return todos;
}

function buildInitialWorkflowTodos(planSteps: string[], providerLabel = 'Joyful AI provider'): BuildTodo[] {
  return [
    {
      id: `todo_${Date.now()}_checkpoint`,
      label: 'Save request checkpoint',
      status: 'done',
    },
    ...planSteps.slice(0, 5).map((step, index) => ({
      id: `todo_${Date.now()}_plan_${index}`,
      label: step,
      status: index === 0 ? 'done' as const : 'pending' as const,
    })),
    {
      id: `todo_${Date.now()}_provider`,
      label: `Call ${providerLabel}`,
      status: 'active',
    },
    {
      id: `todo_${Date.now()}_parse`,
      label: 'Parse AI file operations',
      status: 'pending',
    },
    {
      id: `todo_${Date.now()}_apply`,
      label: 'Apply generated changes',
      status: 'pending',
    },
  ];
}

function getDevelopmentPlanSteps(content: string, existingFiles: ProjectFile[]): string[] {
  const lower = content.toLowerCase();
  const hasReactApp = existingFiles.some(file => /^src\/App\.(jsx|tsx)$/i.test(file.path));
  const hasStyles = existingFiles.some(file => /(^|\/)(styles|style)\.css$/i.test(file.path));
  const requestsRouting = /route|page|navigation|tab|screen|multi[- ]?page/.test(lower);
  const requestsDataFlow = /table|form|crud|filter|search|state|save|persist|dashboard|chart|api/.test(lower);

  const steps = [
    'Read current file structure and rank impacted files',
    hasReactApp ? 'Plan React component/state edits in src/App.jsx' : 'Create the React app entry and component structure',
  ];

  if (requestsRouting) steps.push('Add page/navigation flow and preview route coverage');
  if (requestsDataFlow) steps.push('Add app state, sample data, empty states, and core interactions');
  steps.push(hasStyles ? 'Update styles for responsive UI without breaking existing layout' : 'Add base styles for responsive UI');
  steps.push('Verify preview imports, runtime errors, and file operations');

  return steps;
}

function buildDevelopmentPlanMessage(content: string, existingFiles: ProjectFile[], contextFiles: string[], planSteps: string[]): ChatMessage {
  const fileStructure = existingFiles.length > 0
    ? existingFiles.map(file => `- ${file.path}`).join('\n')
    : '- No files yet';

  return {
    id: `msg_${Date.now() + 1}`,
    role: 'assistant',
    mode: 'plan',
    timestamp: new Date().toISOString(),
    content: `Development plan\n\nGoal:\n${content}\n\nCurrent file structure:\n${fileStructure}\n\nTask queue:\n${planSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}\n\nContext files selected:\n${contextFiles.length > 0 ? contextFiles.map(file => `- ${file}`).join('\n') : '- No focused context files yet'}\n\nNext I will ask Joyful AI for the first implementation pass and apply only structured file operations.`,
    metadata: {
      contextFiles,
      planSteps,
      complexity: existingFiles.length > 8 || content.length > 220 ? 'complex' : 'medium',
    },
  };
}

function buildWalkthrough(response: AIGenerationResponse): string {
  const files = response.files;
  const patches = response.patches || [];
  const creates = files.filter(f => f.action === 'create');
  const modifies = files.filter(f => f.action === 'modify');
  const deletes = files.filter(f => f.action === 'delete');

  const parts: string[] = [];

  if (creates.length > 0) {
    const paths = creates.map(f => f.path).join(', ');
    parts.push(`Created ${creates.length} file${creates.length > 1 ? 's' : ''}: ${paths}.`);
  }

  if (modifies.length > 0) {
    const paths = modifies.map(f => f.path).join(', ');
    parts.push(`Updated ${modifies.length} file${modifies.length > 1 ? 's' : ''}: ${paths}.`);
  }

  if (deletes.length > 0) {
    const paths = deletes.map(f => f.path).join(', ');
    parts.push(`Deleted ${deletes.length} file${deletes.length > 1 ? 's' : ''}: ${paths}.`);
  }
  if (patches.length > 0) {
    parts.push(`Applied ${patches.length} targeted patch${patches.length > 1 ? 'es' : ''}: ${patches.map(p => p.path).join(', ')}.`);
  }

  if (response.summary) {
    parts.push(response.summary);
  }

  const sandboxResults = response.metadata?.sandboxResults || [];
  const failedChecks = sandboxResults.filter(result => result.status === 'error');
  if (sandboxResults.length > 0 && failedChecks.length === 0) {
    parts.push(`Sandbox validation passed: ${sandboxResults.map(result => result.command).join(', ')}.`);
  } else if (failedChecks.length > 0) {
    parts.push(`Sandbox validation needs attention: ${failedChecks.map(result => result.command).join(', ')}.`);
  }

  return parts.join(' ');
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

function buildImplementationPlan(content: string, existingFiles: ProjectFile[]): ChatMessage {
  const contextGraph = buildFileContextGraph(content, existingFiles);
  const defaultSkillNames = defaultBuilderSkills.map(skill => skill.name);
  const userSkillNames = getActiveUserSkills().map(skill => skill.name);
  const hasFiles = existingFiles.length > 0;

  const planSteps = hasFiles
    ? [
        'Clarify the requested change against the current UI and keep unrelated files stable.',
        'Review the ranked context files, imports, styles, and state paths that can affect this request.',
        'Apply the smallest complete set of React, style, and supporting file edits for the behavior.',
        'Check runtime imports, preview entry points, responsive layout, empty states, and visible copy.',
        'Summarize the file operations and refresh the preview for review.',
      ]
    : [
        'Create a complete React/Vite project structure with package scripts, preview entry, app source, styles, and README.',
        'Turn the prompt into a concrete product flow with reusable sections, real navigation, and responsive layout.',
        'Add sensible interactive, empty, loading, and error states where the app needs them.',
        'Review generated files for syntax, imports, accessibility, mobile fit, and preview readiness.',
        'Summarize the build and suggest useful next refinements.',
      ];

  const contextText = contextGraph.length > 0
    ? contextGraph.map((node, index) => `${index + 1}. ${node.path} - ${node.reason}`).join('\n')
    : 'No existing files yet. I will start from a clean React/Vite application structure.';

  const userSkillsText = userSkillNames.length > 0
    ? `\n\nUser skills active:\n${userSkillNames.map(name => `- ${name}`).join('\n')}`
    : '';

  return {
    id: `msg_${Date.now() + 1}`,
    role: 'assistant',
    mode: 'plan',
    actionType: 'plan',
    sourcePrompt: content,
    timestamp: new Date().toISOString(),
    content: `Implementation plan\n\nGoal:\n${content}\n\nContext graph:\n${contextText}\n\nAgent workflow:\n${planSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}\n\nDefault skills active:\n${defaultSkillNames.map(name => `- ${name}`).join('\n')}${userSkillsText}\n\nOnly the latest plan can be proceeded. Ask for more detail anytime and I will replace the build target with the newest plan.`,
    metadata: {
      contextFiles: contextGraph.map(node => node.path),
      planSteps,
      complexity: existingFiles.length > 8 || content.length > 220 ? 'complex' : 'medium',
    },
  };
}

export function useChat(projectId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => getInitialMessages(projectId));
  const [isGenerating, setIsGenerating] = useState(false);
  const [buildTodos, setBuildTodos] = useState<BuildTodo[]>([]);
  const [savedGeneration, setSavedGeneration] = useState<SavedGenerationState | null>(() => storage.getSavedGenerationState(projectId));
  const abortRef = useRef(false);

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
  }, []);

  const sendMessage = useCallback(async (
    content: string,
    existingFiles: ProjectFile[],
    mode: ChatMode = 'build'
  ): Promise<AIGenerationResponse | null> => {
    abortRef.current = false;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      mode,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    storage.saveChatHistory(projectId, newMessages);

    setIsGenerating(true);
    const contextGraph = buildFileContextGraph(content, existingFiles);
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
    };
    setSavedGeneration(checkpoint);
    storage.saveGenerationState(projectId, checkpoint);
    const planSteps = getDevelopmentPlanSteps(content, existingFiles);
    setBuildTodos(buildInitialWorkflowTodos(planSteps));

    try {
      if (mode === 'plan') {
        await new Promise(r => setTimeout(r, 180));
        if (abortRef.current) return null;

        const assistantMsg = buildImplementationPlan(content, existingFiles);
        const finalMessages = [...newMessages, assistantMsg];
        setMessages(finalMessages);
        storage.saveChatHistory(projectId, finalMessages);
        setSavedGeneration(null);
        storage.clearGenerationState(projectId);
        return null;
      }

      const history = newMessages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const planMsg = buildDevelopmentPlanMessage(content, existingFiles, contextGraph.map(node => node.path), planSteps);
      const plannedMessages = [...newMessages, planMsg];
      setMessages(plannedMessages);
      storage.saveChatHistory(projectId, plannedMessages);

      const response = await generateWithAI(content, existingFiles, [...history, { role: 'assistant', content: planMsg.content }], {
        skillBrief: getSkillBrief(),
        contextFiles: contextGraph.map(node => node.path),
      });

      if (abortRef.current) {
        return null;
      }

      setBuildTodos(prev =>
        prev.map(todo => (
          todo.label === 'Call Joyful AI provider' || todo.label === 'Parse AI file operations'
            ? { ...todo, status: 'done' as const }
            : todo.label === 'Apply generated changes'
              ? { ...todo, status: 'active' as const }
              : todo
        ))
      );

      // Build todos from response
      const todos = buildTodosFromResponse(response);
      setBuildTodos(todos);

      // Simulate progressive completion
      for (let i = 0; i < todos.length; i++) {
        if (abortRef.current) break;
        await new Promise(r => setTimeout(r, 200 + Math.random() * 150));
        setBuildTodos(prev =>
          prev.map((t, idx) => idx <= i ? { ...t, status: 'done' as const } : idx === i + 1 ? { ...t, status: 'active' as const } : t)
        );
      }

      if (abortRef.current) {
        return null;
      }

      // Mark all done
      setBuildTodos(prev => prev.map(t => ({ ...t, status: 'done' as const })));

      // Build clean walkthrough message
      const walkthrough = buildWalkthrough(response);

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
        },
      };

      const finalMessages = [...plannedMessages, assistantMsg];
      setMessages(finalMessages);
      storage.saveChatHistory(projectId, finalMessages);
      setSavedGeneration(null);
      storage.clearGenerationState(projectId);

      // Clear todos after a brief display
      setTimeout(() => setBuildTodos([]), 2000);

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
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [messages, projectId]);

  const clearSavedGeneration = useCallback(() => {
    setSavedGeneration(null);
    storage.clearGenerationState(projectId);
  }, [projectId]);

  return { messages, isGenerating, buildTodos, savedGeneration, sendMessage, clearMessages, abortGeneration, clearSavedGeneration };
}
