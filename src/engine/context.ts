import type { AgentContext, RepoMapEntry, FileChange } from './types';

// ── Context Manager ────────────────────────────────────────────────

export interface ContextOptions {
  maxTokens: number;
  includeTree: boolean;
  includeRepoMap: boolean;
  includeRecentChanges: boolean;
  includeMemory: boolean;
  includeSandbox: boolean;
}

export function buildAgentContext(params: {
  userMessage: string;
  files: { path: string; content: string }[];
  repoMap: RepoMapEntry[];
  recentChanges: FileChange[];
  sessionMemory: string;
  projectMemory: string;
  sandboxState: string;
  mode: string;
  taskContext: string;
  options?: Partial<ContextOptions>;
}): AgentContext {
  const opts: ContextOptions = {
    maxTokens: params.options?.maxTokens ?? 8000,
    includeTree: params.options?.includeTree ?? true,
    includeRepoMap: params.options?.includeRepoMap ?? true,
    includeRecentChanges: params.options?.includeRecentChanges ?? true,
    includeMemory: params.options?.includeMemory ?? true,
    includeSandbox: params.options?.includeSandbox ?? true,
  };

  // Extract relevant files based on the user's message
  const relevantFiles = selectRelevantFiles(params.userMessage, params.files, params.repoMap);
  const fileContents = formatFileContentsForPrompt(relevantFiles, opts.maxTokens);

  const context: AgentContext = {
    userMessage: params.userMessage,
    mode: params.mode,
    currentFiles: fileContents,
    projectTree: opts.includeTree
      ? buildTreeString(relevantFiles.map(f => f.path))
      : '',
    repoMap: opts.includeRepoMap
      ? buildRepoMapString(relevantFiles, params.repoMap)
      : '',
    recentChanges: opts.includeRecentChanges
      ? params.recentChanges.map(c => `  ${c.action}: ${c.path} (${c.summary})`).join('\n')
      : '',
    sessionMemory: opts.includeMemory ? params.sessionMemory : '',
    projectMemory: opts.includeMemory ? params.projectMemory : '',
    sandboxState: opts.includeSandbox ? params.sandboxState : '',
    taskContext: params.taskContext,
  };

  return context;
}

// ── Relevance Selection ────────────────────────────────────────────

export function selectRelevantFiles(
  query: string,
  files: { path: string; content: string }[],
  repoMap: RepoMapEntry[],
  maxFiles = 15,
): { path: string; content: string }[] {
  const terms = extractTerms(query);
  const scored = files.map(file => ({
    ...file,
    score: scoreFileRelevance(file, terms, repoMap),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxFiles);
}

function extractTerms(query: string): string[] {
  const words = query.toLowerCase().split(/[^a-zA-Z0-9_/.-]+/);
  return [...new Set(words.filter(w => w.length > 2))];
}

function scoreFileRelevance(
  file: { path: string; content: string },
  terms: string[],
  repoMap: RepoMapEntry[],
): number {
  let score = 0;
  const pathLower = file.path.toLowerCase();
  const contentLower = file.content.toLowerCase();
  const repoEntry = repoMap.find(r => r.path === file.path);

  for (const term of terms) {
    // Exact path match
    if (pathLower === term) { score += 50; continue; }
    if (pathLower.includes(term)) { score += 20; continue; }

    // Path parts
    const pathParts = file.path.split('/');
    for (const part of pathParts) {
      if (part.toLowerCase().includes(term)) { score += 10; break; }
    }

    // Exports
    if (repoEntry && repoEntry.exports.some(e => e.toLowerCase().includes(term))) {
      score += 15;
    }

    // Content frequency
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = contentLower.match(regex);
    if (matches) {
      score += Math.min(matches.length * 2, 15);
    }
  }

  return score;
}

// ── Formatting Helpers ─────────────────────────────────────────────

export function formatFileContentsForPrompt(
  files: { path: string; content: string }[],
  maxTokens = 8000,
): string {
  let result = '';
  let totalChars = 0;
  const charBudget = maxTokens * 3; // rough estimate: 1 token ≈ 3-4 chars

  for (const file of files) {
    const header = `\n## ${file.path}\n\`\`\`\n`;
    const footer = '\n```\n';
    const entry = header + file.content + footer;

    if (totalChars + entry.length > charBudget) {
      if (result === '') {
        // At least include the header with truncated content
        const maxContent = charBudget - header.length - footer.length - 50;
        result += header + file.content.slice(0, Math.max(0, maxContent)) + '\n// ... (truncated)\n' + footer;
      } else {
        result += '\n// ... (remaining files truncated due to token budget)\n';
      }
      break;
    }

    result += entry;
    totalChars += entry.length;
  }

  return result;
}

function buildTreeString(paths: string[]): string {
  if (paths.length === 0) return '(empty project)';

  const sorted = [...paths].sort();
  const lines: string[] = [];
  const prefixMap = new Map<string, boolean>();

  for (const path of sorted) {
    const parts = path.split('/');
    let current = '';

    for (let i = 0; i < parts.length; i++) {
      current = current ? `${current}/${parts[i]}` : parts[i];

      if (!prefixMap.has(current)) {
        prefixMap.set(current, true);
        const indent = '  '.repeat(i);
        const isLast = i === parts.length - 1;
        const name = parts[i] + (isLast ? '' : '/');
        lines.push(`${indent}${name}`);
      }
    }
  }

  return lines.join('\n');
}

function buildRepoMapString(
  relevantFiles: { path: string; content: string }[],
  repoMap: RepoMapEntry[],
): string {
  const relevantPaths = new Set(relevantFiles.map(f => f.path));
  const entries = repoMap.filter(e => relevantPaths.has(e.path));

  if (entries.length === 0) return '';

  return entries.map(e => {
    const parts = [`  ${e.path} — ${e.purpose}`];
    if (e.exports.length > 0) {
      parts.push(`    exports: ${e.exports.join(', ')}`);
    }
    if (e.imports.length > 0) {
      const localImports = e.imports.filter(i => relevantPaths.has(i));
      if (localImports.length > 0) {
        parts.push(`    depends on: ${localImports.join(', ')}`);
      }
    }
    return parts.join('\n');
  }).join('\n');
}

// ── Build Prompt ───────────────────────────────────────────────────

export function buildSystemPrompt(
  mode: string,
  projectContext: string,
  taskContext: string,
): string {
  const modeDescriptions: Record<string, string> = {
    architect: `You are an architect. Your job is to plan and design the architecture before any code is written.
- Analyze the project structure and understand existing patterns
- Create a detailed plan with file paths, component hierarchy, and data flow
- Identify potential issues before implementation
- NEVER write code directly — create spec.md and plan.md files`,
    builder: `You are a builder. Your job is to implement features by editing files.
- Read the plan and existing files before writing code
- Create and edit files with validated operations
- Run the project to verify changes work
- Fix issues iteratively based on errors`,
    debugger: `You are a debugger. Your job is to find and fix bugs.
- Reproduce the issue first
- Isolate the root cause before proposing a fix
- Write the minimal fix needed
- Verify the fix resolves the issue`,
    explorer: `You are an explorer. Your job is to navigate and understand the codebase.
- Read files the user asks about
- Explain how components relate to each other
- Trace data flow through the application
- Answer questions without making changes`,
    reviewer: `You are a reviewer. Your job is to review code quality and provide feedback.
- Check for bugs, security issues, and code smells
- Verify the code follows project conventions
- Suggest improvements without changing code
- Provide actionable, specific feedback`,
    memory: `You are a memory manager. Your job is to manage project knowledge.
- Extract key facts from discussions
- Update project memory with decisions and patterns
- Maintain a structured record of the project's evolution`,
  };

  const description = modeDescriptions[mode] || modeDescriptions.builder;

  return `You are Joyful — an AI-powered development platform.

${description}

## Project Context
${projectContext}

${taskContext ? `## Current Task\n${taskContext}\n` : ''}

## Guidelines
- Always plan before implementing. Create/update tasks as you work.
- Prefer small, focused commits/changes.
- Validate file operations before executing them — no path traversal, no unsafe writes.
- After each change, verify it works (compile, run, test).
- If you hit an error, debug it — don't guess.
- If you're unsure about something, read the relevant files to understand the context.
- Keep the user informed of your progress and any decisions you make.
- Never use emoji in code or commit messages.`;
}

export function buildUserPrompt(context: AgentContext): string {
  const parts: string[] = [];

  if (context.projectTree) {
    parts.push(`## Project Tree\n${context.projectTree}`);
  }

  if (context.repoMap) {
    parts.push(`## Relevant Files\n${context.repoMap}`);
  }

  if (context.recentChanges) {
    parts.push(`## Recent Changes\n${context.recentChanges}`);
  }

  if (context.sessionMemory) {
    parts.push(`## Session Memory\n${context.sessionMemory}`);
  }

  if (context.projectMemory) {
    parts.push(`## Project Memory\n${context.projectMemory}`);
  }

  if (context.sandboxState) {
    parts.push(`## Sandbox State\n${context.sandboxState}`);
  }

  if (context.taskContext) {
    parts.push(`## Current Task Status\n${context.taskContext}`);
  }

  parts.push(`## User Request\n${context.userMessage}`);

  return parts.join('\n\n');
}
