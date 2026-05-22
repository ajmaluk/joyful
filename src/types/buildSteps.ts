// ── Core Build Step ─────────────────────────────────────────────

export interface BuildStep {
  id: string;
  type: 'analyze' | 'plan' | 'create' | 'modify' | 'delete' | 'patch' | 'command' | 'preview' | 'validate' | 'done';
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
  detail?: string;
  timestamp: number;
}

export function createBuildStep(type: BuildStep['type'], label: string, detail?: string): BuildStep {
  return {
    id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    label,
    status: 'pending',
    detail,
    timestamp: Date.now(),
  };
}

export function buildInitialSteps(hasExistingFiles: boolean): BuildStep[] {
  return [
    createBuildStep('analyze', 'Analyzing your request', 'Understanding requirements and context'),
    createBuildStep('plan', 'Planning implementation', hasExistingFiles ? 'Reviewing existing files' : 'Designing project structure'),
    createBuildStep('create', 'Calling AI provider', 'Generating code and file operations'),
    createBuildStep('modify', 'Applying changes', 'Updating project files'),
    createBuildStep('validate', 'Validating in sandbox', 'Checking for errors and compatibility'),
    createBuildStep('preview', 'Refreshing preview', 'Updating live preview'),
  ];
}

export function buildStepsFromResponse(response: { files?: Array<{ path: string; action?: string }>; patches?: Array<{ path: string }>; metadata?: { sandboxCommands?: Array<{ command: string; args?: string[] }> } }): BuildStep[] {
  const steps: BuildStep[] = [];

  const creates = response.files?.filter(f => f.action === 'create') || [];
  const modifies = response.files?.filter(f => f.action === 'modify') || [];
  const deletes = response.files?.filter(f => f.action === 'delete') || [];
  const patches = response.patches || [];

  for (const file of creates) {
    steps.push(createBuildStep('create', `Create ${file.path}`));
  }
  for (const file of modifies) {
    steps.push(createBuildStep('modify', `Update ${file.path}`));
  }
  for (const file of deletes) {
    steps.push(createBuildStep('delete', `Delete ${file.path}`));
  }
  for (const patch of patches) {
    steps.push(createBuildStep('patch', `Patch ${patch.path}`));
  }

  for (const cmd of response.metadata?.sandboxCommands || []) {
    steps.push(createBuildStep('command', `Run ${cmd.command} ${(cmd.args || []).join(' ')}`));
  }

  if (steps.length > 0) {
    steps.push(createBuildStep('preview', 'Refresh preview'));
  }

  return steps;
}

// ── Task Decomposition ────────────────────────────────────────────

/** A decomposed subtask from a larger prompt */
export interface TaskPlan {
  id: string;
  title: string;
  description: string;
  complexity: 'simple' | 'medium' | 'complex';
  subtasks: SubTask[];
  /** Files expected to be touched */
  affectedFiles: string[];
  /** Dependencies on other TaskPlan IDs */
  dependsOn: string[];
  status: 'pending' | 'active' | 'done' | 'error';
  result?: string;
}

export interface SubTask {
  id: string;
  label: string;
  type: 'create' | 'modify' | 'delete' | 'command' | 'validate' | 'analyze' | 'design';
  status: 'pending' | 'active' | 'done' | 'error';
  detail?: string;
}

// ── Memory System ─────────────────────────────────────────────────

/** Persistent memory entry that carries across turns */
export interface MemoryEntry {
  id: string;
  type: 'decision' | 'pattern' | 'issue' | 'lesson' | 'reference';
  content: string;
  /** Affected file paths */
  files: string[];
  /** When this memory was created */
  timestamp: number;
  /** Expiry: after this many turns the memory is considered stale */
  ttlTurns: number;
  /** How many turns this has survived */
  ageTurns: number;
}

export interface SessionMemory {
  entries: MemoryEntry[];
  /** Running context summary for the current session */
  contextSummary: string;
  /** Files that have been modified */
  modifiedFiles: Set<string>;
}

// ── Quality Gates ─────────────────────────────────────────────────

/** Represents a validation gate that must pass */
export interface QualityGate {
  id: string;
  name: string;
  description: string;
  type: 'build' | 'lint' | 'typescript' | 'preview' | 'a11y' | 'responsive' | 'custom';
  command?: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  result?: string;
  /** Auto-repair hint if failed */
  repairHint?: string;
  /** Error count */
  errors?: number;
  timestamp?: number;
}

// ── File Diff Tracking ────────────────────────────────────────────

export interface FileDiff {
  path: string;
  /** Lines added */
  linesAdded: number;
  /** Lines removed */
  linesRemoved: number;
  /** Actual diff content */
  diffContent: string;
  beforeHash: string;
  afterHash: string;
  patch?: string;
}

// ── Error Recovery ────────────────────────────────────────────────

export type ErrorRecoveryStrategy =
  | { type: 'retry'; maxAttempts: number; backoffMs: number }
  | { type: 'fallback_model'; model: string }
  | { type: 'simplify_prompt'; hint: string }
  | { type: 'strip_images' }
  | { type: 'abort'; message: string };

export interface ErrorRecoveryPlan {
  error: string;
  source: 'ai_provider' | 'sandbox' | 'build' | 'lint' | 'typescript' | 'preview' | 'patch';
  strategies: ErrorRecoveryStrategy[];
}

// ── Multi-Step Pipeline ────────────────────────────────────────────

/** File entry in a project plan (generated before actual content) */
export interface PlanFileEntry {
  path: string;
  action: 'create' | 'modify' | 'delete';
  reason: string;
  estimatedComplexity: 'simple' | 'medium' | 'complex';
  /** File paths this file depends on (imports) */
  dependencies: string[];
}

/** A plan for a multi-step build, generated as the first step */
export interface ProjectPlan {
  id: string;
  title: string;
  description: string;
  files: PlanFileEntry[];
  estimatedComplexity: 'simple' | 'medium' | 'complex';
  summary: string;
  /** Suggested order: files that should be generated first (dependencies) */
  executionOrder: string[];
}

/** Result of generating a single file in the pipeline */
export interface SingleFileGenerationResult {
  path: string;
  content: string;
  action: 'create' | 'modify';
  success: boolean;
  error?: string;
}

/** Overall result of a multi-step pipeline execution */
export interface MultiStepPipelineResult {
  plan: ProjectPlan;
  files: SingleFileGenerationResult[];
  summary: string;
  errors: { path: string; error: string }[];
}

// ── Dependency Analysis ───────────────────────────────────────────

export interface DependencyNode {
  path: string;
  imports: string[];
  importedBy: string[];
  /** External packages used */
  externalDeps: string[];
  type: 'component' | 'page' | 'hook' | 'service' | 'utility' | 'style' | 'config' | 'unknown';
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  /** Circular dependency warnings */
  cycles: string[][];
  /** Orphan files (not imported by anything) */
  orphans: string[];
}
