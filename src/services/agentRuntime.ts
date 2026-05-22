import type { AgentPlanStep, AgentToolTrace, AIGenerationResponse, ProjectMemorySnapshot, ProjectFile } from '@/types';
import type { ContextFileNode } from '@/services/skills';
import {
  type TaskPlan,
  type SubTask,
  type MemoryEntry,
  type SessionMemory,
  type QualityGate,
  type FileDiff,
  type ErrorRecoveryPlan,
  type ErrorRecoveryStrategy,
  type DependencyGraph,
  type DependencyNode,
} from '@/types/buildSteps';

// ─── Utilities ────────────────────────────────────────────────────

function now() {
  return new Date().toISOString();
}

function uid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function createTrace(
  tool: AgentToolTrace['tool'],
  label: string,
  detail?: string,
  target?: string,
  status: AgentToolTrace['status'] = 'done',
): AgentToolTrace {
  const timestamp = now();
  return {
    id: `trace_${uid()}`,
    tool,
    label,
    status,
    target,
    detail,
    startedAt: timestamp,
    endedAt: status === 'running' || status === 'pending' ? undefined : timestamp,
  };
}

// ─── Session Memory System ───────────────────────────────────────-

const TTL_TURNS_DEFAULT = 8;
const MAX_MEMORY_ENTRIES = 100;

export class SessionMemoryManager {
  private memory: SessionMemory = {
    entries: [],
    contextSummary: '',
    modifiedFiles: new Set(),
  };

  /** Add a decision or lesson to session memory */
  addEntry(
    type: MemoryEntry['type'],
    content: string,
    files: string[] = [],
    ttlTurns = TTL_TURNS_DEFAULT,
  ): MemoryEntry {
    const entry: MemoryEntry = {
      id: `mem_${uid()}`,
      type,
      content,
      files,
      timestamp: Date.now(),
      ttlTurns,
      ageTurns: 0,
    };
    this.memory.entries.push(entry);
    this.pruneStale();
    return entry;
  }

  /** Track a modified file */
  trackModifiedFile(path: string): void {
    this.memory.modifiedFiles.add(path);
  }

  /** Get relevant memory entries for a given prompt/context */
  getRelevantEntries(prompt: string, limit = 8): MemoryEntry[] {
    const promptTokens = new Set(
      prompt.toLowerCase().split(/\s+/).filter(t => t.length > 3),
    );

    return this.memory.entries
      .map(entry => {
        let score = 0;
        const contentTokens = entry.content.toLowerCase().split(/\s+/);
        for (const token of promptTokens) {
          if (contentTokens.some(t => t.includes(token))) score += 2;
          if (entry.files.some(f => f.includes(token))) score += 3;
          if (entry.type === 'issue' && token === 'fix') score += 5;
          if (entry.type === 'decision' && token === 'keep') score += 4;
        }
        // Favor recent entries
        score += Math.max(0, 3 - entry.ageTurns);
        return { entry, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.entry);
  }

  /** Build a memory summary string for prompt context */
  buildMemoryNotes(): string[] {
    const notes: string[] = [];

    const decisions = this.memory.entries.filter(e => e.type === 'decision');
    if (decisions.length > 0) {
      notes.push('Key decisions:');
      decisions.slice(-6).forEach(d => notes.push(`- ${d.content}`));
    }

    const issues = this.memory.entries.filter(e => e.type === 'issue');
    if (issues.length > 0) {
      notes.push('Known issues:');
      issues.slice(-4).forEach(d => notes.push(`- ${d.content}`));
    }

    if (this.memory.modifiedFiles.size > 0) {
      notes.push(`Modified files: ${Array.from(this.memory.modifiedFiles).join(', ')}`);
    }

    return notes;
  }

  /** Age all entries (call at end of each turn) */
  ageEntries(): void {
    this.memory.entries.forEach(e => (e.ageTurns += 1));
    this.pruneStale();
  }

  /** Remove expired or aged-out entries */
  private pruneStale(): void {
    this.memory.entries = this.memory.entries.filter(
      e => e.ageTurns < e.ttlTurns,
    );
    if (this.memory.entries.length > MAX_MEMORY_ENTRIES) {
      this.memory.entries = this.memory.entries.slice(-MAX_MEMORY_ENTRIES);
    }
  }

  getSessionMemory(): SessionMemory {
    return this.memory;
  }

  resetSessionMemory(): void {
    this.memory = { entries: [], contextSummary: '', modifiedFiles: new Set() };
  }
}

// ─── Task Decomposition Engine ────────────────────────────────────

export class TaskDecompositionEngine {
  /** Decompose a prompt into ordered subtasks */
  decompose(
    prompt: string,
    contextGraph: ContextFileNode[],
    hasExistingFiles: boolean,
  ): TaskPlan[] {
    const complexity = this.classifyComplexity(prompt, contextGraph);

    if (complexity === 'simple') {
      return [this.buildSingleTask(prompt, hasExistingFiles)];
    }

    return this.buildMultiStepPlan(prompt, contextGraph, complexity);
  }

  private classifyComplexity(
    prompt: string,
    contextGraph: ContextFileNode[],
  ): 'simple' | 'medium' | 'complex' {
    const lower = prompt.toLowerCase();
    const length = prompt.length;
    const contextSize = contextGraph.length;

    // Complex signals: multi-page, auth, data fetching, state management, complex forms
    const complexSignals = [
      'dashboard', 'multi.page', 'auth', 'login', 'registration',
      'data.fetching', 'api', 'database', 'state.management',
      'workflow', 'kanban', 'crm', 'payment', 'stripe',
      'real.time', 'websocket', 'chat', 'notification',
      'complex.form', 'wizard', 'multi.step',
      'authentication', 'authorization', 'role',
      'admin.panel', 'settings.page', 'user.profile',
      'ecommerce', 'checkout', 'cart', 'product.catalog',
    ];

    const mediumSignals = [
      'form', 'page.', 'route', 'component', 'section',
      'contact.form', 'gallery', 'pricing.table',
      'testimonial', 'blog.post', 'article.list',
      'modal', 'dialog', 'sidebar', 'navigation',
      'search', 'filter', 'sort', 'pagination',
    ];

    const hasComplex = complexSignals.some(s => lower.includes(s));
    const hasMedium = mediumSignals.some(s => lower.includes(s));

    if (hasComplex || length > 500 || contextSize > 6) return 'complex';
    if (hasMedium || length > 200 || contextSize > 3) return 'medium';
    return 'simple';
  }

  private buildSingleTask(prompt: string, hasExistingFiles: boolean): TaskPlan {
    return {
      id: `task_${uid()}`,
      title: hasExistingFiles ? 'Update project' : 'Create project',
      description: prompt.slice(0, 200),
      complexity: 'simple',
      subtasks: [
        {
          id: `sub_${uid()}`,
          label: hasExistingFiles ? 'Read and understand current files' : 'Generate project scaffold',
          type: 'analyze',
          status: 'pending',
        },
        {
          id: `sub_${uid()}`,
          label: 'Generate implementation',
          type: 'create',
          status: 'pending',
        },
        {
          id: `sub_${uid()}`,
          label: 'Validate output',
          type: 'validate',
          status: 'pending',
        },
      ],
      affectedFiles: [],
      dependsOn: [],
      status: 'pending',
    };
  }

  private buildMultiStepPlan(
    prompt: string,
    contextGraph: ContextFileNode[],
    complexity: 'medium' | 'complex',
  ): TaskPlan[] {
    const lower = prompt.toLowerCase();
    const plans: TaskPlan[] = [];

    // Phase 1: Analysis & planning
    plans.push({
      id: `task_${uid()}`,
      title: 'Analyze request and plan architecture',
      description: 'Understand requirements, review existing context, and design the solution architecture',
      complexity,
      subtasks: [
        {
          id: `sub_${uid()}`,
          label: 'Review existing files and context',
          type: 'analyze',
          status: 'pending',
          detail: contextGraph.slice(0, 3).map(n => n.path).join(', '),
        },
        {
          id: `sub_${uid()}`,
          label: 'Design component tree and data flow',
          type: 'design',
          status: 'pending',
        },
        {
          id: `sub_${uid()}`,
          label: 'Plan file structure and routing',
          type: 'analyze',
          status: 'pending',
        },
        {
          id: `sub_${uid()}`,
          label: 'Identify dependencies and shared state',
          type: 'analyze',
          status: 'pending',
        },
      ],
      affectedFiles: contextGraph.map(n => n.path),
      dependsOn: [],
      status: 'pending',
    });

    // Phase 2: Core implementation
    const coreSubtasks: SubTask[] = [];
    if (complexity === 'complex' || /auth|login|sign.?up|user/i.test(lower)) {
      coreSubtasks.push({
        id: `sub_${uid()}`,
        label: 'Build types and interfaces',
        type: 'create',
        status: 'pending',
      });
      coreSubtasks.push({
        id: `sub_${uid()}`,
        label: 'Build data layer (services, hooks)',
        type: 'create',
        status: 'pending',
      });
    }

    if (/page|route|multi/i.test(lower) || complexity === 'complex') {
      coreSubtasks.push({
        id: `sub_${uid()}`,
        label: 'Create page components with routing',
        type: 'create',
        status: 'pending',
      });
    }

    coreSubtasks.push({
      id: `sub_${uid()}`,
      label: 'Build shared components and layouts',
      type: 'create',
      status: 'pending',
    });

    if (/state|context|store|redux|recoil|zustand|jotai/i.test(lower)) {
      coreSubtasks.push({
        id: `sub_${uid()}`,
        label: 'Set up state management',
        type: 'create',
        status: 'pending',
      });
    }

    coreSubtasks.push({
      id: `sub_${uid()}`,
      label: 'Implement styling and responsive layout',
      type: 'modify',
      status: 'pending',
    });

    plans.push({
      id: `task_${uid()}`,
      title: `Build ${complexity === 'complex' ? 'full application' : 'feature implementation'}`,
      description: 'Generate all necessary files and components',
      complexity,
      subtasks: coreSubtasks,
      affectedFiles: [],
      dependsOn: [plans.length > 0 ? plans[0].id : ''],
      status: 'pending',
    });

    // Phase 3: Validation & polish
    plans.push({
      id: `task_${uid()}`,
      title: 'Validate, fix, and polish',
      description: 'Run validation checks, fix errors, and polish UI',
      complexity,
      subtasks: [
        {
          id: `sub_${uid()}`,
          label: 'Run build check',
          type: 'command',
          status: 'pending',
        },
        {
          id: `sub_${uid()}`,
          label: 'Fix TypeScript and lint errors',
          type: 'validate',
          status: 'pending',
        },
        {
          id: `sub_${uid()}`,
          label: 'Verify all routes render correctly',
          type: 'validate',
          status: 'pending',
        },
        {
          id: `sub_${uid()}`,
          label: 'Check responsive layout and accessibility',
          type: 'validate',
          status: 'pending',
        },
        {
          id: `sub_${uid()}`,
          label: 'Polish UI and fix visual issues',
          type: 'modify',
          status: 'pending',
        },
      ],
      affectedFiles: [],
      dependsOn: [plans.length > 0 ? plans[plans.length - 1].id : ''],
      status: 'pending',
    });

    return plans;
  }
}

// ─── Quality Gate Orchestrator ────────────────────────────────────

export class QualityGateOrchestrator {
  private gates: QualityGate[] = [];

  /** Build the standard gates for a project */
  buildGates(
    hasPackageJson: boolean,
    hasTsConfig: boolean,
    complexity: 'simple' | 'medium' | 'complex',
  ): QualityGate[] {
    this.gates = [];

    if (hasPackageJson) {
      this.gates.push({
        id: `gate_${uid()}`,
        name: 'Package.json valid',
        description: 'Validate package.json is well-formed',
        type: 'build',
        command: 'check package.json',
        status: 'pending',
        repairHint: 'Fix JSON syntax errors in package.json or restore missing required fields',
      });
    }

    if (hasTsConfig) {
      this.gates.push({
        id: `gate_${uid()}`,
        name: 'TypeScript compiles',
        description: 'Verify TypeScript compilation passes',
        type: 'typescript',
        command: 'npm run build',
        status: 'pending',
        repairHint: 'Check for missing types, incorrect imports, or type mismatches',
      });
    }

    this.gates.push({
      id: `gate_${uid()}`,
      name: 'File structure complete',
      description: 'All referenced files exist and imports resolve',
      type: 'build',
      status: 'pending',
      repairHint: 'Missing file or broken import path',
    });

    if (complexity !== 'simple') {
      this.gates.push({
        id: `gate_${uid()}`,
        name: 'Routing works',
        description: 'All routes are defined and components exist',
        type: 'preview',
        status: 'pending',
        repairHint: 'Missing route definition or page component',
      });

      this.gates.push({
        id: `gate_${uid()}`,
        name: 'Responsive layout',
        description: 'Layout adapts across viewport sizes',
        type: 'responsive',
        status: 'pending',
        repairHint: 'Add responsive Tailwind classes (sm:, md:, lg:)',
      });
    }

    this.gates.push({
      id: `gate_${uid()}`,
      name: 'No dead code',
      description: 'No unused imports, variables, or exports',
      type: 'lint',
      status: 'pending',
      repairHint: 'Remove unused imports and dead code paths',
    });

    return this.gates;
  }

  /** Mark a gate with status */
  updateGate(id: string, updates: Partial<QualityGate>): void {
    const gate = this.gates.find(g => g.id === id);
    if (gate) Object.assign(gate, updates);
  }

  /** Get all failed gates */
  getFailedGates(): QualityGate[] {
    return this.gates.filter(g => g.status === 'failed');
  }

  /** Check if all gates pass */
  allPassed(): boolean {
    return this.gates.length > 0 && this.gates.every(g => g.status === 'passed' || g.status === 'skipped');
  }

  /** Get summary for reporting */
  getSummary(): { passed: number; failed: number; total: number } {
    return {
      passed: this.gates.filter(g => g.status === 'passed').length,
      failed: this.gates.filter(g => g.status === 'failed').length,
      total: this.gates.length,
    };
  }

  reset(): void {
    this.gates = [];
  }
}

// ─── Error Recovery Engine ────────────────────────────────────────

export class ErrorRecoveryEngine {
  /** Build a recovery plan for a given error */
  planRecovery(
    error: string,
    source: ErrorRecoveryPlan['source'],
    attemptNumber: number,
  ): ErrorRecoveryPlan {
    const strategies: ErrorRecoveryStrategy[] = [];

    const lower = error.toLowerCase();

    if (source === 'ai_provider') {
      strategies.push({ type: 'retry', maxAttempts: 3, backoffMs: 1000 * Math.pow(2, attemptNumber) });

      if (/rate.limit|429|too many/i.test(lower)) {
        strategies.push({ type: 'retry', maxAttempts: 2, backoffMs: 5000 });
      }

      if (/timeout|timed out|504|503|502/i.test(lower)) {
        strategies.push({ type: 'fallback_model', model: 'fallback' });
      }

      if (/image|vision|multimodal/i.test(lower)) {
        strategies.push({ type: 'strip_images' });
      }

      if (attemptNumber >= 3) {
        strategies.push({ type: 'simplify_prompt', hint: 'Reduce prompt complexity and remove non-essential additions' });
      }
    }

    if (source === 'typescript') {
      strategies.push({ type: 'retry', maxAttempts: 2, backoffMs: 500 });
      if (/module|import|cannot.find/i.test(lower)) {
        strategies.push({ type: 'simplify_prompt', hint: 'Add missing imports or fix file paths' });
      }
    }

    if (source === 'build') {
      strategies.push({ type: 'retry', maxAttempts: 2, backoffMs: 500 });
    }

    if (source === 'lint') {
      strategies.push({ type: 'retry', maxAttempts: 2, backoffMs: 300 });
    }

    if (source === 'patch') {
      strategies.push({ type: 'simplify_prompt', hint: 'The patch target could not be found. Use full file replacement instead.' });
    }

    if (strategies.length === 0) {
      strategies.push({ type: 'retry', maxAttempts: 2, backoffMs: 1000 });
      strategies.push({ type: 'abort', message: `Could not recover from: ${error.slice(0, 200)}` });
    }

    return { error, source, strategies };
  }

  /** Check if an error is recoverable */
  isRecoverable(plan: ErrorRecoveryPlan): boolean {
    return plan.strategies.some(s => s.type !== 'abort');
  }
}

// ─── Dependency Graph Builder ─────────────────────────────────────

export class DependencyGraphBuilder {
  build(files: ProjectFile[]): DependencyGraph {
    const nodes = new Map<string, DependencyNode>();
    const cycles: string[][] = [];
    const orphans: string[] = [];

    // Create nodes
    for (const file of files) {
      const node = this.analyzeFile(file);
      nodes.set(file.path, node);
    }

    const knownPaths = new Set(nodes.keys());

    // Build incoming references
    for (const [, node] of nodes) {
      for (const imp of node.imports) {
        const resolved = this.resolveLocalImport(node.path, imp, knownPaths);
        if (resolved && nodes.has(resolved)) {
          nodes.get(resolved)!.importedBy.push(node.path);
        }
      }
    }

    // Detect cycles via DFS
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const path: string[] = [];

    const dfs = (current: string) => {
      if (inStack.has(current)) {
        const cycleStart = path.indexOf(current);
        if (cycleStart >= 0) {
          cycles.push([...path.slice(cycleStart), current]);
        }
        return;
      }
      if (visited.has(current)) return;

      visited.add(current);
      inStack.add(current);
      path.push(current);

      const node = nodes.get(current);
      if (node) {
        for (const imp of node.imports) {
          const resolved = this.resolveLocalImport(current, imp, knownPaths);
          if (resolved && nodes.has(resolved)) {
            dfs(resolved);
          }
        }
      }

      path.pop();
      inStack.delete(current);
    };

    for (const [path] of nodes) {
      dfs(path);
    }

    // Find orphans (files not imported by anything)
    for (const [path, node] of nodes) {
      if (node.importedBy.length === 0 && !/^(index\.html|package\.json|vite\.config|tsconfig|README)/.test(path)) {
        orphans.push(path);
      }
    }

    return { nodes, cycles, orphans };
  }

  private analyzeFile(file: ProjectFile): DependencyNode {
    const imports: string[] = [];
    const externalDeps: string[] = [];
    const importRegex = /(?:import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?)\s*['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;

    while ((match = importRegex.exec(file.content)) !== null) {
      const specifier = match[1];
      if (!specifier) continue;
      if (specifier.startsWith('.') || specifier.startsWith('@/')) {
        imports.push(specifier);
      } else {
        const pkg = specifier.startsWith('@')
          ? specifier.split('/').slice(0, 2).join('/')
          : specifier.split('/')[0];
        if (!externalDeps.includes(pkg)) externalDeps.push(pkg);
      }
    }

    const type = this.inferType(file.path);

    return {
      path: file.path,
      imports,
      importedBy: [],
      externalDeps,
      type,
    };
  }

  private resolveLocalImport(sourcePath: string, specifier: string, knownPaths?: Set<string>): string | null {
    const base = specifier.startsWith('@/')
      ? `src/${specifier.slice(2)}`
      : specifier.startsWith('.')
        ? this.resolveRelative(sourcePath, specifier)
        : null;

    if (!base) return null;

    const extensions = ['.tsx', '.ts', '.jsx', '.js', '.css', '.json', ''];
    const dir = this.dirname(sourcePath);

    // Try each extension and check if the resulting file exists in known paths
    for (const ext of extensions) {
      const candidate = ext ? `${base}${ext}` : base;
      if (knownPaths && knownPaths.has(candidate)) return candidate;
      if (!knownPaths && candidate.endsWith(ext) && ext) return candidate;
    }

    // Try index files
    for (const ext of extensions) {
      const withIndex = `${dir}/${base.split('/').pop()}/index${ext}`;
      if (knownPaths && knownPaths.has(withIndex)) return withIndex;
      if (!knownPaths && withIndex.endsWith(ext) && ext) return withIndex;
    }

    if (knownPaths && knownPaths.has(base)) return base;
    return base;
  }

  private resolveRelative(source: string, relative: string): string {
    const dir = this.dirname(source);
    const parts = dir ? dir.split('/') : [];
    const relParts = relative.split('/');

    for (const part of relParts) {
      if (part === '..') parts.pop();
      else if (part !== '.') parts.push(part);
    }

    return parts.join('/');
  }

  private dirname(path: string): string {
    const parts = path.split('/');
    parts.pop();
    return parts.join('/');
  }

  private inferType(path: string): DependencyNode['type'] {
    if (/^src\/pages\//.test(path)) return 'page';
    if (/^src\/components\//.test(path)) return 'component';
    if (/^src\/hooks\//.test(path)) return 'hook';
    if (/^src\/services\//.test(path)) return 'service';
    if (/^src\/lib\/|^src\/utils\//.test(path)) return 'utility';
    if (/\.css$|\.scss$/.test(path)) return 'style';
    if (/package\.json|vite\.config|tsconfig|\.env/.test(path)) return 'config';
    if (/^src\/types\//.test(path)) return 'utility';
    return 'unknown';
  }
}

// ─── File Diff Calculator ─────────────────────────────────────────

export class FileDiffCalculator {
  compute(oldContent: string, newContent: string, path: string): FileDiff {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    // Simple line diff
    const added: number[] = [];
    const removed: number[] = [];
    let oldIdx = 0;
    let newIdx = 0;

    while (oldIdx < oldLines.length && newIdx < newLines.length) {
      if (oldLines[oldIdx] === newLines[newIdx]) {
        oldIdx++;
        newIdx++;
      } else {
        // Check if line was added
        const lookahead = oldLines.indexOf(newLines[newIdx], oldIdx);
        if (lookahead > oldIdx && lookahead - oldIdx <= 3) {
          while (oldIdx < lookahead) {
            removed.push(oldIdx + 1);
            oldIdx++;
          }
        } else {
          added.push(newIdx + 1);
          newIdx++;
        }
      }
    }

    while (oldIdx < oldLines.length) {
      removed.push(oldIdx + 1);
      oldIdx++;
    }
    while (newIdx < newLines.length) {
      added.push(newIdx + 1);
      newIdx++;
    }

    // Build diff content (simple format)
    const diffLines: string[] = [];
    diffLines.push(`--- a/${path}`);
    diffLines.push(`+++ b/${path}`);

    const allChanges = [...new Set([...added, ...removed])].sort((a, b) => a - b);
    if (allChanges.length > 0) {
      const start = Math.max(1, allChanges[0] - 2);
      const end = Math.min(newLines.length, allChanges[allChanges.length - 1] + 2);
      diffLines.push(`@@ -${start},${end - start + 1} +${start},${end - start + 1} @@`);

      for (let i = start - 1; i < end; i++) {
        if (removed.includes(i + 1)) diffLines.push(`-${oldLines[i] || ''}`);
        else if (added.includes(i + 1)) diffLines.push(`+${newLines[i] || ''}`);
        else diffLines.push(` ${newLines[i] || ''}`);
      }
    }

    // Simple hash
    const beforeHash = String(oldContent.length);
    const afterHash = String(newContent.length);

    return {
      path,
      linesAdded: added.length,
      linesRemoved: removed.length,
      diffContent: diffLines.join('\n'),
      beforeHash,
      afterHash,
    };
  }
}

// ─── Original agent builder functions (preserved API) ─────────────

export function buildProjectMemorySnapshot(
  selectedSkills: string[],
  contextGraph: ContextFileNode[],
  response?: AIGenerationResponse,
): ProjectMemorySnapshot {
  const sandboxIssues = response?.metadata?.sandboxResults
    ?.filter(result => result.status === 'error')
    .map(result => `${result.command}: ${(result.stderr || result.stdout || 'failed').trim().slice(0, 160)}`) || [];

  const recentDecisions = [
    contextGraph.length > 0 ? `Used ranked context: ${contextGraph.slice(0, 4).map(node => node.path).join(', ')}` : 'Started from an empty project.',
    response?.metadata?.estimatedComplexity ? `Complexity: ${response.metadata.estimatedComplexity}` : '',
    response?.patches?.length ? `Preferred ${response.patches.length} targeted patch operation(s).` : '',
  ].filter(Boolean);

  return {
    selectedSkills,
    contextFiles: contextGraph.map(node => node.path),
    recentDecisions,
    knownIssues: sandboxIssues,
  };
}

export function buildAgentPlanFromContext(
  prompt: string,
  contextGraph: ContextFileNode[],
  selectedSkills: string[],
  hasExistingFiles: boolean,
): AgentPlanStep[] {
  const engine = new TaskDecompositionEngine();
  const plans = engine.decompose(prompt, contextGraph, hasExistingFiles);

  // Convert TaskPlans to AgentPlanSteps
  if (plans.length > 1) {
    return plans.flatMap((plan, idx): AgentPlanStep[] => [
      {
        id: plan.id,
        title: plan.title,
        status: idx === 0 ? 'done' as const : 'pending' as const,
        detail: plan.description.slice(0, 100),
      },
      ...plan.subtasks.map((sub, subIdx): AgentPlanStep => ({
        id: sub.id,
        title: sub.label,
        status: idx === 0 && subIdx === 0 ? 'done' as const : 'pending' as const,
        detail: sub.detail,
      })),
    ]);
  }

  const complex = prompt.length > 220 || /complex|dashboard|app|auth|database|workflow|kanban|crm|commerce|booking|analytics|multi[- ]page/i.test(prompt);
  return [
    {
      id: 'understand',
      title: 'Understand request',
      status: 'done',
      detail: complex ? 'Classified as a complex build/change request' : 'Classified as a focused build/change request',
    },
    {
      id: 'context',
      title: hasExistingFiles ? 'Inspect project context' : 'Prepare project scaffold',
      status: 'done',
      detail: contextGraph.length ? contextGraph.slice(0, 3).map(node => node.path).join(', ') : 'No existing files',
    },
    {
      id: 'skills',
      title: 'Activate builder skills',
      status: selectedSkills.length ? 'done' : 'pending',
      detail: selectedSkills.slice(0, 4).join(', '),
    },
    {
      id: 'implementation',
      title: 'Generate targeted file operations',
      status: 'pending',
      detail: hasExistingFiles ? 'Prefer patches and minimal rewrites' : 'Create a complete runnable React/Vite app',
    },
    {
      id: 'verify',
      title: 'Validate and repair',
      status: 'pending',
      detail: 'Run sandbox checks and surface issues for repair',
    },
  ];
}

export function buildAgentToolTrace(
  selectedSkills: string[],
  contextGraph: ContextFileNode[],
  response: AIGenerationResponse,
): AgentToolTrace[] {
  const trace: AgentToolTrace[] = [
    createTrace('select_skills', 'Selected builder skills', selectedSkills.join(', ') || 'Default builder skills'),
    createTrace(
      'rank_context',
      'Ranked project context',
      contextGraph.length ? contextGraph.map(node => `${node.path} (${node.reason})`).join('; ') : 'No existing files',
    ),
  ];

  for (const node of contextGraph.slice(0, 8)) {
    trace.push(createTrace('read_file', `Read ${node.path}`, node.reason, node.path));
  }

  for (const step of response.metadata?.agentPlan || []) {
    trace.push(createTrace('plan', step.title, step.detail, undefined, step.status === 'error' ? 'error' : 'done'));
  }

  for (const patch of response.patches || []) {
    const range = patch.lineStart ? `lines ${patch.lineStart}-${patch.lineEnd ?? patch.lineStart}` : 'exact text patch';
    trace.push(createTrace('apply_patch', `Patch ${patch.path}`, patch.reason || range, patch.path));
  }

  for (const file of response.files || []) {
    const tool = file.action === 'delete' ? 'delete_file' : file.action === 'modify' ? 'write_file' : 'write_file';
    const label = file.action === 'delete' ? `Delete ${file.path}` : file.action === 'modify' ? `Update ${file.path}` : `Create ${file.path}`;
    trace.push(createTrace(tool, label, file.action === 'modify' ? 'Full file operation' : undefined, file.path));
  }

  for (const result of response.metadata?.sandboxResults || []) {
    trace.push(createTrace(
      'run_command',
      `Run ${result.command}`,
      (result.stderr || result.stdout || '').trim().slice(0, 180),
      result.command,
      result.status,
    ));
  }

  if (response.metadata?.repaired) {
    trace.push(createTrace('repair', 'Applied repair pass', 'Provider response was repaired before final output'));
  }

  const failedChecks = response.metadata?.sandboxResults?.filter(result => result.status === 'error').length || 0;
  trace.push(createTrace(
    'validate_preview',
    failedChecks ? 'Validation needs review' : 'Validation completed',
    failedChecks ? `${failedChecks} check(s) failed` : 'No blocking sandbox errors reported',
    undefined,
    failedChecks ? 'error' : 'done',
  ));

  return trace;
}

// ─── Multi-Step Pipeline Executor ─────────────────────────────────

export type PipelinePhase =
  | { type: 'planning'; status: 'active' | 'done' | 'error'; detail?: string }
  | { type: 'executing_file'; path: string; status: 'active' | 'done' | 'error'; detail?: string }
  | { type: 'validating'; status: 'active' | 'done' | 'error'; detail?: string };

/**
 * Orchestrates multi-step pipeline execution:
 * 1. Generate plan (file list, architecture)
 * 2. Execute file-by-file (one AI call per file)
 * 3. Validate the final output
 */
export class MultiStepPipelineExecutor {
  private onPhaseChange?: (phase: PipelinePhase) => void;
  private filesGenerated: number = 0;
  private totalFiles: number = 0;

  constructor(onPhaseChange?: (phase: PipelinePhase) => void) {
    this.onPhaseChange = onPhaseChange;
  }

  /**
   * Build a system prompt for plan-only generation
   */
  buildPlanPrompt(
    prompt: string,
    contextGraph: string[],
    existingFiles: { path: string; content: string }[],
    skillBrief: string[],
    memoryNotes: string[],
  ): string {
    const filesContext = existingFiles
      .slice(0, 24)
      .map(f => `--- ${f.path} ---\n${f.content.slice(0, 8000)}`)
      .join('\n\n');

    const skillText = skillBrief.length
      ? `\n\nActive skills:\n${skillBrief.map(s => `- ${s}`).join('\n')}`
      : '';

    const memoryText = memoryNotes.length
      ? `\n\nProject memory:\n${memoryNotes.map(n => `- ${n}`).join('\n')}`
      : '';

    const contextText = contextGraph.length
      ? `\n\nRanked context files: ${contextGraph.join(', ')}`
      : '';

    return `You are a software architect. Given a user's request and existing project context, create a detailed build plan.

Strict Guidelines for Path, Alias, & Import Management:
1. Alias Usage: For all imports to files in the \`src/\` directory, prefer the absolute alias \`@/\` (e.g. \`import { X } from '@/components/X'\`).
2. Extension Integrity: NEVER append duplicate extensions such as \`.tsx.tsx\` or \`.ts.ts\` to file paths or import specifiers.
3. No Double Slashes: Ensure there are no double slashes \`//\` in any paths or import paths.
4. Capitalization & Consistency: Match directory capitalization exactly (use lowercase \`src/components/\` and \`src/services/\`, do not mix \`Components/\` and \`components/\`).
5. Complete Reference Map: Ensure every component or file listed in the dependencies is defined and created/modified in the plan. Do not reference missing files.

Your task is to analyze the requirements and output a plan (as JSON) that lists:
- Every file that needs to be created, modified, or deleted
- The reason for each file operation
- Dependencies between files (which files does each file import from)
- The optimal execution order (dependencies first)

${skillText}${memoryText}${contextText}

Existing files:
${filesContext || 'No existing files - this is a new project.'}

User request:
${prompt}

Return ONLY valid JSON with this exact shape - no markdown fences, no extra text:
{
  "title": "Plan title",
  "description": "Brief plan description",
  "estimatedComplexity": "simple|medium|complex",
  "summary": "Summary of what will be built",
  "files": [
    {
      "path": "src/components/Example.tsx",
      "action": "create|modify|delete",
      "reason": "Why this file is needed",
      "estimatedComplexity": "simple|medium|complex",
      "dependencies": []
    }
  ]
}
The execution order will be determined by the dependency graph (files with no deps first). Be specific and thorough.`;
  }

  /**
   * Build a system prompt for generating a single file's content
   */
  buildFileGenerationPrompt(
    filePath: string,
    action: 'create' | 'modify' | 'delete',
    reason: string,
    plan: string,
    projectContext: string,
    existingContent: string | undefined,
    alreadyGeneratedFiles: { path: string; content: string }[],
  ): string {
    const existingContext = existingContent
      ? `\n\nExisting file content:\n${existingContent.slice(0, 10000)}`
      : '';

    const alreadyGenerated = alreadyGeneratedFiles.length
      ? `\n\nAlready generated files (available to import):\n${alreadyGeneratedFiles.map(f => `--- ${f.path} ---\n${f.content.slice(0, 3000)}`).join('\n\n')}`
      : '';

    return `You are generating a single file for a project. Focus only on this file's complete content.

Strict Path & Import Instructions:
1. Import Paths: Use correct paths. Prefer using the \`@/\` absolute alias (e.g., \`import { X } from '@/components/X'\`) for imports pointing inside \`src/\`. If using relative paths, make sure they are accurate and do not contain double slashes \`//\` or duplicate file extensions (like \`Comp.tsx.tsx\`).
2. Existing Structure: Match existing file exports and interfaces exactly. Do not assume or invent non-existent files or functions.
3. Completely Filled: Do NOT output any placeholder comments or truncated sections. Complete the implementation.

Project architecture:\n${plan.slice(0, 2000)}

File to ${action}: ${filePath}
Reason: ${reason}
${projectContext}${existingContext}${alreadyGenerated}

Return ONLY valid JSON with this exact shape - no markdown fences, no extra text:
{
  "content": "Complete file content here",
  "summary": "One-line summary of what this file does"
}

Make sure the file is complete, production-quality, and follows the project's conventions. If the file imports from other project files, use actual import paths that match the project structure.`;
  }

  /**
   * Build a system prompt for the final validation pass
   */
  buildValidationPrompt(
    plan: string,
    generatedFiles: { path: string; content: string }[],
  ): string {
    const filesText = generatedFiles
      .map(f => `--- ${f.path} ---\n${f.content.slice(0, 5000)}`)
      .join('\n\n');

    return `You are a QA engineer reviewing a generated project. Check for:
1. Missing imports or broken references
2. Inconsistent naming or patterns
3. Missing files that are imported but not generated
4. Build configuration issues
5. Any TODO or placeholder content that should be filled

Project plan:\n${plan.slice(0, 1000)}

Generated files:\n${filesText}

Return ONLY valid JSON - no markdown fences:
{
  "issues": [
    {
      "type": "missing_import|broken_reference|missing_file|config_issue|placeholder",
      "severity": "error|warning",
      "message": "Description of the issue",
      "file": "path/to/file.tsx",
      "suggestion": "How to fix it"
    }
  ],
  "fixFiles": [
    {
      "path": "path/to/file.tsx",
      "action": "modify|create",
      "content": "Fixed file content",
      "reason": "Why this change is needed"
    }
  ],
  "summary": "Validation result summary"
}
If no issues found, return empty arrays.`;
  }

  /**
   * Parse a plan from AI response text
   */
  parsePlanResponse(text: string): { files: Array<{ path: string; action: string; reason?: string; estimatedComplexity?: string; dependencies?: string[] }>; title?: string; description?: string; summary?: string; estimatedComplexity?: string } | null {
    try {
      const cleaned = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && Array.isArray(parsed.files) && parsed.files.length > 0) {
        return parsed;
      }
      // Handle nested response formats
      if (parsed?.choices?.[0]?.message?.content) {
        return this.parsePlanResponse(parsed.choices[0].message.content);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Parse a single file generation response
   */
  parseFileGenerationResponse(text: string): { content?: string; summary?: string } | null {
    try {
      const cleaned = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed.content === 'string') {
        return parsed;
      }
      if (parsed?.choices?.[0]?.message?.content) {
        return this.parseFileGenerationResponse(parsed.choices[0].message.content);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Parse a validation response
   */
  parseValidationResponse(text: string): { issues?: Array<{ type: string; severity: string; message: string; file?: string; suggestion?: string }>; fixFiles?: Array<{ path: string; action: string; content: string; reason?: string }>; summary?: string } | null {
    try {
      const cleaned = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed) return parsed;
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Determine optimal execution order based on dependencies
   */
  determineExecutionOrder(files: Array<{ path: string; dependencies?: string[] }>): string[] {
    const visited = new Set<string>();
    const order: string[] = [];
    const fileMap = new Map(files.map(f => [f.path, f]));

    const visit = (path: string) => {
      if (visited.has(path)) return;
      visited.add(path);
      const file = fileMap.get(path);
      if (file?.dependencies) {
        for (const dep of file.dependencies) {
          if (fileMap.has(dep)) {
            visit(dep);
          }
        }
      }
      if (!order.includes(path)) {
        order.push(path);
      }
    };

    // Visit config files first, then src files
    const configFiles = files.filter(f => /^package\.json|^vite\.config|^tsconfig|^index\.html/.test(f.path));
    const srcFiles = files.filter(f => !/^package\.json|^vite\.config|^tsconfig|^index\.html/.test(f.path));

    for (const f of configFiles) visit(f.path);
    for (const f of srcFiles) visit(f.path);

    return order;
  }

  /**
   * Build a project context string for file generation prompts
   */
  buildProjectContext(existingFiles: { path: string; content: string }[]): string {
    const configFiles = existingFiles.filter(f =>
      /^package\.json$|^tsconfig|^vite\.config|^index\.html$|^src\/index\.css$|^src\/main\.tsx$/.test(f.path)
    );
    if (configFiles.length === 0) return '';
    return `\nProject config:\n${configFiles.map(f => `--- ${f.path} ---\n${f.content.slice(0, 3000)}`).join('\n\n')}`;
  }

  getProgress(): { filesGenerated: number; totalFiles: number } {
    return { filesGenerated: this.filesGenerated, totalFiles: this.totalFiles };
  }

  /**
   * Create a ProjectPlan from parsed plan data
   */
  createProjectPlan(
    parsed: NonNullable<ReturnType<MultiStepPipelineExecutor['parsePlanResponse']>>,
  ): import('@/types/buildSteps').ProjectPlan {
    this.onPhaseChange?.({ type: 'planning', status: 'active', detail: 'Creating project plan' });
    const planId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const files = parsed.files.map(f => ({
      path: f.path,
      action: (f.action === 'delete' ? 'delete' : f.action === 'modify' ? 'modify' : 'create') as 'create' | 'modify' | 'delete',
      reason: f.reason || 'Required for implementation',
      estimatedComplexity: (f.estimatedComplexity === 'simple' || f.estimatedComplexity === 'medium' || f.estimatedComplexity === 'complex' ? f.estimatedComplexity : 'medium') as 'simple' | 'medium' | 'complex',
      dependencies: Array.isArray(f.dependencies) ? f.dependencies : [],
    }));

    const executionOrder = this.determineExecutionOrder(parsed.files);
    this.totalFiles = files.length;

    return {
      id: planId,
      title: parsed.title || 'Build plan',
      description: parsed.description || parsed.summary || 'Automatically generated build plan',
      files,
      estimatedComplexity: (parsed.estimatedComplexity === 'simple' || parsed.estimatedComplexity === 'medium' || parsed.estimatedComplexity === 'complex'
        ? parsed.estimatedComplexity : 'medium') as 'simple' | 'medium' | 'complex',
      summary: parsed.summary || '',
      executionOrder,
    };
  }
}

// ─── Singleton instances ──────────────────────────────────────────

export const sessionMemory = new SessionMemoryManager();
export const taskDecomposition = new TaskDecompositionEngine();
export const qualityGates = new QualityGateOrchestrator();
export const errorRecovery = new ErrorRecoveryEngine();
export const depGraphBuilder = new DependencyGraphBuilder();
export const diffCalculator = new FileDiffCalculator();
