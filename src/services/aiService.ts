import type { AIGenerationResponse, AgentPlanStep, AIStreamChunk, ChatAttachment, FilePatchOperation, MediaAsset, ProjectFile, SandboxCommandRequest, SandboxCommandResult } from '@/types';
import { joyfulProviderConfig } from '@/services/joyfulProvider';
import { executeInSandbox, loadVirtualFS } from '@/services/clientSandbox';
import { describeAttachment } from '@/services/attachments';
import { inferImageQueries, searchImages } from '@/services/unsplashService';

interface AIGenerationOptions {
  skillBrief?: string[];
  skillManifest?: string[];
  contextFiles?: string[];
  memoryNotes?: string[];
  mediaAssets?: MediaAsset[];
  attachments?: ChatAttachment[];
  signal?: AbortSignal;
}

type JoyfulMessageContent = string | Array<
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
>;

const FETCH_TIMEOUT = 120_000;

async function fetchWithTimeout(url: string, options: RequestInit & { signal?: AbortSignal }, timeoutMs = FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const signal = options.signal
      ? combineSignals(options.signal, controller.signal)
      : controller.signal;
    return await fetch(url, { ...options, signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function combineSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

function stripImagesFromMessages<T extends { content?: JoyfulMessageContent }>(messages: T[]): T[] {
  return messages.map(message => {
    if (!message.content || typeof message.content === 'string') return message;
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

interface JoyfulToolCall {
  id?: string;
  type?: string;
  function?: JoyfulFunctionCall;
  name?: string;
  arguments?: unknown;
}

const JOYFUL_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_images',
      description: 'Search configured Unsplash image assets for a visual website section. Use when the site benefits from real imagery.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Visual search query, for example cinematic movie theater or restaurant food photography.' },
          count: { type: 'number', description: 'Number of images to return, between 1 and 8.' },
          orientation: { type: 'string', enum: ['landscape', 'portrait', 'squarish'] },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'List existing project file paths available in the current Joyful project.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read an existing project file by path before proposing targeted edits.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative project path to read.' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_file',
      description: 'Propose creating a project file.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'modify_file',
      description: 'Propose replacing a project file with complete content.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_file',
      description: 'Propose deleting a project file.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
        },
        required: ['path'],
      },
    },
  },
];

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

const AGENTIC_DEVELOPMENT_PROTOCOL = `Agentic development protocol:
1. Think like a coding agent: understand the request, inspect ranked context files, infer dependencies, plan, edit, validate, and repair.
2. Do not rewrite whole projects for normal feature work. Preserve existing design and code unless replacement is explicitly requested.
3. Prefer exact oldString/newString patches for existing files. Use full file content only for new files, deletes, or broad intentional rewrites.
4. For complex web apps, include all files needed for a coherent runnable implementation: package metadata, entry points, components, styles, utilities, and mock data when useful.
5. Treat validation as mandatory. Include sandboxCommands that prove the generated app can build or at least that the file tree is coherent.
6. BUILD MULTI-PAGE APPS WITH COMPONENT SEPARATION: For any website beyond a simple landing page, create separate files per page (src/pages/), shared components (src/components/), a Layout component for nav/footer, and use React Router for client-side routing. Never put all code in a single App.jsx file.
7. USE TYPESCRIPT: Generate .tsx/.ts files, not .jsx/.js, with proper type interfaces for props, state, and data models.
8. SPLIT BY CONCERN: Pages go in src/pages/, reusable components in src/components/, custom hooks in src/hooks/, types in src/types/, and utilities in src/lib/.
6. When validation or imports are likely to fail, repair in the same response instead of leaving undefined identifiers or missing files.
7. Keep user-facing copy concise and concrete; put unresolved work in nextSteps.
8. When building visual websites, use provided media assets automatically. The user does not need to ask for image sourcing by name.
9. Use available tools when you need to inspect file names/content or request more image assets, then return the final strict JSON file operation response.`;

function stripMarkdownJson(value: string) {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();
  return trimmed;
}

// Parse SSE (Server-Sent Events) streaming response
async function parseSSEResponse(res: Response): Promise<string> {
  let result = '';
  const reader = res.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue; // comment or empty

        // SSE data: prefix
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) result += delta;
          } catch {
            // Skip unparseable chunks
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return result;
}

function parseAIContent(content: string): AIGenerationResponse | null {
  try {
    const cleaned = stripMarkdownJson(content);
    const json = JSON.parse(cleaned);
    // Handle both { files: [...], patches: [...], summary: ... } and { choices: [{ message: { content: ... } }] } formats
    const result = json.files || json.patches ? json
      : json.choices?.[0]?.message?.content
        ? JSON.parse(stripMarkdownJson(json.choices[0].message.content))
        : null;
    if (!result || !result.summary) return null;
    return result as AIGenerationResponse;
  } catch {
    return null;
  }
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

function normalizeSandboxCommands(
  value: unknown,
  files: AIGenerationResponse['files'],
  projectFiles: Array<{ path: string; action?: 'create' | 'modify' | 'delete' }> = files,
): SandboxCommandRequest[] {
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

  const hasPackage = projectFiles.some(file => file.path === 'package.json' && file.action !== 'delete');
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

async function resolveMediaAssets(prompt: string, options?: AIGenerationOptions): Promise<MediaAsset[]> {
  if (options?.mediaAssets?.length) return options.mediaAssets;
  const queries = inferImageQueries(prompt, 6);
  if (queries.length === 0) return [];

  const assets: MediaAsset[] = [];
  for (const query of queries.slice(0, 4)) {
    if (options?.signal?.aborted) throw new Error('Request aborted');
    const images = await searchImages(query, query.includes('cinema') || query.includes('streaming') ? 3 : 2, 'landscape');
    for (const image of images) {
      assets.push({
        id: image.id,
        url: image.url,
        thumb: image.thumb,
        alt: image.alt,
        author: image.author,
        authorUrl: image.authorUrl,
        query,
      });
    }
    if (assets.length >= 10) break;
  }
  return assets.slice(0, 10);
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

function parseToolArguments(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(stripMarkdownJson(value));
      return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' ? value as Record<string, unknown> : {};
}

function extractToolCalls(message: Record<string, unknown>, rootJson: Record<string, unknown>): JoyfulToolCall[] {
  const calls: JoyfulToolCall[] = [];
  const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : Array.isArray(rootJson.tool_calls) ? rootJson.tool_calls : [];
  for (const call of toolCalls) {
    if (call && typeof call === 'object') calls.push(call as JoyfulToolCall);
  }
  const functionCall = message.function_call || rootJson.function_call;
  if (functionCall && typeof functionCall === 'object') calls.push(functionCall as JoyfulToolCall);
  const choiceFunctionCall = rootJson?.choices && Array.isArray(rootJson.choices)
    ? (rootJson.choices[0] as { function_call?: unknown })?.function_call
    : null;
  if (choiceFunctionCall && typeof choiceFunctionCall === 'object') calls.push(choiceFunctionCall as JoyfulToolCall);
  return calls;
}

async function executeJoyfulToolCall(
  call: JoyfulToolCall,
  existingFiles: ProjectFile[],
): Promise<{ type: string; name?: string; args: unknown; result?: unknown; pendingFileOp?: { name: 'create_file' | 'modify_file' | 'delete_file'; args: { path?: string; content?: string } } }> {
  const fn = call.function || call;
  const name = fn.name;
  const args = parseToolArguments(fn.arguments);

  if (name === 'list_files') {
    return { type: 'tool_result', name, args, result: existingFiles.map(file => file.path) };
  }

  if (name === 'read_file') {
    const path = typeof args.path === 'string' ? args.path.trim().replace(/^\/+/, '') : '';
    const file = existingFiles.find(item => item.path === path);
    return {
      type: file ? 'tool_result' : 'tool_error',
      name,
      args,
      result: file ? { path: file.path, content: file.content.slice(0, 16000) } : { error: `File not found: ${path}` },
    };
  }

  if (name === 'search_images') {
    const query = typeof args.query === 'string' ? args.query : 'modern website hero';
    const count = Math.max(1, Math.min(8, Number(args.count || 6)));
    const orientation = args.orientation === 'portrait' || args.orientation === 'squarish' ? args.orientation : 'landscape';
    const images = await searchImages(query, count, orientation);
    return {
      type: 'tool_result',
      name,
      args,
      result: images.map(image => ({
        id: image.id,
        url: image.url,
        thumb: image.thumb,
        alt: image.alt,
        author: image.author,
      })),
    };
  }

  if (name === 'create_file' || name === 'modify_file' || name === 'delete_file') {
    return {
      type: 'pending_file_operation',
      name,
      args,
      pendingFileOp: {
        name,
        args: {
          path: typeof args.path === 'string' ? args.path : undefined,
          content: typeof args.content === 'string' ? args.content : undefined,
        },
      },
    };
  }

  return { type: 'unknown_function', name, args };
}

function providerRejectedTools(status: number, bodyText: string) {
  return status >= 400 && /tools?|tool_choice|function_call|function/i.test(bodyText);
}

export async function runBrowserSandboxChecks(
  response: AIGenerationResponse,
  existingFiles: ProjectFile[],
): Promise<{ commands: SandboxCommandRequest[]; results: SandboxCommandResult[] }> {
  const generatedFiles = new Map(existingFiles.map(file => [file.path, file.content]));
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
  for (const file of response.files) {
    if (file.action === 'delete') generatedFiles.delete(file.path);
    else if (typeof file.content === 'string') generatedFiles.set(file.path, file.content);
  }

  loadVirtualFS(Array.from(generatedFiles.entries()).map(([path, content]) => ({ path, content })));

  const virtualProjectFiles = Array.from(generatedFiles.keys()).map(path => ({ path }));
  const commands = normalizeSandboxCommands(response.metadata?.sandboxCommands, response.files, virtualProjectFiles);
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
  const preferredPaths = options?.contextFiles || [];
  const priority = new Map(preferredPaths.map((path, index) => [path, index]));
  const filesForContext = [...existingFiles]
    .sort((left, right) => {
      const leftRank = priority.has(left.path) ? priority.get(left.path)! : Number.MAX_SAFE_INTEGER;
      const rightRank = priority.has(right.path) ? priority.get(right.path)! : Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) return leftRank - rightRank;
      const leftEntry = /(^package\.json$|^index\.html$|src\/(main|App)\.(tsx|jsx|ts|js)$|\.(css|scss)$)/i.test(left.path) ? 0 : 1;
      const rightEntry = /(^package\.json$|^index\.html$|src\/(main|App)\.(tsx|jsx|ts|js)$|\.(css|scss)$)/i.test(right.path) ? 0 : 1;
      return leftEntry - rightEntry || left.path.localeCompare(right.path);
    })
    .slice(0, 24)
    .map(file => {
      const selected = priority.has(file.path) ? 'selected context' : 'supporting context';
      return `--- ${file.path} (${selected}) ---\n${file.content.slice(0, priority.has(file.path) ? 16000 : 8000)}`;
    })
    .join('\n\n');
  const manifestText = options?.skillManifest?.length
    ? `\n\nAvailable skills manifest (load full instructions only when selected):\n${options.skillManifest.map(skill => `- ${skill}`).join('\n')}`
    : '';
  const skillText = options?.skillBrief?.length
    ? `\n\nSelected skill instructions for this request:\n${options.skillBrief.map(skill => `- ${skill}`).join('\n')}`
    : '';
  const contextText = options?.contextFiles?.length
    ? `\n\nRanked context files to inspect first:\n${options.contextFiles.map((path, index) => `${index + 1}. ${path}`).join('\n')}`
    : '';
  const memoryText = options?.memoryNotes?.length
    ? `\n\nProject memory from recent turns:\n${options.memoryNotes.slice(-12).map(note => `- ${note}`).join('\n')}\nRespect these decisions unless the user explicitly asks to change them.`
    : '';

  const attachments = options?.attachments || [];
  const mediaAssets = options?.mediaAssets || [];
  const attachmentText = attachments.length
    ? `\n\nAttached image references:\n${attachments.map(describeAttachment).map(item => `- ${item}`).join('\n')}\nUse the image content as visual context when the active model supports vision. If visual details are ambiguous, say so in the summary.`
    : '';
  const mediaText = mediaAssets.length
    ? `\n\nResolved website image assets from Unsplash:\n${mediaAssets.map((asset, index) => `${index + 1}. ${asset.url} — ${asset.alt} (query: ${asset.query}${asset.author ? `, by ${asset.author}` : ''})`).join('\n')}\nUse these URLs directly in generated img/background content when the site needs real imagery. Include useful alt text and avoid fake placeholder boxes.`
    : '';
  const userContentText = `User request:\n${prompt}${attachmentText}${mediaText}\n\nExisting files:\n${filesForContext || 'No existing files. Create a complete React/Vite project.'}`;
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
      content: `You are Joyful AI, an agentic website builder inside a React/Vite workspace. Follow a Vercel-style development loop, adapted for Joyful's browser sandbox: understand the request, inspect the ranked file context first, plan concrete tasks, generate complete file operations, choose browser-safe validation commands, and summarize what changed. Preserve existing project intent unless the user asks to replace it. Prefer React/Vite files, accessible UI, responsive layouts, valid imports, and concise copy. For existing-file maintenance, bug fixes, and feature additions, prefer targeted patches over full-file modifications when the exact target code is present. When using lineStart/lineEnd, include a reason and keep the range narrow; prefer exact oldString/newString when possible. Treat the available skill manifest as a catalog only, and treat the selected skill instructions as required constraints. Do not activate unrelated skills or assume unselected skills are in force. Apply the most specific selected skill first. Every imported local component, hook, or utility must be included as a file operation in the same response. Do not reference undefined identifiers. If you use icons from lucide-react, import every icon you reference. For complex apps, complete one coherent implementation pass and put any remaining work in nextSteps as concrete follow-up tasks. Prefer semantic markup, keyboard-friendly controls, explicit empty states, and build/lint/preview validation whenever the change affects behavior.\n\nBUILD MULTI-PAGE APPS WITH COMPONENT SEPARATION: For any website beyond a simple landing page, create separate files per page (src/pages/), shared components (src/components/ with Layout.tsx for nav/footer), and use React Router for client-side routing. Never put all code in a single App.jsx file. Use TypeScript (.tsx/.ts), not JavaScript. Pages go in src/pages/, reusable components in src/components/, custom hooks in src/hooks/, types in src/types/, and utilities in src/lib/. Use @ alias for src/ imports.\n\n${AGENTIC_DEVELOPMENT_PROTOCOL}${manifestText}${skillText}${contextText}${memoryText}\n\n${RESPONSE_SCHEMA_HINT}`,
    },
    ...conversationHistory
      .filter(message => message.role === 'user' || message.role === 'assistant')
      .slice(-20)
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

  const oldString = oldChanged.join('\n');
  const newString = newChanged.join('\n');
  if (oldString && oldString.length <= 4000 && existing.content.includes(oldString)) {
    return {
      path: file.path,
      action: 'patch',
      oldString,
      newString,
      lineStart: prefix + 1,
      lineEnd: prefix + Math.max(1, oldChanged.length),
      reason: 'Compressed model full-file modify response into a guarded exact-text patch.',
    };
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
      let activeMessages: Array<{ role: string; content?: JoyfulMessageContent | string; tool_call_id?: string; name?: string; tool_calls?: JoyfulToolCall[] }> = messages;
      let toolsEnabled = true;
      let imageFallbackAttempts = 0;
      let jsonRepairAttempts = 0;
      let validationRepairAttempts = 0;
      let lastError: string | null = null;
      const toolResults: { type: string; name?: string; args: unknown; result?: unknown }[] = [];
      const pendingFileOps: { name: 'create_file' | 'modify_file' | 'delete_file'; args: { path?: string; content?: string } }[] = [];

      for (let attempt = 0; attempt < 6; attempt++) {
      if (options?.signal?.aborted) {
        throw new Error('Request aborted');
      }

      const requestMessages = activeMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : m.role,
        content: m.content ?? '',
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
        ...(m.name ? { name: m.name } : {}),
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
      }));
      const payload = {
        model: model || 'qwen/qwen3-coder-480b-a35b-instruct',
        messages: requestMessages,
        temperature: 0.7,
        top_p: joyfulProviderConfig.topP || 0.8,
        frequency_penalty: 0,
        presence_penalty: 0,
        max_tokens: 16384,
        // Use streaming when no tool calls needed (last attempt) for progressive output
        stream: !toolsEnabled && attempt >= 3,
        ...(toolsEnabled ? { tools: JOYFUL_TOOLS, tool_choice: 'auto' } : {}),
      };

      const apiUrl = joyfulProviderConfig.invokeUrl;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      headers.Authorization = `Bearer ${joyfulProviderConfig.apiKey}`;
      if (payload.stream) {
        headers.Accept = 'text/event-stream';
      } else {
        headers.Accept = 'application/json';
      }

      const res = await fetchWithTimeout(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: options?.signal,
      });

      // Parse streaming response
      if (payload.stream && res.ok) {
        const fullContent = await parseSSEResponse(res);
        // Build a response object from streamed content
        const parsed = parseAIContent(fullContent);
        if (parsed) return parsed;
        // If parsing failed, fall through to retry
      }

      if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        if (toolsEnabled && providerRejectedTools(res.status, bodyText)) {
          toolsEnabled = false;
          continue;
        }
        const hasImagePayload = activeMessages.some(message => Array.isArray(message.content) && message.content.some(part => part.type === 'image_url'));
        if (hasImagePayload && imageFallbackAttempts < 1) {
          imageFallbackAttempts += 1;
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
      const message = (json?.choices?.[0]?.message || json?.message || {}) as Record<string, unknown>;
      const functionCalls = extractToolCalls(message, json as Record<string, unknown>);

      if (functionCalls.length > 0) {
        activeMessages = [
          ...activeMessages,
          {
            role: 'assistant',
            content: typeof message.content === 'string' ? message.content : '',
            tool_calls: toolsEnabled ? functionCalls : undefined,
          },
        ];

        for (const call of functionCalls) {
          const result = await executeJoyfulToolCall(call, existingFiles);
          toolResults.push({ type: result.type, name: result.name, args: result.args, result: result.result });
          if (result.pendingFileOp) pendingFileOps.push(result.pendingFileOp);

          if (result.type === 'tool_result' || result.type === 'tool_error') {
            activeMessages.push({
              role: toolsEnabled && call.id ? 'tool' : 'user',
              tool_call_id: call.id,
              name: result.name,
              content: JSON.stringify(result.result || {}),
            });
          }
        }

        activeMessages.push({
          role: 'user',
          content: 'Use the tool results above and return the final strict JSON response with file operations, patches, sandboxCommands, summary, and nextSteps.',
        });
        continue;
      }

      // Attempt to extract assistant text from common shapes
      const text = String(message.content || json?.choices?.[0]?.text || json?.output?.[0]?.content || '');
      if (!text.trim()) throw new Error('NVIDIA chat returned an empty response.');

      let parsed: unknown;
      try {
        parsed = JSON.parse(stripMarkdownJson(text));
      } catch (parseError) {
        if (jsonRepairAttempts < 1) {
          jsonRepairAttempts += 1;
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

      if (
        parsed &&
        typeof parsed === 'object' &&
        (Array.isArray((parsed as { files?: unknown }).files) || Array.isArray((parsed as { patches?: unknown }).patches))
      ) {
        const normalized = compactFullFileModifications(normalizeAIResponse(parsed), existingFiles);
        const sandbox = await runBrowserSandboxChecks(normalized, existingFiles);
        const failedChecks = sandbox.results.filter(result => result.status === 'error');
        if (failedChecks.length > 0 && validationRepairAttempts < 2) {
          validationRepairAttempts += 1;
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
          repaired: imageFallbackAttempts + jsonRepairAttempts + validationRepairAttempts > 0,
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
  if (/restaurant|food|menu|cafe|dining|pizza|sushi|bar|lounge|brewery/.test(lower)) template = 'restaurant';
  else if (/shop|store|ecommerce|e-commerce|product|buy|sell|cart|marketplace|retail/.test(lower)) template = 'ecommerce';
  else if (/real estate|realestate|property|properties|realtor|agent profile|mortgage|housing/.test(lower)) template = 'realestate';
  else if (/fitness|gym|trainer|workout|yoga|membership|crossfit|pilates/.test(lower)) template = 'fitness';
  else if (/photography|photographer|photo|masonry|lightbox/.test(lower)) template = 'photography';
  else if (/web app|application|complex app|project management|task manager|kanban|crm|portal|planner|workspace|inventory|booking|internal tool|erp/.test(lower)) template = 'webapp';
  else if (/startup|waitlist|early access/.test(lower)) template = 'startup';
  else if (/saas|app|software|landing|launch|platform/.test(lower)) template = 'saas';
  else if (/blog|article|editorial|post|news|magazine|journal/.test(lower)) template = 'blog';
  else if (/dashboard|admin|analytics|metrics|chart|kpi/.test(lower)) template = 'dashboard';
  else if (/agency|studio|creative|design/.test(lower)) template = 'agency';
  else if (/event|conference|meetup|summit|wedding|concert/.test(lower)) template = 'event';
  else if (/portfolio|personal|resume|cv|developer|designer|freelancer/.test(lower)) template = 'portfolio';

  const features: string[] = [];
  if (/pricing|price|plan|tier|subscription/.test(lower)) features.push('pricing');
  if (/contact|form|email|message|get in touch/.test(lower)) features.push('contact');
  if (/testimonial|review|feedback|quote|customer/.test(lower)) features.push('testimonials');
  if (/gallery|image|photo|portfolio|showcase/.test(lower)) features.push('gallery');
  if (/faq|question|faqs/.test(lower)) features.push('faq');
  if (/team|member|staff|people|about us/.test(lower)) features.push('team');
  if (/hero|banner|header/.test(lower)) features.push('hero');
  if (/about/.test(lower)) features.push('about');
  if (/service|feature|offering/.test(lower)) features.push('services');
  if (/blog|article|post|news/.test(lower)) features.push('blog');
  if (/schedule|calendar|event/.test(lower)) features.push('schedule');
  if (/stats|statistics|metric|counter/.test(lower)) features.push('stats');
  if (/dark|night|black/.test(lower)) features.push('dark-mode');
  if (/animation|animate|motion|scroll|parallax/.test(lower)) features.push('animations');
  if (/responsive|mobile/.test(lower)) features.push('responsive');
  if (/seo|meta|analytics/.test(lower)) features.push('seo');

  let colorScheme: 'light' | 'dark' | 'auto' = 'auto';
  if (/dark|night|black/.test(lower)) colorScheme = 'dark';
  else if (/light|bright|clean|white/.test(lower)) colorScheme = 'light';

  let industry = 'general';
  if (/tech|software|developer|coding|saas|startup/.test(lower)) industry = 'tech';
  else if (/food|restaurant|cafe|chef|baking|brewery/.test(lower)) industry = 'food';
  else if (/fashion|clothing|style|apparel|jewelry/.test(lower)) industry = 'fashion';
  else if (/health|medical|doctor|clinic|wellness|therapy/.test(lower)) industry = 'health';
  else if (/finance|bank|invest|crypto|fintech|insurance/.test(lower)) industry = 'finance';
  else if (/education|learn|course|school|academy|tutorial/.test(lower)) industry = 'education';
  else if (/travel|hotel|tourism|vacation|destination/.test(lower)) industry = 'travel';
  else if (/fitness|gym|sport|yoga|crossfit|martial/.test(lower)) industry = 'fitness';
  else if (/real estate|property|realtor|mortgage|housing/.test(lower)) industry = 'realestate';
  else if (/creative|design|art|photography|studio/.test(lower)) industry = 'creative';
  else if (/nonprofit|charity|foundation|ngo/.test(lower)) industry = 'nonprofit';
  else if (/music|band|musician|concert|festival/.test(lower)) industry = 'music';

  return { intent, template, features, colorScheme, industry };
}

// AI-assisted deep analysis — called when the provider is available for richer classification
async function deepAnalyzePrompt(prompt: string, existingFiles: ProjectFile[]): Promise<PromptAnalysis> {
  const basic = analyzePrompt(prompt, existingFiles);

  // If the AI provider is enabled, get a richer analysis
  if (!joyfulProviderConfig.apiKey && !joyfulProviderConfig.enabled) return basic;

  try {
    const systemMsg = `You are a classification system. Analyze the user's website request and return valid JSON only with these fields:
{
  "template": "${basic.template}" | "restaurant" | "ecommerce" | "portfolio" | "saas" | "blog" | "agency" | "fitness" | "photography" | "event" | "dashboard" | "webapp" | "startup" | "realestate",
  "features": string[],
  "industry": "${basic.industry}" | "tech" | "food" | "finance" | "health" | "education" | "travel" | "fashion" | "creative" | "nonprofit" | "music" | "general",
  "tone": "professional" | "playful" | "luxury" | "minimal" | "technical" | "editorial",
  "colorHint": "light" | "dark" | "auto",
  "pagesSuggested": string[],
  "estimatedPages": number
}
Use the user's prompt to infer the template type, industry features, intended tone, and number of pages needed.

Rules:
- If they mention "restaurant", "cafe", "menu", "food", the template is "restaurant".
- If they mention "shop", "store", "products", the template is "ecommerce".
- If they mention "blog", "articles", "news", the template is "blog".
- If they mention "app", "saas", "software", the template is "saas".
- If they want a personal site, "portfolio".
- Features like "pricing", "contact", "gallery", "team", "faq", "blog" should be inferred from the text.
- estimatedPages should be 1 for single-page, 3-5 for multi-page, 6+ for complex sites.`;

    const res = await fetchWithTimeout(joyfulProviderConfig.invokeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(joyfulProviderConfig.apiKey ? { Authorization: `Bearer ${joyfulProviderConfig.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: joyfulProviderConfig.model,
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: `Analyze this website request:\n\n${prompt.slice(0, 2000)}` },
        ],
        temperature: 0.1,
        max_tokens: 512,
        stream: false,
      }),
    }, 10_000);

    if (res.ok) {
      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = data?.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(stripMarkdownJson(content)) as {
          template?: string;
          features?: string[];
          industry?: string;
          colorHint?: string;
        };
        return {
          intent: basic.intent,
          template: parsed.template || basic.template,
          features: [...new Set([...basic.features, ...(parsed.features || [])])],
          colorScheme: parsed.colorHint === 'dark' ? 'dark' : parsed.colorHint === 'light' ? 'light' : basic.colorScheme,
          industry: parsed.industry || basic.industry,
        };
      }
    }
  } catch {
    // Fall through to basic analysis
  }

  return basic;
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

// ─── Component-Based Multi-Page App Generator ──────────────────────

interface GeneratedComponent {
  path: string;
  content: string;
}


function componentBasedPackageJson(appName: string): string {
  const safeName = appName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'joyful-app';
  return JSON.stringify({
    name: safeName,
    version: '1.0.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite --host 0.0.0.0',
      build: 'tsc -b && vite build',
      preview: 'vite preview --host 0.0.0.0',
      lint: 'eslint .',
    },
    dependencies: {
      react: 'latest',
      'react-dom': 'latest',
      'react-router-dom': '^7.15.1',
      'lucide-react': 'latest',
      '@hookform/resolvers': '^5.2.2',
      'react-hook-form': '^7.70.0',
      zod: '^4.3.5',
      clsx: '^2.1.1',
      'tailwind-merge': '^3.4.0',
      'class-variance-authority': '^0.7.1',
      'framer-motion': '^12.38.0',
      sonner: '^2.0.7',
    },
    devDependencies: {
      '@vitejs/plugin-react': 'latest',
      vite: 'latest',
      typescript: '~5.9.3',
      '@types/react': '^19.2.5',
      '@types/react-dom': '^19.2.3',
      tailwindcss: '^3.4.19',
      '@tailwindcss/vite': 'latest',
      autoprefixer: '^10.4.23',
      postcss: '^8.5.6',
    },
  }, null, 2);
}

function componentBasedTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      isolateModules: true,
      moduleDetection: 'force',
      noEmit: true,
      jsx: 'react-jsx',
      strict: true,
      noUnusedLocals: false,
      noUnusedParameters: false,
      noFallthroughCasesInSwitch: true,
      paths: { '@/*': ['./src/*'] },
      baseUrl: '.',
    },
    include: ['src'],
  }, null, 2);
}

function viteConfigWithAlias(): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});`;
}

function componentBasedIndexHtml(title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
}

function componentBasedMainTsx(): string {
  return `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster position="bottom-right" richColors />
    </BrowserRouter>
  </StrictMode>
);`;
}

function componentBasedIndexCss(): string {
  return `@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.546 0.245 262.881);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.965 0.001 286.375);
  --secondary-foreground: oklch(0.205 0.042 265.755);
  --muted: oklch(0.965 0.001 286.375);
  --muted-foreground: oklch(0.552 0.016 285.938);
  --accent: oklch(0.965 0.001 286.375);
  --accent-foreground: oklch(0.205 0.042 265.755);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0.004 286.32);
  --input: oklch(0.922 0.004 286.32);
  --ring: oklch(0.546 0.245 262.881);
  --radius: 0.625rem;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0.042 265.755);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0.042 265.755);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.546 0.245 262.881);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.269 0.015 284.56);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0.015 284.56);
  --muted-foreground: oklch(0.708 0.01 286.286);
  --accent: oklch(0.269 0.015 284.56);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(0.269 0.015 284.56);
  --input: oklch(0.269 0.015 284.56);
  --ring: oklch(0.546 0.245 262.881);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * { @apply border-border; }
  body {
    @apply bg-background text-foreground;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
}`;
}

function cnHelper(): string {
  return `import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`;
}

function componentTypesFile(): string {
  return `export interface NavLink {
  label: string;
  href: string;
}

export interface Feature {
  title: string;
  description: string;
  icon: string;
}

export interface Stat {
  value: string;
  label: string;
  detail?: string;
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  initials: string;
}

export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular: boolean;
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
}`;
}

function layoutComponent(navLinks: NavLink[]): string {
  const links = navLinks.map(l =>
    `  { label: '${l.label}', href: '${l.href}' }`
  ).join(',\n');
  return `import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navLinks: { label: string; href: string }[] = [
${links}
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <span className="text-primary">Joyful</span>
          </Link>
          <nav className="flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  pathname === link.href
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6 md:py-8">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Joyful. All rights reserved.
          </p>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href} className="hover:text-foreground transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}`;
}

function notFoundPage(): string {
  return `import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="text-xl text-muted-foreground">Page not found</p>
      <Link
        to="/"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}`;
}

interface NavLink { label: string; href: string }

function getTemplatePages(template: string, features: string[]): string[] {
  const pages: string[] = [];
  const f = new Set(features);

  const templateDefaults: Record<string, string[]> = {
    portfolio: ['about', 'gallery', 'contact'],
    saas: ['features', 'pricing', 'contact'],
    ecommerce: ['products', 'features', 'contact'],
    restaurant: ['menu', 'about', 'reservations'],
    blog: ['articles', 'about', 'contact'],
    agency: ['services', 'gallery', 'contact'],
    startup: ['about', 'pricing', 'contact'],
    fitness: ['classes', 'trainers', 'plans', 'contact'],
    photography: ['gallery', 'about', 'contact'],
    event: ['schedule', 'speakers', 'tickets', 'contact'],
    realestate: ['listings', 'agents', 'about', 'contact'],
    dashboard: ['overview', 'reports', 'settings'],
    webapp: ['dashboard', 'tasks', 'settings', 'team'],
  };

  const defaults = templateDefaults[template] || ['about', 'contact'];

  // Add template defaults
  for (const p of defaults) {
    if (!pages.includes(p)) pages.push(p);
  }

  // Add from features list
  if (f.has('pricing') && !pages.includes('pricing')) pages.push('pricing');
  if (f.has('contact') && !pages.includes('contact')) pages.push('contact');
  if (f.has('testimonials') && !pages.includes('testimonials')) pages.push('testimonials');
  if (f.has('gallery') && !pages.includes('gallery')) pages.push('gallery');
  if (f.has('faq') && !pages.includes('faq')) pages.push('faq');
  if (f.has('team') && !pages.includes('team')) pages.push('team');
  if (f.has('services') && !pages.includes('services')) pages.push('services');
  if (f.has('about') && !pages.includes('about')) pages.push('about');

  return pages;
}

function buildComponentTreeReactApp(
  analysis: PromptAnalysis,
  prompt: string,
  mediaAssets: MediaAsset[] = [],
): AIGenerationResponse {
  const p = pickPalette(analysis);
  const lower = prompt.toLowerCase();
  const appName = analysis.template.charAt(0).toUpperCase() + analysis.template.slice(1);

  const brandNameMatch = lower.match(/(?:shop|store|brand|site|company|business|name)\s*(?:name\s*)?(?:to|:|is|=|become|called)?\s*['"]?([a-z][a-z0-9\s&\-.]{1,40})['"]?/i);
  const brand = brandNameMatch
    ? brandNameMatch[1].trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : appName;

  const hasMultiPage = /about|contact|blog|pricing|services|gallery|faq|team|page|multi|route/.test(lower);
  const templatePages = getTemplatePages(analysis.template, analysis.features);
  const pages: string[] = [...new Set(['home', ...templatePages])];

  // Always add required pages based on prompt intent (deduped via Set at the end)
  if (hasMultiPage || lower.includes('about')) pages.push('about');
  if (hasMultiPage || /contact|form/.test(lower)) pages.push('contact');
  if (hasMultiPage || /pricing|plan/.test(lower)) pages.push('pricing');
  if (hasMultiPage || /blog|article|post/.test(lower)) pages.push('blog');
  if (hasMultiPage || /faq|question/.test(lower)) pages.push('faq');
  if (hasMultiPage || /services|feature/.test(lower)) pages.push('services');
  if (hasMultiPage || /team|staff|member/.test(lower)) pages.push('team');
  if (hasMultiPage || /gallery|portfolio|work/.test(lower)) pages.push('gallery');
  const dedupedPages = [...new Set(pages)];
  pages.length = 0;
  pages.push(...dedupedPages);

  const navLinks: NavLink[] = pages.filter(p => p !== 'home').map(p => ({
    label: p.charAt(0).toUpperCase() + p.slice(1),
    href: p === 'home' ? '/' : `/${p}`,
  }));
  if (navLinks.length === 0) {
    navLinks.push({ label: 'About', href: '/about' });
    if (!pages.includes('about')) pages.push('about');
  }
  if (!navLinks.some(l => l.href === '/contact')) {
    navLinks.push({ label: 'Contact', href: '/contact' });
    if (!pages.includes('contact')) pages.push('contact');
  }

  const files: GeneratedComponent[] = [];

  // App.tsx with React Router
  const pageImports = pages.map(p => {
    const name = p === 'home' ? 'HomePage' : p.charAt(0).toUpperCase() + p.slice(1) + 'Page';
    return `const ${name} = lazy(() => import('@/pages/${p === 'home' ? 'Home' : p.charAt(0).toUpperCase() + p.slice(1)}'));`;
  }).join('\n');

  const routes = pages.map(p => {
    const path = p === 'home' ? '/' : `/${p}`;
    const name = p === 'home' ? 'HomePage' : p.charAt(0).toUpperCase() + p.slice(1) + 'Page';
    return `          <Route path="${path}" element={<${name} />} />`;
  }).join('\n');

  files.push({
    path: 'src/App.tsx',
    content: `import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';

${pageImports}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
${routes}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}`,
  });

  // Generate each page
  for (const page of pages) {
    files.push(generatePageComponent(page, brand, analysis, p, navLinks, mediaAssets));
  }

  // Layout, 404, lib, types
  files.push({ path: 'src/components/Layout.tsx', content: layoutComponent(navLinks) });
  files.push({ path: 'src/pages/NotFound.tsx', content: notFoundPage() });
  files.push({ path: 'src/lib/utils.ts', content: cnHelper() });
  files.push({ path: 'src/types/index.ts', content: componentTypesFile() });

  const scaffoldFiles: { path: string; content: string }[] = [
    { path: 'package.json', content: componentBasedPackageJson(brand) },
    { path: 'tsconfig.json', content: componentBasedTsConfig() },
    { path: 'index.html', content: componentBasedIndexHtml(brand) },
    { path: 'src/main.tsx', content: componentBasedMainTsx() },
    { path: 'src/index.css', content: componentBasedIndexCss() },
    { path: 'vite.config.ts', content: viteConfigWithAlias() },
  ];

  // Include section component files if any page uses section-based composition
  const sectionCompositions: Record<string, string[]> = {
    home: ['hero', 'features', 'stats', 'cta'],
    features: ['features'],
    pricing: ['pricing', 'cta'],
    about: ['stats', 'cta'],
  };
  const sectionGenerators: Record<string, (brand: string, analysis: PromptAnalysis) => SectionDefinition> = {
    hero: (b, a) => sectionHero(b, a),
    features: (b, a) => sectionFeatures(b, a),
    pricing: (b) => sectionPricing(b),
    stats: (b, a) => sectionStats(b, a),
    cta: (b) => sectionCTA(b),
  };
  const usedSections = new Set<string>();
  for (const page of pages) {
    const comp = sectionCompositions[page];
    if (comp) for (const s of comp) usedSections.add(s);
  }
  for (const sectionName of usedSections) {
    const gen = sectionGenerators[sectionName];
    if (gen) {
      const section = gen(brand, analysis);
      scaffoldFiles.push({ path: section.filePath, content: section.content });
    }
  }

  const allFiles = [
    ...scaffoldFiles,
    ...files.map(f => ({ path: f.path, content: f.content })),
  ];

  // Build summary
  const pageNames = pages.map(p => p === 'home' ? 'Home' : p.charAt(0).toUpperCase() + p.slice(1));
  const summary = `Created a component-based multi-page ${analysis.template} app "${brand}" with ${pageNames.join(', ')} pages, React Router navigation, lazy loading, shared Layout component, Tailwind CSS v4 styling, dark mode support, and TypeScript.`;

  return {
    files: allFiles.map(f => ({ path: f.path, content: f.content, action: 'create' as const })),
    summary,
    nextSteps: [
      'Customize page content and colors',
      'Add real images and icons',
      'Connect forms to a backend API',
      'Add authentication if needed',
    ],
    metadata: {
      template: analysis.template,
      sections: ['react-router', 'components', 'lazy-loading', 'tailwind-v4', 'typescript', 'responsive'],
      estimatedComplexity: pages.length > 3 ? 'complex' : 'medium',
    },
  };
}

// ── Reusable section component generators ──────
// Each returns a complete React component file that can be composed into pages.

interface SectionDefinition {
  name: string;
  componentName: string;
  filePath: string;
  content: string;
}

function sectionHero(brand: string, _analysis: PromptAnalysis): SectionDefinition {
  return {
    name: 'hero',
    componentName: 'HeroSection',
    filePath: 'src/components/sections/HeroSection.tsx',
    content: `export default function HeroSection() {
  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      <div className="container relative z-10">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            ${brand}
          </h1>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl">
            Build something amazing.
          </p>
        </div>
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 to-transparent" />
    </section>
  );
}`,
  };
}

function sectionFeatures(_brand: string, _analysis: PromptAnalysis): SectionDefinition {
  const features = [
    { title: 'Lightning Fast', description: 'Built on modern tooling for instant feedback and rapid iteration.', icon: 'Zap' },
    { title: 'Type Safe', description: 'Full TypeScript support catches errors before they reach production.', icon: 'Shield' },
    { title: 'Responsive', description: 'Looks great on every device, from mobile to ultra-wide.', icon: 'Smartphone' },
    { title: 'Accessible', description: 'Built with a11y best practices to reach every user.', icon: 'Accessibility' },
  ];
  return {
    name: 'features',
    componentName: 'FeaturesSection',
    filePath: 'src/components/sections/FeaturesSection.tsx',
    content: `const features = ${JSON.stringify(features, null, 2)};

export default function FeaturesSection() {
  return (
    <section className="container py-16 md:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">Features</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Everything you need to build modern web applications.
        </p>
      </div>
      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <div key={feature.title} className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow">
            <h3 className="font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}`,
  };
}

function sectionPricing(_brand: string): SectionDefinition {
  return {
    name: 'pricing',
    componentName: 'PricingSection',
    filePath: 'src/components/sections/PricingSection.tsx',
    content: `const plans = [
  { name: 'Starter', price: '$0', period: 'forever', description: 'Perfect for getting started', popular: false },
  { name: 'Pro', price: '$29', period: '/month', description: 'For growing teams', popular: true },
  { name: 'Enterprise', price: 'Custom', period: '', description: 'For large organizations', popular: false },
];

export default function PricingSection() {
  return (
    <section className="container py-16 md:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">Simple pricing</h2>
        <p className="mt-4 text-lg text-muted-foreground">Start free, upgrade when you need more.</p>
      </div>
      <div className="mt-12 grid gap-8 md:grid-cols-3 mx-auto max-w-5xl">
        {plans.map((plan) => (
          <div key={plan.name} className={\`rounded-xl border bg-card p-8 \${plan.popular ? 'ring-2 ring-primary shadow-lg relative' : ''}\`}>
            {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">Most popular</span>}
            <h3 className="text-xl font-semibold">{plan.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
            <p className="mt-6"><span className="text-4xl font-bold">{plan.price}</span>{plan.period && <span className="text-muted-foreground">{plan.period}</span>}</p>
            <a href="/contact" className={\`mt-8 flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors \${plan.popular ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border border-input hover:bg-accent'}\`}>
              {plan.name === 'Enterprise' ? 'Contact sales' : 'Get started'}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}`,
  };
}

function sectionStats(_brand: string, _analysis: PromptAnalysis): SectionDefinition {
  return {
    name: 'stats',
    componentName: 'StatsSection',
    filePath: 'src/components/sections/StatsSection.tsx',
    content: `const stats = [
  { value: '99.9%', label: 'Uptime' },
  { value: '10k+', label: 'Users' },
  { value: '<50ms', label: 'Response' },
  { value: '4.9', label: 'Rating' },
];

export default function StatsSection() {
  return (
    <section className="border-y bg-muted/50">
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`,
  };
}

function sectionCTA(brand: string): SectionDefinition {
  return {
    name: 'cta',
    componentName: 'CTASection',
    filePath: 'src/components/sections/CTASection.tsx',
    content: `export default function CTASection() {
  return (
    <section className="container py-16 md:py-24">
      <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-8 md:p-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Ready to get started?</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Join thousands of teams building with ${brand}.
        </p>
        <a
          href="/contact"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          Get started free
        </a>
      </div>
    </section>
  );
}`,
  };
}

interface PageComposition {
  pageName: string;
  filePath: string;
  sections: string[];
}

// Build a page component that imports and composes sections
function composePageFromSections(
  _brand: string,
  _analysis: PromptAnalysis,
  composition: PageComposition,
): string {
  const imports = composition.sections
    .map(s => {
      const name = s.charAt(0).toUpperCase() + s.slice(1);
      return `import ${name}Section from '@/components/sections/${name}Section';`;
    })
    .join('\n');

  const usage = composition.sections
    .map(s => {
      const name = s.charAt(0).toUpperCase() + s.slice(1);
      return `      <${name}Section />`;
    })
    .join('\n');

  const pageTitle = composition.pageName.charAt(0).toUpperCase() + composition.pageName.slice(1);

  return `import { Link } from 'react-router-dom';
${imports}

export default function ${pageTitle}Page() {
  return (
    <>
${usage}
    </>
  );
}`;
}

function contactContent(_brand: string): string {
  return `import { useState } from 'react';
import { toast } from 'sonner';

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate form submission — replace with actual API call
    setTimeout(() => {
      toast.success("Message sent! We'll get back to you soon.");
      setFormData({ name: '', email: '', message: '' });
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <div className="container py-16 md:py-24">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">Contact us</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Have a question or want to work together? Send us a message and we&apos;ll get back to you shortly.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">Name</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Your name"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">Email</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-2">Message</label>
            <textarea
              id="message"
              rows={5}
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              className="flex min-h-[120px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="How can we help?"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Sending...' : 'Send message'}
          </button>
        </form>
      </div>
    </div>
  );
}`;
}

function servicesContent(_brand: string): string {
  return `export default function ServicesPage() {
  const services = [
    { title: 'Strategy', description: 'Market research, competitive analysis, and go-to-market planning to align your product with real user needs.', icon: '🎯' },
    { title: 'Design', description: 'User research, wireframing, visual design, and prototyping delivered with a systematic design thinking approach.', icon: '🎨' },
    { title: 'Development', description: 'Full-stack engineering using modern frameworks, with CI/CD, testing, and performance optimization built in.', icon: '⚙️' },
    { title: 'Growth', description: 'Conversion optimization, SEO, analytics infrastructure, and experimentation frameworks for data-driven teams.', icon: '📈' },
  ];

  return (
    <div className="container py-16 md:py-24">
      <div className="mx-auto max-w-3xl text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Our services</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          End-to-end capabilities for ambitious teams.
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {services.map((s) => (
          <article key={s.title} className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-4" aria-hidden="true">{s.icon}</div>
            <h2 className="text-xl font-semibold">{s.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
          </article>
        ))}
      </div>
    </div>
  );
}`;
}

function teamContent(brand: string): string {
  return `export default function TeamPage() {
  const members = [
    { name: 'Alex Chen', role: 'CEO & Founder', bio: 'Building products that matter. Previously led engineering at two YC-backed startups.', initials: 'AC' },
    { name: 'Sarah Kim', role: 'CTO', bio: 'Distributed systems architect with a passion for developer experience and platform reliability.', initials: 'SK' },
    { name: 'Marcus Johnson', role: 'Design Lead', bio: 'Award-winning product designer who believes form and function are inseparable.', initials: 'MJ' },
    { name: 'Priya Patel', role: 'Head of Growth', bio: 'Data-driven marketer who has scaled products from zero to millions of users.', initials: 'PP' },
  ];

  return (
    <div className="container py-16 md:py-24">
      <div className="mx-auto max-w-3xl text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Our team</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          The people behind ${brand}.
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {members.map((m) => (
          <article key={m.name} className="rounded-xl border bg-card p-6 text-center hover:shadow-md transition-shadow">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold" aria-hidden="true">{m.initials}</div>
            <h2 className="font-semibold">{m.name}</h2>
            <p className="text-sm text-primary">{m.role}</p>
            <p className="mt-2 text-xs text-muted-foreground">{m.bio}</p>
          </article>
        ))}
      </div>
    </div>
  );
}`;
}

function blogContent(_brand: string): string {
  return `export default function BlogPage() {
  const posts = [
    { category: 'Design', title: 'The Future of Web Design', excerpt: 'Emerging trends and technologies shaping the next generation of web interfaces.', readTime: '5 min read', date: 'Mar 15, 2026' },
    { category: 'Engineering', title: 'Scalable APIs with Edge Functions', excerpt: 'A practical guide to building serverless APIs that scale to zero and beyond.', readTime: '8 min read', date: 'Mar 10, 2026' },
    { category: 'Creative', title: 'Color Theory for Interfaces', excerpt: 'How to build accessible, emotionally resonant color systems that users love.', readTime: '6 min read', date: 'Mar 5, 2026' },
    { category: 'Product', title: 'Shipping at Startup Speed', excerpt: 'How small teams can move fast without breaking things.', readTime: '7 min read', date: 'Feb 28, 2026' },
    { category: 'Engineering', title: 'TypeScript Patterns for React', excerpt: 'Advanced type patterns that make your React code safer and more maintainable.', readTime: '10 min read', date: 'Feb 20, 2026' },
    { category: 'Design', title: 'Accessible Design Systems', excerpt: 'Building inclusive interfaces that work for everyone, from the ground up.', readTime: '4 min read', date: 'Feb 15, 2026' },
  ];

  return (
    <div className="container py-16 md:py-24">
      <div className="mx-auto max-w-3xl text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Latest articles</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Thoughts on design, engineering, and building great products.
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {posts.map((post) => (
          <article key={post.title} className="rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow">
            <div className="aspect-[16/9] bg-muted flex items-center justify-center text-3xl text-muted-foreground/30" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </div>
            <div className="p-5">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">{post.category}</p>
              <h2 className="mt-2 font-semibold leading-snug">{post.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{post.date}</span>
                <span>&middot;</span>
                <span>{post.readTime}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}`;
}

function faqContent(brand: string): string {
  return `import { useState } from 'react';

const faqs = [
  { q: 'How does ${brand} work?', a: 'Start by describing what you want to build. Our AI generates production-ready code with React, TypeScript, and Tailwind CSS. You can preview, edit, and export your site anytime.' },
  { q: 'Do I need coding experience?', a: 'No. Describe your vision in plain language and our AI handles the implementation. If you want to customize, the generated code is clean and well-organized.' },
  { q: 'Can I export my site?', a: 'Yes. Export complete HTML/CSS/JS or a full React project at any time. No lock-in, no proprietary formats.' },
  { q: 'Is there a free plan?', a: 'Yes. Generate and preview unlimited sites for free. Paid plans add custom domains, team collaboration, and priority support.' },
  { q: 'What technologies does it use?', a: 'React, TypeScript, Tailwind CSS v4, React Router, and Vite. Generated code follows modern best practices and is fully customizable.' },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="container py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-center">Frequently asked questions</h1>
        <p className="mt-4 text-lg text-muted-foreground text-center">
          Everything you need to know about ${brand}.
        </p>
        <div className="mt-12 space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl border bg-card overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between p-5 text-left font-medium hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-expanded={openIndex === i}
              >
                <span>{faq.q}</span>
                <svg
                  className={'h-5 w-5 text-muted-foreground transition-transform flex-shrink-0 ml-4 ' + (openIndex === i ? 'rotate-180' : '')}
                  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {openIndex === i && (
                <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}`;
}

function galleryContent(_brand: string): string {
  return `import { useState } from 'react';

const items = [
  { title: 'Mountain Light', category: 'Landscape', color: 'from-blue-400 to-indigo-500' },
  { title: 'Urban Pulse', category: 'Street', color: 'from-amber-400 to-red-500' },
  { title: 'Still Waters', category: 'Nature', color: 'from-teal-400 to-cyan-500' },
  { title: 'Golden Hour', category: 'Portrait', color: 'from-orange-400 to-pink-500' },
  { title: 'Deep Forest', category: 'Nature', color: 'from-green-400 to-emerald-500' },
  { title: 'City Lights', category: 'Urban', color: 'from-violet-400 to-purple-500' },
];

export default function GalleryPage() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="container py-16 md:py-24">
      <div className="mx-auto max-w-3xl text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Gallery</h1>
        <p className="mt-4 text-lg text-muted-foreground">A curated selection of work.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => setSelected(selected === i ? null : i)}
            className={'aspect-square rounded-xl bg-gradient-to-br ' + item.color + ' p-4 flex flex-col justify-end text-white text-left hover:scale-[1.03] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'}
            aria-label={'View ' + item.title}
          >
            <span className="font-semibold text-sm">{item.title}</span>
            <span className="text-xs opacity-80">{item.category}</span>
          </button>
        ))}
      </div>
      {selected !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-label={items[selected].title}
        >
          <div className={'max-w-lg w-full aspect-square rounded-2xl bg-gradient-to-br ' + items[selected].color + ' p-8 flex flex-col justify-end text-white'}>
            <h2 className="text-2xl font-bold">{items[selected].title}</h2>
            <p className="opacity-80">{items[selected].category}</p>
          </div>
          <button
            onClick={() => setSelected(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}`;
}

function generatePageComponent(
  page: string,
  brand: string,
  analysis: PromptAnalysis,
  _palette: ColorPalette,
  _navLinks: NavLink[],
  _mediaAssets: MediaAsset[],
): GeneratedComponent {

  // For known section-composable pages, try section-based composition
  const sectionCompositions: Record<string, string[]> = {
    home: ['hero', 'features', 'stats', 'cta'],
    features: ['features'],
    pricing: ['pricing', 'cta'],
    about: ['stats', 'cta'],
  };

  const sectionsForPage = sectionCompositions[page];
  if (sectionsForPage) {
    return {
      path: `src/pages/${page.charAt(0).toUpperCase() + page.slice(1)}.tsx`,
      content: composePageFromSections(brand, analysis, {
        pageName: page,
        filePath: `src/pages/${page.charAt(0).toUpperCase() + page.slice(1)}.tsx`,
        sections: sectionsForPage,
      }),
    };
  }

  switch (page) {
    case 'contact':
      return {
        path: 'src/pages/Contact.tsx',
        content: contactContent(brand),
      };

    case 'services':
      return {
        path: 'src/pages/Services.tsx',
        content: servicesContent(brand),
      };

    case 'team':
      return {
        path: 'src/pages/Team.tsx',
        content: teamContent(brand),
      };

    case 'blog':
      return {
        path: 'src/pages/Blog.tsx',
        content: blogContent(brand),
      };

    case 'faq':
      return {
        path: 'src/pages/FAQ.tsx',
        content: faqContent(brand),
      };

    case 'gallery':
      return {
        path: 'src/pages/Gallery.tsx',
        content: galleryContent(brand),
      };

    default:
      return {
        path: `src/pages/${page.charAt(0).toUpperCase() + page.slice(1)}.tsx`,
        content: `export default function ${page.charAt(0).toUpperCase() + page.slice(1)}Page() {
  return (
    <div className="container py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight">${page.charAt(0).toUpperCase() + page.slice(1)}</h1>
        <p className="mt-6 text-lg text-muted-foreground">
          This page is part of the ${brand} application. Edit this file to add your content.
        </p>
      </div>
    </div>
  );
}`,
      };
  }
}

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

interface PageLink { label: string; file: string; }

function navMultiPage(p: ColorPalette, pages: PageLink[], current: string): string {
  const items = pages.map(pl =>
    `      <li><a href="${pl.file}"${pl.file === current ? ` class="active" style="color:${p.primary};font-weight:600"` : ''}>${pl.label}</a></li>`
  ).join('\n');
  return `  <nav class="navbar" style="background:${p.bg};border-bottom:1px solid ${p.border}">
    <div class="logo" style="color:${p.primary}">Site</div>
    <button class="menu-toggle" aria-label="Toggle menu">&#9776;</button>
    <ul class="nav-links">
${items}
    </ul>
  </nav>`;
}

function pageDoc(title: string, p: ColorPalette, navPages: PageLink[], current: string, bodyContent: string): string {
  return htmlDoc(title,
    `<link rel="stylesheet" href="style.css">`,
    `${navMultiPage(p, navPages, current)}
${bodyContent}
${footerHTML(p)}`
  );
}

function heroHTML(p: ColorPalette, title: string, subtitle: string, cta: string, ctaHref = '#contact'): string {
  return `  <section class="hero" style="background:${p.gradient}">
    <h1>${title}</h1>
    <p>${subtitle}</p>
    <a href="${ctaHref}" class="btn btn-primary" style="background:${p.bg};color:${p.primary}">${cta}</a>
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

function buildStreamingTemplate(mediaAssets: MediaAsset[] = []): AIGenerationResponse {
  const fallbackImages: MediaAsset[] = [
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&h=760&fit=crop&q=80',
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=900&h=560&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=900&h=560&fit=crop&q=80',
    'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=900&h=560&fit=crop&q=80',
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=900&h=560&fit=crop&q=80',
    'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=900&h=560&fit=crop&q=80',
  ].map((url, index) => ({
    id: `fallback_stream_${index}`,
    url,
    thumb: url,
    alt: 'Cinematic streaming artwork',
    query: 'cinematic streaming fallback',
  }));
  const assets = mediaAssets.length >= 4 ? mediaAssets : fallbackImages;
  const titles = ['Midnight Signal', 'The Last Horizon', 'Neon District', 'Archive 72', 'Parallel Lives', 'Northbound', 'Signal Room', 'The Glass City'];
  const genres = ['Thriller', 'Sci-Fi', 'Drama', 'Mystery', 'Action', 'Documentary'];
  const rows = [
    { title: 'Trending now', filter: 'trending' },
    { title: 'Because you watched thrillers', filter: 'thriller' },
    { title: 'New releases', filter: 'new' },
  ];
  const cards = Array.from({ length: 12 }).map((_, index) => {
    const asset = assets[index % assets.length];
    return {
      id: index + 1,
      title: titles[index % titles.length],
      genre: genres[index % genres.length],
      match: `${92 - (index % 8)}% match`,
      year: 2026 - (index % 6),
      image: asset.url,
      alt: asset.alt || `${titles[index % titles.length]} poster`,
      row: rows[index % rows.length].filter,
    };
  });

  const dataStr = JSON.stringify({ rows, cards }, null, 2);

  const navbarComponent = `import React from 'react';

interface NavbarProps {
  query: string;
  onQueryChange: (value: string) => void;
}

export default function Navbar({ query, onQueryChange }: NavbarProps) {
  return (
    <nav className="topbar">
      <div className="brand">StreamFlix</div>
      <div className="links"><span>Home</span><span>Series</span><span>Movies</span><span>My List</span></div>
      <input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="Search titles" />
    </nav>
  );
}`;

  const heroComponent = `import React from 'react';

interface HeroCardProps {
  title: string;
  image: string;
  alt: string;
  match: string;
  year: number;
  genre: string;
}

export default function HeroCard({ title, image, alt, match, year, genre }: HeroCardProps) {
  return (
    <section
      className="hero"
      style={{
        backgroundImage: \`linear-gradient(90deg, rgba(5,5,8,.96), rgba(5,5,8,.55), rgba(5,5,8,.12)), url(\${image})\`,
      }}
    >
      <p className="eyebrow">Original series</p>
      <h1>{title}</h1>
      <p>A cinematic streaming experience with curated rows, search, genre filters, responsive artwork, and production-ready visual hierarchy.</p>
      <div className="actions">
        <button type="button">Play</button>
        <button type="button" className="secondary">More info</button>
      </div>
    </section>
  );
}`;

  const genreFilterComponent = `import React from 'react';

interface GenreFilterProps {
  genres: string[];
  activeGenre: string;
  onGenreChange: (genre: string) => void;
}

export default function GenreFilter({ genres, activeGenre, onGenreChange }: GenreFilterProps) {
  return (
    <section className="filters">
      {genres.map((genre) => (
        <button
          key={genre}
          type="button"
          onClick={() => onGenreChange(genre)}
          className={activeGenre === genre ? 'active' : ''}
        >
          {genre}
        </button>
      ))}
    </section>
  );
}`;

  const movieRowComponent = `import React from 'react';

interface MovieCard {
  id: number;
  title: string;
  image: string;
  alt: string;
  match: string;
  year: number;
  genre: string;
}

interface MovieRowProps {
  title: string;
  cards: MovieCard[];
}

function MovieCard({ card }: { card: MovieCard }) {
  return (
    <article className="card">
      <img src={card.image} alt={card.alt} loading="lazy" />
      <div className="card-body">
        <h3>{card.title}</h3>
        <p><strong>{card.match}</strong> \u00b7 {card.year} \u00b7 {card.genre}</p>
      </div>
    </article>
  );
}

export default function MovieRow({ title, cards }: MovieRowProps) {
  if (cards.length === 0) return null;
  return (
    <section className="rail">
      <h2>{title}</h2>
      <div className="cards">
        {cards.map((card) => (
          <MovieCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}`;

  const app = `import React, { useMemo, useState } from 'react';
import data from './data.json';
import Navbar from './components/Navbar';
import HeroCard from './components/HeroCard';
import GenreFilter from './components/GenreFilter';
import MovieRow from './components/MovieRow';

export default function App() {
  const { rows, cards } = data;
  const [query, setQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');
  const genres = ['All', ...Array.from(new Set(cards.map((card: any) => card.genre)))];
  const hero = cards[0];

  const filteredCards = useMemo(() => cards.filter((card: any) => {
    const matchesQuery = [card.title, card.genre].join(' ').toLowerCase().includes(query.toLowerCase());
    const matchesGenre = activeGenre === 'All' || card.genre === activeGenre;
    return matchesQuery && matchesGenre;
  }), [activeGenre, query]);

  return (
    <main className="stream-app">
      <Navbar query={query} onQueryChange={setQuery} />
      <HeroCard title={hero.title} image={hero.image} alt={hero.alt} match={hero.match} year={hero.year} genre={hero.genre} />
      <GenreFilter genres={genres} activeGenre={activeGenre} onGenreChange={setActiveGenre} />
      {rows.map((row: any) => (
        <MovieRow key={row.filter} title={row.title} cards={filteredCards.filter((card: any) => card.row === row.filter)} />
      ))}
    </main>
  );
}`;

  const css = `:root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #050508; color: #fff; }
* { box-sizing: border-box; }
body { margin: 0; background: #050508; }
button, input { font: inherit; }
.stream-app { min-height: 100vh; background: radial-gradient(circle at top right, rgba(229,9,20,.24), transparent 28rem), #050508; }
.topbar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 1.4rem; padding: 1rem clamp(1rem, 4vw, 3rem); background: linear-gradient(180deg, rgba(5,5,8,.96), rgba(5,5,8,.72)); backdrop-filter: blur(18px); }
.brand { color: #e50914; font-size: 1.55rem; font-weight: 950; letter-spacing: .02em; }
.links { display: flex; gap: 1rem; color: rgba(255,255,255,.78); font-size: .9rem; }
.topbar input { margin-left: auto; width: min(260px, 36vw); border: 1px solid rgba(255,255,255,.16); border-radius: 999px; background: rgba(255,255,255,.08); color: white; padding: .7rem 1rem; outline: none; }
.hero { min-height: 66vh; display: flex; flex-direction: column; justify-content: center; padding: clamp(2rem, 6vw, 5rem); background-size: cover; background-position: center; }
.eyebrow { margin: 0 0 .7rem; color: #e50914; font-size: .78rem; font-weight: 900; text-transform: uppercase; letter-spacing: .16em; }
h1 { margin: 0; max-width: 760px; font-size: clamp(3rem, 8vw, 7rem); line-height: .9; letter-spacing: -.06em; }
.hero p:not(.eyebrow) { max-width: 620px; color: rgba(255,255,255,.78); font-size: 1.08rem; line-height: 1.65; }
.actions { display: flex; gap: .8rem; margin-top: 1rem; }
.actions button, .filters button { border: 0; border-radius: .45rem; padding: .85rem 1.15rem; font-weight: 850; cursor: pointer; }
.actions button { background: #fff; color: #050508; }
.actions .secondary { background: rgba(255,255,255,.18); color: #fff; }
.filters { display: flex; gap: .5rem; overflow-x: auto; padding: 1.2rem clamp(1rem, 4vw, 3rem) 0; }
.filters button { flex-shrink: 0; background: rgba(255,255,255,.08); color: rgba(255,255,255,.76); border: 1px solid rgba(255,255,255,.12); padding: .55rem .9rem; border-radius: 999px; }
.filters button.active { background: #e50914; color: #fff; border-color: #e50914; }
.rail { padding: 1.3rem clamp(1rem, 4vw, 3rem); }
.rail h2 { margin: 0 0 .8rem; font-size: clamp(1.25rem, 2vw, 1.8rem); }
.cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .85rem; }
.card { overflow: hidden; border-radius: .65rem; background: #16161c; border: 1px solid rgba(255,255,255,.08); transition: transform .18s ease, border-color .18s ease; }
.card:hover { transform: translateY(-4px) scale(1.01); border-color: rgba(229,9,20,.55); }
.card img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; background: #222; }
.card-body { padding: .8rem; }
.card h3 { margin: 0 0 .35rem; font-size: 1rem; }
.card p { margin: 0; color: rgba(255,255,255,.65); font-size: .84rem; }
.card strong { color: #46d369; }
@media (max-width: 900px) { .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } .links { display: none; } .topbar { gap: .8rem; } }
@media (max-width: 560px) { .hero { min-height: 58vh; } .cards { grid-template-columns: 1fr; } .topbar input { width: 42vw; } .actions { flex-direction: column; align-items: flex-start; } }`;

  return {
    files: [
      { path: 'package.json', content: reactPackageJson('streamflix'), action: 'create' },
      { path: 'index.html', content: reactIndexHtml('StreamFlix'), action: 'create' },
      { path: 'src/main.jsx', content: reactMainFile(), action: 'create' },
      { path: 'src/App.jsx', content: app, action: 'create' },
      { path: 'src/data.json', content: dataStr, action: 'create' },
      { path: 'src/components/Navbar.jsx', content: navbarComponent, action: 'create' },
      { path: 'src/components/HeroCard.jsx', content: heroComponent, action: 'create' },
      { path: 'src/components/GenreFilter.jsx', content: genreFilterComponent, action: 'create' },
      { path: 'src/components/MovieRow.jsx', content: movieRowComponent, action: 'create' },
      { path: 'src/styles.css', content: css, action: 'create' },
      { path: 'vite.config.js', content: reactViteConfig(), action: 'create' },
      { path: 'README.md', content: `# StreamFlix\n\nNetflix-style streaming UI generated by Joyful with component-based architecture.\n\nComponents:\n- Navbar — with search input\n- HeroCard — hero section with backdrop image\n- GenreFilter — genre pill buttons\n- MovieRow — horizontal card rail\n\nImage assets are remote URLs; replace with licensed production artwork before launch.\n`, action: 'create' },
    ],
    summary: `Created a streaming React app with component architecture (Navbar, HeroCard, GenreFilter, MovieRow), hero artwork, searchable rails, genre filters, responsive poster cards, and ${mediaAssets.length ? `${mediaAssets.length} Unsplash asset references` : 'fallback cinematic image URLs'}.`,
    nextSteps: ['Connect a real movie catalog API', 'Add detail pages and playback modal', 'Add auth profiles and watchlist persistence', 'Replace demo imagery with licensed production assets'],
    metadata: { template: 'streaming', sections: ['hero', 'rails', 'search', 'filters', 'components', 'unsplash-media'], estimatedComplexity: 'complex', mediaAssets: assets },
  };
}

function buildAdvancedWebAppTemplate(prompt: string): AIGenerationResponse {
  const lower = prompt.toLowerCase();
  const isProject = /project|kanban|task|sprint|roadmap/.test(lower);
  const isInventory = /inventory|stock|warehouse|orders?/.test(lower);
  const isBooking = /booking|reservation|appointment|schedule/.test(lower);
  const productName = isProject ? 'ProjectOS' : isInventory ? 'StockPilot' : isBooking ? 'BookingDesk' : 'Northstar CRM';
  const entityName = isProject ? 'project' : isInventory ? 'item' : isBooking ? 'booking' : 'deal';
  const seedRecords = isProject
    ? [
      { id: 1, name: 'Client portal launch', owner: 'Maya', company: 'Acme Studio', stage: 'In progress', priority: 'High', value: 74000, due: '2026-06-04', notes: 'Auth handoff and billing screens need QA.' },
      { id: 2, name: 'Analytics redesign', owner: 'Noah', company: 'BrightLayer', stage: 'Review', priority: 'Medium', value: 42000, due: '2026-06-11', notes: 'Executive summary cards are ready for review.' },
      { id: 3, name: 'Mobile onboarding', owner: 'Iris', company: 'Orbit Labs', stage: 'Backlog', priority: 'Low', value: 28000, due: '2026-06-20', notes: 'Waiting for final copy and product screenshots.' },
    ]
    : isInventory
      ? [
        { id: 1, name: 'Aero desk lamp', owner: 'Maya', company: 'North warehouse', stage: 'Low stock', priority: 'High', value: 34, due: '2026-05-28', notes: 'Reorder threshold hit after wholesale order.' },
        { id: 2, name: 'Canvas travel tote', owner: 'Noah', company: 'Retail floor', stage: 'Available', priority: 'Medium', value: 126, due: '2026-06-02', notes: 'Seasonal display item with steady velocity.' },
        { id: 3, name: 'Core runner', owner: 'Iris', company: 'West warehouse', stage: 'Reserved', priority: 'Low', value: 58, due: '2026-06-09', notes: 'Reserved for marketplace fulfillment.' },
      ]
      : isBooking
        ? [
          { id: 1, name: 'Enterprise demo', owner: 'Maya', company: 'Acme Studio', stage: 'Confirmed', priority: 'High', value: 12, due: '2026-05-27', notes: 'Needs Zoom link and product specialist.' },
          { id: 2, name: 'Onboarding workshop', owner: 'Noah', company: 'BrightLayer', stage: 'Pending', priority: 'Medium', value: 8, due: '2026-05-30', notes: 'Waiting for attendee list.' },
          { id: 3, name: 'Renewal review', owner: 'Iris', company: 'Orbit Labs', stage: 'Confirmed', priority: 'Low', value: 5, due: '2026-06-06', notes: 'Add usage report before the call.' },
        ]
        : [
          { id: 1, name: 'Acme expansion', owner: 'Maya', company: 'Acme Studio', stage: 'Qualified', priority: 'High', value: 86000, due: '2026-06-03', notes: 'Legal review complete. Procurement call scheduled.' },
          { id: 2, name: 'BrightLayer renewal', owner: 'Noah', company: 'BrightLayer', stage: 'Proposal', priority: 'Medium', value: 52000, due: '2026-06-12', notes: 'Needs security addendum and champion follow-up.' },
          { id: 3, name: 'Orbit pilot', owner: 'Iris', company: 'Orbit Labs', stage: 'Discovery', priority: 'Low', value: 24000, due: '2026-06-21', notes: 'Product fit is strong, budget timing uncertain.' },
        ];
  const seedContacts = [
    { id: 1, name: 'Priya Shah', role: 'VP Operations', email: 'priya@example.com', health: 'Strong', lastTouch: 'Today' },
    { id: 2, name: 'Daniel Kim', role: 'Head of Revenue', email: 'daniel@example.com', health: 'Watch', lastTouch: 'Yesterday' },
    { id: 3, name: 'Elena Rossi', role: 'Founder', email: 'elena@example.com', health: 'New', lastTouch: 'May 20' },
  ];
  const seedTasks = [
    { id: 1, text: 'Send pricing comparison', done: false, owner: 'Maya' },
    { id: 2, text: 'Review import validation', done: true, owner: 'Noah' },
    { id: 3, text: 'Prepare stakeholder summary', done: false, owner: 'Iris' },
  ];

  const dataStr = JSON.stringify({ seedRecords, seedContacts, seedTasks }, null, 2);
  const storageKeyName = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const sidebarComponent = `import React from 'react';

interface RouteItem {
  id: string;
  label: string;
  path: string;
}

const routes: RouteItem[] = [
  { id: 'overview', label: 'Overview', path: '/' },
  { id: 'pipeline', label: '${isProject ? 'Projects' : isInventory ? 'Inventory' : isBooking ? 'Bookings' : 'Pipeline'}', path: '/pipeline' },
  { id: 'contacts', label: 'Contacts', path: '/contacts' },
  { id: 'settings', label: 'Settings', path: '/settings' }
];

export function getRoutes() { return routes; }

export default function Sidebar({ activeRoute, onNavigate }: { activeRoute: string; onNavigate: (id: string) => void }) {
  return (
    <aside className="sidebar" aria-label="Workspace navigation">
      <div className="logo">N</div>
      <nav>
        {routes.map((item) => (
          <button key={item.id} onClick={() => onNavigate(item.id)} className={activeRoute === item.id ? 'active' : ''}>{item.label}</button>
        ))}
      </nav>
    </aside>
  );
}`;

  const metricsComponent = `import React from 'react';

interface Metric {
  label: string;
  value: string;
  detail: string;
}

export default function MetricsGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="metrics">
      {metrics.map((metric) => (
        <article key={metric.label} className="metric">
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <small>{metric.detail}</small>
        </article>
      ))}
    </div>
  );
}`;

  const workCardComponent = `import React from 'react';

interface Record {
  id: number;
  name: string;
  company: string;
  owner: string;
  stage: string;
  priority: string;
  value: number;
  due: string;
  notes: string;
}

function currency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

interface WorkCardProps {
  record: Record;
  onDelete: (id: number) => void;
  onStageChange: (id: number, stage: string) => void;
  stages: string[];
}

export default function WorkCard({ record, onDelete, onStageChange, stages }: WorkCardProps) {
  return (
    <article className="work-card">
      <div className="card-head">
        <span className={'badge ' + record.priority}>{record.priority}</span>
        <button onClick={() => onDelete(record.id)} aria-label={'Delete ' + record.name}>Delete</button>
      </div>
      <h3>{record.name}</h3>
      <p>{record.notes}</p>
      <dl>
        <div><dt>Owner</dt><dd>{record.owner}</dd></div>
        <div><dt>Value</dt><dd>{currency(Number(record.value || 0))}</dd></div>
        <div><dt>Due</dt><dd>{record.due}</dd></div>
      </dl>
      <select
        value={record.stage}
        onChange={(e) => onStageChange(record.id, e.target.value)}
        aria-label={'Stage for ' + record.name}
      >
        {stages.filter((s) => s !== 'All').map((s) => <option key={s}>{s}</option>)}
      </select>
    </article>
  );
}`;

  const contactListComponent = `import React from 'react';

interface Contact {
  id: number;
  name: string;
  role: string;
  email: string;
  health: string;
  lastTouch: string;
}

export default function ContactList({ contacts }: { contacts: Contact[] }) {
  return (
    <div className="table">
      {contacts.map((contact) => (
        <article key={contact.id} className="table-row">
          <div><strong>{contact.name}</strong><span>{contact.role}</span></div>
          <a href={'mailto:' + contact.email}>{contact.email}</a>
          <span className={'health ' + contact.health}>{contact.health}</span>
          <span>{contact.lastTouch}</span>
        </article>
      ))}
    </div>
  );
}`;

  const taskChecklistComponent = `import React from 'react';

interface Task {
  id: number;
  text: string;
  done: boolean;
  owner: string;
}

export default function TaskChecklist({ tasks, onToggle }: { tasks: Task[]; onToggle: (id: number) => void }) {
  return (
    <div>
      {tasks.map((task) => (
        <label key={task.id} className="task">
          <input type="checkbox" checked={task.done} onChange={() => onToggle(task.id)} />
          <span>{task.text}</span>
          <small>{task.owner}</small>
        </label>
      ))}
    </div>
  );
}`;

  const app = `import React, { useEffect, useMemo, useState } from 'react';
import data from './data.json';
import Sidebar, { getRoutes } from './components/Sidebar';
import MetricsGrid from './components/MetricsGrid';
import WorkCard from './components/WorkCard';
import ContactList from './components/ContactList';
import TaskChecklist from './components/TaskChecklist';

const storageKey = '${storageKeyName}-state';
const routes = getRoutes();

function routeFromPath(path: string) {
  const clean = path === '/' ? 'overview' : String(path || '/').replace(/^\\//, '');
  return routes.some((item: any) => item.id === clean) ? clean : 'overview';
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    return {
      records: Array.isArray(saved.records) ? saved.records : data.seedRecords,
      contacts: Array.isArray(saved.contacts) ? saved.contacts : data.seedContacts,
      tasks: Array.isArray(saved.tasks) ? saved.tasks : data.seedTasks,
      compactMode: Boolean(saved.compactMode),
      weeklyDigest: saved.weeklyDigest !== false
    };
  } catch {
    return { records: data.seedRecords, contacts: data.seedContacts, tasks: data.seedTasks, compactMode: false, weeklyDigest: true };
  }
}

function currency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export default function App() {
  const [route, setRoute] = useState(() => routeFromPath(window.__JOYFUL_PREVIEW_PATH || window.location.pathname || '/'));
  const [state, setState] = useState(loadState);
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState('All');
  const [draft, setDraft] = useState({ name: '', company: '', owner: 'Maya', value: '', due: '', priority: 'Medium', stage: 'Qualified', notes: '' });
  const stages = useMemo(() => ['All', ...Array.from(new Set(state.records.map((r: any) => r.stage)))], [state.records]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state]);

  const navigate = (nextRoute: string) => {
    const match = routes.find((item: any) => item.id === nextRoute) || routes[0];
    window.history.pushState(null, '', match.path);
    setRoute(match.id);
  };

  useEffect(() => {
    const onPop = () => setRoute(routeFromPath(window.__JOYFUL_PREVIEW_PATH || window.location.pathname || '/'));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const filteredRecords = useMemo(() => state.records.filter((record: any) => {
    const haystack = [record.name, record.company, record.owner, record.stage, record.priority, record.notes].join(' ').toLowerCase();
    return (stage === 'All' || record.stage === stage) && haystack.includes(query.toLowerCase());
  }), [query, stage, state.records]);

  const metrics = useMemo(() => {
    const totalValue = state.records.reduce((sum: number, r: any) => sum + Number(r.value || 0), 0);
    const urgent = state.records.filter((r: any) => r.priority === 'High').length;
    const doneTasks = state.tasks.filter((t: any) => t.done).length;
    const strongContacts = state.contacts.filter((c: any) => c.health === 'Strong').length;
    return [
      { label: 'Open ${entityName}s', value: String(state.records.length), detail: urgent + ' high priority' },
      { label: isNaN(totalValue) ? 'Capacity' : 'Pipeline value', value: isNaN(totalValue) ? String(state.records.length) : currency(totalValue), detail: 'Live from saved records' },
      { label: 'Task progress', value: doneTasks + '/' + state.tasks.length, detail: 'Checklist completion' },
      { label: 'Contact health', value: String(strongContacts), detail: 'Strong relationships' }
    ];
  }, [state]);

  const submitRecord = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = draft.name.trim();
    if (!trimmedName) return;
    const nextRecord = {
      id: Date.now(),
      name: trimmedName,
      company: draft.company.trim() || 'New account',
      owner: draft.owner,
      stage: draft.stage,
      priority: draft.priority,
      value: Number(draft.value) || 0,
      due: draft.due || new Date().toISOString().slice(0, 10),
      notes: draft.notes.trim() || 'Created from the quick add form.'
    };
    setState((current: any) => ({ ...current, records: [nextRecord, ...current.records] }));
    setDraft({ name: '', company: '', owner: 'Maya', value: '', due: '', priority: 'Medium', stage: 'Qualified', notes: '' });
  };

  const updateStage = (id: number, nextStage: string) => {
    setState((current: any) => ({
      ...current,
      records: current.records.map((r: any) => r.id === id ? { ...r, stage: nextStage } : r)
    }));
  };

  const removeRecord = (id: number) => {
    setState((current: any) => ({ ...current, records: current.records.filter((r: any) => r.id !== id) }));
  };

  const toggleTask = (id: number) => {
    setState((current: any) => ({
      ...current,
      tasks: current.tasks.map((t: any) => t.id === id ? { ...t, done: !t.done } : t)
    }));
  };

  const addTask = () => {
    const text = window.prompt('Task name');
    if (!text || !text.trim()) return;
    setState((current: any) => ({ ...current, tasks: [{ id: Date.now(), text: text.trim(), owner: 'Maya', done: false }, ...current.tasks] }));
  };

  return (
    <main className={state.compactMode ? 'app compact' : 'app'}>
      <Sidebar activeRoute={route} onNavigate={navigate} />
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Advanced generated app</p>
            <h1>${productName}</h1>
          </div>
          <label className="search">
            <span>Search</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search records, owners, notes..." />
          </label>
        </header>

        {route === 'overview' && (
          <section className="page-grid">
            <MetricsGrid metrics={metrics} />
            <section className="panel wide">
              <div className="panel-title"><h2>Priority queue</h2><button onClick={() => navigate('pipeline')}>View all</button></div>
              <div className="record-list">
                {filteredRecords.slice(0, 4).map((record: any) => (
                  <article key={record.id} className="record-row">
                    <div><strong>{record.name}</strong><span>{record.company} - {record.owner}</span></div>
                    <span className={'badge ' + record.priority}>{record.priority}</span>
                    <span>{record.due}</span>
                  </article>
                ))}
              </div>
            </section>
            <section className="panel">
              <div className="panel-title"><h2>Tasks</h2><button onClick={addTask}>Add</button></div>
              <TaskChecklist tasks={state.tasks} onToggle={toggleTask} />
            </section>
          </section>
        )}

        {route === 'pipeline' && (
          <section className="page-grid">
            <form className="panel form-panel" onSubmit={submitRecord}>
              <div className="panel-title"><h2>Add ${entityName}</h2><button type="submit">Save</button></div>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="${entityName.charAt(0).toUpperCase() + entityName.slice(1)} name" aria-label="${entityName} name" />
              <input value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} placeholder="Company or source" aria-label="Company or source" />
              <div className="split">
                <select value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} aria-label="Owner"><option>Maya</option><option>Noah</option><option>Iris</option></select>
                <select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })} aria-label="Priority"><option>High</option><option>Medium</option><option>Low</option></select>
              </div>
              <div className="split">
                <input value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} placeholder="Value" inputMode="numeric" aria-label="Value" />
                <input value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} type="date" aria-label="Due date" />
              </div>
              <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Notes" aria-label="Notes" />
            </form>
            <section className="panel wide">
              <div className="panel-title">
                <h2>${isProject ? 'Project board' : isInventory ? 'Inventory board' : isBooking ? 'Booking board' : 'Deal pipeline'}</h2>
                <select value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Filter stage">{stages.map((s: string) => <option key={s}>{s}</option>)}</select>
              </div>
              {filteredRecords.length === 0 ? (
                <div className="empty"><strong>No records found</strong><p>Clear search or add a new ${entityName} to continue.</p></div>
              ) : (
                <div className="cards">
                  {filteredRecords.map((record: any) => (
                    <WorkCard key={record.id} record={record} onDelete={removeRecord} onStageChange={updateStage} stages={stages} />
                  ))}
                </div>
              )}
            </section>
          </section>
        )}

        {route === 'contacts' && (
          <section className="panel">
            <div className="panel-title"><h2>Contacts</h2><span>{state.contacts.length} people</span></div>
            <ContactList contacts={state.contacts} />
          </section>
        )}

        {route === 'settings' && (
          <section className="panel settings">
            <div className="panel-title"><h2>Settings</h2><button onClick={() => setState({ records: data.seedRecords, contacts: data.seedContacts, tasks: data.seedTasks, compactMode: false, weeklyDigest: true })}>Reset demo data</button></div>
            <label><span>Compact interface</span><input type="checkbox" checked={state.compactMode} onChange={(e) => setState((current: any) => ({ ...current, compactMode: e.target.checked }))} /></label>
            <label><span>Weekly digest</span><input type="checkbox" checked={state.weeklyDigest} onChange={(e) => setState((current: any) => ({ ...current, weeklyDigest: e.target.checked }))} /></label>
            <p>All demo data persists in localStorage so generated app behavior survives refreshes.</p>
          </section>
        )}
      </section>
    </main>
  );
}`;

  const css = `:root { color-scheme: light; --bg: #f5f7fb; --surface: #ffffff; --ink: #111827; --muted: #667085; --line: #e4e7ec; --brand: #2563eb; --brand-2: #14b8a6; --danger: #dc2626; --shadow: 0 18px 60px rgba(15, 23, 42, .08); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; background: radial-gradient(circle at 80% 10%, rgba(20, 184, 166, .16), transparent 28rem), var(--bg); color: var(--ink); }
button, input, select, textarea { font: inherit; }
button, select, input, textarea { border-radius: 10px; }
.app { min-height: 100vh; display: grid; grid-template-columns: 232px minmax(0, 1fr); }
.sidebar { background: #0f172a; color: #fff; padding: 18px; display: flex; flex-direction: column; gap: 22px; }
.logo { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 14px; background: linear-gradient(135deg, var(--brand), var(--brand-2)); font-weight: 950; }
nav { display: grid; gap: 8px; }
nav button { border: 0; background: transparent; color: rgba(255,255,255,.68); text-align: left; padding: 11px 12px; cursor: pointer; font-weight: 750; }
nav button.active, nav button:hover { background: rgba(255,255,255,.1); color: #fff; }
.workspace { min-width: 0; padding: clamp(16px, 3vw, 32px); display: grid; align-content: start; gap: 18px; }
.topbar { display: flex; justify-content: space-between; align-items: end; gap: 16px; }
.eyebrow { margin: 0 0 4px; color: var(--brand); text-transform: uppercase; letter-spacing: .08em; font-size: 12px; font-weight: 900; }
h1, h2, h3, p { margin-top: 0; }
h1 { margin-bottom: 0; font-size: clamp(32px, 5vw, 56px); letter-spacing: -.05em; }
.search { display: grid; gap: 6px; color: var(--muted); font-size: 12px; font-weight: 800; min-width: min(100%, 360px); }
.search input, .form-panel input, .form-panel select, .form-panel textarea, .panel-title select, .work-card select { border: 1px solid var(--line); background: #fff; padding: 10px 12px; outline: none; }
.search input:focus, input:focus, select:focus, textarea:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(37, 99, 235, .14); }
.page-grid { display: grid; grid-template-columns: minmax(280px, .72fr) minmax(0, 1.28fr); gap: 18px; align-items: start; }
.metrics { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.metric, .panel { background: rgba(255,255,255,.92); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow); }
.metric { padding: 18px; }
.metric span, .metric small, .record-row span, .table-row span, .table-row a { color: var(--muted); font-size: 13px; }
.metric strong { display: block; margin: 6px 0; font-size: 30px; letter-spacing: -.04em; }
.panel { padding: 16px; min-width: 0; }
.panel.wide { grid-column: span 1; }
.panel-title { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; }
.panel-title h2 { margin: 0; font-size: 18px; }
.panel-title button, .form-panel button { border: 0; background: var(--brand); color: #fff; padding: 9px 12px; font-weight: 850; cursor: pointer; }
.record-list, .table { display: grid; gap: 10px; }
.record-row, .table-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 12px; align-items: center; border: 1px solid var(--line); border-radius: 12px; padding: 12px; background: #fff; }
.record-row div, .table-row div { min-width: 0; display: grid; gap: 3px; }
.record-row strong, .table-row strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.task { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--line); }
.task:last-child { border-bottom: 0; }
.task input:checked + span { text-decoration: line-through; color: var(--muted); }
.form-panel { display: grid; gap: 10px; position: sticky; top: 16px; }
.form-panel textarea { min-height: 110px; resize: vertical; }
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.work-card { border: 1px solid var(--line); background: #fff; border-radius: 14px; padding: 14px; display: grid; gap: 10px; }
.card-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.card-head button { border: 0; background: #fee2e2; color: var(--danger); padding: 7px 10px; cursor: pointer; font-weight: 800; }
.work-card h3 { margin: 0; }
.work-card p { color: var(--muted); line-height: 1.55; margin-bottom: 0; }
dl { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 0; }
dt { color: var(--muted); font-size: 11px; font-weight: 850; text-transform: uppercase; }
dd { margin: 3px 0 0; font-weight: 800; }
.badge, .health { display: inline-flex; border-radius: 999px; padding: 4px 9px; font-size: 12px; font-weight: 900; width: fit-content; }
.High, .Watch { background: #fee2e2; color: #991b1b; }
.Medium, .New { background: #fef3c7; color: #92400e; }
.Low, .Strong { background: #dcfce7; color: #166534; }
.empty { border: 1px dashed var(--line); border-radius: 14px; padding: 30px; text-align: center; color: var(--muted); }
.settings { max-width: 720px; }
.settings label { display: flex; justify-content: space-between; align-items: center; gap: 14px; border-bottom: 1px solid var(--line); padding: 14px 0; font-weight: 800; }
.compact .panel, .compact .metric, .compact .work-card { box-shadow: none; border-radius: 10px; }
@media (max-width: 1080px) { .app { grid-template-columns: 1fr; } .sidebar { position: sticky; top: 0; z-index: 10; flex-direction: row; align-items: center; overflow-x: auto; } nav { display: flex; } nav button { white-space: nowrap; } .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } .page-grid { grid-template-columns: 1fr; } .form-panel { position: static; } }
@media (max-width: 640px) { .workspace { padding: 12px; } .topbar { align-items: stretch; flex-direction: column; } .metrics, .cards, .split { grid-template-columns: 1fr; } .record-row, .table-row { grid-template-columns: 1fr; } dl { grid-template-columns: 1fr; } }`;

  return {
    files: [
      { path: 'package.json', content: reactPackageJson(productName.toLowerCase().replace(/[^a-z0-9]+/g, '-')), action: 'create' },
      { path: 'index.html', content: reactIndexHtml(productName), action: 'create' },
      { path: 'src/main.jsx', content: reactMainFile(), action: 'create' },
      { path: 'src/App.jsx', content: app, action: 'create' },
      { path: 'src/data.json', content: dataStr, action: 'create' },
      { path: 'src/components/Sidebar.jsx', content: sidebarComponent, action: 'create' },
      { path: 'src/components/MetricsGrid.jsx', content: metricsComponent, action: 'create' },
      { path: 'src/components/WorkCard.jsx', content: workCardComponent, action: 'create' },
      { path: 'src/components/ContactList.jsx', content: contactListComponent, action: 'create' },
      { path: 'src/components/TaskChecklist.jsx', content: taskChecklistComponent, action: 'create' },
      { path: 'src/styles.css', content: css, action: 'create' },
      { path: 'vite.config.js', content: reactViteConfig(), action: 'create' },
      { path: 'README.md', content: `# ${productName}\n\nAdvanced React/Vite app generated by Joyful with component-based architecture.\n\nComponents:\n- Sidebar — workspace navigation\n- MetricsGrid — metric cards\n- WorkCard — CRUD record items\n- ContactList — contacts table\n- TaskChecklist — task items\n\nIncluded behavior:\n- Route-like navigation with browser history\n- Search, stage filtering, CRUD-style record creation and deletion\n- Persisted demo state through localStorage\n- Contacts, task checklist, settings, empty states, and responsive layouts\n`, action: 'create' },
    ],
    summary: `Created a component-based ${productName} React app (Sidebar, MetricsGrid, WorkCard, ContactList, TaskChecklist) with route-like navigation, persisted state, CRUD-style ${entityName} workflows, filters, contacts, tasks, settings, empty states, and responsive UI.`,
    nextSteps: ['Connect the records to a real backend API', 'Add authentication and role permissions', 'Replace prompt-derived copy with production domain content', 'Add automated component tests'],
    metadata: { template: 'advanced-webapp', sections: ['routes', 'crud', 'local-storage', 'filters', 'settings', 'components', 'responsive-ui'], estimatedComplexity: 'complex' },
  };
}

function buildReactTemplate(analysis: PromptAnalysis, prompt = '', mediaAssets: MediaAsset[] = []): AIGenerationResponse {
  if (/netflix|streaming|movie|movies|cinema|tv show|series|ott|watchlist/i.test(prompt)) {
    return buildStreamingTemplate(mediaAssets);
  }

  if (
    analysis.template === 'webapp' ||
    analysis.template === 'dashboard' ||
    /crm|kanban|project management|internal tool|admin|portal|inventory|booking|tasks?|contacts?|settings|routes?|complex/i.test(prompt)
  ) {
    return buildAdvancedWebAppTemplate(prompt);
  }

  // Component-based multi-page for ALL website/app requests except simple single-pagers
  const hasMultiPageIntent = /about|contact|blog|pricing|services|gallery|faq|team|page |multi|route|pages|company|features|website|site|brand|portfolio|saas|startup|agency/i.test(prompt);
  const hasComplexKeywords = /website|app|application|full|complete|professional|modern|company|business|startup|brand|landing|product|service|platform/.test(prompt);
  const isSimpleLanding = /^simple|^basic|^minimal|^single.?page|^one.?page|^tiny|^small/.test(prompt.toLowerCase());
  if ((hasMultiPageIntent || hasComplexKeywords || analysis.features.length >= 2 || analysis.template !== 'portfolio') && !isSimpleLanding) {
    try {
      return buildComponentTreeReactApp(analysis, prompt, mediaAssets);
    } catch (err) {
      console.warn('Component tree generation failed, falling back to standard template:', err);
    }
  }

  const p = pickPalette(analysis);
  const lowerPrompt = prompt.toLowerCase();

  // Extract brand name from prompt for React templates
  const brandNameMatch = lowerPrompt.match(/(?:shop|store|brand|site|company|business|name)\s*(?:name\s*)?(?:to|:|is|=|become|called)?\s*['"]?([a-z][a-z0-9\s&\-.]{1,40})['"]?/i)
    || lowerPrompt.match(/(?:change|update|set|rename|edit|improve)\s*(?:the\s*)?(?:shop|store|brand|site|company|business)?\s*(?:name|branding)\s*(?:to|:|is|=|become|called)?\s*['"]?([a-z][a-z0-9\s&\-.]{1,40})['"]?/i);
  const customBrand = brandNameMatch ? brandNameMatch[1].trim().replace(/['"]$/g, '') : null;
  const capitalizedBrand = customBrand ? customBrand.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null;

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

  // Apply custom branding if extracted from prompt
  const brandedConfig = capitalizedBrand ? {
    ...config,
    title: capitalizedBrand,
    eyebrow: customBrand ? `${customBrand}` : config.eyebrow,
  } : config;

  const previewRoutes = Array.from(new Set(['/', ...extractRoutePaths(prompt)]));
  const initialItems = brandedConfig.cards.map(([name, body, meta], index) => ({
    id: index + 1,
    name,
    body,
    meta,
    status: index === 0 ? 'Active' : index === 1 ? 'Review' : 'Ready',
    priority: index === 0 ? 'High' : index === 1 ? 'Medium' : 'Low',
  }));

  const app = `import React, { useMemo, useState } from 'react';

const initialItems = ${JSON.stringify(initialItems, null, 2)};
  const stats = ${JSON.stringify(brandedConfig.stats, null, 2)};
  const navItems = ${JSON.stringify(brandedConfig.nav)};
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
        name: 'New ${brandedConfig.visual} item',
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
        <div className="brand">${brandedConfig.title.charAt(0)}</div>
        {navItems.map((item, index) => (
          <button key={item} data-preview-path={previewRoutes[index] || '/'} className={index === 0 ? 'nav active' : 'nav'}>{item}</button>
        ))}
      </aside>

      <section className="workspace">
        <header className="hero">
          <div>
            <p className="eyebrow">${brandedConfig.eyebrow}</p>
            <h1>${brandedConfig.title}</h1>
            <p>${brandedConfig.description}</p>
          </div>
          <button onClick={addItem} className="primary">${brandedConfig.cta}</button>
          <div className="hero-visual ${brandedConfig.visual}" aria-hidden="true">
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
      { path: 'package.json', content: reactPackageJson(brandedConfig.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')), action: 'create' },
      { path: 'index.html', content: reactIndexHtml(brandedConfig.title), action: 'create' },
      { path: 'src/main.jsx', content: reactMainFile(), action: 'create' },
      { path: 'src/App.jsx', content: app, action: 'create' },
      { path: 'src/styles.css', content: css, action: 'create' },
      { path: 'vite.config.js', content: reactViteConfig(), action: 'create' },
      { path: 'README.md', content: `# ${brandedConfig.title}\n\nReact/Vite project generated by Joyful.\n\n- Edit \`src/App.jsx\` for app logic.\n- Edit \`src/styles.css\` for styling.\n- Preview runs in Joyful's local iframe sandbox.\n`, action: 'create' },
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
  const navPages: PageLink[] = [
    { label: 'Home', file: 'index.html' },
    { label: 'About', file: 'about.html' },
    { label: 'Projects', file: 'projects.html' },
    { label: 'Contact', file: 'contact.html' },
  ];

  const indexHtml = pageDoc('Creative Portfolio', p, navPages, 'index.html',
    `${heroHTML(p, 'Hello, I\'m a Creator', 'I craft digital experiences that blend beauty with function.', 'View My Work', 'projects.html')}`
  );
  const aboutHtml = pageDoc('About | Creative Portfolio', p, navPages, 'about.html',
    `  <section class="fade-up" style="background:${p.bgAlt};min-height:60vh">
      <h2 class="section-title">About Me</h2>
      <p class="section-subtitle">Passionate about creating elegant solutions to complex problems.</p>
      <div class="grid grid-3" style="max-width:900px;margin:0 auto">
        <div class="card"><div class="card-icon">&#9998;</div><h3>Design</h3><p>Creating intuitive interfaces that users love.</p></div>
        <div class="card"><div class="card-icon">&#60;/&#62;</div><h3>Development</h3><p>Building robust, scalable web applications.</p></div>
        <div class="card"><div class="card-icon">&#9889;</div><h3>Performance</h3><p>Optimizing for speed and accessibility.</p></div>
      </div>
    </section>`
  );
  const projectsHtml = pageDoc('Projects | Creative Portfolio', p, navPages, 'projects.html',
    `  <section class="fade-up" style="min-height:60vh">
      <h2 class="section-title">Featured Work</h2>
      <p class="section-subtitle">A selection of recent projects I'm proud of.</p>
      <div class="grid grid-3">
        <div class="card"><div class="card-icon">&#127912;</div><h3>Brand Identity</h3><p>Complete visual identity for a tech startup.</p></div>
        <div class="card"><div class="card-icon">&#128241;</div><h3>Mobile App</h3><p>Cross-platform app with 50k+ downloads.</p></div>
        <div class="card"><div class="card-icon">&#127760;</div><h3>Web Platform</h3><p>SaaS dashboard serving 10k daily users.</p></div>
      </div>
    </section>`
  );
  const contactHtml = pageDoc('Contact | Creative Portfolio', p, navPages, 'contact.html',
    `  <section class="fade-up" style="background:${p.bgAlt};min-height:60vh">
      <h2 class="section-title">Get In Touch</h2>
      <p class="section-subtitle">Have a project in mind? Let's talk.</p>
      <form class="contact-form">
        <input type="text" placeholder="Your Name" required>
        <input type="email" placeholder="Your Email" required>
        <textarea rows="5" placeholder="Tell me about your project..." required></textarea>
        <button type="submit">Send Message</button>
      </form>
    </section>`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssForm(p), cssFooter(p), cssAnimations()].join('\n');
  const js = jsBase() + `\n\ndocument.querySelector('.contact-form')?.addEventListener('submit',e=>{\n  e.preventDefault();\n  joyfulNotify('Thanks! I\\'ll get back to you soon.');\n  e.target.reset();\n});`;

  return {
    files: [
      { path: 'index.html', content: indexHtml },
      { path: 'about.html', content: aboutHtml },
      { path: 'projects.html', content: projectsHtml },
      { path: 'contact.html', content: contactHtml },
      { path: 'style.css', content: css },
      { path: 'script.js', content: js },
    ],
    summary: `Built a ${p.bg === '#0F172A' ? 'dark' : 'light'}-themed multi-page portfolio (index, about, projects, contact).`,
    nextSteps: ['Add real project images', 'Connect contact form to backend', 'Add testimonials section', 'Customize colors'],
    metadata: { template: 'portfolio', sections, estimatedComplexity: 'medium' },
  };
}

function buildSaaS(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);
  const sections = ['hero', 'features', 'pricing', 'testimonials', 'cta'];
  const navPages: PageLink[] = [
    { label: 'Home', file: 'index.html' },
    { label: 'Features', file: 'features.html' },
    { label: 'Pricing', file: 'pricing.html' },
    { label: 'Contact', file: 'contact.html' },
  ];

  const indexHtml = pageDoc('SaaS Product', p, navPages, 'index.html',
    `${heroHTML(p, 'Ship Faster, Scale Smarter', 'The all-in-one platform for modern teams.', 'Start Free Trial', 'features.html')}`
  );
  const featuresHtml = pageDoc('Features | SaaS Product', p, navPages, 'features.html',
    `  <section class="fade-up" style="min-height:60vh;padding-top:6rem">
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
    </section>`
  );
  const pricingHtml = pageDoc('Pricing | SaaS Product', p, navPages, 'pricing.html',
    `  <section class="fade-up" style="background:${p.bgAlt};min-height:60vh;padding-top:6rem">
      <h2 class="section-title">Simple Pricing</h2>
      <p class="section-subtitle">Start free, upgrade when ready.</p>
      <div class="grid grid-3" style="max-width:900px;margin:0 auto">
        <div class="card" style="text-align:center"><h3>Starter</h3><div style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:1rem 0">$0</div><p>For side projects</p><a href="contact.html" class="btn" style="margin-top:1rem;width:100%;justify-content:center;border:1px solid ${p.border};color:${p.text}">Get Started</a></div>
        <div class="card" style="text-align:center;border-color:${p.primary};position:relative"><span style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:${p.primary};color:#fff;padding:4px 16px;border-radius:20px;font-size:.75rem;font-weight:600">Popular</span><h3>Pro</h3><div style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:1rem 0">$29<span style="font-size:1rem;font-weight:400;color:${p.textMuted}">/mo</span></div><p>For growing teams</p><a href="contact.html" class="btn" style="margin-top:1rem;width:100%;justify-content:center;background:${p.primary};color:#fff">Start Free Trial</a></div>
        <div class="card" style="text-align:center"><h3>Enterprise</h3><div style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:1rem 0">Custom</div><p>For large orgs</p><a href="contact.html" class="btn" style="margin-top:1rem;width:100%;justify-content:center;border:1px solid ${p.border};color:${p.text}">Contact Sales</a></div>
      </div>
    </section>`
  );
  const contactHtml = pageDoc('Contact | SaaS Product', p, navPages, 'contact.html',
    `  <section class="fade-up" style="min-height:60vh;padding-top:6rem">
      <h2 class="section-title">Get In Touch</h2>
      <p class="section-subtitle">Have questions? We're here to help.</p>
      <form class="contact-form" style="max-width:500px">
        <input type="text" placeholder="Your Name" required>
        <input type="email" placeholder="Your Email" required>
        <textarea rows="5" placeholder="How can we help?" required></textarea>
        <button type="submit">Send Message</button>
      </form>
    </section>`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssForm(p), cssFooter(p), cssAnimations()].join('\n');
  const js = jsBase() + `\n\ndocument.querySelector('.contact-form')?.addEventListener('submit',e=>{\n  e.preventDefault();\n  joyfulNotify('Thanks! We\\'ll be in touch soon.');\n  e.target.reset();\n});`;

  return {
    files: [
      { path: 'index.html', content: indexHtml },
      { path: 'features.html', content: featuresHtml },
      { path: 'pricing.html', content: pricingHtml },
      { path: 'contact.html', content: contactHtml },
      { path: 'style.css', content: css },
      { path: 'script.js', content: js },
    ],
    summary: 'Created a multi-page SaaS site (home, features, pricing, contact) with feature grid, 3-tier pricing, and CTA.',
    nextSteps: ['Add monthly/annual pricing toggle', 'Add FAQ section', 'Integrate payment provider', 'Add more testimonials'],
    metadata: { template: 'saas', sections, estimatedComplexity: 'medium' },
  };
}

function buildRestaurant(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);
  const sections = ['hero', 'menu', 'about', 'reservations'];
  const navPages: PageLink[] = [
    { label: 'Home', file: 'index.html' },
    { label: 'Menu', file: 'menu.html' },
    { label: 'About', file: 'about.html' },
    { label: 'Reservations', file: 'reservations.html' },
  ];

  const indexHtml = pageDoc('Restaurant', p, navPages, 'index.html',
    `${heroHTML(p, 'Taste the Difference', 'Farm-to-table dining in the heart of the city.', 'View Menu', 'menu.html')}`
  );
  const menuHtml = pageDoc('Menu | Restaurant', p, navPages, 'menu.html',
    `  <section class="fade-up" style="min-height:60vh;padding-top:6rem">
      <h2 class="section-title">Our Menu</h2>
      <p class="section-subtitle">Seasonal ingredients, timeless flavors.</p>
      <div class="grid grid-2">
        <div class="card"><div class="card-icon">&#127837;</div><h3>Starters</h3><p>Fresh garden salad, artisan bread, seasonal soup.</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">From $12</p></div>
        <div class="card"><div class="card-icon">&#127830;</div><h3>Mains</h3><p>Grilled salmon, grass-fed steak, wild mushroom risotto.</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">From $28</p></div>
        <div class="card"><div class="card-icon">&#127856;</div><h3>Desserts</h3><p>Creme brulee, chocolate fondant, fruit tart.</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">From $14</p></div>
        <div class="card"><div class="card-icon">&#127863;</div><h3>Drinks</h3><p>Curated wine list, craft cocktails, local beers.</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">From $8</p></div>
      </div>
    </section>`
  );
  const aboutHtml = pageDoc('About | Restaurant', p, navPages, 'about.html',
    `  <section class="fade-up" style="background:${p.bgAlt};min-height:60vh;padding-top:6rem">
      <h2 class="section-title">Our Story</h2>
      <p class="section-subtitle">Since 2015, serving the community with passion and dedication.</p>
      <div class="grid grid-3" style="max-width:700px;margin:0 auto">
        <div class="card" style="text-align:center"><div style="font-size:2rem;font-weight:800;color:${p.primary}">9+</div><p>Years of Service</p></div>
        <div class="card" style="text-align:center"><div style="font-size:2rem;font-weight:800;color:${p.primary}">50k+</div><p>Happy Guests</p></div>
        <div class="card" style="text-align:center"><div style="font-size:2rem;font-weight:800;color:${p.primary}">4.9</div><p>Star Rating</p></div>
      </div>
    </section>`
  );
  const resHtml = pageDoc('Reservations | Restaurant', p, navPages, 'reservations.html',
    `  <section class="fade-up" style="min-height:60vh;padding-top:6rem">
      <h2 class="section-title">Reserve a Table</h2>
      <form class="contact-form">
        <input type="text" placeholder="Your Name" required>
        <input type="email" placeholder="Email" required>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem"><input type="date" required><input type="time" required></div>
        <select required><option value="">Party Size</option><option>1-2 guests</option><option>3-4 guests</option><option>5-6 guests</option><option>7+ guests</option></select>
        <button type="submit">Reserve Now</button>
      </form>
    </section>`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssForm(p), cssFooter(p), cssAnimations()].join('\n');
  const js = jsBase() + `\n\ndocument.querySelector('.contact-form')?.addEventListener('submit',e=>{\n  e.preventDefault();\n  joyfulNotify('Reservation confirmed!');\n  e.target.reset();\n});`;

  return {
    files: [
      { path: 'index.html', content: indexHtml },
      { path: 'menu.html', content: menuHtml },
      { path: 'about.html', content: aboutHtml },
      { path: 'reservations.html', content: resHtml },
      { path: 'style.css', content: css },
      { path: 'script.js', content: js },
    ],
    summary: 'Built a multi-page restaurant site (home, menu, about, reservations).',
    nextSteps: ['Add food photography', 'Integrate reservation system', 'Add Google Maps', 'Add wine list'],
    metadata: { template: 'restaurant', sections, estimatedComplexity: 'medium' },
  };
}

function buildEcommerce(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);
  const sections = ['hero', 'products', 'features', 'cta'];
  const navPages: PageLink[] = [
    { label: 'Home', file: 'index.html' },
    { label: 'Products', file: 'products.html' },
    { label: 'Features', file: 'features.html' },
    { label: 'Contact', file: 'contact.html' },
  ];

  const indexHtml = pageDoc('Shop', p, navPages, 'index.html',
    `${heroHTML(p, 'Curated Collections', 'Premium products crafted for modern living.', 'Shop Now', 'products.html')}`
  );
  const productsHtml = pageDoc('Products | Shop', p, navPages, 'products.html',
    `  <section class="fade-up" style="min-height:60vh;padding-top:6rem">
      <h2 class="section-title">Featured Products</h2>
      <div class="grid grid-4">
        <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:1;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#128091;</div><div style="padding:1.25rem"><h3>Leather Bag</h3><p style="font-size:.85rem">Handcrafted premium leather</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">$189</p></div></div>
        <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:1;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#8986;</div><div style="padding:1.25rem"><h3>Classic Watch</h3><p style="font-size:.85rem">Swiss movement, minimalist</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">$349</p></div></div>
        <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:1;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#128085;</div><div style="padding:1.25rem"><h3>Wool Jacket</h3><p style="font-size:.85rem">Sustainable merino blend</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">$275</p></div></div>
        <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:1;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#128092;</div><div style="padding:1.25rem"><h3>Sneakers</h3><p style="font-size:.85rem">Limited edition colorway</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">$145</p></div></div>
      </div>
    </section>`
  );
  const featuresHtml = pageDoc('Why Shop With Us', p, navPages, 'features.html',
    `  <section class="fade-up" style="background:${p.bgAlt};min-height:60vh;padding-top:6rem">
      <h2 class="section-title">Why Shop With Us</h2>
      <div class="grid grid-3" style="max-width:700px;margin:0 auto">
        <div class="card"><div class="card-icon">&#128666;</div><h3>Free Shipping</h3><p>On all orders over $75.</p></div>
        <div class="card"><div class="card-icon">&#128260;</div><h3>Easy Returns</h3><p>30-day hassle-free returns.</p></div>
        <div class="card"><div class="card-icon">&#128274;</div><h3>Secure Checkout</h3><p>256-bit SSL encryption.</p></div>
      </div>
    </section>`
  );
  const contactHtml = pageDoc('Contact | Shop', p, navPages, 'contact.html',
    `  <section class="fade-up" style="min-height:60vh;padding-top:6rem">
      <h2 class="section-title">Get In Touch</h2>
      <p class="section-subtitle">Questions? We'd love to hear from you.</p>
      <form class="contact-form" style="max-width:500px">
        <input type="text" placeholder="Your Name" required>
        <input type="email" placeholder="Your Email" required>
        <textarea rows="5" placeholder="Your message..." required></textarea>
        <button type="submit">Send Message</button>
      </form>
    </section>`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssForm(p), cssFooter(p), cssAnimations()].join('\n');
  const js = jsBase() + `\n\ndocument.querySelector('.contact-form')?.addEventListener('submit',e=>{\n  e.preventDefault();\n  joyfulNotify('Thanks! We\\'ll get back to you soon.');\n  e.target.reset();\n});`;

  return {
    files: [
      { path: 'index.html', content: indexHtml },
      { path: 'products.html', content: productsHtml },
      { path: 'features.html', content: featuresHtml },
      { path: 'contact.html', content: contactHtml },
      { path: 'style.css', content: css },
      { path: 'script.js', content: js },
    ],
    summary: 'Created a multi-page e-commerce site (home, products, features, contact) with product grid and trust badges.',
    nextSteps: ['Add product detail pages', 'Integrate Stripe', 'Add shopping cart', 'Add search/filtering'],
    metadata: { template: 'ecommerce', sections, estimatedComplexity: 'medium' },
  };
}

function buildPhotography(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);
  const sections = ['hero', 'gallery', 'about', 'contact'];
  const navPages: PageLink[] = [
    { label: 'Home', file: 'index.html' },
    { label: 'Gallery', file: 'gallery.html' },
    { label: 'About', file: 'about.html' },
    { label: 'Contact', file: 'contact.html' },
  ];

  const indexHtml = pageDoc('Photography', p, navPages, 'index.html',
    `${heroHTML(p, 'Capturing Moments', 'Fine art photography that tells stories through light and shadow.', 'View Gallery', 'gallery.html')}`
  );
  const galleryHtml = pageDoc('Gallery | Photography', p, navPages, 'gallery.html',
    `  <section class="fade-up" style="padding-top:6rem">
      <h2 class="section-title">Portfolio</h2>
      <div class="masonry-grid">
        <div class="masonry-item" onclick="openLightbox(this)"><div style="aspect-ratio:3/4;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#127748;</div></div>
        <div class="masonry-item" onclick="openLightbox(this)"><div style="aspect-ratio:4/3;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#127742;</div></div>
        <div class="masonry-item" onclick="openLightbox(this)"><div style="aspect-ratio:1/1;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#127749;</div></div>
        <div class="masonry-item" onclick="openLightbox(this)"><div style="aspect-ratio:3/4;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#127750;</div></div>
        <div class="masonry-item" onclick="openLightbox(this)"><div style="aspect-ratio:4/3;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#127743;</div></div>
        <div class="masonry-item" onclick="openLightbox(this)"><div style="aspect-ratio:1/1;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#127744;</div></div>
      </div>
    </section>`
  );
  const aboutHtml = pageDoc('About | Photography', p, navPages, 'about.html',
    `  <section class="fade-up" style="background:${p.bgAlt};min-height:60vh;padding-top:6rem">
      <div style="max-width:800px;margin:0 auto;display:grid;grid-template-columns:1fr 2fr;gap:3rem;align-items:center">
        <div style="aspect-ratio:1;background:${p.surface};border-radius:1rem;display:flex;align-items:center;justify-content:center;font-size:4rem">&#128247;</div>
        <div><p style="font-size:.85rem;color:${p.primary};font-weight:600;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.75rem">About the Photographer</p><h2 style="font-size:clamp(1.5rem,3vw,2rem);font-weight:800;margin-bottom:1rem">Visual Storyteller</h2><p style="color:${p.textMuted};line-height:1.7">With over a decade of experience capturing the world's most breathtaking moments, I specialize in landscape, portrait, and street photography. Every frame is an opportunity to reveal something extraordinary in the ordinary.</p></div>
      </div>
    </section>`
  );
  const contactHtml = pageDoc('Contact | Photography', p, navPages, 'contact.html',
    `  <section class="fade-up" style="min-height:60vh;padding-top:6rem">
      <h2 class="section-title">Get in Touch</h2>
      <p class="section-subtitle">Available for commissions, collaborations, and prints.</p>
      <form style="max-width:500px;margin:0 auto;display:flex;flex-direction:column;gap:1rem">
        <input type="text" placeholder="Your name" required style="border-radius:50px;padding:.75rem 1.25rem;border:1px solid ${p.border};background:${p.bg};color:${p.text}">
        <input type="email" placeholder="Your email" required style="border-radius:50px;padding:.75rem 1.25rem;border:1px solid ${p.border};background:${p.bg};color:${p.text}">
        <textarea placeholder="Tell me about your project" rows="4" style="border-radius:1rem;padding:.75rem 1.25rem;border:1px solid ${p.border};background:${p.bg};color:${p.text};resize:vertical"></textarea>
        <button type="submit" class="btn" style="border-radius:50px;align-self:center">Send Message</button>
      </form>
    </section>`
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
    files: [
      { path: 'index.html', content: indexHtml },
      { path: 'gallery.html', content: galleryHtml },
      { path: 'about.html', content: aboutHtml },
      { path: 'contact.html', content: contactHtml },
      { path: 'style.css', content: css },
      { path: 'script.js', content: js },
    ],
    summary: 'Built a multi-page photography portfolio (home, gallery, about, contact) with masonry gallery and lightbox.',
    nextSteps: ['Add high-res images', 'Integrate Instagram feed', 'Add print shop', 'Add EXIF data display'],
    metadata: { template: 'photography', sections, estimatedComplexity: 'medium' },
  };
}

function buildBlog(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);
  const sections = ['hero', 'articles', 'newsletter'];
  const navPages: PageLink[] = [
    { label: 'Home', file: 'index.html' },
    { label: 'Articles', file: 'articles.html' },
    { label: 'Subscribe', file: 'subscribe.html' },
  ];

  const indexHtml = pageDoc('Blog', p, navPages, 'index.html',
    `${heroHTML(p, 'Insights & Ideas', 'Thoughtful perspectives on design, technology, and creativity.', 'Read Latest', 'articles.html')}`
  );
  const articlesHtml = pageDoc('Articles | Blog', p, navPages, 'articles.html',
    `  <section class="fade-up" style="padding-top:6rem">
      <h2 class="section-title">Latest Articles</h2>
      <div class="grid grid-3">
        <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:16/9;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:2.5rem">&#128221;</div><div style="padding:1.5rem"><p style="font-size:.8rem;color:${p.primary};font-weight:600;text-transform:uppercase;letter-spacing:.05em">Design</p><h3 style="margin-top:.5rem">The Future of Web Design</h3><p style="margin-top:.5rem">Emerging trends shaping the web.</p><p style="margin-top:1rem;font-size:.85rem;color:${p.textMuted}">5 min read</p></div></div>
        <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:16/9;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:2.5rem">&#128187;</div><div style="padding:1.5rem"><p style="font-size:.8rem;color:${p.primary};font-weight:600;text-transform:uppercase;letter-spacing:.05em">Engineering</p><h3 style="margin-top:.5rem">Scalable APIs with Edge Functions</h3><p style="margin-top:.5rem">A practical serverless guide.</p><p style="margin-top:1rem;font-size:.85rem;color:${p.textMuted}">8 min read</p></div></div>
        <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:16/9;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:2.5rem">&#127912;</div><div style="padding:1.5rem"><p style="font-size:.8rem;color:${p.primary};font-weight:600;text-transform:uppercase;letter-spacing:.05em">Creative</p><h3 style="margin-top:.5rem">Color Theory for Interfaces</h3><p style="margin-top:.5rem">Palettes that convert and delight.</p><p style="margin-top:1rem;font-size:.85rem;color:${p.textMuted}">6 min read</p></div></div>
      </div>
    </section>`
  );
  const subscribeHtml = pageDoc('Subscribe | Blog', p, navPages, 'subscribe.html',
    `  <section class="fade-up" style="text-align:center;background:${p.bgAlt};min-height:60vh;padding-top:6rem">
      <h2 class="section-title">Stay Updated</h2>
      <p class="section-subtitle">Get the latest articles delivered to your inbox.</p>
      <form style="display:flex;gap:.5rem;max-width:420px;margin:2rem auto 0">
        <input type="email" placeholder="your@email.com" required style="flex:1;border-radius:50px;padding:.75rem 1.25rem;border:1px solid ${p.border};background:${p.bg};color:${p.text}">
        <button type="submit" class="btn" style="border-radius:50px;background:${p.primary};color:#fff">Subscribe</button>
      </form>
    </section>`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssForm(p), cssFooter(p), cssAnimations()].join('\n');
  const js = jsBase() + `\n\ndocument.querySelector('form')?.addEventListener('submit',e=>{\n  e.preventDefault();\n  joyfulNotify('Subscribed! Check your inbox.');\n  e.target.reset();\n});`;

  return {
    files: [
      { path: 'index.html', content: indexHtml },
      { path: 'articles.html', content: articlesHtml },
      { path: 'subscribe.html', content: subscribeHtml },
      { path: 'style.css', content: css },
      { path: 'script.js', content: js },
    ],
    summary: 'Created a multi-page blog (home, articles, subscribe) with article cards and newsletter section.',
    nextSteps: ['Add RSS feed', 'Add search', 'Add categories/tags', 'Add social sharing'],
    metadata: { template: 'blog', sections, estimatedComplexity: 'medium' },
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
    metadata: { template: 'event', sections, estimatedComplexity: 'medium' },
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
        estimatedComplexity: 'medium',
        sandboxCommands: [{ command: 'npm', args: ['run', 'build'], wait: true, reason: 'Validate patched React app.' }],
      },
    };
  }

  return null;
}

function extractBrandName(lower: string, _analysis: PromptAnalysis): string {
  const match = lower.match(/(?:brand|site|app|company|business|shop|store)\s*(?:name\s*)?(?:called|named)?\s*['"`]?([a-z][a-z0-9\s&\-.]{2,40})['"`]?/i)
    || lower.match(/(?:this\s+is\s+(?:a|for|my)\s+)?(?:website|site|app|brand)\s*(?:for|about|called|named)?\s*['"`]?([a-z][a-z0-9\s&\-.]{2,40})['"`]?/i);
  return match ? match[1].trim().replace(/['"`]$/g, '') : 'My App';
}

function buildReactIncrementalPatches(prompt: string, existingFiles: ProjectFile[], analysis: PromptAnalysis): AIGenerationResponse | null {
  const lower = prompt.toLowerCase();
  const appFile = existingFiles.find(f => /^src\/App\.(jsx|tsx)$/i.test(f.path));
  const layoutFile = existingFiles.find(f => /^src\/components\/Layout\.(jsx|tsx)$/i.test(f.path) || /^src\/components\/layout\.(jsx|tsx)$/i.test(f.path));
  if (!appFile) return null;

  const patches: FilePatchOperation[] = [];
  const newFiles: AIGenerationResponse['files'] = [];
  const nextSteps: string[] = [];
  let summary = '';

  // --- Add new page ---
  const addPageMatch = lower.match(/add\s+(?:a\s+)?(?:new\s+)?(?:page\s+)?(?:called\s+|named\s+|for\s+)?(\w+)\s+page/i)
    || lower.match(/(?:create|make|add|build)\s+(?:a\s+)?(?:new\s+)?(\w+)\s+page/i);
  if (addPageMatch) {
    const pageName = addPageMatch[1].toLowerCase();
    const pageTitle = pageName.charAt(0).toUpperCase() + pageName.slice(1);
    const pagePath = `src/pages/${pageTitle}.tsx`;

    if (existingFiles.some(f => f.path === pagePath)) {
      return {
        files: [],
        patches: [],
        summary: `The page "${pageTitle}" already exists. Try renaming or modifying it.`,
        nextSteps: ['Open the existing page', 'Ask to modify its content'],
        metadata: { template: analysis.template, sections: ['page-exists'], estimatedComplexity: 'simple' as const },
      };
    }

    // Create the page file
    const brandName = extractBrandName(lower, analysis);
    newFiles.push({
      path: pagePath,
      content: generatePageComponent(pageName, brandName, analysis, pickPalette(analysis), [], []).content,
      action: 'create',
    });

    // Add route to App.tsx
    const appContent = appFile.content;
    const importPattern = new RegExp(`(import\\s+{[^}]*\\}\\s+from\\s+['"]react-router-dom['"])`);
    const importMatch = appContent.match(importPattern);

    if (importMatch) {
      patches.push({
        path: appFile.path,
        action: 'patch',
        insertAfter: importMatch[0],
        content: `\nimport ${pageTitle}Page from '@/pages/${pageTitle}';`,
        reason: `Add import for the new ${pageName} page.`,
      });

      // Find the last route in Routes block and add after it
      const routeLinePattern = /\s*<Route\s+path=["']\/[^"']*["']\s+(?:element|Component)=\{/g;
      const routeMatches = [...appContent.matchAll(routeLinePattern)];
      const lastRoute = routeMatches[routeMatches.length - 1];
      if (lastRoute) {
        const routeEndIndex = appContent.indexOf('/>', lastRoute.index!);
        if (routeEndIndex !== -1) {
          const lineEnd = appContent.indexOf('\n', routeEndIndex);
          const insertPoint = lineEnd !== -1 ? lineEnd + 1 : routeEndIndex + 2;
          patches.push({
            path: appFile.path,
            action: 'patch',
            insertAfter: appContent.slice(insertPoint - 50, insertPoint).split('\n').pop() || '',
            content: `\n          <Route path="/${pageName}" element={<${pageTitle}Page />} />`,
            reason: `Add route for the new ${pageName} page.`,
          });
        }
      }
    }

    // Add nav link to Layout if it exists
    if (layoutFile) {
      const layoutContent = layoutFile.content;
      const navLinksMatch = layoutContent.match(/(<Link\s+to=["'][^"']*["']\s*>\s*[^<]+\s*<\/Link>\s*)+/g);
      if (navLinksMatch) {
        const lastLink = navLinksMatch[navLinksMatch.length - 1];
        const lastLinkEnd = layoutContent.lastIndexOf(lastLink) + lastLink.length;
        patches.push({
          path: layoutFile.path,
          action: 'patch',
          insertAfter: layoutContent.slice(lastLinkEnd - 30, lastLinkEnd).split('\n').pop() || '',
          content: `\n              <Link to="/${pageName}">${pageTitle}</Link>`,
          reason: `Add nav link for the new ${pageName} page.`,
        });
      }
    }

    summary = `Added a new "${pageTitle}" page with route and navigation link.`;
    nextSteps.push('Open the new page', 'Customize page content', 'Repeat for more pages');
  }

  // --- Remove page ---
  const removeMatch = lower.match(/(?:remove|delete|take\s+out)\s+(?:the\s+)?(\w+)\s+page/i);
  if (removeMatch) {
    const pageName = removeMatch[1].toLowerCase();
    const pageTitle = pageName.charAt(0).toUpperCase() + pageName.slice(1);
    const pagePath = `src/pages/${pageTitle}.tsx`;

    if (!existingFiles.some(f => f.path === pagePath)) {
      return {
        files: [],
        patches: [],
        summary: `Could not find a page named "${pageTitle}" to remove.`,
        nextSteps: ['Check the page name', 'List existing pages'],
        metadata: { template: analysis.template, sections: ['page-not-found'], estimatedComplexity: 'simple' },
      };
    }

    // Delete the page file
    newFiles.push({ path: pagePath, action: 'delete' });

    // Remove import from App.tsx
    const appContent = appFile.content;
    const importLine = appContent.split('\n').find(line => line.includes(pagePath.replace('src/', '@/')));
    if (importLine) {
      patches.push({
        path: appFile.path,
        action: 'patch',
        oldString: importLine + '\n',
        newString: '',
        reason: `Remove import for deleted ${pageName} page.`,
      });
    }

    // Remove route from App.tsx
    const routePattern = new RegExp(`\\s*<Route\\s+path="/${pageName}"[^>]*\\/>\\n?`);
    patches.push({
      path: appFile.path,
      action: 'patch',
      oldString: appContent.match(routePattern)?.[0] || '',
      newString: '',
      reason: `Remove route for deleted ${pageName} page.`,
    });

    // Remove nav link from Layout
    if (layoutFile) {
      const navLinkPattern = new RegExp(`\\s*<Link\\s+to="/${pageName}"[^>]*>.*?<\\/Link>\\n?`);
      const layoutContent = layoutFile.content;
      const navMatch = layoutContent.match(navLinkPattern);
      if (navMatch) {
        patches.push({
          path: layoutFile.path,
          action: 'patch',
          oldString: navMatch[0],
          newString: '',
          reason: `Remove nav link for deleted ${pageName} page.`,
        });
      }
    }

    summary = `Removed the "${pageTitle}" page and cleaned up routes.`;
    nextSteps.push('Verify no broken links', 'Preview the updated app');
  }

  // --- Rename brand ---
  if (!addPageMatch && !removeMatch) {
    const brandNameMatch = lower.match(/(?:shop|store|brand|site|company|business|name)\s*(?:name\s*)?(?:to|:|is|=|become|called)?\s*['"]?([a-z][a-z0-9\s&\-.]{1,40})['"]?/i)
      || lower.match(/(?:change|update|set|rename)\s*(?:the\s*)?(?:shop|store|brand|site|company|business)?\s*(?:name|branding)\s*(?:to|:|is|=|become|called)?\s*['"]?([a-z][a-z0-9\s&\-.]{1,40})['"]?/i);
    if (brandNameMatch) {
      const newName = brandNameMatch[1].trim().replace(/['"]$/g, '');
      const capitalized = newName.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const brandRefs = ['index.html', 'src/App.tsx', 'src/components/Layout.tsx'];

      for (const path of brandRefs) {
        const file = existingFiles.find(f => f.path === path);
        if (!file) continue;
        const content = file.content;
        const oldTitleMatch = content.match(/<title>([^<]*)<\/title>/i);
        if (oldTitleMatch && !oldTitleMatch[1].includes(capitalized)) {
          patches.push({
            path,
            action: 'patch',
            oldString: oldTitleMatch[0],
            newString: `<title>${capitalized}</title>`,
            reason: `Brand rename to ${capitalized}`,
          });
        }
        const brandTextMatches = content.matchAll(/['"`]Joyful['"`]|['"`]My App['"`]|['"`]SiteName['"`]/g);
        for (const match of brandTextMatches) {
          patches.push({
            path,
            action: 'patch',
            oldString: match[0],
            newString: `'${capitalized}'`,
            reason: `Brand rename to ${capitalized}`,
          });
        }
      }

      summary = `Renamed brand references to "${capitalized}" across the React project.`;
      nextSteps.push('Review updated pages', 'Check for remaining old brand references');
    }
  }

  if (patches.length === 0 && newFiles.length === 0) return null;

  return {
    files: newFiles,
    patches,
    summary: summary || 'Applied targeted patches to the React project.',
    nextSteps: nextSteps.length ? nextSteps : ['Preview the app', 'Run lint to verify'],
    metadata: { template: analysis.template, sections: ['targeted-patches'], estimatedComplexity: 'medium' },
  };
}

function modifyExistingFiles(prompt: string, existingFiles: ProjectFile[], analysis: PromptAnalysis): AIGenerationResponse | null {
  const lower = prompt.toLowerCase();
  const reactAppFile = existingFiles.find(f => /^src\/App\.(jsx|tsx)$/i.test(f.path));
  if (reactAppFile) {
    // Try incremental patches first (add/remove pages, rename brand)
    const incremental = buildReactIncrementalPatches(prompt, existingFiles, analysis);
    if (incremental) return incremental;

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

  // Extract brand name from prompt: "change shop name to Luxe", "rename to MyBrand", "brand name: Nova"
  const brandNameMatch = lower.match(/(?:shop|store|brand|site|company|business|name)\s*(?:name\s*)?(?:to|:|is|=|become|called)?\s*['"]?([a-z][a-z0-9\s&\-.]{1,40})['"]?/i)
    || lower.match(/(?:change|update|set|rename|edit|improve)\s*(?:the\s*)?(?:shop|store|brand|site|company|business)?\s*(?:name|branding)\s*(?:to|:|is|=|become|called)?\s*['"]?([a-z][a-z0-9\s&\-.]{1,40})['"]?/i)
    || lower.match(/(?:call|name|title)\s*(?:it|this|the\s*(?:shop|store|site|brand))\s*['"]?([a-z][a-z0-9\s&\-.]{1,40})['"]?/i);
  const newBrandName = brandNameMatch ? brandNameMatch[1].trim().replace(/['"]$/g, '') : null;

  // Handle branding/shop name changes
  if (newBrandName) {
    const capitalizedBrand = newBrandName.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    // Update HTML: logo, title, headings, footer, meta
    html = html
      // Update <title> tag
      .replace(/<title>[^<]*<\/title>/i, `<title>${capitalizedBrand}</title>`)
      // Update logo text in navbar
      .replace(/<div\s+class="logo"[^>]*>[^<]*<\/div>/i, `<div class="logo" style="color:${pickPalette(analysis).primary}">${capitalizedBrand}</div>`)
      // Update hero heading
      .replace(/<h1>[^<]*<\/h1>/i, (match) => {
        if (match.includes('Curated') || match.includes('Welcome') || match.includes('Capturing') || match.includes('Insights') || match.includes('Build') || match.includes('Crafting') || match.includes('Elevate')) {
          return `<h1>Welcome to ${capitalizedBrand}</h1>`;
        }
        return match;
      })
      // Update footer brand references
      .replace(/&copy;\s*\d{4}\s*[^<]*/i, `&copy; ${new Date().getFullYear()} ${capitalizedBrand}`)
      .replace(/Built with[^<]*/i, `${capitalizedBrand} — All rights reserved`);

    // Update CSS: brand-specific styling if requested
    if (/improve|enhance|upgrade|premium|professional|modern|better/.test(lower)) {
      const p = pickPalette(analysis);
      css += `\n\n/* ${capitalizedBrand} — Enhanced branding */
.logo { font-weight: 800 !important; font-size: 1.35rem !important; letter-spacing: -0.02em !important; }
.navbar { backdrop-filter: blur(12px) !important; }
.hero h1 { letter-spacing: -0.03em !important; }
.btn { font-weight: 600 !important; letter-spacing: 0.01em !important; transition: all 0.2s ease !important; }
.card { transition: transform 0.2s ease, box-shadow 0.2s ease !important; }
.card:hover { transform: translateY(-4px) !important; box-shadow: 0 12px 40px rgba(0,0,0,0.12) !important; }
.section-title { letter-spacing: -0.02em !important; }
footer { border-top: 1px solid ${p.border} !important; }
@media (max-width: 768px) {
  .logo { font-size: 1.15rem !important; }
}`;
    }

    summary = `Updated branding to "${capitalizedBrand}" across the site — logo, title, hero, and footer.`;
    nextSteps.push('Customize the tagline', 'Add a favicon', 'Update meta description');
  }

  if (requestedPath && /\b(delete|remove)\b/.test(lower)) {
    if (!existingFiles.some(file => file.path === requestedPath)) {
      return {
        files: [],
        summary: `I could not find ${requestedPath} to delete.`,
        nextSteps: ['Check the file path', 'Open the file explorer', 'Ask Joyful to create the file instead'],
        metadata: { template: analysis.template, sections: ['file-system'], estimatedComplexity: 'medium' },
      };
    }
    return {
      files: [{ path: requestedPath, action: 'delete' }],
      summary: `Deleted ${requestedPath} from the project.`,
      nextSteps: ['Review the preview', 'Remove any references to that file', 'Export the updated project'],
      metadata: { template: analysis.template, sections: ['file-system'], estimatedComplexity: 'medium' },
    };
  }

  if (requestedPath && /\b(create|add|new)\b/.test(lower) && !existingFiles.some(file => file.path === requestedPath)) {
    return {
      files: [{ path: requestedPath, content: starterContentForPath(requestedPath, prompt), action: 'create' }],
      summary: `Created ${requestedPath} with starter content based on your request.`,
      nextSteps: ['Open the new file', 'Ask Joyful to connect it from navigation', 'Refine the content'],
      metadata: { template: analysis.template, sections: ['file-system'], estimatedComplexity: 'medium' },
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
    metadata: { template: analysis.template, sections: ['modified'], estimatedComplexity: 'medium' },
  };
}

function buildRealEstate(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);

  const html = htmlDoc('Premium Properties',
    `<link rel="stylesheet" href="style.css">`,
    `${navHTML(p, ['Listings', 'Featured', 'Agents', 'Contact'])}
<section class="hero" style="background:linear-gradient(135deg,${p.primary},${p.secondary});min-height:80vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:6rem 2rem;color:#fff">
  <h1 style="font-size:3.5rem;font-weight:800;margin-bottom:1rem;max-width:800px">Find Your Dream Home</h1>
  <p style="font-size:1.25rem;opacity:0.9;margin-bottom:2rem;max-width:600px">Browse premium properties in the most sought-after locations.</p>
  <div style="display:flex;gap:1rem;flex-wrap:wrap;justify-content:center;max-width:600px;width:100%">
    <select style="flex:1;min-width:150px;padding:0.875rem 1.25rem;border-radius:12px;border:none;font-size:1rem;color:${p.text};background:${p.bg}"><option>All Types</option><option>Houses</option><option>Apartments</option><option>Condos</option><option>Commercial</option></select>
    <select style="flex:1;min-width:150px;padding:0.875rem 1.25rem;border-radius:12px;border:none;font-size:1rem;color:${p.text};background:${p.bg}"><option>Any Price</option><option>$100k - $300k</option><option>$300k - $600k</option><option>$600k - $1M</option><option>$1M+</option></select>
    <a href="#" class="btn" style="background:#fff;color:${p.primary};padding:0.875rem 2rem">Search</a>
  </div>
</section>
<section id="listings" class="fade-up">
  <h2 class="section-title">Featured Listings</h2>
  <p class="section-subtitle">Hand-picked properties for you.</p>
  <div class="grid grid-3">
    <div class="card"><div style="background:${p.secondary};height:160px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:2rem;margin-bottom:1rem">&#127968;</div><h3>Modern Family Home</h3><p style="color:${p.primary};font-weight:700;font-size:1.25rem">$450,000</p><p>4 bed • 3 bath • 2,400 sqft</p><p style="color:${p.textMuted};font-size:0.9rem">123 Oak Street, CA</p></div>
    <div class="card"><div style="background:${p.secondary};height:160px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:2rem;margin-bottom:1rem">&#127963;</div><h3>Downtown Loft</h3><p style="color:${p.primary};font-weight:700;font-size:1.25rem">$320,000</p><p>2 bed • 2 bath • 1,200 sqft</p><p style="color:${p.textMuted};font-size:0.9rem">456 Main Street, NY</p></div>
    <div class="card"><div style="background:${p.secondary};height:160px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:2rem;margin-bottom:1rem">&#127969;</div><h3>Luxury Villa</h3><p style="color:${p.primary};font-weight:700;font-size:1.25rem">$1,250,000</p><p>6 bed • 5 bath • 4,800 sqft</p><p style="color:${p.textMuted};font-size:0.9rem">789 Ocean Drive, FL</p></div>
  </div>
</section>
<section id="agents" class="fade-up" style="background:${p.bgAlt}">
  <h2 class="section-title">Meet Our Agents</h2>
  <p class="section-subtitle">Expert guidance every step of the way.</p>
  <div class="grid grid-3">
    <div class="card" style="text-align:center"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Ccircle cx='40' cy='40' r='40' fill='${encodeURIComponent(p.secondary)}'/%3E%3Ctext x='40' y='48' text-anchor='middle' font-size='28' fill='%23fff'%3E%A%3C/text%3E%3C/svg%3E" alt="Agent" style="width:80px;height:80px;border-radius:50%;margin:0 auto 1rem;display:block"><h3>Alice Johnson</h3><p style="color:${p.textMuted};font-size:0.9rem">Senior Agent • 12+ years</p></div>
    <div class="card" style="text-align:center"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Ccircle cx='40' cy='40' r='40' fill='${encodeURIComponent(p.secondary)}'/%3E%3Ctext x='40' y='48' text-anchor='middle' font-size='28' fill='%23fff'%3EB%3C/text%3E%3C/svg%3E" alt="Agent" style="width:80px;height:80px;border-radius:50%;margin:0 auto 1rem;display:block"><h3>Bob Smith</h3><p style="color:${p.textMuted};font-size:0.9rem">Listing Specialist • 8+ years</p></div>
    <div class="card" style="text-align:center"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Ccircle cx='40' cy='40' r='40' fill='${encodeURIComponent(p.secondary)}'/%3E%3Ctext x='40' y='48' text-anchor='middle' font-size='28' fill='%23fff'%3EC%3C/text%3E%3C/svg%3E" alt="Agent" style="width:80px;height:80px;border-radius:50%;margin:0 auto 1rem;display:block"><h3>Carol Davis</h3><p style="color:${p.textMuted};font-size:0.9rem">Buyer Specialist • 10+ years</p></div>
  </div>
</section>
<section id="contact" class="fade-up">
  <h2 class="section-title">Schedule a Viewing</h2>
  <p class="section-subtitle">Ready to find your perfect property?</p>
  <form class="contact-form">
    <input type="text" placeholder="Your Name" required>
    <input type="email" placeholder="Your Email" required>
    <input type="tel" placeholder="Phone Number">
    <textarea rows="4" placeholder="Message..." required></textarea>
    <button type="submit">Send Inquiry</button>
  </form>
</section>
${footerHTML(p)}`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssForm(p), cssFooter(p), cssAnimations()].join('\n');
  const js = jsBase() + `\ndocument.querySelector('form')?.addEventListener('submit',e=>{e.preventDefault();joyfulNotify('Thanks! We\\'ll contact you soon.');e.target.reset();});`;

  return {
    files: [{ path: 'index.html', content: html }, { path: 'style.css', content: css }, { path: 'script.js', content: js }],
    summary: `Built a real estate site "${name}" with property listings, agent profiles, search filters, and contact form.`,
    nextSteps: ['Add mortgage calculator', 'Integrate map view', 'Add property detail pages', 'Connect MLS listings'],
    metadata: { template: 'realestate', sections: ['hero', 'listings', 'agents', 'contact'], estimatedComplexity: 'medium' },
  };
}

function buildFitness(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);

  const html = htmlDoc('FitLife Studio',
    `<link rel="stylesheet" href="style.css">`,
    `${navHTML(p, ['Classes', 'Trainers', 'Pricing', 'Contact'])}
<section class="hero" style="background:linear-gradient(135deg,${p.primary},${p.secondary});min-height:80vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:6rem 2rem;color:#fff">
  <h1 style="font-size:3.5rem;font-weight:800;margin-bottom:1rem;max-width:800px">Transform Your Body</h1>
  <p style="font-size:1.25rem;opacity:0.9;margin-bottom:2rem;max-width:600px">Expert trainers, modern equipment, and a supportive community.</p>
  <div style="display:flex;gap:1rem;flex-wrap:wrap;justify-content:center">
    <a href="#" class="btn" style="background:#fff;color:${p.primary}">Start Free Trial</a>
    <a href="#" class="btn" style="border:2px solid rgba(255,255,255,0.5);color:#fff">View Classes</a>
  </div>
</section>
<section id="classes" class="fade-up">
  <h2 class="section-title">Our Classes</h2>
  <p class="section-subtitle">Something for every fitness level.</p>
  <div class="grid grid-3">
    <div class="card"><div style="background:${p.secondary};height:120px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:2.5rem;margin-bottom:1rem">&#128170;</div><h3>Strength Training</h3><p>Build muscle and increase power with guided weight training sessions.</p><p style="color:${p.primary};font-weight:600;margin-top:0.5rem">Mon/Wed/Fri • 7am & 6pm</p></div>
    <div class="card"><div style="background:${p.secondary};height:120px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:2.5rem;margin-bottom:1rem">&#129764;</div><h3>Yoga & Flexibility</h3><p>Improve flexibility and find your inner balance with our yoga program.</p><p style="color:${p.primary};font-weight:600;margin-top:0.5rem">Tue/Thu/Sat • 8am & 5pm</p></div>
    <div class="card"><div style="background:${p.secondary};height:120px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:2.5rem;margin-bottom:1rem">&#128084;</div><h3>HIIT</h3><p>High intensity interval training for maximum calorie burn.</p><p style="color:${p.primary};font-weight:600;margin-top:0.5rem">Mon/Wed/Fri • 12pm & 7pm</p></div>
  </div>
</section>
<section id="trainers" class="fade-up" style="background:${p.bgAlt}">
  <h2 class="section-title">Meet Your Trainers</h2>
  <p class="section-subtitle">Certified professionals dedicated to your success.</p>
  <div class="grid grid-3">
    <div class="card" style="text-align:center"><div style="background:${p.secondary};width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;color:#fff;margin:0 auto 1rem">&#9794;</div><h3>Mike Torres</h3><p style="color:${p.textMuted}">NASM Certified • Strength Coach</p></div>
    <div class="card" style="text-align:center"><div style="background:${p.secondary};width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;color:#fff;margin:0 auto 1rem">&#9792;</div><h3>Sarah Kim</h3><p style="color:${p.textMuted}">500hr RYT • Yoga Instructor</p></div>
    <div class="card" style="text-align:center"><div style="background:${p.secondary};width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;color:#fff;margin:0 auto 1rem">&#9794;</div><h3>James Park</h3><p style="color:${p.textMuted}">CrossFit Level 2 • HIIT Specialist</p></div>
  </div>
</section>
<section id="pricing" class="fade-up">
  <h2 class="section-title">Membership Plans</h2>
  <p class="section-subtitle">Flexible options that fit your lifestyle.</p>
  <div class="grid grid-3">
    <div class="card" style="text-align:center"><h3>Basic</h3><div style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:1rem 0">$29<span style="font-size:1rem;color:${p.textMuted}">/mo</span></div><p>Gym access during staffed hours</p><a href="#" class="btn" style="margin-top:1rem;border:1px solid ${p.border};color:${p.text}">Join Now</a></div>
    <div class="card" style="text-align:center;border-color:${p.primary}"><span style="background:${p.primary};color:#fff;padding:4px 16px;border-radius:20px;font-size:.75rem;font-weight:600;position:absolute;top:-12px;left:50%;transform:translateX(-50%)">Popular</span><h3>Premium</h3><div style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:1rem 0">$59<span style="font-size:1rem;color:${p.textMuted}">/mo</span></div><p>Unlimited classes + gym access</p><a href="#" class="btn" style="margin-top:1rem;background:${p.primary};color:#fff">Start Free Trial</a></div>
    <div class="card" style="text-align:center"><h3>Elite</h3><div style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:1rem 0">$99<span style="font-size:1rem;color:${p.textMuted}">/mo</span></div><p>Everything + personal training sessions</p><a href="#" class="btn" style="margin-top:1rem;border:1px solid ${p.border};color:${p.text}">Get Started</a></div>
  </div>
</section>
<section id="contact" class="fade-up" style="background:${p.bgAlt}">
  <h2 class="section-title">Get Started Today</h2>
  <p class="section-subtitle">First session is on us!</p>
  <form class="contact-form">
    <input type="text" placeholder="Your Name" required>
    <input type="email" placeholder="Your Email" required>
    <input type="tel" placeholder="Phone">
    <textarea rows="4" placeholder="Tell us about your fitness goals..." required></textarea>
    <button type="submit">Claim Free Session</button>
  </form>
</section>
${footerHTML(p)}`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssForm(p), cssFooter(p), cssAnimations()].join('\n');
  const js = jsBase() + `\ndocument.querySelector('form')?.addEventListener('submit',e=>{e.preventDefault();joyfulNotify('Welcome! We\\'ll reach out to schedule your free session.');e.target.reset();});`;

  return {
    files: [{ path: 'index.html', content: html }, { path: 'style.css', content: css }, { path: 'script.js', content: js }],
    summary: `Built a fitness studio site "${name}" with class schedule, trainer profiles, membership plans, and contact form.`,
    nextSteps: ['Add class booking system', 'Add client testimonials', 'Add progress tracking', 'Create mobile app'],
    metadata: { template: 'fitness', sections: ['hero', 'classes', 'trainers', 'pricing', 'contact'], estimatedComplexity: 'medium' },
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
  realestate: buildRealEstate,
  fitness: buildFitness,
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
      mediaAssets: options?.mediaAssets,
    },
  };
}

export async function generateWithAI(
  prompt: string,
  existingFiles: ProjectFile[],
  conversationHistory: { role: string; content: string }[] = [],
  options?: AIGenerationOptions
): Promise<AIGenerationResponse> {
  const mediaAssets = await resolveMediaAssets(prompt, options);
  const generationOptions = { ...options, mediaAssets };

  // Use deep analysis when provider is enabled for richer template/feature detection
  const analysis = joyfulProviderConfig.enabled
    ? await deepAnalyzePrompt(prompt, existingFiles)
    : analyzePrompt(prompt, existingFiles);

  if (joyfulProviderConfig.enabled) {
    try {
      const response = await generateWithJoyfulAI(prompt, existingFiles, conversationHistory, generationOptions);
      return withGenerationGuidance({
        ...response,
        metadata: {
          ...response.metadata,
          mediaAssets,
        },
      }, generationOptions);
    } catch (error) {
      console.warn('Joyful AI API failed, falling back to local template builders:', error);
    }
  }

  if (analysis.intent === 'modify') {
    const modified = modifyExistingFiles(prompt, existingFiles, analysis);
    if (modified) {
      return finalizeGenerationResponse(modified, existingFiles, generationOptions);
    }
  }

  if (!/\b(static html|plain html|vanilla html|no react)\b/i.test(prompt)) {
    return finalizeGenerationResponse(buildReactTemplate(analysis, prompt, mediaAssets), existingFiles, generationOptions);
  }

  const builder = TEMPLATE_BUILDERS[analysis.template] || buildPortfolio;
  return finalizeGenerationResponse(builder(analysis), existingFiles, generationOptions);
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
