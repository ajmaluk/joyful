import { describe, it, expect, beforeEach } from 'vitest';
import { SessionMemory, ProjectMemory, InMemoryProjectStorage } from '@/engine/memory';

describe('SessionMemory', () => {
  let memory: SessionMemory;

  beforeEach(() => {
    memory = new SessionMemory(50);
  });

  it('starts empty', () => {
    expect(memory.getAll()).toEqual([]);
    expect(memory.toString()).toBe('(no session memory)');
    expect(memory.getSummary()).toBe('');
  });

  it('adds entries', () => {
    const entry = memory.add('fact', 'The sky is blue', ['color', 'nature'], 'test');
    expect(entry.type).toBe('fact');
    expect(entry.content).toBe('The sky is blue');
    expect(entry.tags).toEqual(['color', 'nature']);
    expect(entry.source).toBe('test');
    expect(entry.id).toBeTruthy();
    expect(entry.timestamp).toBeTruthy();
    expect(memory.getAll()).toHaveLength(1);
  });

  it('returns recent entries', () => {
    for (let i = 0; i < 30; i++) {
      memory.add('fact', `Entry ${i}`, []);
    }
    const recent = memory.getRecent(5);
    expect(recent).toHaveLength(5);
    expect(recent[0].content).toBe('Entry 25');
    expect(recent[4].content).toBe('Entry 29');
  });

  it('default recent count is 20', () => {
    for (let i = 0; i < 30; i++) {
      memory.add('fact', `Entry ${i}`, []);
    }
    expect(memory.getRecent()).toHaveLength(20);
  });

  it('caps entries at maxEntries', () => {
    for (let i = 0; i < 100; i++) {
      memory.add('fact', `Entry ${i}`, []);
    }
    expect(memory.getAll()).toHaveLength(50);
    expect(memory.getAll()[0].content).toBe('Entry 50');
  });

  it('searches by content', () => {
    memory.add('fact', 'React is a library', ['js']);
    memory.add('fact', 'Vue is a framework', ['js']);
    memory.add('decision', 'Use React for this project', ['tech']);
    const results = memory.search('React');
    expect(results).toHaveLength(2);
  });

  it('searches by type', () => {
    memory.add('fact', 'Fact one', []);
    memory.add('decision', 'Decision one', []);
    memory.add('pattern', 'Pattern one', []);
    const results = memory.search('one', 'decision');
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('decision');
  });

  it('searches by tag', () => {
    memory.add('fact', 'Some fact', ['important', 'js']);
    const results = memory.search('important');
    expect(results).toHaveLength(1);
  });

  it('returns empty for no matches', () => {
    memory.add('fact', 'Hello', []);
    expect(memory.search('xyz')).toEqual([]);
  });

  it('clears all entries', () => {
    memory.add('fact', 'X', []);
    memory.add('fact', 'Y', []);
    memory.clear();
    expect(memory.getAll()).toEqual([]);
  });

  it('generates summary with recent entries', () => {
    memory.add('fact', 'Fact A', []);
    memory.add('decision', 'Decision B', []);
    const summary = memory.getSummary();
    expect(summary).toContain('Fact A');
    expect(summary).toContain('Decision B');
  });
});

describe('ProjectMemory', () => {
  let storage: InMemoryProjectStorage;
  let pm: ProjectMemory;

  beforeEach(() => {
    storage = new InMemoryProjectStorage();
    pm = new ProjectMemory(storage);
  });

  it('starts with defaults', () => {
    expect(pm.description).toBe('');
    expect(pm.techStack).toEqual([]);
    expect(pm.decisions).toEqual([]);
    expect(pm.errors).toEqual([]);
    expect(pm.conventions).toEqual([]);
    expect(pm.patterns).toEqual([]);
    expect(pm.toString()).toBe('(no project memory)');
  });

  it('adds technology', () => {
    pm.addTechnology('React');
    expect(pm.techStack).toContain('React');
  });

  it('deduplicates technology', () => {
    pm.addTechnology('React');
    pm.addTechnology('React');
    expect(pm.techStack).toEqual(['React']);
  });

  it('sorts technology alphabetically', () => {
    pm.addTechnology('Zustand');
    pm.addTechnology('React');
    expect(pm.techStack).toEqual(['React', 'Zustand']);
  });

  it('adds decision', () => {
    pm.addDecision('State management', 'Use Zustand', ['Redux', 'Context'], 'Lightweight');
    expect(pm.decisions).toHaveLength(1);
    expect(pm.decisions[0].title).toBe('State management');
    expect(pm.decisions[0].decision).toBe('Use Zustand');
    expect(pm.decisions[0].alternatives).toEqual(['Redux', 'Context']);
    expect(pm.decisions[0].rationale).toBe('Lightweight');
  });

  it('adds error', () => {
    pm.addError('TypeError', 'Add type check');
    expect(pm.errors).toHaveLength(1);
    expect(pm.errors[0].frequency).toBe(1);
  });

  it('increments error frequency on duplicate', () => {
    pm.addError('Same error', 'Fix 1');
    pm.addError('Same error', 'Fix 2');
    expect(pm.errors).toHaveLength(1);
    expect(pm.errors[0].frequency).toBe(2);
    expect(pm.errors[0].solution).toBe('Fix 1'); // keeps first solution
  });

  it('adds convention', () => {
    pm.addConvention('Use consistent imports');
    expect(pm.conventions).toContain('Use consistent imports');
  });

  it('deduplicates conventions', () => {
    pm.addConvention('C1');
    pm.addConvention('C1');
    expect(pm.conventions).toEqual(['C1']);
  });

  it('adds pattern', () => {
    pm.addPattern('Repository pattern');
    expect(pm.patterns).toContain('Repository pattern');
  });

  it('saves and loads from storage', async () => {
    pm.addTechnology('React');
    pm.addDecision('UI', 'Use Tailwind', [], 'Utility-first');
    await pm.save();

    const loaded = await ProjectMemory.load(storage);
    expect(loaded.techStack).toEqual(['React']);
    expect(loaded.decisions).toHaveLength(1);
    expect(loaded.decisions[0].decision).toBe('Use Tailwind');
  });

  it('generates string representation', () => {
    pm.addTechnology('React');
    pm.addDecision('State', 'Zustand', [], 'Lightweight');
    pm.addError('Bug', 'Fix');
    const str = pm.toString();
    expect(str).toContain('React');
    expect(str).toContain('State');
    expect(str).toContain('Bug');
    expect(str).toContain('Fix');
  });

  it('preserves data after multiple saves', async () => {
    pm.addTechnology('React');
    await pm.save();
    pm.addTechnology('Vite');
    await pm.save();

    const loaded = await ProjectMemory.load(storage);
    expect(loaded.techStack).toEqual(['React', 'Vite']);
  });
});
