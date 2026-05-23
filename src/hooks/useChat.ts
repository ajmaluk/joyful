import { useState, useCallback, useEffect, useRef } from 'react';
import type { ApplyReport, ChatAttachment, ChatMessage, ProjectFile, AIGenerationResponse, ChatMode, SavedGenerationState } from '@/types';
import { generateWithAI, runBrowserSandboxChecks } from '@/services/aiService';
import { joyfulProviderConfig } from '@/services/joyfulProvider';
import * as storage from '@/services/storage';
import type { BuildTodo } from '@/components/chat/WorkingProcess';
import { buildFileContextGraph, getSkillManifest, selectSkillsWithConfidence, composeSkills, mergeSkillBriefs, buildQualityGatesForPrompt, type BuilderSkill } from '@/services/skills';
import { buildAgentPlanFromContext, buildAgentToolTrace, buildProjectMemorySnapshot, sessionMemory, taskDecomposition, MultiStepPipelineExecutor, type PipelinePhase } from '@/services/agentRuntime';
import { uniqueId } from '@/utils/ids';

const MIN_REQUEST_INTERVAL = 3000;
const lastRequestTimeRef = { current: 0 };

function buildTodosFromResponse(response: AIGenerationResponse): BuildTodo[] {
  const todos: BuildTodo[] = [];
  let index = 0;
  const baseId = uniqueId('base');
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
      id: uniqueId('todo_analyze'),
      label: 'Analyzing your request',
      status: 'active',
      detail: 'Selecting skills, files, and recent conversation context',
    },
    {
      id: uniqueId('todo_plan'),
      label: hasExistingFiles ? 'Planning changes' : 'Planning project structure',
      status: 'pending',
    },
    {
      id: uniqueId('todo_generate'),
      label: `Generating code with ${providerLabel}`,
      status: 'pending',
    },
    {
      id: uniqueId('todo_apply'),
      label: 'Applying changes to files',
      status: 'pending',
    },
    {
      id: uniqueId('todo_validate'),
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
      id: uniqueId('msg'),
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

    // Use advanced confidence-based skill selection
    const { selected: skillObjs, confidences } = selectSkillsWithConfidence(content, existingFiles, attachments);
    const selectedSkills = skillObjs.map(skill => skill.name);

    // Compose skills into orchestrated groups
    const composedSkills = composeSkills(
      skillObjs.filter((s): s is BuilderSkill => 'keywords' in s),
      content
    );

    // Use session memory from previous turns
    const memoryNotes = buildMemoryNotes(currentMessages);

    // Build quality gates for validation
    const gates = buildQualityGatesForPrompt(content, existingFiles);

    // Task decomposition
    const plans = taskDecomposition.decompose(content, contextGraph, existingFiles.length > 0);

    // Add memory entry for this request
    sessionMemory.addEntry('decision', `Processing: ${content.slice(0, 100)}`, contextGraph.map(n => n.path));

    setBuildTodos(buildInitialWorkflowTodos(existingFiles.length > 0));
    setBuildTodos(prev => prev.map(todo =>
      todo.label.includes('Analyzing')
        ? { ...todo, status: 'done' as const, detail: confidences.length > 0
            ? `Selected ${contextGraph.length} context file(s), top skill confidence: ${(confidences[0]?.normalizedConfidence * 100).toFixed(0)}%`
            : `Selected ${contextGraph.length} context file(s)` }
        : todo.label.includes('Planning')
          ? { ...todo, status: 'active' as const, detail: `${plans.length} task plan(s), ${gates.length} quality gate(s)` }
          : todo
    ));
    const checkpoint: SavedGenerationState = {
      id: uniqueId('generation'),
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

        // Show quality gates in plan
        const gateSummary = gates
          .filter(g => g.status !== 'skipped')
          .map(g => `- ${g.name}: ${g.description}`)
          .join('\n');

        const composedSkillNote = composedSkills.length > 0
          ? `\n\nComposed skill groups:\n${composedSkills.map(c => `- ${c.id}: ${c.skills.map(s => s.name).join(', ')}`).join('\n')}`
          : '';

        const assistantMsg: ChatMessage = {
          id: uniqueId('msg'),
          role: 'assistant',
          mode: 'plan',
          actionType: 'plan',
          sourcePrompt: content,
          timestamp: new Date().toISOString(),
          content: `Here's my plan:\n\n${agentPlan.map((step, i) => `${i + 1}. ${step.title}${step.detail ? ` — ${step.detail}` : ''}`).join('\n')}\n\n${selectedSkills.length > 0 ? `Using skills: ${selectedSkills.join(', ')}.` : ''}${composedSkillNote}\n\nQuality gates to validate:\n${gateSummary || 'No active quality gates.'}\n\nReady to build when you are.`,
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
          : t.label.includes('Generating') ? { ...t, status: 'active' as const, detail: `Quality gates: ${gates.filter(g => g.status === 'passed').length}/${gates.length}` }
          : t
      ));

      // Use composed skill briefs
      const skillBrief = mergeSkillBriefs(composedSkills, content);

      abortControllerRef.current = new AbortController();

      // Determine whether to use multi-step pipeline based on task complexity
      const estimatedFileCount = Math.max(1, plans.reduce((sum, p) => sum + p.subtasks.filter(s => s.type === 'create' || s.type === 'modify').length, 0));
      const isMultiStep = plans.length > 1 || estimatedFileCount > 3 || existingFiles.length > 0;

      let response: AIGenerationResponse | null = null;
      let multiStepFailed = false;

      if (isMultiStep && !abortRef.current) {
        try {
          // ── Multi-step pipeline: Plan → Execute files → Validate ──
        let pipelineExec: MultiStepPipelineExecutor | null = null;
        pipelineExec = new MultiStepPipelineExecutor((phase: PipelinePhase) => {
          if (phase.type === 'planning') {
            setBuildTodos(prev => prev.map(todo =>
              todo.label.includes('Generating')
                ? { ...todo, status: 'active' as const, detail: 'Planning file structure and dependencies' }
                : todo
            ));
          } else if (phase.type === 'executing_file') {
            const progress = pipelineExec!.getProgress();
            setBuildTodos(prev => prev.map(todo =>
              todo.label.includes('Generating')
                ? { ...todo, detail: `Generating ${phase.path} (${progress.filesGenerated + 1}/${progress.totalFiles})` }
                : todo
            ));
          } else if (phase.type === 'validating') {
            setBuildTodos(prev => prev.map(todo =>
              todo.label.includes('Generating') ? { ...todo, status: 'done' as const }
                : todo.label.includes('Validating') ? { ...todo, status: 'active' as const, detail: phase.detail }
                : todo
            ));
          }
        });

        const contextPaths = contextGraph.map(n => n.path);
        const projectConfigContext = pipelineExec.buildProjectContext(existingFiles);

        // Phase 1: Generate plan
        const planPrompt = pipelineExec.buildPlanPrompt(
          content, contextPaths, existingFiles,
          skillBrief, [...memoryNotes, ...sessionMemory.buildMemoryNotes()]
        );

        abortControllerRef.current = new AbortController();
        const planResponse = await generateWithAI(planPrompt, existingFiles, history, {
          skillBrief: [],
          skillManifest: getSkillManifest().map(skill => `${skill.name}: ${skill.description}`),
          contextFiles: contextPaths,
          memoryNotes: [...memoryNotes, ...sessionMemory.buildMemoryNotes()],
          attachments,
          signal: abortControllerRef.current.signal,
        });

        if (abortRef.current) return null;

        const planFiles = planResponse.files.map(f => ({ path: f.path, action: f.action || ('create' as const) }));
        const parsedPlan = {
          files: planFiles,
          title: planResponse.summary?.slice(0, 80) || 'Build plan',
          summary: planResponse.summary,
        };
        const executionOrder = parsedPlan.files.length > 1
          ? pipelineExec.determineExecutionOrder(parsedPlan.files)
          : parsedPlan.files.map(f => f.path);

        if (executionOrder.length === 0 && planResponse.files.length === 0) {
          throw new Error('Multi-step pipeline: plan produced no files to generate');
        }

        // Phase 2: Generate files one-by-one in dependency order
        const order = executionOrder.length > 0 ? executionOrder : planResponse.files.map(f => f.path);
        const planSummary = parsedPlan?.summary || planResponse.summary;
        const accumulatedFiles: { path: string; content: string; action: 'create' | 'modify' | 'delete' }[] = [];

        setBuildTodos(prev => prev.map(todo =>
          todo.label.includes('Generating')
            ? { ...todo, detail: `Generating ${order.length} file(s) sequentially` }
            : todo
        ));

        for (let fileIdx = 0; fileIdx < order.length; fileIdx++) {
          if (abortRef.current) break;

          const filePath = order[fileIdx];
          const fileInfo = planFiles.find(f => f.path === filePath) || { path: filePath, action: 'create' as const };
          const action = (fileInfo.action === 'delete' ? 'delete' : 'create') as 'create' | 'modify' | 'delete';
          const existingContent = existingFiles.find(f => f.path === filePath)?.content;

          // Update todos to show current file
          setBuildTodos(prev => prev.map(todo =>
            todo.label.includes('Generating')
              ? { ...todo, detail: `Generating file ${fileIdx + 1}/${order.length}: ${filePath}` }
              : todo
          ));

          // Skip deletes for single-file generation
          if (action === 'delete') {
            accumulatedFiles.push({ path: filePath, content: '', action: 'delete' });
            continue;
          }

          // If file already exists and is not being modified, treat as modify
          const effectiveAction = existingContent !== undefined && action === 'create' ? 'modify' : action;

          const filePrompt = pipelineExec.buildFileGenerationPrompt(
            filePath,
            effectiveAction,
            `Implementation of ${filePath}`,
            planSummary || content.slice(0, 500),
            projectConfigContext,
            existingContent,
            accumulatedFiles.map(f => ({ path: f.path, content: f.content }))
          );

          const fileResponse = await generateWithAI(filePrompt, existingFiles, history, {
            skillBrief: [],
            skillManifest: [],
            contextFiles: contextPaths,
            memoryNotes: [...memoryNotes, ...sessionMemory.buildMemoryNotes()],
            attachments,
            signal: abortControllerRef.current!.signal,
          });

          if (abortRef.current) return null;

          const generatedContent = fileResponse.files.find(f => f.path === filePath)?.content;
          if (generatedContent) {
            accumulatedFiles.push({ path: filePath, content: generatedContent, action: effectiveAction });
          } else if (fileResponse.files.length > 0) {
            accumulatedFiles.push({
              path: filePath,
              content: fileResponse.files[0].content || '',
              action: effectiveAction,
            });
          }

          // Brief delay between file generations
          await new Promise(r => setTimeout(r, 300));
        }

        if (abortRef.current) return null;

        // Convert accumulated files to match AIGenerationResponse format
        const mergedFiles = accumulatedFiles.map(f => ({
          path: f.path,
          action: f.action as 'create' | 'modify' | 'delete',
          content: f.content,
        }));

        // Phase 3: Validation (optional - only if we have enough files)
        if (mergedFiles.length >= 3 && !abortRef.current) {
          setBuildTodos(prev => prev.map(todo =>
            todo.label.includes('Validating')
              ? { ...todo, status: 'active' as const, detail: 'Checking imports and references' }
              : todo
          ));

          const validationPrompt = pipelineExec.buildValidationPrompt(
            planSummary || content.slice(0, 500),
            mergedFiles
          );

          try {
            const validationResponse = await generateWithAI(validationPrompt, existingFiles, history, {
              skillBrief: [],
              skillManifest: [],
              contextFiles: contextPaths,
              memoryNotes: [...memoryNotes, ...sessionMemory.buildMemoryNotes()],
              attachments,
              signal: abortControllerRef.current!.signal,
            });

            if (!abortRef.current && validationResponse.files.length > 0) {
              // Merge validation fixes into accumulated files
              for (const fix of validationResponse.files) {
                const existingIdx = mergedFiles.findIndex(f => f.path === fix.path);
                if (existingIdx >= 0 && fix.content) {
                  mergedFiles[existingIdx] = { ...mergedFiles[existingIdx], content: fix.content };
                } else if (fix.content) {
                  mergedFiles.push({
                    path: fix.path,
                    action: fix.action || 'modify',
                    content: fix.content,
                  });
                }
              }
            }
          } catch (validationErr) {
            console.error('Validation phase encountered an error (continuing with generated files):', validationErr);
          }

          await new Promise(r => setTimeout(r, 200));
        }

        if (abortRef.current) return null;

        setBuildTodos(prev => prev.map(todo =>
          todo.label.includes('Validating') ? { ...todo, status: 'done' as const }
            : todo.label.includes('Applying') ? { ...todo, status: 'active' as const }
            : todo
        ));

        // Build the final response from accumulated files
        response = {
          files: mergedFiles,
          patches: [],
          summary: `Generated ${mergedFiles.filter(f => f.action !== 'delete').length} file(s) across ${order.length} planned operations. ${planSummary || ''}`.trim(),
          nextSteps: [
            'Review the generated files for correctness',
            'Customize content and styling as needed',
            'Add any additional features or pages',
          ],
          metadata: {
            estimatedComplexity: plans[0]?.complexity || 'medium',
            agentPlan: plans.flatMap(p => [
              { id: p.id, title: p.title, status: 'done' as const, detail: p.description.slice(0, 100) },
              ...p.subtasks.map(s => ({ id: s.id, title: s.label, status: 'done' as const, detail: s.detail })),
            ]),
            sandboxCommands: [],
            sandboxResults: [],
          },
        };
      } catch (pipelineErr) {
          console.error('Multi-step pipeline failed, falling back to single-step:', pipelineErr);
          multiStepFailed = true;
        }
      }

      // Fall back to single-step if multi-step failed or skipped
      if (!isMultiStep || multiStepFailed) {
        if (multiStepFailed) {
          setBuildTodos(prev => prev.map(t =>
            t.label.includes('Generating')
              ? { ...t, status: 'active' as const, detail: 'Falling back to single-step generation' }
              : t
          ));
        }

        response = await generateWithAI(content, existingFiles, history, {
          skillBrief,
          skillManifest: getSkillManifest().map(skill => `${skill.name}: ${skill.description}`),
          contextFiles: contextGraph.map(node => node.path),
          memoryNotes: [...memoryNotes, ...sessionMemory.buildMemoryNotes()],
          attachments,
          signal: abortControllerRef.current.signal,
        });

        if (abortRef.current) {
          return null;
        }
      }

      if (!response) {
        throw new Error('Generation did not produce a response');
      }

      // Hook-level autonomous self-repair if provider is enabled and compilation fails
      if (joyfulProviderConfig.enabled && !abortRef.current) {
        let attempts = 0;
        let sandbox = await runBrowserSandboxChecks(response, existingFiles);
        let failedChecks = sandbox.results.filter(result => result.status === 'error');

        if (failedChecks.length > 0) {
          const healTodoId = uniqueId('heal');
          setBuildTodos(prev => [
            ...prev.map(todo =>
              todo.label.includes('Generating') ? { ...todo, status: 'done' as const }
                : todo.label.includes('Applying') ? { ...todo, status: 'active' as const }
                : todo
            ),
            {
              id: healTodoId,
              label: 'Autonomous Self-Repair',
              status: 'active' as const,
              detail: `Found ${failedChecks.length} compile/sandbox error(s). Healing...`,
            }
          ]);

          while (failedChecks.length > 0 && attempts < 2) {
            attempts++;
            const lastError = failedChecks.map(result => `Command: ${result.command}\nError:\n${result.stderr || result.stdout}`).join('\n\n');
            const repairPrompt = `Joyful browser sandbox compilation/validation failed. Repair the generated output now.

Validation errors:
${lastError}

Return the corrected files or patches. Make sure all imports use exact paths or correct '@/' aliases.`;

            try {
              const repairResponse = await generateWithAI(repairPrompt, response.files as unknown as ProjectFile[], history, {
                skillBrief,
                skillManifest: getSkillManifest().map(skill => `${skill.name}: ${skill.description}`),
                contextFiles: contextGraph.map(node => node.path),
                memoryNotes: [...memoryNotes, ...sessionMemory.buildMemoryNotes()],
                attachments,
                signal: abortControllerRef.current!.signal,
              });

              if (abortRef.current) return null;

              if (repairResponse && repairResponse.files.length > 0) {
                const updatedFiles: AIGenerationResponse['files'] = [...response.files];
                for (const fix of repairResponse.files) {
                  const existingIdx = updatedFiles.findIndex((file) => file.path === fix.path);
                  if (existingIdx >= 0) {
                    updatedFiles[existingIdx] = {
                      ...updatedFiles[existingIdx],
                      content: fix.content || updatedFiles[existingIdx].content,
                      action: fix.action || updatedFiles[existingIdx].action
                    };
                  } else {
                    updatedFiles.push({
                      path: fix.path,
                      action: fix.action || 'modify',
                      content: fix.content || ''
                    });
                  }
                }

                const updatedPatches: NonNullable<AIGenerationResponse['patches']> = [...(response.patches || [])];
                if (repairResponse.patches) {
                  updatedPatches.push(...repairResponse.patches);
                }

                response = {
                  ...response,
                  files: updatedFiles,
                  patches: updatedPatches,
                  metadata: {
                    ...response.metadata,
                    repaired: true,
                  }
                };

                sandbox = await runBrowserSandboxChecks(response, existingFiles);
                failedChecks = sandbox.results.filter(result => result.status === 'error');

                setBuildTodos(prev =>
                  prev.map(t =>
                    t.id === healTodoId
                      ? {
                          ...t,
                          detail: failedChecks.length > 0
                            ? `Attempt ${attempts} finished. Still has ${failedChecks.length} error(s). Retrying...`
                            : `Successfully healed all compile errors!`,
                        }
                      : t
                  )
                );
              } else {
                break;
              }
            } catch (err) {
              console.error('Self-healing iteration encountered an error:', err);
              break;
            }
          }

          setBuildTodos(prev =>
            prev.map(t =>
              t.id === healTodoId
                ? {
                    ...t,
                    status: failedChecks.length > 0 ? ('error' as const) : ('done' as const),
                    detail: failedChecks.length > 0
                      ? `Self-repair finished with remaining build error(s).`
                      : `Successfully repaired and validated codebase integrity.`,
                  }
                : t
            )
          );
        }

        response = {
          ...response,
          metadata: {
            ...response.metadata,
            sandboxCommands: sandbox.commands,
            sandboxResults: sandbox.results,
          }
        };
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
        id: uniqueId('msg'),
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

      setTimeout(() => setBuildTodos(prev => prev.length > 0 ? [] : prev), 12000);

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
        id: uniqueId('msg'),
        role: 'system',
        content: `Something went wrong while building. ${detail}`,
        timestamp: new Date().toISOString(),
      };
      const finalMessages = [...newMessages, errorMsg];
      setMessages(finalMessages);
      storage.saveChatHistory(projectId, finalMessages);
      setBuildTodos(prev => prev.length > 0
        ? prev.map(todo => todo.status === 'active' ? { ...todo, status: 'error' as const, detail } : todo)
        : [{ id: uniqueId('todo_error'), label: 'Build failed', status: 'error' as const, detail }]
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
        id: uniqueId('trace_apply_skip'),
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
              id: uniqueId('trace_apply'),
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
