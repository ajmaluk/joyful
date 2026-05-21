import type { AIGenerationResponse, AgentPlanStep, AIStreamChunk, ChatAttachment, FilePatchOperation, ProjectFile, SandboxCommandRequest, SandboxCommandResult } from '@/types';
import { joyfulProviderConfig } from '@/services/joyfulProvider';
import { executeInSandbox, loadVirtualFS } from '@/services/clientSandbox';
import { describeAttachment } from '@/services/attachments';

interface AIGenerationOptions {
  skillBrief?: string[];
  skillManifest?: string[];
  contextFiles?: string[];
  attachments?: ChatAttachment[];
  signal?: AbortSignal;
}

type JoyfulMessageContent = string | Array<
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
>;

function stripImagesFromMessages<T extends { content: JoyfulMessageContent }>(messages: T[]): T[] {
  return messages.map(message => {
    if (typeof message.content === 'string') return message;
    const text = message.content
      .filter(part => part.type === 'text')
      .map(part => part.text)
      .join('\n\n');
    return {
      ...message,
      content: `${text}\n\nNote: the current NVIDIA model rejected direct image input, so this retry uses the image filename metadata only. Ask the user for visual details if needed.`,
    };
  });
}

function scoreVisionModel(model: string) {
  const value = model.toLowerCase();
  let score = 0;
  if (/vision|multimodal|multi-modal|\bvl\b/.test(value)) score += 3;
  if (/qwen.*vision|llava|pixtral/.test(value)) score += 4;
  if (/gpt-4o|claude-3-5|gemini/.test(value)) score += 2;
  return score;
}

function sortCandidateModelsForAttachments(models: string[], hasAttachments: boolean) {
  if (!hasAttachments) return models;
  return [...models].sort((left, right) => scoreVisionModel(right) - scoreVisionModel(left));
}

interface JoyfulFunctionCall {
  name?: string;
  arguments?: unknown;
}

const RESPONSE_SCHEMA_HINT = `Return only valid JSON with this shape:
{
  "agentPlan": [
    { "id": "understand", "title": "Understand request", "status": "done", "detail": "short note" }
  ],
  "files": [
    { "path": "package.json", "action": "create|modify|delete", "content": "complete file content" }
  ],
  "patches": [
    { "path": "src/App.jsx", "action": "patch", "oldString": "exact existing code", "newString": "replacement code", "reason": "why this small edit is enough" }
  ],
  "sandboxCommands": [
    { "command": "npm", "args": ["run", "build"], "wait": true, "reason": "validate generated app" }
  ],
  "summary": "brief summary of what changed",
  "nextSteps": ["short next step"],
  "metadata": { "template": "react-app", "sections": ["..."], "estimatedComplexity": "simple|medium|complex" }
}
Use patches for maintenance, fixes, and small edits when an exact oldString can be found. Use files for new files, deletes, or large rewrites. For create or modify file operations, include the complete new file content. Use sandboxCommands only for browser-safe commands: ls, cat, pwd, node -v, npm install, npm run build, npm run lint. Do not wrap JSON in markdown. Do not use JavaScript string concatenation, comments, trailing commas, or unescaped line breaks inside JSON strings.`;

function stripMarkdownJson(value: string) {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) return trimmed.slice(firstBrace, lastBrace + 1);
  return trimmed;
}

function isSafeProjectPath(path: string): boolean {
  const normalized = path.trim().replace(/^\/+/, '');
  const reservedNames = new Set(['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']);
  const baseName = normalized.split('/').pop()?.split('.')[0]?.toUpperCase();
  return Boolean(
    normalized &&
    normalized.length <= 200 &&
    !normalized.includes('..') &&
    !normalized.startsWith(' ') &&
    !normalized.endsWith(' ') &&
    !reservedNames.has(baseName || '') &&
    /^[/\w\-. ]+$/.test(normalized)
  );
}

function normalizeAgentPlan(value: unknown, fallbackTitles: string[]): AgentPlanStep[] {
  const source = Array.isArray(value) && value.length > 0
    ? value
    : fallbackTitles.map((title, index) => ({ id: `step_${index + 1}`, title, status: index === 0 ? 'done' : 'pending' }));

  return source.slice(0, 8).map((step, index) => {
    const item = typeof step === 'object' && step ? step as Partial<AgentPlanStep> : { title: String(step) };
    const status = item.status === 'active' || item.status === 'done' || item.status === 'error' ? item.status : 'pending';
    return {
      id: typeof item.id === 'string' && item.id ? item.id : `step_${index + 1}`,
      title: typeof item.title === 'string' && item.title ? item.title : `Step ${index + 1}`,
      status,
      detail: typeof item.detail === 'string' ? item.detail : undefined,
    };
  });
}

function normalizeSandboxCommands(value: unknown, files: AIGenerationResponse['files']): SandboxCommandRequest[] {
  const commands = Array.isArray(value) ? value : [];
  const normalized = commands
    .map(command => {
      if (!command || typeof command !== 'object') return null;
      const item = command as Partial<SandboxCommandRequest>;
      if (typeof item.command !== 'string') return null;
      return {
        command: item.command,
        args: Array.isArray(item.args) ? item.args.map(String) : [],
        wait: item.wait !== false,
        reason: typeof item.reason === 'string' ? item.reason : undefined,
      };
    })
    .filter(Boolean) as SandboxCommandRequest[];

  if (normalized.length > 0) return normalized.slice(0, 4);

  const hasPackage = files.some(file => file.path === 'package.json' && file.action !== 'delete');
  return hasPackage
    ? [{ command: 'npm', args: ['run', 'build'], wait: true, reason: 'Validate generated project structure in Joyful browser sandbox.' }]
    : [{ command: 'ls', args: ['.'], wait: true, reason: 'Confirm generated files are available in Joyful browser sandbox.' }];
}

function normalizePatches(value: unknown): FilePatchOperation[] {
  const patches = Array.isArray(value) ? value : [];
  return patches
    .map((patch): FilePatchOperation | null => {
      if (!patch || typeof patch !== 'object') return null;
      const item = patch as Partial<FilePatchOperation>;
      if (typeof item.path !== 'string' || !isSafeProjectPath(item.path)) return null;
      return {
        path: item.path.trim().replace(/^\/+/, ''),
        action: 'patch',
        oldString: typeof item.oldString === 'string' ? item.oldString : undefined,
        newString: typeof item.newString === 'string' ? item.newString : undefined,
        insertBefore: typeof item.insertBefore === 'string' ? item.insertBefore : undefined,
        insertAfter: typeof item.insertAfter === 'string' ? item.insertAfter : undefined,
        content: typeof item.content === 'string' ? item.content : undefined,
        lineStart: typeof item.lineStart === 'number' ? item.lineStart : undefined,
        lineEnd: typeof item.lineEnd === 'number' ? item.lineEnd : undefined,
        reason: typeof item.reason === 'string' ? item.reason : undefined,
      };
    })
    .filter(Boolean) as FilePatchOperation[];
}

function commandToString(command: SandboxCommandRequest): string {
  return [command.command, ...(command.args || [])].join(' ').trim();
}

function eventsToCommandResult(command: SandboxCommandRequest, events: Awaited<ReturnType<typeof executeInSandbox>>): SandboxCommandResult {
  const stdout = events
    .filter(event => event.type === 'stdout')
    .map(event => String(event.data))
    .join('');
  const stderr = events
    .filter(event => event.type === 'stderr' || event.type === 'error')
    .map(event => String(event.data))
    .join('');
  const exitEvent = [...events].reverse().find(event => event.type === 'exit' && typeof event.data === 'object') as { data?: { code?: number } } | undefined;
  const exitCode = exitEvent?.data?.code ?? (stderr ? 1 : 0);

  return {
    command: commandToString(command),
    stdout,
    stderr,
    exitCode,
    status: exitCode === 0 ? 'done' : 'error',
  };
}

async function runBrowserSandboxChecks(
  response: AIGenerationResponse,
  existingFiles: ProjectFile[],
): Promise<{ commands: SandboxCommandRequest[]; results: SandboxCommandResult[] }> {
  const generatedFiles = new Map(existingFiles.map(file => [file.path, file.content]));
  for (const file of response.files) {
    if (file.action === 'delete') generatedFiles.delete(file.path);
    else if (typeof file.content === 'string') generatedFiles.set(file.path, file.content);
  }
  for (const patch of response.patches || []) {
    const current = generatedFiles.get(patch.path);
    if (typeof current !== 'string') continue;
    if (typeof patch.oldString === 'string' && typeof patch.newString === 'string' && current.includes(patch.oldString)) {
      generatedFiles.set(patch.path, current.replace(patch.oldString, patch.newString));
    } else if (typeof patch.insertBefore === 'string' && typeof patch.content === 'string' && current.includes(patch.insertBefore)) {
      generatedFiles.set(patch.path, current.replace(patch.insertBefore, `${patch.content}${patch.insertBefore}`));
    } else if (typeof patch.insertAfter === 'string' && typeof patch.content === 'string' && current.includes(patch.insertAfter)) {
      generatedFiles.set(patch.path, current.replace(patch.insertAfter, `${patch.insertAfter}${patch.content}`));
    } else if (typeof patch.lineStart === 'number' && typeof patch.lineEnd === 'number' && typeof patch.content === 'string') {
      const lines = current.split('\n');
      const start = Math.max(1, Math.floor(patch.lineStart));
      const end = Math.max(0, Math.floor(patch.lineEnd));
      if (start <= lines.length + 1) {
        lines.splice(start - 1, Math.max(0, end - start + 1), ...patch.content.split('\n'));
        generatedFiles.set(patch.path, lines.join('\n'));
      }
    }
  }

  loadVirtualFS(Array.from(generatedFiles.entries()).map(([path, content]) => ({ path, content })));

  const commands = normalizeSandboxCommands(response.metadata?.sandboxCommands, response.files);
  const results: SandboxCommandResult[] = [];
  for (const command of commands) {
    const events = await executeInSandbox(commandToString(command));
    results.push(eventsToCommandResult(command, events));
  }
  return { commands, results };
}

function buildJoyfulMessages(
  prompt: string,
  existingFiles: ProjectFile[],
  conversationHistory: { role: string; content: string }[],
  options?: AIGenerationOptions,
) {
  const filesForContext = existingFiles
    .slice(0, 24)
    .map(file => `--- ${file.path} ---\n${file.content.slice(0, 12000)}`)
    .join('\n\n');
  const manifestText = options?.skillManifest?.length
    ? `\n\nAvailable skills manifest (load full instructions only when selected):\n${options.skillManifest.map(skill => `- ${skill}`).join('\n')}`
    : '';
  const skillText = options?.skillBrief?.length
    ? `\n\nSelected skill instructions for this request:\n${options.skillBrief.map(skill => `- ${skill}`).join('\n')}`
    : '';
  const contextText = options?.contextFiles?.length
    ? `\n\nAdditional context:\n${options.contextFiles.join('\n\n')}`
    : '';

  const attachments = options?.attachments || [];
  const attachmentText = attachments.length
    ? `\n\nAttached image references:\n${attachments.map(describeAttachment).map(item => `- ${item}`).join('\n')}\nUse the image content as visual context when the active model supports vision. If visual details are ambiguous, say so in the summary.`
    : '';
  const userContentText = `User request:\n${prompt}${attachmentText}\n\nExisting files:\n${filesForContext || 'No existing files. Create a complete React/Vite project.'}`;
  const userContent: JoyfulMessageContent = attachments.length
    ? [
        { type: 'text', text: userContentText },
        ...attachments.map(attachment => ({
          type: 'image_url' as const,
          image_url: { url: attachment.dataUrl },
        })),
      ]
    : userContentText;

  return [
    {
      role: 'system',
      content: `You are Joyful AI, an agentic website builder inside a React/Vite workspace. Follow a Vercel-style development loop, adapted for Joyful's browser sandbox: understand the request, inspect the provided files, plan concrete tasks, generate complete file operations, choose browser-safe validation commands, and summarize what changed. Preserve existing project intent unless the user asks to replace it. Prefer React/Vite files, accessible UI, responsive layouts, valid imports, and concise copy. For existing-file maintenance, bug fixes, and feature additions, prefer targeted patches over full-file modifications when the exact target code is present. Treat the available skill manifest as a catalog only, and treat the selected skill instructions as required constraints. Do not activate unrelated skills or assume unselected skills are in force. Apply the most specific selected skill first. Every imported local component, hook, or utility must be included as a file operation in the same response. Do not reference undefined identifiers. If you use icons from lucide-react, import every icon you reference. For complex apps, complete one coherent implementation pass and put any remaining work in nextSteps as concrete follow-up tasks. Prefer semantic markup, keyboard-friendly controls, explicit empty states, and build/lint/preview validation whenever the change affects behavior.${manifestText}${skillText}${contextText}\n\n${RESPONSE_SCHEMA_HINT}`,
    },
    ...conversationHistory
      .filter(message => message.role === 'user' || message.role === 'assistant')
      .slice(-6)
      .map(message => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content,
      })),
    {
      role: 'user',
      content: userContent,
    },
  ];
}

function normalizeAIResponse(value: unknown): AIGenerationResponse {
  if (!value || typeof value !== 'object') throw new Error('Joyful AI returned an empty response.');

  const response = value as Partial<AIGenerationResponse>;
  const files = Array.isArray(response.files) ? response.files : [];
  const normalizedPatches = normalizePatches((response as { patches?: unknown }).patches);
  if (files.length === 0 && normalizedPatches.length === 0) throw new Error('Joyful AI did not return any file or patch operations.');

  const normalizedFiles = files
    .map(file => ({
      path: typeof file.path === 'string' ? file.path.trim().replace(/^\/+/, '') : '',
      action: file.action === 'delete' ? 'delete' as const : file.action === 'modify' ? 'modify' as const : 'create' as const,
      content: typeof file.content === 'string' ? file.content : '',
    }))
    .filter(file => file.path && isSafeProjectPath(file.path))
    .filter(file => file.action === 'delete' || file.content.length > 0);

  if (normalizedFiles.length === 0 && normalizedPatches.length === 0) throw new Error('Joyful AI returned file operations without valid paths.');

  const metadata = response.metadata && typeof response.metadata === 'object' ? response.metadata : {};

  return {
    files: normalizedFiles,
    patches: normalizedPatches,
    summary: typeof response.summary === 'string' ? response.summary : 'Joyful AI updated the project files.',
    nextSteps: Array.isArray(response.nextSteps) ? response.nextSteps.map(String) : [],
    metadata: {
      template: typeof metadata.template === 'string' ? metadata.template : undefined,
      sections: Array.isArray(metadata.sections) ? metadata.sections.map(String) : [],
      estimatedComplexity: metadata.estimatedComplexity === 'simple' || metadata.estimatedComplexity === 'medium' || metadata.estimatedComplexity === 'complex'
        ? metadata.estimatedComplexity
        : 'medium',
      agentPlan: normalizeAgentPlan((response as { agentPlan?: unknown }).agentPlan || metadata.agentPlan, [
        'Read current project context',
        'Generate complete file operations',
        'Validate in Joyful browser sandbox',
      ]),
      sandboxCommands: normalizeSandboxCommands((response as { sandboxCommands?: unknown }).sandboxCommands || metadata.sandboxCommands, normalizedFiles),
    },
  };
}

function buildLinePatchFromFullEdit(file: AIGenerationResponse['files'][number], existingFiles: ProjectFile[]): FilePatchOperation | null {
  if (file.action !== 'modify' || typeof file.content !== 'string') return null;
  const existing = existingFiles.find(existingFile => existingFile.path === file.path);
  if (!existing || existing.content === file.content) return null;

  const oldLines = existing.content.split('\n');
  const newLines = file.content.split('\n');
  let prefix = 0;
  while (prefix < oldLines.length && prefix < newLines.length && oldLines[prefix] === newLines[prefix]) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < oldLines.length - prefix &&
    suffix < newLines.length - prefix &&
    oldLines[oldLines.length - 1 - suffix] === newLines[newLines.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const oldChanged = oldLines.slice(prefix, oldLines.length - suffix);
  const newChanged = newLines.slice(prefix, newLines.length - suffix);
  const changedLineCount = Math.max(oldChanged.length, newChanged.length);
  const originalLineCount = Math.max(oldLines.length, 1);

  if (changedLineCount > 80 || changedLineCount / originalLineCount > 0.45) {
    return null;
  }

  return {
    path: file.path,
    action: 'patch',
    lineStart: prefix + 1,
    lineEnd: prefix + Math.max(1, oldChanged.length),
    content: newChanged.join('\n'),
    reason: 'Compressed model full-file modify response into a targeted line patch.',
  };
}

function compactFullFileModifications(response: AIGenerationResponse, existingFiles: ProjectFile[]): AIGenerationResponse {
  const patches = [...(response.patches || [])];
  const files: AIGenerationResponse['files'] = [];
  let compactedCount = 0;

  for (const file of response.files) {
    const patch = buildLinePatchFromFullEdit(file, existingFiles);
    if (patch) {
      patches.push(patch);
      compactedCount += 1;
    } else {
      files.push(file);
    }
  }

  if (compactedCount === 0) return response;

  return {
    ...response,
    files,
    patches,
    summary: `${response.summary} Converted ${compactedCount} full-file modification${compactedCount > 1 ? 's' : ''} into targeted patch operation${compactedCount > 1 ? 's' : ''}.`,
    metadata: {
      ...response.metadata,
      sections: [...new Set([...(response.metadata?.sections || []), 'targeted-patches'])],
    },
  };
}

async function generateWithJoyfulAI(
  prompt: string,
  existingFiles: ProjectFile[],
  conversationHistory: { role: string; content: string }[],
  options?: AIGenerationOptions,
): Promise<AIGenerationResponse> {
  // Use NVIDIA chat completions endpoint for Joyful's hosted generation path.
  if (!joyfulProviderConfig.apiKey) {
    throw new Error('VITE_NV_API_KEY is required when VITE_JOYFUL_PROVIDER_ENABLED=true.');
  }

  const messages = buildJoyfulMessages(prompt, existingFiles, conversationHistory, options);
  const candidateModels = Array.from(new Set([
    joyfulProviderConfig.model,
    ...joyfulProviderConfig.fallbackModels,
  ].filter(Boolean)));
  const orderedModels = sortCandidateModelsForAttachments(candidateModels, Boolean(options?.attachments?.length));
  const failures: string[] = [];

  for (const model of orderedModels) {
    try {
      let activeMessages = messages;
      let repairedOnce = false;
      let lastError: string | null = null;

      for (let attempt = 0; attempt < 2; attempt++) {
      const payload = {
        model: model || 'qwen/qwen3-coder-480b-a35b-instruct',
        messages: activeMessages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : m.role, content: m.content })),
        temperature: 0.7,
        top_p: joyfulProviderConfig.topP || 0.8,
        frequency_penalty: 0,
        presence_penalty: 0,
        max_tokens: 4096,
        stream: false,
      };

      const res = await fetch(joyfulProviderConfig.invokeUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${joyfulProviderConfig.apiKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: options?.signal,
      });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        const hasImagePayload = activeMessages.some(message => Array.isArray(message.content) && message.content.some(part => part.type === 'image_url'));
        if (hasImagePayload && !repairedOnce) {
          repairedOnce = true;
          lastError = `NVIDIA API error ${res.status}: ${bodyText}`;
          activeMessages = stripImagesFromMessages(activeMessages);
          activeMessages.push({
            role: 'user',
            content: `The provider rejected direct image input for this model. Continue with the text request and attached image metadata. If the visual content is required and not described in text, ask for the missing details in nextSteps.\n\nProvider error:\n${lastError}`,
          });
          continue;
        }
        throw new Error(`NVIDIA API error ${res.status}: ${bodyText}`);
      }

      const json = await res.json();
      // Attempt to extract assistant text from common shapes
      const text = String(json?.choices?.[0]?.message?.content || json?.choices?.[0]?.text || json?.output?.[0]?.content || json?.message?.content || '');
      if (!text.trim()) throw new Error('NVIDIA chat returned an empty response.');

      let parsed: unknown;
      try {
        parsed = JSON.parse(stripMarkdownJson(text));
      } catch (parseError) {
        if (!repairedOnce) {
          repairedOnce = true;
          lastError = parseError instanceof Error ? parseError.message : String(parseError);
          activeMessages = [
            ...activeMessages,
            { role: 'assistant', content: text },
            {
              role: 'user',
              content: `Your previous response was not valid JSON and could not be parsed.

Parse error:
${lastError}

Return the same intended result again as strict JSON only. Do not use markdown fences, JavaScript string concatenation, comments, trailing commas, or unescaped line breaks in JSON strings.`,
            },
          ];
          continue;
        }
        throw parseError;
      }

      // Detect function calls in the model response (SDK-specific shapes)
      const functionCalls: JoyfulFunctionCall[] = [];
      const maybe = json?.choices?.[0]?.message?.function_call || json?.function_call || json?.choices?.[0]?.function_call || null;
      if (maybe && typeof maybe === 'object') {
        functionCalls.push(maybe as JoyfulFunctionCall);
      }

      const toolResults: { type: string; name?: string; args: unknown }[] = [];
      const pendingFileOps: { name: 'create_file' | 'modify_file' | 'delete_file'; args: { path?: string; content?: string } }[] = [];

      if (functionCalls.length > 0) {
        for (const fc of functionCalls) {
          const name = fc.name;
          const argsText = typeof fc.arguments === 'string' ? fc.arguments : JSON.stringify(fc.arguments || {});
          let args: unknown = {};
          try {
            args = JSON.parse(stripMarkdownJson(argsText));
          } catch {
            args = fc.arguments || {};
          }

          if (name === 'create_file' || name === 'modify_file' || name === 'delete_file') {
            pendingFileOps.push({ name, args: typeof args === 'object' && args ? args as { path?: string; content?: string } : {} });
          } else {
            toolResults.push({ type: 'unknown_function', name, args });
          }
        }
      }

      if (
        parsed &&
        typeof parsed === 'object' &&
        (Array.isArray((parsed as { files?: unknown }).files) || Array.isArray((parsed as { patches?: unknown }).patches))
      ) {
        const normalized = compactFullFileModifications(normalizeAIResponse(parsed), existingFiles);
        const sandbox = await runBrowserSandboxChecks(normalized, existingFiles);
        const failedChecks = sandbox.results.filter(result => result.status === 'error');
        if (failedChecks.length > 0 && !repairedOnce) {
          repairedOnce = true;
          lastError = failedChecks.map(result => `${result.command}\n${result.stderr || result.stdout}`).join('\n\n');
          activeMessages = [
            ...activeMessages,
            { role: 'assistant', content: text },
            {
              role: 'user',
              content: `Joyful browser sandbox validation failed. Repair the generated output now.

Validation errors:
${lastError}

Return the corrected JSON only. Prefer targeted patches when fixing existing files, and include sandboxCommands for the next validation pass.`,
            },
          ];
          continue;
        }

        const metadata = {
          ...normalized.metadata,
          sandboxCommands: sandbox.commands,
          sandboxResults: sandbox.results,
          repaired: repairedOnce,
          toolResults: toolResults.length ? toolResults : undefined,
          pendingFileOps: pendingFileOps.length ? pendingFileOps : undefined,
        };
        return {
          ...normalized,
          summary: model !== joyfulProviderConfig.model
            ? `${normalized.summary} Used fallback model ${model} because ${joyfulProviderConfig.model} was unavailable.`
            : normalized.summary,
          metadata,
        };
      }

      // If we handled function calls but model didn't return final JSON, return a tool-only response so UI can react.
      if ((toolResults.length || pendingFileOps.length) && (!parsed || !Array.isArray((parsed as { files?: unknown }).files))) {
        const metadata = {
          template: '',
          sections: [],
          estimatedComplexity: 'medium' as const,
          toolResults: toolResults.length ? toolResults : undefined,
          pendingFileOps: pendingFileOps.length ? pendingFileOps : undefined,
        };
        return {
          files: [],
          summary: 'Executed tool calls. Review tool results and approve file operations.',
          nextSteps: [],
          metadata,
        } as AIGenerationResponse;
      }

      throw new Error('Joyful AI returned JSON without file operations.');
      }

      if (lastError) throw new Error(`Joyful AI could not repair validation errors: ${lastError}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${model}: ${message}`);
    }
  }

  throw new Error(`Joyful AI provider failed. ${failures.join(' | ')}`);
}

// ─── Prompt Analysis ───────────────────────────────────────────────

interface PromptAnalysis {
  intent: 'create' | 'modify';
  template: string;
  features: string[];
  colorScheme: 'light' | 'dark' | 'auto';
  industry: string;
}

function analyzePrompt(prompt: string, existingFiles: ProjectFile[]): PromptAnalysis {
  const lower = prompt.toLowerCase();
  const hasExistingSite = existingFiles.some(f => f.path === 'index.html' && f.content.trim().length > 100);

  const modifyKeywords = ['add', 'change', 'update', 'make', 'convert', 'improve', 'remove', 'fix', 'edit'];
  const intent: 'create' | 'modify' = hasExistingSite && modifyKeywords.some(k => lower.includes(k)) ? 'modify' : 'create';

  let template = 'portfolio';
  if (/restaurant|food|menu|cafe|dining|pizza|sushi/.test(lower)) template = 'restaurant';
  else if (/shop|store|ecommerce|e-commerce|product|buy|sell|cart/.test(lower)) template = 'ecommerce';
  else if (/real estate|realestate|property|properties|realtor|agent profile|mortgage/.test(lower)) template = 'realestate';
  else if (/fitness|gym|trainer|workout|yoga|membership/.test(lower)) template = 'fitness';
  else if (/photography|photographer|photo|masonry|lightbox/.test(lower)) template = 'photography';
  else if (/web app|application|complex app|project management|task manager|kanban|crm|portal|planner|workspace|inventory|booking|internal tool/.test(lower)) template = 'webapp';
  else if (/startup|waitlist|early access/.test(lower)) template = 'startup';
  else if (/saas|app|software|landing|launch/.test(lower)) template = 'saas';
  else if (/blog|article|editorial|post|news|magazine/.test(lower)) template = 'blog';
  else if (/dashboard|admin|analytics|metrics|chart/.test(lower)) template = 'dashboard';
  else if (/agency|studio|creative|design/.test(lower)) template = 'agency';
  else if (/event|conference|meetup|summit|wedding/.test(lower)) template = 'event';
  else if (/portfolio|personal|resume|cv|developer|designer/.test(lower)) template = 'portfolio';

  const features: string[] = [];
  if (/pricing|price|plan|tier/.test(lower)) features.push('pricing');
  if (/contact|form|email|message/.test(lower)) features.push('contact');
  if (/testimonial|review|feedback/.test(lower)) features.push('testimonials');
  if (/gallery|image|photo/.test(lower)) features.push('gallery');
  if (/faq|question/.test(lower)) features.push('faq');
  if (/team|member|staff/.test(lower)) features.push('team');
  if (/hero|banner|header/.test(lower)) features.push('hero');
  if (/about/.test(lower)) features.push('about');
  if (/service|feature|offering/.test(lower)) features.push('services');
  if (/dark|night|black/.test(lower)) features.push('dark-mode');
  if (/animation|animate|motion|scroll/.test(lower)) features.push('animations');
  if (/responsive|mobile/.test(lower)) features.push('responsive');
  if (/seo|meta/.test(lower)) features.push('seo');

  let colorScheme: 'light' | 'dark' | 'auto' = 'auto';
  if (/dark|night|black/.test(lower)) colorScheme = 'dark';
  else if (/light|bright|clean|white/.test(lower)) colorScheme = 'light';

  let industry = 'general';
  if (/tech|software|developer|coding/.test(lower)) industry = 'tech';
  else if (/food|restaurant|cafe|chef/.test(lower)) industry = 'food';
  else if (/fashion|clothing|style/.test(lower)) industry = 'fashion';
  else if (/health|medical|doctor|clinic/.test(lower)) industry = 'health';
  else if (/finance|bank|invest|crypto/.test(lower)) industry = 'finance';
  else if (/education|learn|course|school/.test(lower)) industry = 'education';
  else if (/travel|hotel|tourism/.test(lower)) industry = 'travel';
  else if (/fitness|gym|sport|yoga/.test(lower)) industry = 'fitness';

  return { intent, template, features, colorScheme, industry };
}

// ─── Color Palette Generator ───────────────────────────────────────

interface ColorPalette {
  primary: string;
  primaryHover: string;
  secondary: string;
  accent: string;
  bg: string;
  bgAlt: string;
  surface: string;
  surfaceHover: string;
  text: string;
  textMuted: string;
  border: string;
  gradient: string;
}

const PALETTES: Record<string, ColorPalette> = {
  indigo: {
    primary: '#6366F1', primaryHover: '#818CF8', secondary: '#EC4899', accent: '#F59E0B',
    bg: '#FFFFFF', bgAlt: '#F9FAFB', surface: '#F3F4F6', surfaceHover: '#E5E7EB',
    text: '#111827', textMuted: '#6B7280', border: '#E5E7EB',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
  },
  emerald: {
    primary: '#10B981', primaryHover: '#34D399', secondary: '#3B82F6', accent: '#F59E0B',
    bg: '#FFFFFF', bgAlt: '#F0FDF4', surface: '#ECFDF5', surfaceHover: '#D1FAE5',
    text: '#064E3B', textMuted: '#6B7280', border: '#D1FAE5',
    gradient: 'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)',
  },
  sunset: {
    primary: '#F97316', primaryHover: '#FB923C', secondary: '#EF4444', accent: '#8B5CF6',
    bg: '#FFFFFF', bgAlt: '#FFF7ED', surface: '#FFEDD5', surfaceHover: '#FED7AA',
    text: '#7C2D12', textMuted: '#9A3412', border: '#FED7AA',
    gradient: 'linear-gradient(135deg, #F97316 0%, #EF4444 100%)',
  },
  midnight: {
    primary: '#818CF8', primaryHover: '#A5B4FC', secondary: '#F472B6', accent: '#34D399',
    bg: '#0F172A', bgAlt: '#1E293B', surface: '#334155', surfaceHover: '#475569',
    text: '#F8FAFC', textMuted: '#94A3B8', border: '#334155',
    gradient: 'linear-gradient(135deg, #818CF8 0%, #F472B6 100%)',
  },
  rose: {
    primary: '#E11D48', primaryHover: '#FB7185', secondary: '#8B5CF6', accent: '#06B6D4',
    bg: '#FFFFFF', bgAlt: '#FFF1F2', surface: '#FFE4E6', surfaceHover: '#FECDD3',
    text: '#881337', textMuted: '#9F1239', border: '#FECDD3',
    gradient: 'linear-gradient(135deg, #E11D48 0%, #8B5CF6 100%)',
  },
};

function pickPalette(analysis: PromptAnalysis): ColorPalette {
  if (analysis.colorScheme === 'dark') return PALETTES.midnight;
  if (analysis.template === 'restaurant') return PALETTES.sunset;
  if (analysis.template === 'ecommerce') return PALETTES.emerald;
  if (analysis.template === 'agency') return PALETTES.rose;
  if (analysis.template === 'startup') return PALETTES.emerald;
  if (analysis.template === 'fitness') return PALETTES.sunset;
  if (analysis.template === 'photography') return PALETTES.midnight;
  if (analysis.template === 'realestate') return PALETTES.indigo;
  if (analysis.industry === 'health') return PALETTES.emerald;
  if (analysis.industry === 'finance') return PALETTES.indigo;
  return PALETTES.indigo;
}

// ─── Template Builders ─────────────────────────────────────────────

function htmlDoc(title: string, head: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${head}
</head>
<body>
${body}
  <script src="script.js"></script>
</body>
</html>`;
}

function navHTML(p: ColorPalette, links: string[]): string {
  const items = links.map(l => `      <li><a href="#${l.toLowerCase().replace(/\s+/g, '-')}">${l}</a></li>`).join('\n');
  return `  <nav class="navbar" style="background:${p.bg};border-bottom:1px solid ${p.border}">
    <div class="logo" style="color:${p.primary}">Site</div>
    <button class="menu-toggle" aria-label="Toggle menu">&#9776;</button>
    <ul class="nav-links">
${items}
    </ul>
  </nav>`;
}

function heroHTML(p: ColorPalette, title: string, subtitle: string, cta: string): string {
  return `  <section class="hero" style="background:${p.gradient}">
    <h1>${title}</h1>
    <p>${subtitle}</p>
    <a href="#contact" class="btn btn-primary" style="background:${p.bg};color:${p.primary}">${cta}</a>
  </section>`;
}

function footerHTML(p: ColorPalette): string {
  return `  <footer style="background:${p.bgAlt};border-top:1px solid ${p.border}">
    <p style="color:${p.textMuted}">&copy; ${new Date().getFullYear()} Site. All rights reserved.</p>
  </footer>`;
}

function cssReset(): string {
  return `*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
img{max-width:100%;display:block}
a{text-decoration:none}
ul{list-style:none}`;
}

function cssNavbar(p: ColorPalette): string {
  return `.navbar{display:flex;justify-content:space-between;align-items:center;padding:1rem clamp(1rem,5vw,4rem);position:sticky;top:0;z-index:100;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.logo{font-size:1.5rem;font-weight:800;letter-spacing:-.02em}
.nav-links{display:flex;gap:2rem;align-items:center}
.nav-links a{color:${p.textMuted};font-weight:500;font-size:.9rem;transition:color .2s}
.nav-links a:hover{color:${p.primary}}
.menu-toggle{display:none;background:none;border:none;font-size:1.5rem;cursor:pointer;color:${p.text}}
@media(max-width:768px){.menu-toggle{display:block}.nav-links{display:none;position:absolute;top:100%;left:0;right:0;background:${p.bg};flex-direction:column;padding:1rem;gap:1rem;border-bottom:1px solid ${p.border};box-shadow:0 4px 20px rgba(0,0,0,.1)}.nav-links.open{display:flex}}`;
}

function cssHero(p: ColorPalette): string {
  return `.hero{min-height:80vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:4rem clamp(1rem,5vw,4rem);color:#fff}
.hero h1{font-size:clamp(2.5rem,6vw,4.5rem);font-weight:800;letter-spacing:-.03em;line-height:1.1;max-width:800px;margin-bottom:1.5rem}
.hero p{font-size:clamp(1rem,2vw,1.25rem);opacity:.9;max-width:600px;margin-bottom:2.5rem}
.btn{display:inline-flex;align-items:center;gap:.5rem;padding:.875rem 2rem;border-radius:50px;font-weight:600;font-size:.95rem;transition:transform .2s,box-shadow .2s}
.btn:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(0,0,0,.2)}
.btn-primary{background:${p.bg};color:${p.primary}}`;
}

function cssSections(p: ColorPalette): string {
  return `section{padding:clamp(3rem,8vw,6rem) clamp(1rem,5vw,4rem)}
.section-title{text-align:center;font-size:clamp(1.75rem,4vw,2.75rem);font-weight:800;letter-spacing:-.02em;color:${p.text};margin-bottom:1rem}
.section-subtitle{text-align:center;color:${p.textMuted};max-width:600px;margin:0 auto 3rem;font-size:1.05rem}
.grid{display:grid;gap:1.5rem}
.grid-2{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.grid-3{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.grid-4{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}`;
}

function cssCard(p: ColorPalette): string {
  return `.card{background:${p.bg};border:1px solid ${p.border};border-radius:16px;padding:2rem;transition:transform .3s,box-shadow .3s}
.card:hover{transform:translateY(-4px);box-shadow:0 20px 40px rgba(0,0,0,.08)}
.card h3{font-size:1.15rem;font-weight:700;color:${p.text};margin-bottom:.5rem}
.card p{color:${p.textMuted};font-size:.95rem;line-height:1.6}
.card-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:1rem;background:${p.primary}15;color:${p.primary}}`;
}

function cssForm(p: ColorPalette): string {
  return `.contact-form{max-width:560px;margin:0 auto;display:flex;flex-direction:column;gap:1rem}
.contact-form input,.contact-form textarea,.contact-form select{padding:.875rem 1rem;border:1px solid ${p.border};border-radius:10px;background:${p.bg};color:${p.text};font-family:inherit;font-size:.95rem;transition:border-color .2s}
.contact-form input:focus,.contact-form textarea:focus{outline:none;border-color:${p.primary};box-shadow:0 0 0 3px ${p.primary}20}
.contact-form button{padding:.875rem;background:${p.primary};color:#fff;border:none;border-radius:10px;font-weight:600;font-size:.95rem;cursor:pointer;transition:background .2s}
.contact-form button:hover{background:${p.primaryHover}}`;
}

function cssFooter(p: ColorPalette): string {
  return `footer{text-align:center;padding:2rem;background:${p.bgAlt};border-top:1px solid ${p.border}}
footer p{font-size:.85rem}`;
}

function cssFAQ(p: ColorPalette): string {
  return `.faq-item{border:1px solid ${p.border};border-radius:12px;margin-bottom:1rem;overflow:hidden;background:${p.bg}}
.faq-question{padding:1.25rem 1.5rem;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;align-items:center;color:${p.text};transition:background .2s}
.faq-question:hover{background:${p.surface}}
.faq-answer{max-height:0;overflow:hidden;transition:max-height .3s ease,padding .3s ease;padding:0 1.5rem;color:${p.textMuted};line-height:1.6}
.faq-item.open .faq-answer{max-height:300px;padding:0 1.5rem 1.25rem}
.faq-item.open .faq-icon{transform:rotate(45deg)}`;
}

function cssTeam(p: ColorPalette): string {
  return `.team-card{text-align:center;padding:2rem;background:${p.bg};border:1px solid ${p.border};border-radius:16px;transition:transform .3s,box-shadow .3s}
.team-card:hover{transform:translateY(-4px);box-shadow:0 20px 40px rgba(0,0,0,.08)}
.team-avatar{width:96px;height:96px;border-radius:50%;margin:0 auto 1.25rem;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:700;color:#fff}
.team-card h3{font-size:1.1rem;font-weight:700;color:${p.text};margin-bottom:.25rem}
.team-card .role{font-size:.85rem;color:${p.primary};font-weight:500;margin-bottom:.75rem}
.team-card p{font-size:.9rem;color:${p.textMuted};line-height:1.5}`;
}

function cssGallery(_p: ColorPalette): string {
  return `.gallery-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem}
.gallery-item{aspect-ratio:1;border-radius:12px;overflow:hidden;position:relative;cursor:pointer;transition:transform .3s}
.gallery-item:hover{transform:scale(1.03)}
.gallery-item .overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.6),transparent);opacity:0;transition:opacity .3s;display:flex;align-items:flex-end;padding:1rem}
.gallery-item:hover .overlay{opacity:1}
.gallery-item .overlay span{color:#fff;font-weight:600;font-size:.9rem}`;
}

function cssAnimations(): string {
  return `@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
.fade-up{opacity:0;transform:translateY(24px);transition:opacity .6s ease,transform .6s ease}
.fade-up.visible{opacity:1;transform:translateY(0)}`;
}

function jsBase(): string {
  return `// Site-styled message dialog
function joyfulNotify(message){
  const existing=document.querySelector('.joyful-message');
  if(existing)existing.remove();
  const note=document.createElement('div');
  note.className='joyful-message';
  note.setAttribute('role','status');
  note.innerHTML='<div><strong>Success</strong><p></p></div><button type="button" aria-label="Dismiss">OK</button>';
  note.querySelector('p').textContent=message;
  note.querySelector('button').addEventListener('click',()=>note.remove());
  Object.assign(note.style,{
    position:'fixed',
    left:'50%',
    bottom:'24px',
    zIndex:'9999',
    display:'flex',
    alignItems:'center',
    gap:'18px',
    maxWidth:'min(420px,calc(100vw - 32px))',
    transform:'translateX(-50%)',
    padding:'16px',
    border:'1px solid rgba(255,255,255,.14)',
    borderRadius:'14px',
    background:'rgba(17,24,39,.96)',
    color:'#fff',
    boxShadow:'0 22px 70px rgba(0,0,0,.28)',
    fontFamily:'inherit'
  });
  Object.assign(note.querySelector('strong').style,{display:'block',fontSize:'14px',marginBottom:'3px'});
  Object.assign(note.querySelector('p').style,{margin:'0',fontSize:'14px',lineHeight:'1.4',color:'rgba(255,255,255,.75)'});
  Object.assign(note.querySelector('button').style,{border:'0',borderRadius:'10px',padding:'9px 14px',background:'#fff',color:'#111827',fontWeight:'700',cursor:'pointer'});
  document.body.appendChild(note);
  setTimeout(()=>note.remove(),4200);
}

// Mobile menu toggle
document.querySelectorAll('.menu-toggle').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const links=btn.nextElementSibling;
    if(links)links.classList.toggle('open');
  });
});

// Scroll animations
const obs=new IntersectionObserver((entries)=>{
  entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target)}});
},{threshold:.1,rootMargin:'0px 0px -50px 0px'});
document.querySelectorAll('.fade-up').forEach(el=>obs.observe(el));

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click',e=>{
    e.preventDefault();
    const t=document.querySelector(a.getAttribute('href'));
    if(t)t.scrollIntoView({behavior:'smooth',block:'start'});
  });
});`;
}

function extractRequestedPath(prompt: string): string | null {
  const quoted = prompt.match(/["'`](.{1,120}\.[a-z0-9]+)["'`]/i)?.[1];
  const direct = quoted || prompt.match(/\b([\w ./-]+\.(?:html|css|js|json|md|jsx|tsx))\b/i)?.[1];
  if (!direct) return null;
  const normalized = direct.trim().replace(/^\.\//, '').replace(/\s+/g, '-');
  if (normalized.includes('..') || normalized.startsWith('/') || !/^[/\w\-.]+$/.test(normalized)) return null;
  return normalized;
}

function starterContentForPath(path: string, prompt: string): string {
  const title = path.split('/').pop()?.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ') || 'New file';
  if (path.endsWith('.html')) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="page">
    <h1>${title.charAt(0).toUpperCase() + title.slice(1)}</h1>
    <p>${prompt.replace(/[<>]/g, '').slice(0, 180) || 'Add your content here.'}</p>
  </main>
</body>
</html>`;
  }
  if (path.endsWith('.css')) return `:root {\n  color-scheme: light;\n}\n\nbody {\n  margin: 0;\n  font-family: Inter, system-ui, sans-serif;\n}\n`;
  if (path.endsWith('.js')) return `// ${title}\nconsole.log('${title} loaded');\n`;
  if (path.endsWith('.json')) return `{\n  "name": "${title}",\n  "createdBy": "Joyful"\n}\n`;
  if (path.endsWith('.md')) return `# ${title.charAt(0).toUpperCase() + title.slice(1)}\n\nCreated from your Joyful prompt.\n`;
  return '';
}

function reactPackageJson(name = 'joyful-app'): string {
  return JSON.stringify({
    name,
    version: '1.0.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite --host 0.0.0.0',
      build: 'vite build',
      preview: 'vite preview --host 0.0.0.0',
    },
    dependencies: {
      '@vitejs/plugin-react': 'latest',
      vite: 'latest',
      react: 'latest',
      'react-dom': 'latest',
      'lucide-react': 'latest',
    },
    devDependencies: {},
  }, null, 2);
}

function reactViteConfig(): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
  },
});`;
}

function reactIndexHtml(title = 'Joyful React App'): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;
}

function reactMainFile(): string {
  return `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
}

function extractRoutePaths(prompt: string): string[] {
  const routes = new Set<string>();
  const matches = prompt.match(/\/[a-z0-9][a-z0-9_/-]*/gi) || [];
  for (const match of matches) {
    const clean = match.replace(/[,.;:!?]+$/g, '').replace(/\/+$/g, '') || '/';
    if (!clean.includes('//') && clean.length <= 80) routes.add(clean);
  }
  return Array.from(routes);
}

function buildReactTemplate(analysis: PromptAnalysis, prompt = ''): AIGenerationResponse {
  const p = pickPalette(analysis);
  const configs: Record<string, {
    title: string;
    eyebrow: string;
    description: string;
    cta: string;
    nav: string[];
    stats: [string, string, string][];
    cards: [string, string, string][];
    visual: string;
  }> = {
    portfolio: {
      title: 'Alex Chen Studio',
      eyebrow: 'Independent designer and developer',
      description: 'A refined portfolio for presenting signature projects, capabilities, and a calm path to contact.',
      cta: 'View selected work',
      nav: ['Work', 'Profile', 'Contact'],
      stats: [['12', 'featured projects', '+34% inquiries'], ['8', 'years shipped', 'product-led'], ['4.9', 'client rating', '32 reviews']],
      cards: [
        ['Nova Analytics', 'A data product redesign with executive dashboards and faster workflows.', 'Case study'],
        ['Morrow Brand System', 'A flexible identity kit with responsive web components.', 'Identity'],
        ['Orbit Mobile', 'A launch-ready app experience for subscription teams.', 'Product'],
      ],
      visual: 'portfolio',
    },
    saas: {
      title: 'LaunchLayer',
      eyebrow: 'SaaS launch platform',
      description: 'A conversion-focused product page with feature proof, pricing, and the confidence signals buyers expect.',
      cta: 'Start free trial',
      nav: ['Features', 'Pricing', 'Customers'],
      stats: [['42%', 'faster onboarding', 'median lift'], ['18k', 'teams onboarded', 'active'], ['99.98%', 'uptime', 'last 90 days']],
      cards: [
        ['Pipeline Builder', 'Turn launches into repeatable workflows with owners, approvals, and release notes.', 'Core'],
        ['Revenue Signals', 'Spot expansion accounts and trial risk before they affect the quarter.', 'Growth'],
        ['Team Rooms', 'Bring sales, product, and success into one launch surface.', 'Collab'],
      ],
      visual: 'saas',
    },
    ecommerce: {
      title: 'Luma Market',
      eyebrow: 'Curated commerce storefront',
      description: 'A polished store experience with product highlights, trust badges, and a clear buying path.',
      cta: 'Browse collection',
      nav: ['Products', 'Stories', 'Reviews'],
      stats: [['4.8', 'store rating', '2k+ reviews'], ['24h', 'dispatch window', 'most orders'], ['30d', 'easy returns', 'no hassle']],
      cards: [
        ['Arc Travel Tote', 'Structured recycled canvas with weather-safe finishing.', '$148'],
        ['Core Desk Lamp', 'Warm dimmable light with sculptural aluminum details.', '$96'],
        ['Everyday Runner', 'Lightweight knit upper with a responsive recycled sole.', '$132'],
      ],
      visual: 'commerce',
    },
    blog: {
      title: 'The Daily Thought',
      eyebrow: 'Editorial journal',
      description: 'A readable content home for essays, categories, featured authors, and newsletter growth.',
      cta: 'Read latest',
      nav: ['Essays', 'Topics', 'Newsletter'],
      stats: [['84', 'published essays', 'curated'], ['36k', 'monthly readers', 'organic'], ['12', 'topic guides', 'evergreen']],
      cards: [
        ['The Art of Slow Living', 'A grounded guide to designing calmer routines and better defaults.', '6 min read'],
        ['Systems for Creative Work', 'How small rituals keep editorial teams moving without chaos.', '8 min read'],
        ['Notes on Better Tools', 'A field guide to choosing software that disappears into the work.', '5 min read'],
      ],
      visual: 'blog',
    },
    dashboard: {
      title: 'Revenue Command',
      eyebrow: 'Executive analytics dashboard',
      description: 'A dense admin surface with metrics, trends, reports, and filters built for repeated daily use.',
      cta: 'Create report',
      nav: ['Overview', 'Reports', 'Forecast'],
      stats: [['$482k', 'monthly revenue', '+12.5%'], ['18.4k', 'active users', '+8.3%'], ['3.8%', 'conversion rate', '+0.7%']],
      cards: [
        ['North America', 'Pipeline rose after the partner channel campaign.', '+18%'],
        ['Enterprise Trials', 'High-value accounts moving through onboarding.', '42 open'],
        ['Retention Watch', 'Three cohorts need success follow-up this week.', 'Action'],
      ],
      visual: 'dashboard',
    },
    restaurant: {
      title: 'Maison Rue',
      eyebrow: 'Seasonal dining room',
      description: 'A premium restaurant page with menu storytelling, reservation intent, and warm hospitality cues.',
      cta: 'Reserve a table',
      nav: ['Menu', 'Story', 'Reservations'],
      stats: [['4.9', 'guest rating', 'local favorite'], ['12', 'seasonal plates', 'tonight'], ['7pm', 'prime seating', 'limited']],
      cards: [
        ['Seared Scallops', 'Brown butter, citrus, and garden herbs over parsnip silk.', '$32'],
        ['Wild Mushroom Risotto', 'Carnaroli rice, aged parmesan, and black garlic.', '$28'],
        ['Citrus Pavlova', 'Meringue, lemon curd, blood orange, and mint.', '$14'],
      ],
      visual: 'restaurant',
    },
    agency: {
      title: 'Northstar Studio',
      eyebrow: 'Creative agency',
      description: 'A sharp agency site for services, selected work, process, and high-intent project inquiries.',
      cta: 'Start a project',
      nav: ['Services', 'Work', 'Process'],
      stats: [['64', 'brands launched', 'global'], ['9', 'award wins', 'recent'], ['3.2x', 'average lift', 'tracked']],
      cards: [
        ['Nexus Rebrand', 'A complete brand system for a platform moving upmarket.', 'Identity'],
        ['FinFlow Mobile', 'A banking app refresh focused on trust and speed.', 'Product'],
        ['Summit Campaign', 'A launch campaign with motion, social, and landing pages.', 'Growth'],
      ],
      visual: 'agency',
    },
    event: {
      title: 'FutureStack Summit',
      eyebrow: 'Conference experience',
      description: 'A high-energy event page with schedule, speaker proof, sponsors, and registration urgency.',
      cta: 'Register now',
      nav: ['Schedule', 'Speakers', 'Tickets'],
      stats: [['2', 'conference days', 'June 15-16'], ['36', 'expert speakers', 'confirmed'], ['900+', 'builders attending', 'limited seats']],
      cards: [
        ['Opening Keynote', 'Product leaders on what durable AI workflows need next.', '9:30 AM'],
        ['Design Systems Lab', 'A hands-on session for component quality at scale.', '1:00 PM'],
        ['Founder Panel', 'Operators share launch lessons from fast-growing teams.', '4:15 PM'],
      ],
      visual: 'event',
    },
    photography: {
      title: 'Mira Vale Photo',
      eyebrow: 'Editorial photography',
      description: 'A cinematic portfolio for galleries, services, image categories, and booking inquiries.',
      cta: 'Explore gallery',
      nav: ['Gallery', 'Services', 'Booking'],
      stats: [['128', 'published images', 'selected'], ['14', 'editorial shoots', 'this year'], ['6', 'print collections', 'available']],
      cards: [
        ['Quiet Coast', 'Muted shoreline portraits captured at blue hour.', 'Editorial'],
        ['Studio Light', 'A controlled portrait series with soft sculptural contrast.', 'Portrait'],
        ['City Frames', 'Architectural fragments and street-level movement.', 'Urban'],
      ],
      visual: 'photography',
    },
    startup: {
      title: 'SignalPilot',
      eyebrow: 'Early access startup',
      description: 'A modern startup landing page with problem framing, product proof, and a focused waitlist path.',
      cta: 'Join waitlist',
      nav: ['Problem', 'Solution', 'Proof'],
      stats: [['2.4k', 'waitlist signups', '+31% week'], ['11', 'pilot teams', 'active'], ['4 min', 'setup time', 'median']],
      cards: [
        ['Detect Drift', 'Catch customer risk before it turns into churn.', 'Insight'],
        ['Prioritize Work', 'Rank opportunities by revenue, effort, and urgency.', 'Focus'],
        ['Sync Teams', 'Turn scattered notes into one operating view.', 'Action'],
      ],
      visual: 'startup',
    },
    fitness: {
      title: 'Forge Fit Club',
      eyebrow: 'Training and membership',
      description: 'An energetic fitness site with class schedules, trainers, memberships, and transformation proof.',
      cta: 'Book a class',
      nav: ['Classes', 'Trainers', 'Plans'],
      stats: [['42', 'weekly classes', 'all levels'], ['8', 'expert trainers', 'certified'], ['1.8k', 'member check-ins', 'monthly']],
      cards: [
        ['Strength Circuit', 'Progressive lifts, coaching cues, and team energy.', 'Mon 6 AM'],
        ['Mobility Flow', 'Recovery-focused movement for desk-heavy weeks.', 'Wed 7 PM'],
        ['HIIT Engine', 'Intervals built around endurance, power, and form.', 'Sat 9 AM'],
      ],
      visual: 'fitness',
    },
    realestate: {
      title: 'Atlas Realty',
      eyebrow: 'Property search experience',
      description: 'A property listing site with agent trust, search filters, featured homes, and buyer actions.',
      cta: 'View listings',
      nav: ['Listings', 'Agents', 'Valuation'],
      stats: [['248', 'active listings', 'updated today'], ['$1.2M', 'median home', 'west side'], ['18d', 'avg. close time', 'last quarter']],
      cards: [
        ['Cedar House', 'Four-bedroom hillside home with glass walls and a garden deck.', '$1.48M'],
        ['Market Loft', 'Converted warehouse residence near transit and cafes.', '$820k'],
        ['Harbor Villa', 'Waterfront retreat with private dock and guest suite.', '$2.1M'],
      ],
      visual: 'realestate',
    },
    webapp: {
      title: 'Operations Command',
      eyebrow: 'Application workspace',
      description: 'A focused internal tool for owners, status, priority, and delivery risk.',
      cta: 'New item',
      nav: ['Overview', 'Pipeline', 'Tasks'],
      stats: [['28', 'open work items', 'active'], ['12', 'ready to ship', 'reviewed'], ['94%', 'portfolio health', 'strong']],
      cards: [
        ['Customer Portal', 'Finalize onboarding permissions and billing states.', 'High'],
        ['Partner Analytics', 'QA dashboard filters and export behavior.', 'Medium'],
        ['Help Center', 'Migrate evergreen docs into the new IA.', 'Low'],
      ],
      visual: 'dashboard',
    },
  };

  const config = configs[analysis.template] ?? configs.portfolio;
  const previewRoutes = Array.from(new Set(['/', ...extractRoutePaths(prompt)]));
  const initialItems = config.cards.map(([name, body, meta], index) => ({
    id: index + 1,
    name,
    body,
    meta,
    status: index === 0 ? 'Active' : index === 1 ? 'Review' : 'Ready',
    priority: index === 0 ? 'High' : index === 1 ? 'Medium' : 'Low',
  }));

  const app = `import React, { useMemo, useState } from 'react';

const initialItems = ${JSON.stringify(initialItems, null, 2)};
const stats = ${JSON.stringify(config.stats, null, 2)};
const navItems = ${JSON.stringify(config.nav)};
const previewRoutes = ${JSON.stringify(previewRoutes)};

export default function App() {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState('All');

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      const matchesStatus = activeStatus === 'All' || item.status === activeStatus;
      const matchesQuery = [item.name, item.body, item.meta].join(' ').toLowerCase().includes(query.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [activeStatus, items, query]);

  const addItem = () => {
    const nextId = Math.max(...items.map((item) => item.id)) + 1;
    setItems((current) => [
      {
        id: nextId,
        name: 'New ${config.visual} item',
        body: 'Edit this card or ask Joyful to replace it with real content and behavior.',
        meta: 'Draft',
        status: 'Active',
        priority: 'High',
      },
      ...current,
    ]);
  };

  return (
    <main className="app">
      <aside className="sidebar">
        <div className="brand">${config.title.charAt(0)}</div>
        {navItems.map((item, index) => (
          <button key={item} data-preview-path={previewRoutes[index] || '/'} className={index === 0 ? 'nav active' : 'nav'}>{item}</button>
        ))}
      </aside>

      <section className="workspace">
        <header className="hero">
          <div>
            <p className="eyebrow">${config.eyebrow}</p>
            <h1>${config.title}</h1>
            <p>${config.description}</p>
          </div>
          <button onClick={addItem} className="primary">${config.cta}</button>
          <div className="hero-visual ${config.visual}" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        </header>

        <section className="stats">
          {stats.map(([value, label, delta]) => (
            <article key={label}><strong>{value}</strong><span>{label}</span><small>{delta}</small></article>
          ))}
        </section>

        <section className="toolbar">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this template..." />
          <div className="segments">
            {['All', 'Active', 'Review', 'Ready'].map((status) => (
              <button key={status} onClick={() => setActiveStatus(status)} className={activeStatus === status ? 'selected' : ''}>
                {status}
              </button>
            ))}
          </div>
        </section>

        <section className="grid">
          {visibleItems.map((item) => (
            <article key={item.id} className="card">
              <div className="card-top">
                <span className={'priority ' + item.priority}>{item.priority}</span>
                <span>{item.status}</span>
              </div>
              <h2>{item.name}</h2>
              <p>{item.body}</p>
              <footer>{item.meta}</footer>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}`;

  const css = `:root {
  color-scheme: light;
  --primary: ${p.primary};
  --primary-hover: ${p.primaryHover};
  --bg: ${p.bg};
  --surface: ${p.bgAlt};
  --secondary: ${p.secondary};
  --text: ${p.text};
  --muted: ${p.textMuted};
  --border: ${p.border};
  --gradient: ${p.gradient};
}

* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: radial-gradient(circle at top left, ${p.primary}22, transparent 34rem), linear-gradient(135deg, var(--surface), var(--bg)); color: var(--text); }
button, input { font: inherit; }
.app { min-height: 100vh; display: grid; grid-template-columns: 96px minmax(0, 1fr); }
.sidebar { border-right: 1px solid var(--border); background: rgba(255,255,255,.76); backdrop-filter: blur(18px); padding: 1rem; display: flex; flex-direction: column; align-items: center; gap: .75rem; }
.brand { width: 48px; height: 48px; border-radius: 16px; display: grid; place-items: center; margin-bottom: 1rem; background: ${p.gradient}; color: white; font-weight: 900; box-shadow: 0 16px 40px rgba(99,102,241,.25); }
.nav { width: 100%; border: 0; border-radius: 12px; padding: .75rem .25rem; background: transparent; color: var(--muted); font-size: .76rem; font-weight: 800; cursor: pointer; }
.nav.active, .nav:hover { background: white; color: var(--primary); box-shadow: 0 8px 24px rgba(15,23,42,.08); }
.workspace { min-width: 0; padding: clamp(1rem, 3vw, 2rem); display: grid; gap: 1rem; }
.hero { position: relative; overflow: hidden; display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(220px, .5fr); gap: 1rem; align-items: center; border: 1px solid var(--border); background: rgba(255,255,255,.88); border-radius: 24px; padding: clamp(1.2rem, 3vw, 2.4rem); box-shadow: 0 24px 80px rgba(15,23,42,.10); }
.eyebrow { margin: 0 0 .55rem; color: var(--primary); font-size: .72rem; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
h1 { margin: 0; font-size: clamp(2.15rem, 5vw, 4.5rem); line-height: 1; letter-spacing: -.04em; }
.hero p:not(.eyebrow) { max-width: 680px; color: var(--muted); line-height: 1.7; }
.primary { border: 0; border-radius: 14px; background: var(--primary); color: white; padding: .9rem 1.1rem; font-weight: 900; cursor: pointer; white-space: nowrap; }
.primary:hover { background: var(--primary-hover); }
.hero-visual { min-height: 190px; border-radius: 22px; border: 1px solid var(--border); background: linear-gradient(135deg, white, var(--surface)); box-shadow: inset 0 1px 0 rgba(255,255,255,.8), 0 18px 48px rgba(15,23,42,.10); padding: 1rem; display: grid; gap: .65rem; }
.hero-visual span { display: block; border-radius: 14px; background: var(--gradient); opacity: .9; }
.hero-visual span:nth-child(1) { height: 38px; width: 72%; }
.hero-visual span:nth-child(2) { height: 70px; width: 100%; opacity: .22; }
.hero-visual span:nth-child(3), .hero-visual span:nth-child(4) { height: 42px; width: 48%; display: inline-block; }
.hero-visual.commerce, .hero-visual.realestate, .hero-visual.photography { grid-template-columns: repeat(2, 1fr); }
.hero-visual.commerce span, .hero-visual.realestate span, .hero-visual.photography span { width: 100%; height: auto; min-height: 70px; }
.hero-visual.dashboard span:nth-child(2), .hero-visual.saas span:nth-child(2), .hero-visual.startup span:nth-child(2) { background: linear-gradient(90deg, var(--primary), var(--secondary, ${p.secondary})); opacity: .35; }
.hero-visual.restaurant { background: radial-gradient(circle at 72% 36%, ${p.accent}44, transparent 7rem), linear-gradient(135deg, white, var(--surface)); }
.hero-visual.fitness span { transform: skewX(-8deg); }
.stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
.stats article, .card, .toolbar { border: 1px solid var(--border); background: rgba(255,255,255,.88); border-radius: 18px; box-shadow: 0 18px 50px rgba(15,23,42,.08); }
.stats article { padding: 1rem; }
.stats span, .stats small, .card-top, .card footer { color: var(--muted); font-size: .82rem; }
.stats strong { display: block; font-size: 2rem; color: var(--text); }
.stats small { display: block; margin-top: .35rem; color: var(--primary); font-weight: 800; }
.toolbar { display: flex; justify-content: space-between; gap: .75rem; padding: .75rem; }
.toolbar input { min-width: min(100%, 320px); border: 1px solid var(--border); border-radius: 12px; padding: .8rem 1rem; }
.segments { display: flex; gap: .35rem; border: 1px solid var(--border); border-radius: 14px; padding: .3rem; background: var(--surface); }
.segments button { border: 0; background: transparent; border-radius: 10px; padding: .55rem .75rem; color: var(--muted); font-weight: 800; cursor: pointer; }
.segments button.selected { background: var(--primary); color: white; }
.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
.card { padding: 1rem; min-height: 210px; display: flex; flex-direction: column; position: relative; overflow: hidden; }
.card::before { content: ""; position: absolute; inset: 0 0 auto; height: 4px; background: var(--gradient); opacity: .85; }
.card-top { display: flex; justify-content: space-between; gap: 1rem; }
.priority { border-radius: 999px; padding: .25rem .55rem; font-weight: 900; font-size: .7rem; }
.High { background: #fee2e2; color: #b91c1c; }
.Medium { background: #fef3c7; color: #92400e; }
.Low { background: #dcfce7; color: #166534; }
.card h2 { margin: 1rem 0 .45rem; }
.card p { color: var(--muted); line-height: 1.65; }
.card footer { margin-top: auto; border-top: 1px solid var(--border); padding-top: .9rem; font-weight: 800; }
@media (max-width: 980px) { .app { grid-template-columns: 1fr; } .sidebar { position: sticky; top: 0; z-index: 10; flex-direction: row; justify-content: space-between; } .sidebar .nav { width: auto; padding: .7rem .8rem; } .hero { grid-template-columns: 1fr; } .primary { width: fit-content; } .stats, .grid { grid-template-columns: 1fr; } .toolbar { flex-direction: column; } }
@media (max-width: 640px) { .sidebar { overflow-x: auto; justify-content: flex-start; } .hero-visual { min-height: 150px; } .segments { overflow-x: auto; } }`;

  return {
    files: [
      { path: 'package.json', content: reactPackageJson(config.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')), action: 'create' },
      { path: 'index.html', content: reactIndexHtml(config.title), action: 'create' },
      { path: 'src/main.jsx', content: reactMainFile(), action: 'create' },
      { path: 'src/App.jsx', content: app, action: 'create' },
      { path: 'src/styles.css', content: css, action: 'create' },
      { path: 'vite.config.js', content: reactViteConfig(), action: 'create' },
      { path: 'README.md', content: `# ${config.title}\n\nReact/Vite project generated by Joyful.\n\n- Edit \`src/App.jsx\` for app logic.\n- Edit \`src/styles.css\` for styling.\n- Preview runs in Joyful's local iframe sandbox.\n`, action: 'create' },
    ],
    summary: `Created a polished React/Vite ${analysis.template} template with stateful filtering, tailored content, responsive layout, and a framework-ready file structure.`,
    nextSteps: ['Split UI into components', 'Add routing', 'Connect API data', 'Add tests'],
    metadata: { template: analysis.template, sections: ['react-app', 'state', 'responsive-ui'], estimatedComplexity: analysis.template === 'webapp' ? 'complex' : 'medium' },
  };
}

// ─── Full Template Builders ────────────────────────────────────────

function buildPortfolio(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);
  const sections = ['hero', 'about', 'projects', 'contact'];

  const html = htmlDoc('Creative Portfolio',
    `<link rel="stylesheet" href="style.css">`,
    `${navHTML(p, ['About', 'Projects', 'Contact'])}
${heroHTML(p, 'Hello, I\'m a Creator', 'I craft digital experiences that blend beauty with function.', 'View My Work')}
  <section id="about" class="fade-up" style="background:${p.bgAlt}">
    <h2 class="section-title">About Me</h2>
    <p class="section-subtitle">Passionate about creating elegant solutions to complex problems.</p>
    <div class="grid grid-3">
      <div class="card"><div class="card-icon">&#9998;</div><h3>Design</h3><p>Creating intuitive interfaces that users love.</p></div>
      <div class="card"><div class="card-icon">&#60;/&#62;</div><h3>Development</h3><p>Building robust, scalable web applications.</p></div>
      <div class="card"><div class="card-icon">&#9889;</div><h3>Performance</h3><p>Optimizing for speed and accessibility.</p></div>
    </div>
  </section>
  <section id="projects" class="fade-up">
    <h2 class="section-title">Featured Work</h2>
    <p class="section-subtitle">A selection of recent projects I'm proud of.</p>
    <div class="grid grid-3">
      <div class="card"><div class="card-icon">&#127912;</div><h3>Brand Identity</h3><p>Complete visual identity for a tech startup.</p></div>
      <div class="card"><div class="card-icon">&#128241;</div><h3>Mobile App</h3><p>Cross-platform app with 50k+ downloads.</p></div>
      <div class="card"><div class="card-icon">&#127760;</div><h3>Web Platform</h3><p>SaaS dashboard serving 10k daily users.</p></div>
    </div>
  </section>
  <section id="contact" class="fade-up" style="background:${p.bgAlt}">
    <h2 class="section-title">Get In Touch</h2>
    <p class="section-subtitle">Have a project in mind? Let's talk.</p>
    <form class="contact-form">
      <input type="text" placeholder="Your Name" required>
      <input type="email" placeholder="Your Email" required>
      <textarea rows="5" placeholder="Tell me about your project..." required></textarea>
      <button type="submit">Send Message</button>
    </form>
  </section>
${footerHTML(p)}`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssForm(p), cssFooter(p), cssAnimations()].join('\n');
  const js = jsBase() + `\n\ndocument.querySelector('.contact-form')?.addEventListener('submit',e=>{\n  e.preventDefault();\n  joyfulNotify('Thanks! I\\'ll get back to you soon.');\n  e.target.reset();\n});`;

  return {
    files: [{ path: 'index.html', content: html }, { path: 'style.css', content: css }, { path: 'script.js', content: js }],
    summary: `Built a ${p.bg === '#0F172A' ? 'dark' : 'light'}-themed portfolio with hero, about, projects, and contact form sections.`,
    nextSteps: ['Add real project images', 'Connect contact form to backend', 'Add testimonials section', 'Customize colors'],
    metadata: { template: 'portfolio', sections, estimatedComplexity: 'simple' },
  };
}

function buildSaaS(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);
  const sections = ['hero', 'features', 'pricing', 'testimonials', 'cta'];

  const html = htmlDoc('SaaS Product',
    `<link rel="stylesheet" href="style.css">`,
    `${navHTML(p, ['Features', 'Pricing', 'Testimonials'])}
${heroHTML(p, 'Ship Faster, Scale Smarter', 'The all-in-one platform for modern teams.', 'Start Free Trial')}
  <section id="features" class="fade-up">
    <h2 class="section-title">Everything You Need</h2>
    <p class="section-subtitle">Powerful tools designed for modern teams.</p>
    <div class="grid grid-3">
      <div class="card"><div class="card-icon">&#9889;</div><h3>Lightning Fast</h3><p>Sub-second load times with edge caching.</p></div>
      <div class="card"><div class="card-icon">&#128274;</div><h3>Enterprise Security</h3><p>SOC 2 compliant with end-to-end encryption.</p></div>
      <div class="card"><div class="card-icon">&#128640;</div><h3>Auto Scaling</h3><p>Handles traffic spikes automatically.</p></div>
      <div class="card"><div class="card-icon">&#128202;</div><h3>Analytics</h3><p>Real-time performance insights.</p></div>
      <div class="card"><div class="card-icon">&#127912;</div><h3>Team Collab</h3><p>Built-in tools for seamless teamwork.</p></div>
      <div class="card"><div class="card-icon">&#128295;</div><h3>API First</h3><p>RESTful API with comprehensive docs.</p></div>
    </div>
  </section>
  <section id="pricing" class="fade-up" style="background:${p.bgAlt}">
    <h2 class="section-title">Simple Pricing</h2>
    <p class="section-subtitle">Start free, upgrade when ready.</p>
    <div class="grid grid-3">
      <div class="card" style="text-align:center"><h3>Starter</h3><div style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:1rem 0">$0</div><p>For side projects</p><a href="#" class="btn" style="margin-top:1rem;width:100%;justify-content:center;border:1px solid ${p.border};color:${p.text}">Get Started</a></div>
      <div class="card" style="text-align:center;border-color:${p.primary};position:relative"><span style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:${p.primary};color:#fff;padding:4px 16px;border-radius:20px;font-size:.75rem;font-weight:600">Popular</span><h3>Pro</h3><div style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:1rem 0">$29<span style="font-size:1rem;font-weight:400;color:${p.textMuted}">/mo</span></div><p>For growing teams</p><a href="#" class="btn" style="margin-top:1rem;width:100%;justify-content:center;background:${p.primary};color:#fff">Start Free Trial</a></div>
      <div class="card" style="text-align:center"><h3>Enterprise</h3><div style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:1rem 0">Custom</div><p>For large orgs</p><a href="#" class="btn" style="margin-top:1rem;width:100%;justify-content:center;border:1px solid ${p.border};color:${p.text}">Contact Sales</a></div>
    </div>
  </section>
  <section id="testimonials" class="fade-up">
    <h2 class="section-title">Loved by Teams</h2>
    <div class="grid grid-3">
      <div class="card"><p style="font-style:italic;margin-bottom:1rem">"This tool transformed our workflow. We ship 3x faster now."</p><p style="font-weight:600;color:${p.text}">Sarah Chen</p><p style="font-size:.85rem">CTO, TechCorp</p></div>
      <div class="card"><p style="font-style:italic;margin-bottom:1rem">"The best developer experience I've encountered in years."</p><p style="font-weight:600;color:${p.text}">Mike Johnson</p><p style="font-size:.85rem">Lead Dev, StartupXYZ</p></div>
      <div class="card"><p style="font-style:italic;margin-bottom:1rem">"Setup took 5 minutes. Scaled to millions effortlessly."</p><p style="font-weight:600;color:${p.text}">Lisa Park</p><p style="font-size:.85rem">VP Eng, ScaleUp</p></div>
    </div>
  </section>
  <section class="fade-up" style="text-align:center;background:${p.gradient};color:#fff;padding:5rem 2rem">
    <h2 style="font-size:clamp(1.75rem,4vw,2.5rem);font-weight:800;margin-bottom:1rem">Ready to Get Started?</h2>
    <p style="opacity:.9;max-width:500px;margin:0 auto 2rem">Join thousands of teams already building with us.</p>
    <a href="#" class="btn" style="background:#fff;color:${p.primary}">Start Free Trial</a>
  </section>
${footerHTML(p)}`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssFooter(p), cssAnimations()].join('\n');

  return {
    files: [{ path: 'index.html', content: html }, { path: 'style.css', content: css }, { path: 'script.js', content: jsBase() }],
    summary: 'Created a SaaS landing page with features grid, 3-tier pricing, testimonials, and CTA section.',
    nextSteps: ['Add monthly/annual pricing toggle', 'Add FAQ section', 'Integrate payment provider', 'Add more testimonials'],
    metadata: { template: 'saas', sections, estimatedComplexity: 'medium' },
  };
}

function buildRestaurant(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);
  const sections = ['hero', 'menu', 'about', 'reservations'];

  const html = htmlDoc('Restaurant',
    `<link rel="stylesheet" href="style.css">`,
    `${navHTML(p, ['Menu', 'About', 'Reservations'])}
${heroHTML(p, 'Taste the Difference', 'Farm-to-table dining in the heart of the city.', 'View Menu')}
  <section id="menu" class="fade-up">
    <h2 class="section-title">Our Menu</h2>
    <p class="section-subtitle">Seasonal ingredients, timeless flavors.</p>
    <div class="grid grid-2">
      <div class="card"><div class="card-icon">&#127837;</div><h3>Starters</h3><p>Fresh garden salad, artisan bread, seasonal soup.</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">From $12</p></div>
      <div class="card"><div class="card-icon">&#127830;</div><h3>Mains</h3><p>Grilled salmon, grass-fed steak, wild mushroom risotto.</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">From $28</p></div>
      <div class="card"><div class="card-icon">&#127856;</div><h3>Desserts</h3><p>Creme brulee, chocolate fondant, fruit tart.</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">From $14</p></div>
      <div class="card"><div class="card-icon">&#127863;</div><h3>Drinks</h3><p>Curated wine list, craft cocktails, local beers.</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">From $8</p></div>
    </div>
  </section>
  <section id="about" class="fade-up" style="background:${p.bgAlt}">
    <h2 class="section-title">Our Story</h2>
    <p class="section-subtitle">Since 2015, serving the community with passion and dedication.</p>
    <div class="grid grid-3">
      <div class="card" style="text-align:center"><div style="font-size:2rem;font-weight:800;color:${p.primary}">9+</div><p>Years of Service</p></div>
      <div class="card" style="text-align:center"><div style="font-size:2rem;font-weight:800;color:${p.primary}">50k+</div><p>Happy Guests</p></div>
      <div class="card" style="text-align:center"><div style="font-size:2rem;font-weight:800;color:${p.primary}">4.9</div><p>Star Rating</p></div>
    </div>
  </section>
  <section id="reservations" class="fade-up">
    <h2 class="section-title">Reserve a Table</h2>
    <form class="contact-form">
      <input type="text" placeholder="Your Name" required>
      <input type="email" placeholder="Email" required>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem"><input type="date" required><input type="time" required></div>
      <select required><option value="">Party Size</option><option>1-2 guests</option><option>3-4 guests</option><option>5-6 guests</option><option>7+ guests</option></select>
      <button type="submit">Reserve Now</button>
    </form>
  </section>
${footerHTML(p)}`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssForm(p), cssFooter(p), cssAnimations()].join('\n');
  const js = jsBase() + `\n\ndocument.querySelector('.contact-form')?.addEventListener('submit',e=>{\n  e.preventDefault();\n  joyfulNotify('Reservation confirmed!');\n  e.target.reset();\n});`;

  return {
    files: [{ path: 'index.html', content: html }, { path: 'style.css', content: css }, { path: 'script.js', content: js }],
    summary: 'Built a restaurant site with menu, story section with stats, and reservation form.',
    nextSteps: ['Add food photography', 'Integrate reservation system', 'Add Google Maps', 'Add wine list'],
    metadata: { template: 'restaurant', sections, estimatedComplexity: 'simple' },
  };
}

function buildEcommerce(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);
  const sections = ['hero', 'products', 'features', 'cta'];

  const html = htmlDoc('Shop',
    `<link rel="stylesheet" href="style.css">`,
    `${navHTML(p, ['Products', 'Features'])}
${heroHTML(p, 'Curated Collections', 'Premium products crafted for modern living.', 'Shop Now')}
  <section id="products" class="fade-up">
    <h2 class="section-title">Featured Products</h2>
    <div class="grid grid-4">
      <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:1;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#128091;</div><div style="padding:1.25rem"><h3>Leather Bag</h3><p style="font-size:.85rem">Handcrafted premium leather</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">$189</p></div></div>
      <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:1;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#8986;</div><div style="padding:1.25rem"><h3>Classic Watch</h3><p style="font-size:.85rem">Swiss movement, minimalist</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">$349</p></div></div>
      <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:1;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#128085;</div><div style="padding:1.25rem"><h3>Wool Jacket</h3><p style="font-size:.85rem">Sustainable merino blend</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">$275</p></div></div>
      <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:1;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#128092;</div><div style="padding:1.25rem"><h3>Sneakers</h3><p style="font-size:.85rem">Limited edition colorway</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">$145</p></div></div>
    </div>
  </section>
  <section class="fade-up" style="background:${p.bgAlt}">
    <h2 class="section-title">Why Shop With Us</h2>
    <div class="grid grid-3">
      <div class="card"><div class="card-icon">&#128666;</div><h3>Free Shipping</h3><p>On all orders over $75.</p></div>
      <div class="card"><div class="card-icon">&#128260;</div><h3>Easy Returns</h3><p>30-day hassle-free returns.</p></div>
      <div class="card"><div class="card-icon">&#128274;</div><h3>Secure Checkout</h3><p>256-bit SSL encryption.</p></div>
    </div>
  </section>
  <section class="fade-up" style="text-align:center;background:${p.gradient};color:#fff;padding:5rem 2rem">
    <h2 style="font-size:clamp(1.75rem,4vw,2.5rem);font-weight:800;margin-bottom:1rem">New Arrivals Weekly</h2>
    <p style="opacity:.9;margin-bottom:2rem">Subscribe for early access and 10% off your first order.</p>
    <form style="display:flex;gap:.5rem;max-width:400px;margin:0 auto">
      <input type="email" placeholder="Your email" required style="flex:1;border-radius:50px;padding:.75rem 1.25rem;border:1px solid ${p.border};background:${p.bg};color:${p.text}">
      <button type="submit" class="btn" style="border-radius:50px;background:#fff;color:${p.primary};padding:.75rem 1.5rem">Subscribe</button>
    </form>
  </section>
${footerHTML(p)}`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssFooter(p), cssAnimations()].join('\n');

  return {
    files: [{ path: 'index.html', content: html }, { path: 'style.css', content: css }, { path: 'script.js', content: jsBase() }],
    summary: 'Created an e-commerce storefront with product grid, trust badges, and email subscription CTA.',
    nextSteps: ['Add product detail pages', 'Integrate Stripe', 'Add shopping cart', 'Add search/filtering'],
    metadata: { template: 'ecommerce', sections, estimatedComplexity: 'medium' },
  };
}

function buildPhotography(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);
  const sections = ['hero', 'gallery', 'about', 'contact'];

  const html = htmlDoc('Photography',
    `<link rel="stylesheet" href="style.css">`,
    `${navHTML(p, ['Gallery', 'About', 'Contact'])}
${heroHTML(p, 'Capturing Moments', 'Fine art photography that tells stories through light and shadow.', 'View Gallery')}
  <section id="gallery" class="fade-up">
    <h2 class="section-title">Portfolio</h2>
    <div class="masonry-grid">
      <div class="masonry-item" onclick="openLightbox(this)"><div style="aspect-ratio:3/4;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#127748;</div></div>
      <div class="masonry-item" onclick="openLightbox(this)"><div style="aspect-ratio:4/3;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#127742;</div></div>
      <div class="masonry-item" onclick="openLightbox(this)"><div style="aspect-ratio:1/1;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#127749;</div></div>
      <div class="masonry-item" onclick="openLightbox(this)"><div style="aspect-ratio:3/4;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#127750;</div></div>
      <div class="masonry-item" onclick="openLightbox(this)"><div style="aspect-ratio:4/3;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#127743;</div></div>
      <div class="masonry-item" onclick="openLightbox(this)"><div style="aspect-ratio:1/1;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#127744;</div></div>
    </div>
  </section>
  <section id="about" class="fade-up" style="background:${p.bgAlt}">
    <div style="max-width:800px;margin:0 auto;display:grid;grid-template-columns:1fr 2fr;gap:3rem;align-items:center">
      <div style="aspect-ratio:1;background:${p.surface};border-radius:1rem;display:flex;align-items:center;justify-content:center;font-size:4rem">&#128247;</div>
      <div><p style="font-size:.85rem;color:${p.primary};font-weight:600;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.75rem">About the Photographer</p><h2 style="font-size:clamp(1.5rem,3vw,2rem);font-weight:800;margin-bottom:1rem">Visual Storyteller</h2><p style="color:${p.textMuted};line-height:1.7">With over a decade of experience capturing the world's most breathtaking moments, I specialize in landscape, portrait, and street photography. Every frame is an opportunity to reveal something extraordinary in the ordinary.</p></div>
    </div>
  </section>
  <section id="contact" class="fade-up">
    <h2 class="section-title">Get in Touch</h2>
    <p class="section-subtitle">Available for commissions, collaborations, and prints.</p>
    <form style="max-width:500px;margin:0 auto;display:flex;flex-direction:column;gap:1rem">
      <input type="text" placeholder="Your name" required style="border-radius:50px;padding:.75rem 1.25rem;border:1px solid ${p.border};background:${p.bg};color:${p.text}">
      <input type="email" placeholder="Your email" required style="border-radius:50px;padding:.75rem 1.25rem;border:1px solid ${p.border};background:${p.bg};color:${p.text}">
      <textarea placeholder="Tell me about your project" rows="4" style="border-radius:1rem;padding:.75rem 1.25rem;border:1px solid ${p.border};background:${p.bg};color:${p.text};resize:vertical"></textarea>
      <button type="submit" class="btn" style="border-radius:50px;align-self:center">Send Message</button>
    </form>
  </section>
${footerHTML(p)}`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssFooter(p), cssAnimations(), `
    .masonry-grid { columns: 3; column-gap: 1.5rem; max-width: 1200px; margin: 0 auto; }
    .masonry-item { break-inside: avoid; margin-bottom: 1.5rem; border-radius: 0.75rem; overflow: hidden; cursor: pointer; transition: transform 0.2s; }
    .masonry-item:hover { transform: scale(1.02); }
    @media (max-width: 768px) { .masonry-grid { columns: 2; } }
    @media (max-width: 480px) { .masonry-grid { columns: 1; } }
    #lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.95); display: flex; align-items: center; justify-content: center; z-index: 9999; cursor: pointer; }
    #lightbox img, #lightbox div { max-width: 90vw; max-height: 90vh; border-radius: 0.5rem; }
    #lightbox-close { position: absolute; top: 1rem; right: 1rem; color: #fff; font-size: 2rem; cursor: pointer; }
  `].join('\n');

  const js = `${jsBase()}
    function openLightbox(el) {
      var overlay = document.createElement('div');
      overlay.id = 'lightbox';
      overlay.onclick = function() { overlay.remove(); };
      var content = el.querySelector('div').cloneNode(true);
      content.style.fontSize = '8rem';
      overlay.appendChild(content);
      var close = document.createElement('div');
      close.id = 'lightbox-close';
      close.textContent = '\\u00d7';
      overlay.appendChild(close);
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';
    }
  `;

  return {
    files: [{ path: 'index.html', content: html }, { path: 'style.css', content: css }, { path: 'script.js', content: js }],
    summary: 'Built a photography portfolio with masonry gallery, lightbox, about section, and contact form.',
    nextSteps: ['Add high-res images', 'Integrate Instagram feed', 'Add print shop', 'Add EXIF data display'],
    metadata: { template: 'photography', sections, estimatedComplexity: 'simple' },
  };
}

function buildBlog(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);
  const sections = ['hero', 'articles', 'newsletter'];

  const html = htmlDoc('Blog',
    `<link rel="stylesheet" href="style.css">`,
    `${navHTML(p, ['Articles', 'Newsletter'])}
${heroHTML(p, 'Insights & Ideas', 'Thoughtful perspectives on design, technology, and creativity.', 'Read Latest')}
  <section id="articles" class="fade-up">
    <h2 class="section-title">Latest Articles</h2>
    <div class="grid grid-3">
      <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:16/9;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:2.5rem">&#128221;</div><div style="padding:1.5rem"><p style="font-size:.8rem;color:${p.primary};font-weight:600;text-transform:uppercase;letter-spacing:.05em">Design</p><h3 style="margin-top:.5rem">The Future of Web Design</h3><p style="margin-top:.5rem">Emerging trends shaping the web.</p><p style="margin-top:1rem;font-size:.85rem;color:${p.textMuted}">5 min read</p></div></div>
      <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:16/9;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:2.5rem">&#128187;</div><div style="padding:1.5rem"><p style="font-size:.8rem;color:${p.primary};font-weight:600;text-transform:uppercase;letter-spacing:.05em">Engineering</p><h3 style="margin-top:.5rem">Scalable APIs with Edge Functions</h3><p style="margin-top:.5rem">A practical serverless guide.</p><p style="margin-top:1rem;font-size:.85rem;color:${p.textMuted}">8 min read</p></div></div>
      <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:16/9;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:2.5rem">&#127912;</div><div style="padding:1.5rem"><p style="font-size:.8rem;color:${p.primary};font-weight:600;text-transform:uppercase;letter-spacing:.05em">Creative</p><h3 style="margin-top:.5rem">Color Theory for Interfaces</h3><p style="margin-top:.5rem">Palettes that convert and delight.</p><p style="margin-top:1rem;font-size:.85rem;color:${p.textMuted}">6 min read</p></div></div>
    </div>
  </section>
  <section id="newsletter" class="fade-up" style="text-align:center;background:${p.bgAlt}">
    <h2 class="section-title">Stay Updated</h2>
    <p class="section-subtitle">Latest articles in your inbox. No spam, ever.</p>
    <form style="display:flex;gap:.5rem;max-width:400px;margin:0 auto">
      <input type="email" placeholder="Your email" required style="flex:1;border-radius:50px;padding:.75rem 1.25rem;border:1px solid ${p.border};background:${p.bg};color:${p.text}">
      <button type="submit" class="btn" style="border-radius:50px;background:${p.primary};color:#fff;padding:.75rem 1.5rem">Subscribe</button>
    </form>
  </section>
${footerHTML(p)}`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssFooter(p), cssAnimations()].join('\n');

  return {
    files: [{ path: 'index.html', content: html }, { path: 'style.css', content: css }, { path: 'script.js', content: jsBase() }],
    summary: 'Built a blog with article cards featuring category tags and read times, plus newsletter subscription.',
    nextSteps: ['Add article pages', 'Add category filtering', 'Add search', 'Add author profiles'],
    metadata: { template: 'blog', sections, estimatedComplexity: 'simple' },
  };
}

function buildDashboard(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);
  const sections = ['hero', 'stats', 'features'];

  const html = htmlDoc('Dashboard',
    `<link rel="stylesheet" href="style.css">`,
    `${navHTML(p, ['Stats', 'Features'])}
${heroHTML(p, 'Command Center', 'Real-time analytics and insights for your business.', 'View Dashboard')}
  <section id="stats" class="fade-up" style="background:${p.bgAlt}">
    <h2 class="section-title">Key Metrics</h2>
    <div class="grid grid-4">
      <div class="card" style="text-align:center"><p style="font-size:.85rem;color:${p.textMuted};text-transform:uppercase;letter-spacing:.05em">Revenue</p><p style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:.5rem 0">$48.2k</p><p style="color:#10B981;font-size:.85rem;font-weight:600">&#9650; 12.5%</p></div>
      <div class="card" style="text-align:center"><p style="font-size:.85rem;color:${p.textMuted};text-transform:uppercase;letter-spacing:.05em">Users</p><p style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:.5rem 0">12.4k</p><p style="color:#10B981;font-size:.85rem;font-weight:600">&#9650; 8.3%</p></div>
      <div class="card" style="text-align:center"><p style="font-size:.85rem;color:${p.textMuted};text-transform:uppercase;letter-spacing:.05em">Conversion</p><p style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:.5rem 0">3.2%</p><p style="color:#10B981;font-size:.85rem;font-weight:600">&#9650; 2.1%</p></div>
      <div class="card" style="text-align:center"><p style="font-size:.85rem;color:${p.textMuted};text-transform:uppercase;letter-spacing:.05em">Avg Session</p><p style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:.5rem 0">4m 32s</p><p style="color:#EF4444;font-size:.85rem;font-weight:600">&#9660; 1.2%</p></div>
    </div>
  </section>
  <section id="features" class="fade-up">
    <h2 class="section-title">Platform Features</h2>
    <div class="grid grid-3">
      <div class="card"><div class="card-icon">&#128202;</div><h3>Real-time Charts</h3><p>Interactive live visualizations.</p></div>
      <div class="card"><div class="card-icon">&#128276;</div><h3>Smart Alerts</h3><p>Threshold-based notifications.</p></div>
      <div class="card"><div class="card-icon">&#128203;</div><h3>Custom Reports</h3><p>Build and export tailored reports.</p></div>
    </div>
  </section>
${footerHTML(p)}`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssFooter(p), cssAnimations()].join('\n');

  return {
    files: [{ path: 'index.html', content: html }, { path: 'style.css', content: css }, { path: 'script.js', content: jsBase() }],
    summary: 'Created a dashboard landing page with metric cards showing trends and feature highlights.',
    nextSteps: ['Add interactive charts with Chart.js', 'Add data tables', 'Add date filters', 'Connect to real API'],
    metadata: { template: 'dashboard', sections, estimatedComplexity: 'medium' },
  };
}

function buildWebApp(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);
  const sections = ['sidebar', 'metrics', 'workspace', 'table', 'modal'];

  const html = htmlDoc('Joyful Workspace App',
    `<link rel="stylesheet" href="style.css">`,
    `  <div class="app-shell">
    <aside class="app-sidebar">
      <div class="brand-mark">J</div>
      <nav>
        <button class="nav-item active" data-view="overview">Overview</button>
        <button class="nav-item" data-view="pipeline">Pipeline</button>
        <button class="nav-item" data-view="tasks">Tasks</button>
        <button class="nav-item" data-view="reports">Reports</button>
      </nav>
    </aside>
    <main class="workspace">
      <header class="workspace-header">
        <div>
          <p class="eyebrow">Application workspace</p>
          <h1>Operations Command Center</h1>
          <p class="muted">Manage projects, owners, status, priority, and delivery risk from one responsive app.</p>
        </div>
        <button class="primary-action" id="newItemBtn">New item</button>
      </header>
      <section class="metrics-grid">
        <article class="metric-card"><span>Open work</span><strong id="openCount">0</strong><small>Active records</small></article>
        <article class="metric-card"><span>Completed</span><strong id="doneCount">0</strong><small>Ready to ship</small></article>
        <article class="metric-card"><span>High priority</span><strong id="priorityCount">0</strong><small>Needs attention</small></article>
        <article class="metric-card"><span>Health</span><strong id="healthScore">0%</strong><small>Portfolio score</small></article>
      </section>
      <section class="control-panel">
        <div class="segmented" role="tablist" aria-label="Status filter">
          <button class="filter-btn active" data-filter="all">All</button>
          <button class="filter-btn" data-filter="Active">Active</button>
          <button class="filter-btn" data-filter="Review">Review</button>
          <button class="filter-btn" data-filter="Done">Done</button>
        </div>
        <input id="searchInput" type="search" placeholder="Search projects, owners, or tags">
      </section>
      <section class="content-grid">
        <div class="panel">
          <div class="panel-header"><h2>Delivery Board</h2><span id="recordCount">0 records</span></div>
          <div class="kanban" id="kanbanBoard"></div>
        </div>
        <div class="panel">
          <div class="panel-header"><h2>Work Register</h2><span>Live data</span></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Project</th><th>Owner</th><th>Status</th><th>Priority</th><th>Due</th></tr></thead>
              <tbody id="workTable"></tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  </div>
  <dialog id="itemDialog">
    <form method="dialog" id="itemForm" class="dialog-card">
      <div class="panel-header"><h2>Add work item</h2><button type="button" id="closeDialog">Close</button></div>
      <label>Project name<input name="name" required placeholder="Customer onboarding redesign"></label>
      <label>Owner<input name="owner" required placeholder="Maya"></label>
      <div class="form-grid">
        <label>Status<select name="status"><option>Active</option><option>Review</option><option>Done</option></select></label>
        <label>Priority<select name="priority"><option>High</option><option>Medium</option><option>Low</option></select></label>
      </div>
      <label>Due date<input name="due" type="date" required></label>
      <button class="primary-action" type="submit">Save item</button>
    </form>
  </dialog>`
  );

  const css = `${cssReset()}
:root{--primary:${p.primary};--primary-hover:${p.primaryHover};--surface:${p.bg};--surface-2:${p.bgAlt};--panel:${p.surface};--text:${p.text};--muted:${p.textMuted};--border:${p.border};--shadow:0 24px 80px rgba(15,23,42,.12)}
body{min-height:100vh;background:linear-gradient(135deg,${p.bgAlt},${p.bg});color:var(--text)}
.app-shell{display:grid;grid-template-columns:88px minmax(0,1fr);min-height:100vh}
.app-sidebar{border-right:1px solid var(--border);background:rgba(255,255,255,.78);backdrop-filter:blur(18px);padding:1rem;display:flex;flex-direction:column;align-items:center;gap:2rem}
.brand-mark{width:48px;height:48px;border-radius:14px;background:${p.gradient};display:grid;place-items:center;color:#fff;font-weight:900;box-shadow:0 14px 30px rgba(99,102,241,.24)}
.app-sidebar nav{display:grid;gap:.75rem;width:100%}.nav-item{border:1px solid transparent;background:transparent;color:var(--muted);border-radius:12px;padding:.8rem .35rem;font:inherit;font-size:.75rem;font-weight:700;cursor:pointer}.nav-item.active,.nav-item:hover{background:var(--surface);border-color:var(--border);color:var(--primary)}
.workspace{min-width:0;padding:clamp(1rem,3vw,2rem);display:grid;gap:1.25rem}.workspace-header{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}.eyebrow{color:var(--primary);font-weight:800;text-transform:uppercase;font-size:.72rem;letter-spacing:.08em}.workspace h1{font-size:clamp(2rem,4vw,3.5rem);line-height:1.05;margin:.2rem 0 .6rem}.muted{color:var(--muted);max-width:680px}
.primary-action{border:0;border-radius:12px;background:var(--primary);color:#fff;padding:.8rem 1rem;font-weight:800;cursor:pointer;box-shadow:0 12px 30px rgba(99,102,241,.22)}.primary-action:hover{background:var(--primary-hover)}
.metrics-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem}.metric-card,.panel{background:rgba(255,255,255,.9);border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow)}.metric-card{padding:1.2rem}.metric-card span,.metric-card small{display:block;color:var(--muted);font-size:.82rem}.metric-card strong{display:block;font-size:2rem;margin:.4rem 0;color:var(--text)}
.control-panel{display:flex;gap:1rem;align-items:center;justify-content:space-between}.segmented{display:flex;gap:.35rem;border:1px solid var(--border);background:rgba(255,255,255,.76);padding:.35rem;border-radius:14px}.filter-btn{border:0;background:transparent;color:var(--muted);border-radius:10px;padding:.6rem .85rem;font-weight:700;cursor:pointer}.filter-btn.active{background:var(--primary);color:#fff}#searchInput{min-width:min(100%,320px);border:1px solid var(--border);border-radius:12px;background:#fff;padding:.8rem 1rem;color:var(--text)}
.content-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:1rem}.panel{min-width:0;padding:1rem}.panel-header{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1rem}.panel-header h2{font-size:1rem}.panel-header span,.panel-header button{color:var(--muted);font-size:.78rem;background:transparent;border:0}
.kanban{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.75rem}.lane{border:1px dashed var(--border);border-radius:14px;padding:.75rem;background:var(--surface-2);min-height:260px}.lane h3{font-size:.78rem;text-transform:uppercase;color:var(--muted);margin-bottom:.75rem}.work-card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:.85rem;margin-bottom:.75rem}.work-card strong{display:block;margin-bottom:.35rem}.card-meta{display:flex;justify-content:space-between;color:var(--muted);font-size:.75rem}.pill{display:inline-flex;border-radius:999px;padding:.2rem .55rem;font-size:.7rem;font-weight:800}.High{background:#fee2e2;color:#b91c1c}.Medium{background:#fef3c7;color:#92400e}.Low{background:#dcfce7;color:#166534}
.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:.86rem}th,td{text-align:left;border-bottom:1px solid var(--border);padding:.8rem .65rem;white-space:nowrap}th{color:var(--muted);font-size:.74rem;text-transform:uppercase}
dialog{border:0;background:transparent}dialog::backdrop{background:rgba(15,23,42,.5)}.dialog-card{width:min(92vw,460px);background:#fff;border:1px solid var(--border);border-radius:18px;padding:1.2rem;box-shadow:var(--shadow);display:grid;gap:1rem}.dialog-card label{display:grid;gap:.4rem;font-weight:700;font-size:.82rem}.dialog-card input,.dialog-card select{border:1px solid var(--border);border-radius:10px;padding:.75rem;font:inherit}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}
@media(max-width:980px){.metrics-grid,.content-grid{grid-template-columns:1fr}.kanban{grid-template-columns:1fr}.workspace-header,.control-panel{flex-direction:column;align-items:stretch}.app-shell{grid-template-columns:1fr}.app-sidebar{position:sticky;top:0;z-index:10;flex-direction:row;justify-content:space-between}.app-sidebar nav{grid-template-columns:repeat(4,1fr)}}`;

  const js = `const defaultItems=[
  {name:'Customer portal launch',owner:'Maya',status:'Active',priority:'High',due:'2026-06-04'},
  {name:'Billing workflow QA',owner:'Noah',status:'Review',priority:'Medium',due:'2026-05-28'},
  {name:'Partner analytics view',owner:'Iris',status:'Active',priority:'High',due:'2026-06-10'},
  {name:'Help center migration',owner:'Ari',status:'Done',priority:'Low',due:'2026-05-18'},
  {name:'Admin permission model',owner:'Sam',status:'Review',priority:'High',due:'2026-05-30'}
];
let items=JSON.parse(localStorage.getItem('joyful_app_items')||'null')||defaultItems;
let filter='all';
const save=()=>localStorage.setItem('joyful_app_items',JSON.stringify(items));
const matches=(item,query)=>[item.name,item.owner,item.status,item.priority].join(' ').toLowerCase().includes(query.toLowerCase());
function render(){
  const query=document.querySelector('#searchInput').value.trim();
  const visible=items.filter(item=>(filter==='all'||item.status===filter)&&matches(item,query));
  document.querySelector('#openCount').textContent=items.filter(i=>i.status!=='Done').length;
  document.querySelector('#doneCount').textContent=items.filter(i=>i.status==='Done').length;
  document.querySelector('#priorityCount').textContent=items.filter(i=>i.priority==='High').length;
  document.querySelector('#healthScore').textContent=Math.round((items.filter(i=>i.status==='Done').length/Math.max(items.length,1))*100)+'%';
  document.querySelector('#recordCount').textContent=visible.length+' records';
  document.querySelector('#kanbanBoard').innerHTML=['Active','Review','Done'].map(status=>{
    const cards=visible.filter(item=>item.status===status).map(item=>'<article class="work-card"><strong>'+item.name+'</strong><div class="card-meta"><span>'+item.owner+'</span><span class="pill '+item.priority+'">'+item.priority+'</span></div><div class="card-meta"><span>Due '+item.due+'</span><button data-promote="'+item.name+'">Move</button></div></article>').join('');
    return '<section class="lane"><h3>'+status+'</h3>'+cards+'</section>';
  }).join('');
  document.querySelector('#workTable').innerHTML=visible.map(item=>'<tr><td>'+item.name+'</td><td>'+item.owner+'</td><td>'+item.status+'</td><td><span class="pill '+item.priority+'">'+item.priority+'</span></td><td>'+item.due+'</td></tr>').join('');
}
document.querySelectorAll('.filter-btn').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');filter=btn.dataset.filter;render();
}));
document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}));
document.querySelector('#searchInput').addEventListener('input',render);
document.querySelector('#newItemBtn').addEventListener('click',()=>document.querySelector('#itemDialog').showModal());
document.querySelector('#closeDialog').addEventListener('click',()=>document.querySelector('#itemDialog').close());
document.querySelector('#itemForm').addEventListener('submit',event=>{
  event.preventDefault();
  const data=Object.fromEntries(new FormData(event.currentTarget));
  items=[data,...items];save();event.currentTarget.reset();document.querySelector('#itemDialog').close();render();
});
document.querySelector('#kanbanBoard').addEventListener('click',event=>{
  const target=event.target.closest('[data-promote]');
  if(!target)return;
  const item=items.find(record=>record.name===target.dataset.promote);
  if(!item)return;
  item.status=item.status==='Active'?'Review':item.status==='Review'?'Done':'Active';
  save();render();
});
render();`;

  return {
    files: [{ path: 'index.html', content: html }, { path: 'style.css', content: css }, { path: 'script.js', content: js }],
    summary: 'Built a complex application workspace with responsive navigation, metrics, Kanban board, searchable data table, modal creation flow, local storage, and status updates.',
    nextSteps: ['Add authentication screens', 'Connect to an API', 'Add charts and role permissions', 'Create detail pages'],
    metadata: { template: 'webapp', sections, estimatedComplexity: 'complex' },
  };
}

function buildAgency(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);
  const sections = ['hero', 'services', 'work', 'contact'];

  const html = htmlDoc('Creative Agency',
    `<link rel="stylesheet" href="style.css">`,
    `${navHTML(p, ['Services', 'Work', 'Contact'])}
${heroHTML(p, 'We Create What Others Imagine', 'Award-winning digital agency crafting brands and experiences.', 'See Our Work')}
  <section id="services" class="fade-up">
    <h2 class="section-title">What We Do</h2>
    <div class="grid grid-3">
      <div class="card"><div class="card-icon">&#127912;</div><h3>Brand Identity</h3><p>Logos, guidelines, and visual systems.</p></div>
      <div class="card"><div class="card-icon">&#128187;</div><h3>Web Development</h3><p>Custom websites built for performance.</p></div>
      <div class="card"><div class="card-icon">&#128241;</div><h3>Product Design</h3><p>User-centered design for digital products.</p></div>
    </div>
  </section>
  <section id="work" class="fade-up" style="background:${p.bgAlt}">
    <h2 class="section-title">Selected Work</h2>
    <div class="grid grid-2">
      <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:4/3;background:${p.gradient};display:flex;align-items:center;justify-content:center;font-size:3rem;color:#fff">&#9733;</div><div style="padding:1.5rem"><h3>Nexus Brand Redesign</h3><p>Complete rebrand for a Fortune 500 company.</p></div></div>
      <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:4/3;background:linear-gradient(135deg,#10B981,#3B82F6);display:flex;align-items:center;justify-content:center;font-size:3rem;color:#fff">&#9670;</div><div style="padding:1.5rem"><h3>FinFlow App</h3><p>Mobile banking app serving 2M+ users.</p></div></div>
    </div>
  </section>
  <section id="contact" class="fade-up">
    <h2 class="section-title">Start a Project</h2>
    <p class="section-subtitle">Let's build something great together.</p>
    <form class="contact-form">
      <input type="text" placeholder="Your Name" required>
      <input type="email" placeholder="Email" required>
      <select required><option value="">Project Type</option><option>Brand Identity</option><option>Web Development</option><option>Product Design</option></select>
      <textarea rows="4" placeholder="Tell us about your project..." required></textarea>
      <button type="submit">Send Inquiry</button>
    </form>
  </section>
${footerHTML(p)}`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssForm(p), cssFooter(p), cssAnimations()].join('\n');

  return {
    files: [{ path: 'index.html', content: html }, { path: 'style.css', content: css }, { path: 'script.js', content: jsBase() }],
    summary: 'Built a creative agency site with services, portfolio showcase with gradient cards, and project inquiry form.',
    nextSteps: ['Add case study pages', 'Add team section', 'Add client logos', 'Add process timeline'],
    metadata: { template: 'agency', sections, estimatedComplexity: 'medium' },
  };
}

function buildEvent(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);
  const sections = ['hero', 'schedule', 'speakers', 'register'];

  const html = htmlDoc('Event',
    `<link rel="stylesheet" href="style.css">`,
    `${navHTML(p, ['Schedule', 'Speakers', 'Register'])}
${heroHTML(p, 'Tech Summit 2026', 'The premier conference for developers and designers.', 'Register Now')}
  <section id="schedule" class="fade-up">
    <h2 class="section-title">Schedule</h2>
    <div class="grid grid-2">
      <div class="card"><h3 style="color:${p.primary}">Day 1 — June 15</h3><div style="margin-top:1rem;display:flex;flex-direction:column;gap:.75rem"><p><strong>9:00 AM</strong> — Registration</p><p><strong>10:00 AM</strong> — Opening Keynote</p><p><strong>11:30 AM</strong> — Workshop: Modern CSS</p><p><strong>2:00 PM</strong> — Panel: Future of Web</p><p><strong>4:00 PM</strong> — Networking</p></div></div>
      <div class="card"><h3 style="color:${p.primary}">Day 2 — June 16</h3><div style="margin-top:1rem;display:flex;flex-direction:column;gap:.75rem"><p><strong>9:00 AM</strong> — Morning Sessions</p><p><strong>10:30 AM</strong> — Workshop: AI Tools</p><p><strong>1:00 PM</strong> — Lightning Talks</p><p><strong>3:00 PM</strong> — Closing Keynote</p><p><strong>4:30 PM</strong> — After Party</p></div></div>
    </div>
  </section>
  <section id="speakers" class="fade-up" style="background:${p.bgAlt}">
    <h2 class="section-title">Speakers</h2>
    <div class="grid grid-4">
      <div class="card" style="text-align:center"><div style="width:80px;height:80px;border-radius:50%;background:${p.gradient};margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.5rem">AK</div><h3>Alex Kim</h3><p style="font-size:.85rem">VP of Design, Stripe</p></div>
      <div class="card" style="text-align:center"><div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#10B981,#3B82F6);margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.5rem">SP</div><h3>Sara Patel</h3><p style="font-size:.85rem">CTO, Vercel</p></div>
      <div class="card" style="text-align:center"><div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#F97316,#EF4444);margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.5rem">MC</div><h3>Marcus Chen</h3><p style="font-size:.85rem">Staff Eng, Google</p></div>
      <div class="card" style="text-align:center"><div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#8B5CF6,#EC4899);margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.5rem">LW</div><h3>Lisa Wang</h3><p style="font-size:.85rem">Founder, DesignLab</p></div>
    </div>
  </section>
  <section class="fade-up" style="text-align:center;background:${p.gradient};color:#fff;padding:5rem 2rem">
    <h2 style="font-size:clamp(1.75rem,4vw,2.5rem);font-weight:800;margin-bottom:1rem">Secure Your Spot</h2>
    <p style="opacity:.9;margin-bottom:.5rem">Early bird pricing until May 1st.</p>
    <p style="font-size:2rem;font-weight:800;margin-bottom:2rem">$199</p>
    <a href="#" class="btn" style="background:#fff;color:${p.primary}">Register Now</a>
  </section>
${footerHTML(p)}`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssFooter(p), cssAnimations()].join('\n');

  return {
    files: [{ path: 'index.html', content: html }, { path: 'style.css', content: css }, { path: 'script.js', content: jsBase() }],
    summary: 'Created an event page with 2-day schedule, speaker cards, and registration CTA.',
    nextSteps: ['Add ticket tiers', 'Add countdown timer', 'Add venue map', 'Add sponsor logos'],
    metadata: { template: 'event', sections, estimatedComplexity: 'simple' },
  };
}

// ─── Modification Engine ───────────────────────────────────────────

function buildReactMaintenancePatches(prompt: string, existingFiles: ProjectFile[], analysis: PromptAnalysis): AIGenerationResponse | null {
  const lower = prompt.toLowerCase();
  const appFile = existingFiles.find(f => /^src\/App\.(jsx|tsx)$/i.test(f.path));
  const cssFile = existingFiles.find(f => /^src\/styles\.css$/i.test(f.path));
  if (!appFile || !cssFile) return null;

  const patches: FilePatchOperation[] = [];

  if (/\bfaq|question|accordion\b/.test(lower) && !/faq-panel|faqItems/.test(appFile.content)) {
    const jsxAnchor = `        <section className="grid">
          {visibleItems.map((item) => (`;
    if (!appFile.content.includes(jsxAnchor)) return null;

    patches.push({
      path: appFile.path,
      action: 'patch',
      insertBefore: jsxAnchor,
      content: `        <section className="faq-panel">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2>Answers before the call</h2>
          </div>
          <div className="faq-list">
            {[
              ['How fast can we launch?', 'Most teams can turn a validated prototype into a reviewable website in one focused session.'],
              ['Can we keep editing after generation?', 'Yes. Use chat for broad changes, then patch small sections or edit files directly.'],
              ['Does the preview catch issues?', 'The local sandbox reports console, network, and validation problems so fixes can be sent back into chat.'],
            ].map(([question, answer]) => (
              <article key={question} className="faq-item">
                <h3>{question}</h3>
                <p>{answer}</p>
              </article>
            ))}
          </div>
        </section>

`,
      reason: 'Add a focused FAQ section without rebuilding the React app.',
    });

    const cssAnchor = '@media (max-width: 980px)';
    patches.push({
      path: cssFile.path,
      action: 'patch',
      insertBefore: cssFile.content.includes(cssAnchor) ? cssAnchor : undefined,
      insertAfter: cssFile.content.includes(cssAnchor) ? undefined : cssFile.content,
      content: `.faq-panel { border: 1px solid var(--border); background: rgba(255,255,255,.88); border-radius: 18px; box-shadow: 0 18px 50px rgba(15,23,42,.08); padding: clamp(1rem, 3vw, 1.5rem); display: grid; grid-template-columns: minmax(0, .75fr) minmax(0, 1.25fr); gap: 1rem; align-items: start; }
.faq-panel h2 { margin: 0; font-size: clamp(1.4rem, 3vw, 2rem); letter-spacing: 0; }
.faq-list { display: grid; gap: .75rem; }
.faq-item { border: 1px solid var(--border); border-radius: 14px; background: white; padding: 1rem; }
.faq-item h3 { margin: 0 0 .35rem; font-size: .98rem; }
.faq-item p { margin: 0; color: var(--muted); line-height: 1.6; }
@media (max-width: 760px) { .faq-panel { grid-template-columns: 1fr; } }
`,
      reason: 'Style the FAQ section with responsive constraints.',
    });

    return {
      files: [],
      patches,
      summary: 'Added a compact FAQ section using targeted patch operations instead of rewriting the full React project.',
      nextSteps: ['Review FAQ copy', 'Connect questions to real customer objections', 'Run another preview pass'],
      metadata: {
        template: analysis.template,
        sections: ['faq', 'targeted-patches'],
        estimatedComplexity: 'simple',
        sandboxCommands: [{ command: 'npm', args: ['run', 'build'], wait: true, reason: 'Validate patched React app.' }],
      },
    };
  }

  return null;
}

function modifyExistingFiles(prompt: string, existingFiles: ProjectFile[], analysis: PromptAnalysis): AIGenerationResponse | null {
  const lower = prompt.toLowerCase();
  const reactAppFile = existingFiles.find(f => /^src\/App\.(jsx|tsx)$/i.test(f.path));
  if (reactAppFile) {
    const targeted = buildReactMaintenancePatches(prompt, existingFiles, analysis);
    if (targeted) return targeted;

    const rebuilt = buildReactTemplate(analysis, prompt);
    return {
      ...rebuilt,
      files: rebuilt.files.map(file => ({
        ...file,
        action: existingFiles.some(existing => existing.path === file.path) ? 'modify' : 'create',
      })),
      summary: `Updated the React/Vite app from the existing project scaffold. ${rebuilt.summary}`,
    };
  }

  const htmlFile = existingFiles.find(f => f.path === 'index.html');
  const cssFile = existingFiles.find(f => f.path === 'style.css');
  const jsFile = existingFiles.find(f => f.path === 'script.js');

  if (!htmlFile) return null;

  let html = htmlFile.content;
  let css = cssFile?.content || '';
  let js = jsFile?.content || jsBase();
  const modifiedFiles: AIGenerationResponse['files'] = [];
  let summary = '';
  const nextSteps: string[] = [];
  const requestedPath = extractRequestedPath(prompt);

  if (requestedPath && /\b(delete|remove)\b/.test(lower)) {
    if (!existingFiles.some(file => file.path === requestedPath)) {
      return {
        files: [],
        summary: `I could not find ${requestedPath} to delete.`,
        nextSteps: ['Check the file path', 'Open the file explorer', 'Ask Joyful to create the file instead'],
        metadata: { template: analysis.template, sections: ['file-system'], estimatedComplexity: 'simple' },
      };
    }
    return {
      files: [{ path: requestedPath, action: 'delete' }],
      summary: `Deleted ${requestedPath} from the project.`,
      nextSteps: ['Review the preview', 'Remove any references to that file', 'Export the updated project'],
      metadata: { template: analysis.template, sections: ['file-system'], estimatedComplexity: 'simple' },
    };
  }

  if (requestedPath && /\b(create|add|new)\b/.test(lower) && !existingFiles.some(file => file.path === requestedPath)) {
    return {
      files: [{ path: requestedPath, content: starterContentForPath(requestedPath, prompt), action: 'create' }],
      summary: `Created ${requestedPath} with starter content based on your request.`,
      nextSteps: ['Open the new file', 'Ask Joyful to connect it from navigation', 'Refine the content'],
      metadata: { template: analysis.template, sections: ['file-system'], estimatedComplexity: 'simple' },
    };
  }

  if (/dark|night|black/.test(lower) && /convert|make|change|switch|toggle/.test(lower)) {
    css = css
      .replace(/background:\s*#ffffff/gi, 'background: #0F172A')
      .replace(/background:\s*#fff\b/gi, 'background: #0F172A')
      .replace(/background:\s*#f8f9fa/gi, 'background: #1E293B')
      .replace(/background:\s*#f9fafb/gi, 'background: #1E293B')
      .replace(/background:\s*white/gi, 'background: #0F172A')
      .replace(/color:\s*#333/gi, 'color: #F8FAFC')
      .replace(/color:\s*#555/gi, 'color: #94A3B8')
      .replace(/color:\s*#222/gi, 'color: #F8FAFC')
      .replace(/color:\s*#111827/gi, 'color: #F8FAFC');
    summary = 'Converted to dark mode with deep navy backgrounds and light text.';
    nextSteps.push('Add dark/light toggle', 'Adjust image brightness', 'Custom dark accent colors');
  } else if (/pricing|price|plan/.test(lower) && /add|create|include/.test(lower)) {
    const p = pickPalette(analysis);
    const pricingHTML = `\n  <section id="pricing" class="fade-up" style="background:${p.bgAlt}">\n    <h2 class="section-title">Pricing</h2>\n    <div class="grid grid-3">\n      <div class="card" style="text-align:center"><h3>Free</h3><div style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:1rem 0">$0</div><a href="#" class="btn" style="width:100%;justify-content:center;border:1px solid ${p.border};color:${p.text}">Get Started</a></div>\n      <div class="card" style="text-align:center;border-color:${p.primary}"><h3>Pro</h3><div style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:1rem 0">$19<span style="font-size:1rem;color:${p.textMuted}">/mo</span></div><a href="#" class="btn" style="width:100%;justify-content:center;background:${p.primary};color:#fff">Subscribe</a></div>\n      <div class="card" style="text-align:center"><h3>Enterprise</h3><div style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:1rem 0">Custom</div><a href="#" class="btn" style="width:100%;justify-content:center;border:1px solid ${p.border};color:${p.text}">Contact</a></div>\n    </div>\n  </section>\n`;
    html = html.replace('</body>', `${pricingHTML}</body>`);
    summary = 'Added a 3-tier pricing section.';
    nextSteps.push('Add feature comparison', 'Add annual/monthly toggle');
  } else if (/contact|form/.test(lower) && /add|create|include/.test(lower)) {
    const p = pickPalette(analysis);
    const contactHTML = `\n  <section id="contact" class="fade-up" style="background:${p.bgAlt}">\n    <h2 class="section-title">Get In Touch</h2>\n    <form class="contact-form">\n      <input type="text" placeholder="Your Name" required>\n      <input type="email" placeholder="Your Email" required>\n      <textarea rows="5" placeholder="Your Message" required></textarea>\n      <button type="submit">Send Message</button>\n    </form>\n  </section>\n`;
    html = html.replace('</body>', `${contactHTML}</body>`);
    css += `\n${cssForm(p)}`;
    js += `\n\ndocument.querySelector('.contact-form')?.addEventListener('submit',e=>{\n  e.preventDefault();\n  joyfulNotify('Message sent!');\n  e.target.reset();\n});`;
    summary = 'Added a contact form section.';
    nextSteps.push('Connect to backend', 'Add validation');
  } else if (/testimonial|review/.test(lower) && /add|create|include/.test(lower)) {
    const testHTML = `\n  <section id="testimonials" class="fade-up">\n    <h2 class="section-title">What People Say</h2>\n    <div class="grid grid-3">\n      <div class="card"><p style="font-style:italic">"Absolutely incredible experience."</p><p style="margin-top:1rem;font-weight:600">— Alex K.</p></div>\n      <div class="card"><p style="font-style:italic">"Transformed our business."</p><p style="margin-top:1rem;font-weight:600">— Sarah M.</p></div>\n      <div class="card"><p style="font-style:italic">"Best decision we made this year."</p><p style="margin-top:1rem;font-weight:600">— James L.</p></div>\n    </div>\n  </section>\n`;
    html = html.replace('</body>', `${testHTML}</body>`);
    summary = 'Added a testimonials section with 3 customer quotes.';
    nextSteps.push('Add real photos', 'Add star ratings');
  } else if (/faq|question|accordion/.test(lower) && /add|create|include/.test(lower)) {
    const p = pickPalette(analysis);
    const faqHTML = `\n  <section id="faq" class="fade-up" style="background:${p.bgAlt}">\n    <h2 class="section-title">Frequently Asked Questions</h2>\n    <div style="max-width:640px;margin:0 auto">\n      <div class="faq-item"><div class="faq-question">How do I get started?<span class="faq-icon" style="transition:transform .3s">+</span></div><div class="faq-answer">Simply sign up for a free account and follow our quick setup guide. You'll be up and running in minutes.</div></div>\n      <div class="faq-item"><div class="faq-question">What payment methods do you accept?<span class="faq-icon" style="transition:transform .3s">+</span></div><div class="faq-answer">We accept all major credit cards, PayPal, and bank transfers. Enterprise plans can also use invoicing.</div></div>\n      <div class="faq-item"><div class="faq-question">Can I cancel anytime?<span class="faq-icon" style="transition:transform .3s">+</span></div><div class="faq-answer">Yes, you can cancel your subscription at any time with no cancellation fees. Your access continues until the end of your billing period.</div></div>\n      <div class="faq-item"><div class="faq-question">Do you offer a free trial?<span class="faq-icon" style="transition:transform .3s">+</span></div><div class="faq-answer">Absolutely! All plans come with a 14-day free trial. No credit card required to start.</div></div>\n    </div>\n  </section>\n`;
    html = html.replace('</body>', `${faqHTML}</body>`);
    css += `\n${cssFAQ(p)}`;
    js += `\n\ndocument.querySelectorAll('.faq-question').forEach(q=>{\n  q.addEventListener('click',()=>{\n    const item=q.parentElement;\n    item.classList.toggle('open');\n  });\n});`;
    summary = 'Added an interactive FAQ section with accordion functionality.';
    nextSteps.push('Add more questions', 'Customize answers', 'Add search within FAQ');
  } else if (/team|member|staff|people/.test(lower) && /add|create|include/.test(lower)) {
    const p = pickPalette(analysis);
    const gradients = [p.gradient, 'linear-gradient(135deg,#10B981,#3B82F6)', 'linear-gradient(135deg,#F97316,#EF4444)', 'linear-gradient(135deg,#8B5CF6,#EC4899)'];
    const teamHTML = `\n  <section id="team" class="fade-up">\n    <h2 class="section-title">Meet Our Team</h2>\n    <p class="section-subtitle">The talented people behind our success.</p>\n    <div class="grid grid-4">\n      <div class="team-card"><div class="team-avatar" style="background:${gradients[0]}">AK</div><h3>Alex Kim</h3><p class="role">CEO & Founder</p><p>Visionary leader with 15+ years in tech.</p></div>\n      <div class="team-card"><div class="team-avatar" style="background:${gradients[1]}">SP</div><h3>Sara Patel</h3><p class="role">CTO</p><p>Engineering excellence at scale.</p></div>\n      <div class="team-card"><div class="team-avatar" style="background:${gradients[2]}">MC</div><h3>Marcus Chen</h3><p class="role">Head of Design</p><p>Creating delightful user experiences.</p></div>\n      <div class="team-card"><div class="team-avatar" style="background:${gradients[3]}">LW</div><h3>Lisa Wang</h3><p class="role">VP of Marketing</p><p>Growth strategist and brand builder.</p></div>\n    </div>\n  </section>\n`;
    html = html.replace('</body>', `${teamHTML}</body>`);
    css += `\n${cssTeam(p)}`;
    summary = 'Added a team section with avatar cards, roles, and bios.';
    nextSteps.push('Add real photos', 'Add social links', 'Add more team members');
  } else if (/gallery|image|photo|portfolio/.test(lower) && /add|create|include/.test(lower)) {
    const p = pickPalette(analysis);
    const galleryHTML = `\n  <section id="gallery" class="fade-up" style="background:${p.bgAlt}">\n    <h2 class="section-title">Gallery</h2>\n    <p class="section-subtitle">A visual showcase of our work.</p>\n    <div class="gallery-grid">\n      <div class="gallery-item" style="background:${p.gradient}"><div class="overlay"><span>Project Alpha</span></div></div>\n      <div class="gallery-item" style="background:linear-gradient(135deg,#10B981,#3B82F6)"><div class="overlay"><span>Project Beta</span></div></div>\n      <div class="gallery-item" style="background:linear-gradient(135deg,#F97316,#EF4444)"><div class="overlay"><span>Project Gamma</span></div></div>\n      <div class="gallery-item" style="background:linear-gradient(135deg,#8B5CF6,#EC4899)"><div class="overlay"><span>Project Delta</span></div></div>\n      <div class="gallery-item" style="background:linear-gradient(135deg,#06B6D4,#10B981)"><div class="overlay"><span>Project Epsilon</span></div></div>\n      <div class="gallery-item" style="background:linear-gradient(135deg,#F43F5E,#F97316)"><div class="overlay"><span>Project Zeta</span></div></div>\n    </div>\n  </section>\n`;
    html = html.replace('</body>', `${galleryHTML}</body>`);
    css += `\n${cssGallery(p)}`;
    summary = 'Added a responsive image gallery with hover overlays.';
    nextSteps.push('Add real images', 'Add lightbox', 'Add filtering by category');
  } else if (/animation|animate|motion|scroll/.test(lower)) {
    css += `\n${cssAnimations()}`;
    html = html.replace(/<section(?!.*class="fade-up")/g, '<section class="fade-up"');
    js += `\n\nconst obs=new IntersectionObserver((entries)=>{\n  entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target)}});\n},{threshold:.1});\ndocument.querySelectorAll('.fade-up').forEach(el=>obs.observe(el));`;
    summary = 'Added scroll-triggered fade-up animations to all sections.';
    nextSteps.push('Add staggered delays', 'Add parallax effects');
  } else if (/responsive|mobile|better|improve|premium/.test(lower)) {
    css += `\n\n@media(max-width:768px){.hero h1{font-size:2.5rem}.grid-2,.grid-3,.grid-4{grid-template-columns:1fr}.navbar{padding:1rem}}`;
    if (!css.includes('.fade-up')) css += `\n${cssAnimations()}`;
    summary = 'Enhanced responsive design with mobile-optimized breakpoints.';
    nextSteps.push('Test on devices', 'Add touch gestures');
  } else {
    const sectionName = lower.match(/add\s+(?:a\s+)?(\w+)/)?.[1] || 'section';
    const sectionHTML = `\n  <section class="fade-up" style="padding:5rem 2rem;text-align:center">\n    <h2 class="section-title">${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}</h2>\n    <p class="section-subtitle">This section was added based on your request.</p>\n    <div class="grid grid-3">\n      <div class="card"><div class="card-icon">&#128221;</div><h3>Feature One</h3><p>Description of the first feature.</p></div>\n      <div class="card"><div class="card-icon">&#128221;</div><h3>Feature Two</h3><p>Description of the second feature.</p></div>\n      <div class="card"><div class="card-icon">&#128221;</div><h3>Feature Three</h3><p>Description of the third feature.</p></div>\n    </div>\n  </section>\n`;
    html = html.replace('</body>', `${sectionHTML}</body>`);
    summary = `Added a new ${sectionName} section.`;
    nextSteps.push('Customize content', 'Add real data');
  }

  modifiedFiles.push({ path: 'index.html', content: html, action: 'modify' });
  modifiedFiles.push({ path: 'style.css', content: css, action: 'modify' });
  if (jsFile) modifiedFiles.push({ path: 'script.js', content: js, action: 'modify' });

  return {
    files: modifiedFiles,
    summary,
    nextSteps,
    metadata: { template: analysis.template, sections: ['modified'], estimatedComplexity: 'simple' },
  };
}

// ─── Template Router ───────────────────────────────────────────────

const TEMPLATE_BUILDERS: Record<string, (analysis: PromptAnalysis) => AIGenerationResponse> = {
  portfolio: buildPortfolio,
  saas: buildSaaS,
  restaurant: buildRestaurant,
  ecommerce: buildEcommerce,
  photography: buildPhotography,
  blog: buildBlog,
  dashboard: buildDashboard,
  webapp: buildWebApp,
  agency: buildAgency,
  event: buildEvent,
  realestate: buildPortfolio,
  fitness: buildPortfolio,
  startup: buildSaaS,
};

// ─── Main Generation Function ──────────────────────────────────────

function withGenerationGuidance(response: AIGenerationResponse, options?: AIGenerationOptions): AIGenerationResponse {
  if (!options?.skillBrief?.length && !options?.contextFiles?.length) return response;

  const guidanceNotes: string[] = [];
  if (options.contextFiles?.length) {
    guidanceNotes.push(`Context reviewed: ${options.contextFiles.slice(0, 5).join(', ')}.`);
  }
  if (options.skillBrief?.length) {
    guidanceNotes.push(`Applied ${options.skillBrief.length} active builder skill${options.skillBrief.length > 1 ? 's' : ''}.`);
  }

  return {
    ...response,
    summary: [response.summary, ...guidanceNotes].filter(Boolean).join(' '),
    nextSteps: response.nextSteps.filter(step => !/suggested next steps/i.test(step)),
  };
}

async function finalizeGenerationResponse(
  response: AIGenerationResponse,
  existingFiles: ProjectFile[],
  options?: AIGenerationOptions,
): Promise<AIGenerationResponse> {
  const guided = withGenerationGuidance(response, options);
  const compacted = compactFullFileModifications(guided, existingFiles);
  const fallbackPlan = [
    'Read current project context',
    'Apply structured file operations',
    'Validate in Joyful browser sandbox',
  ];
  const sandbox = await runBrowserSandboxChecks(compacted, existingFiles);

  return {
    ...compacted,
    metadata: {
      template: compacted.metadata?.template,
      sections: compacted.metadata?.sections || [],
      estimatedComplexity: compacted.metadata?.estimatedComplexity || 'medium',
      ...compacted.metadata,
      agentPlan: normalizeAgentPlan(compacted.metadata?.agentPlan, fallbackPlan),
      sandboxCommands: sandbox.commands,
      sandboxResults: sandbox.results,
    },
  };
}

export async function generateWithAI(
  prompt: string,
  existingFiles: ProjectFile[],
  conversationHistory: { role: string; content: string }[] = [],
  options?: AIGenerationOptions
): Promise<AIGenerationResponse> {
  if (joyfulProviderConfig.enabled) {
    try {
      const response = await generateWithJoyfulAI(prompt, existingFiles, conversationHistory, options);
      return withGenerationGuidance(response, options);
    } catch (error) {
      console.warn('Joyful AI API failed, falling back to local template builders:', error);
    }
  }

  await new Promise(resolve => setTimeout(resolve, 400));

  const analysis = analyzePrompt(prompt, existingFiles);

  if (analysis.intent === 'modify') {
    const modified = modifyExistingFiles(prompt, existingFiles, analysis);
    if (modified) {
      return finalizeGenerationResponse(modified, existingFiles, options);
    }
  }

  if (!/\b(static html|plain html|vanilla html|no react)\b/i.test(prompt)) {
    return finalizeGenerationResponse(buildReactTemplate(analysis, prompt), existingFiles, options);
  }

  const builder = TEMPLATE_BUILDERS[analysis.template] || buildPortfolio;
  return finalizeGenerationResponse(builder(analysis), existingFiles, options);
}

// ─── Streaming Support ─────────────────────────────────────────────

export async function* generateWithAIStream(
  prompt: string,
  existingFiles: ProjectFile[],
  _conversationHistory: { role: string; content: string }[] = []
): AsyncGenerator<AIStreamChunk> {
  const analysis = analyzePrompt(prompt, existingFiles);

  let response: AIGenerationResponse;
  if (analysis.intent === 'modify') {
    const modified = modifyExistingFiles(prompt, existingFiles, analysis);
    response = modified || (TEMPLATE_BUILDERS[analysis.template] || buildPortfolio)(analysis);
  } else if (!/\b(static html|plain html|vanilla html|no react)\b/i.test(prompt)) {
    response = buildReactTemplate(analysis, prompt);
  } else {
    response = (TEMPLATE_BUILDERS[analysis.template] || buildPortfolio)(analysis);
  }

  for (const file of response.files) {
    yield { type: 'file_start', data: { path: file.path } };

    const content = file.content || '';
    const chunkSize = 200;
    for (let i = 0; i < content.length; i += chunkSize) {
      const chunk = content.slice(i, i + chunkSize);
      yield { type: 'file_content', data: { path: file.path, content: chunk } };
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    yield { type: 'file_end', data: { path: file.path } };
  }

  yield { type: 'summary', data: { summary: response.summary } };

  if (response.metadata) {
    yield { type: 'metadata', data: { metadata: response.metadata } };
  }
}
