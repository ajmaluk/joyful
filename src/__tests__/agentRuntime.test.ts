import { describe, it, expect, beforeEach } from 'vitest';
import {
  SessionMemoryManager,
  TaskDecompositionEngine,
  QualityGateOrchestrator,
  ErrorRecoveryEngine,
  DependencyGraphBuilder,
  FileDiffCalculator,
} from '@/services/agentRuntime';
import type { ProjectFile } from '@/types';

// ─── SessionMemoryManager ─────────────────────────────────────────

describe('SessionMemoryManager', () => {
  let mem: SessionMemoryManager;

  beforeEach(() => {
    mem = new SessionMemoryManager();
  });

  it('starts with empty memory', () => {
    const state = mem.getSessionMemory();
    expect(state.entries).toEqual([]);
    expect(state.contextSummary).toBe('');
    expect(state.modifiedFiles.size).toBe(0);
  });

  it('adds an entry and retrieves it', () => {
    const entry = mem.addEntry('decision', 'Use React Router for routing', ['src/App.tsx']);
    expect(entry.id).toMatch(/^mem_/);
    expect(entry.type).toBe('decision');
    expect(entry.content).toBe('Use React Router for routing');
    expect(entry.files).toEqual(['src/App.tsx']);
    expect(entry.ageTurns).toBe(0);
    expect(entry.ttlTurns).toBe(8);
  });

  it('ages entries and prunes stale ones', () => {
    mem.addEntry('decision', 'Entry 1', [], 2);
    mem.addEntry('decision', 'Entry 2', [], 2);

    mem.ageEntries();
    mem.ageEntries();
    mem.ageEntries(); // past TTL

    const state = mem.getSessionMemory();
    expect(state.entries.length).toBe(0);
  });

  it('tracks modified files', () => {
    mem.trackModifiedFile('src/App.tsx');
    mem.trackModifiedFile('src/index.css');

    const state = mem.getSessionMemory();
    expect(state.modifiedFiles.has('src/App.tsx')).toBe(true);
    expect(state.modifiedFiles.has('src/index.css')).toBe(true);
  });

  it('builds memory notes with decisions and issues', () => {
    mem.addEntry('decision', 'Use Tailwind for styling');
    mem.addEntry('decision', 'Use shadcn components');
    mem.addEntry('issue', 'The login form is missing validation');
    mem.trackModifiedFile('src/App.tsx');

    const notes = mem.buildMemoryNotes();
    expect(notes.length).toBeGreaterThanOrEqual(4);
    expect(notes.some(n => n.includes('Key decisions:'))).toBe(true);
    expect(notes.some(n => n.includes('Known issues:'))).toBe(true);
    expect(notes.some(n => n.includes('Modified files:'))).toBe(true);
  });

  it('gets relevant entries by prompt matching', () => {
    mem.addEntry('decision', 'Use React Router for the navigation routing', ['src/routes.tsx']);
    mem.addEntry('decision', 'Use Recharts for chart rendering', ['src/charts.tsx']);
    mem.addEntry('issue', 'The footer color contrast is too low', ['src/Footer.tsx']);

    // Prompt about routing should rank the routing entry higher
    const relevant = mem.getRelevantEntries('Add routing for pages', 2);
    expect(relevant.length).toBeGreaterThanOrEqual(1);
    expect(relevant[0].content.toLowerCase()).toContain('routing');
  });

  it('resets session memory', () => {
    mem.addEntry('decision', 'Some decision');
    mem.resetSessionMemory();
    const state = mem.getSessionMemory();
    expect(state.entries.length).toBe(0);
    expect(state.modifiedFiles.size).toBe(0);
  });

  it('enforces max memory entries limit', () => {
    for (let i = 0; i < 120; i++) {
      mem.addEntry('decision', `Entry ${i}`);
    }
    const state = mem.getSessionMemory();
    expect(state.entries.length).toBeLessThanOrEqual(100);
  });
});

// ─── TaskDecompositionEngine ──────────────────────────────────────

describe('TaskDecompositionEngine', () => {
  let engine: TaskDecompositionEngine;

  beforeEach(() => {
    engine = new TaskDecompositionEngine();
  });

  it('returns a single simple task for short prompts with no medium/complex signals', () => {
    const plans = engine.decompose('Fix button color to blue', [], false);
    expect(plans.length).toBe(1);
    expect(plans[0].complexity).toBe('simple');
    expect(plans[0].subtasks.length).toBe(3);
  });

  it('returns multi-step plan for prompts with medium signals like "component"', () => {
    const plans = engine.decompose('Create a button component', [], false);
    expect(plans.length).toBeGreaterThan(1);
  });

  it('returns multi-step plan for complex prompts', () => {
    const prompt = 'Build a full dashboard with authentication, analytics charts, user management, and notification system';
    const plans = engine.decompose(prompt, [], false);
    expect(plans.length).toBeGreaterThan(1);
    expect(plans[0].complexity).toBe('complex');
  });

  it('returns multi-step plan for medium complexity', () => {
    const plans = engine.decompose('Create a pricing page with a contact form and testimonials section', [], false);
    expect(plans.length).toBeGreaterThan(1);
  });

  it('classifies as simple with short prompt and few context files', () => {
    const plans = engine.decompose('Fix the button color', [], true);
    expect(plans.length).toBe(1);
    expect(plans[0].complexity).toBe('simple');
  });

  it('includes analyze, design, and validate subtasks in multi-step plans', () => {
    const plans = engine.decompose(
      'Create a complex e-commerce checkout page with Stripe payment',
      [{ path: 'src/App.tsx', score: 10, reason: 'entry' }],
      true,
    );

    const allSubtaskTypes = plans.flatMap(p => p.subtasks.map(s => s.type));
    expect(allSubtaskTypes).toContain('analyze');
    expect(allSubtaskTypes).toContain('create');
    expect(allSubtaskTypes).toContain('validate');
  });

  it('handles empty context graph gracefully', () => {
    const plans = engine.decompose('Add a new page', [], true);
    expect(plans.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── QualityGateOrchestrator ──────────────────────────────────────

describe('QualityGateOrchestrator', () => {
  let gates: QualityGateOrchestrator;

  beforeEach(() => {
    gates = new QualityGateOrchestrator();
  });

  it('builds gates for a simple project with package.json', () => {
    const result = gates.buildGates(true, false, 'simple');
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result.some(g => g.name.includes('Package.json'))).toBe(true);
    expect(result.some(g => g.name.includes('File structure'))).toBe(true);
  });

  it('builds gates for complex project with TS config', () => {
    const result = gates.buildGates(true, true, 'complex');
    expect(result.length).toBeGreaterThanOrEqual(5);
    expect(result.some(g => g.name.includes('TypeScript'))).toBe(true);
    expect(result.some(g => g.name.includes('Routing'))).toBe(true);
    expect(result.some(g => g.name.includes('Responsive'))).toBe(true);
  });

  it('updates gate status', () => {
    const result = gates.buildGates(true, false, 'simple');
    const gateId = result[0].id;

    gates.updateGate(gateId, { status: 'passed' });
    expect(gates.getFailedGates().length).toBe(0);
  });

  it('reports all passed correctly', () => {
    const result = gates.buildGates(true, false, 'simple');
    // Mark all as passed using the returned gate IDs
    for (const g of result) {
      gates.updateGate(g.id, { status: 'passed' });
    }
    expect(gates.allPassed()).toBe(true);
  });

  it('reports not all passed when some fail', () => {
    const result = gates.buildGates(true, false, 'simple');
    if (result.length > 0) {
      gates.updateGate(result[0].id, { status: 'failed' });
    }
    if (result.length > 1) {
      gates.updateGate(result[1].id, { status: 'passed' });
    }
    expect(gates.allPassed()).toBe(false);
  });

  it('returns accurate summary', () => {
    const result = gates.buildGates(true, false, 'simple');
    const summary = gates.getSummary();
    expect(summary.total).toBeGreaterThan(0);
    expect(summary.total).toBe(result.length);
    expect(summary.passed + summary.failed).toBe(0); // all pending initially

    // Mark some
    if (result.length > 0) {
      gates.updateGate(result[0].id, { status: 'passed' });
    }
    const summary2 = gates.getSummary();
    expect(summary2.passed).toBeGreaterThanOrEqual(1);
  });

  it('resets gates', () => {
    const result = gates.buildGates(true, false, 'simple');
    expect(result.length).toBeGreaterThan(0);
    gates.reset();
    expect(gates.getSummary().total).toBe(0);
  });
});

// ─── ErrorRecoveryEngine ──────────────────────────────────────────

describe('ErrorRecoveryEngine', () => {
  let recovery: ErrorRecoveryEngine;

  beforeEach(() => {
    recovery = new ErrorRecoveryEngine();
  });

  it('plans retry strategy for AI provider errors', () => {
    const plan = recovery.planRecovery('Rate limit exceeded', 'ai_provider', 1);
    expect(plan.strategies.length).toBeGreaterThan(0);
    expect(plan.strategies.some(s => s.type === 'retry')).toBe(true);
  });

  it('adds fallback model strategy for timeout errors', () => {
    const plan = recovery.planRecovery('timed out after 30s', 'ai_provider', 1);
    expect(plan.strategies.some(s => s.type === 'fallback_model')).toBe(true);
  });

  it('adds simplify_prompt after multiple attempts', () => {
    const plan = recovery.planRecovery('Some error', 'ai_provider', 3);
    expect(plan.strategies.some(s => s.type === 'simplify_prompt')).toBe(true);
  });

  it('handles typescript errors with import hints', () => {
    const plan = recovery.planRecovery("Cannot find module 'react'", 'typescript', 1);
    expect(plan.strategies.some(s => s.type === 'retry')).toBe(true);
    expect(plan.strategies.some(s => s.type === 'simplify_prompt')).toBe(true);
  });

  it('handles patch errors', () => {
    const plan = recovery.planRecovery('Patch target not found', 'patch', 1);
    expect(plan.strategies.some(s => s.type === 'simplify_prompt')).toBe(true);
  });

  it('marks unknown source as recoverable', () => {
    // Build-related errors should still have retry strategies
    const plan = recovery.planRecovery('Build failed with exit code 1', 'build', 1);
    expect(recovery.isRecoverable(plan)).toBe(true);
  });

  it('provides abort strategy for fallback', () => {
    // Create an edge case where only abort is available by checking with a generic error
    // The error recovery engine always adds retry + abort for unknown cases
    const plan = recovery.planRecovery('Unknown error occurred', 'lint', 1);
    expect(plan.strategies.length).toBeGreaterThan(0);
  });
});

// ─── DependencyGraphBuilder ───────────────────────────────────────

describe('DependencyGraphBuilder', () => {
  let builder: DependencyGraphBuilder;

  beforeEach(() => {
    builder = new DependencyGraphBuilder();
  });

  const makeFile = (path: string, content: string, id = '1'): ProjectFile => ({
    id,
    path,
    content,
    type: 'tsx',
  });

  it('builds a graph with nodes for each file', () => {
    const files = [
      makeFile('src/index.ts', 'export const x = 1;'),
      makeFile('src/App.tsx', 'export function App() { return null; }'),
    ];
    const graph = builder.build(files);
    expect(graph.nodes.size).toBe(2);
  });

  it('detects imports between files', () => {
    const files = [
      makeFile('src/utils.ts', 'export const helper = () => {};'),
      makeFile('src/App.tsx', `import { helper } from './utils';\nexport function App() { return helper(); }`),
    ];
    const graph = builder.build(files);
    const appNode = graph.nodes.get('src/App.tsx');
    expect(appNode).toBeDefined();
    expect(appNode!.imports.length).toBeGreaterThan(0);
  });

  it('detects external dependencies', () => {
    const files = [
      makeFile('src/App.tsx', `import React from 'react';\nimport { BrowserRouter } from 'react-router-dom';`),
    ];
    const graph = builder.build(files);
    const appNode = graph.nodes.get('src/App.tsx');
    expect(appNode!.externalDeps).toContain('react');
    expect(appNode!.externalDeps).toContain('react-router-dom');
  });

  it('detects cycles in imports', () => {
    const files = [
      makeFile('src/A.ts', "import { B } from './B';"),
      makeFile('src/B.ts', "import { A } from './A';"),
    ];
    const graph = builder.build(files);
    // The cycle detection should identify the A -> B -> A cycle
    expect(graph.cycles.length).toBeGreaterThan(0);
    const cycleFound = graph.cycles.some(
      c => c.some(p => p.includes('A.ts')) && c.some(p => p.includes('B.ts')),
    );
    expect(cycleFound).toBe(true);
  });

  it('classifies file types correctly', () => {
    const files = [
      makeFile('src/pages/Home.tsx', 'export default function Home() {}'),
      makeFile('src/components/Button.tsx', 'export function Button() {}'),
      makeFile('src/hooks/useData.ts', 'export function useData() {}'),
      makeFile('src/services/api.ts', 'export function fetchData() {}'),
    ];
    const graph = builder.build(files);

    expect(graph.nodes.get('src/pages/Home.tsx')?.type).toBe('page');
    expect(graph.nodes.get('src/components/Button.tsx')?.type).toBe('component');
    expect(graph.nodes.get('src/hooks/useData.ts')?.type).toBe('hook');
    expect(graph.nodes.get('src/services/api.ts')?.type).toBe('service');
  });
});

// ─── FileDiffCalculator ───────────────────────────────────────────

describe('FileDiffCalculator', () => {
  let calc: FileDiffCalculator;

  beforeEach(() => {
    calc = new FileDiffCalculator();
  });

  it('computes no diff for identical content', () => {
    const content = 'line1\nline2\nline3';
    const diff = calc.compute(content, content, 'test.ts');
    expect(diff.linesAdded).toBe(0);
    expect(diff.linesRemoved).toBe(0);
  });

  it('detects added lines', () => {
    const diff = calc.compute('line1\nline2', 'line1\nline2\nline3', 'test.ts');
    expect(diff.linesAdded).toBeGreaterThan(0);
  });

  it('detects removed lines', () => {
    const diff = calc.compute('line1\nline2\nline3', 'line1\nline3', 'test.ts');
    expect(diff.linesRemoved).toBeGreaterThan(0);
  });

  it('produces diff content with unified diff format', () => {
    const diff = calc.compute('old content', 'new content', 'file.ts');
    expect(diff.diffContent).toContain('--- a/file.ts');
    expect(diff.diffContent).toContain('+++ b/file.ts');
    expect(diff.diffContent).toContain('@@');
  });

  it('has before and after hashes', () => {
    const diff = calc.compute('old', 'new', 'test.ts');
    expect(diff.beforeHash).toBe('3');
    expect(diff.afterHash).toBe('3');
  });
});
