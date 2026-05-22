import { describe, it, expect, beforeEach } from 'vitest';
import { TaskManager, resetTaskCounter } from '@/engine/tasks';
import type { TaskTodo } from '@/engine/types';

function makeTask(overrides?: Partial<TaskTodo>): TaskTodo {
  return {
    id: `test-${Date.now()}-${Math.random()}`,
    content: 'Test task',
    status: 'pending',
    priority: 'medium',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('TaskManager', () => {
  let manager: TaskManager;

  beforeEach(() => {
    resetTaskCounter();
    manager = new TaskManager();
  });

  it('starts empty', () => {
    expect(manager.getAll()).toEqual([]);
    expect(manager.toPromptString()).toBe('No tasks defined yet.');
  });

  it('adds a task', () => {
    const task = manager.add({ content: 'Fix bug', status: 'pending', priority: 'high' });
    expect(task.id).toMatch(/^task-/);
    expect(task.content).toBe('Fix bug');
    expect(task.status).toBe('pending');
    expect(task.createdAt).toBeTruthy();
    expect(task.updatedAt).toBeTruthy();
    expect(manager.getAll()).toHaveLength(1);
  });

  it('accepts initial tasks', () => {
    const initial = [makeTask({ content: 'Task 1' }), makeTask({ content: 'Task 2' })];
    const m = new TaskManager(initial);
    expect(m.getAll()).toHaveLength(2);
  });

  it('finds task by id', () => {
    const task = manager.add({ content: 'Find me', status: 'pending', priority: 'medium' });
    expect(manager.getById(task.id)?.content).toBe('Find me');
    expect(manager.getById('nonexistent')).toBeUndefined();
  });

  it('filters by status', () => {
    manager.add({ content: 'A', status: 'pending', priority: 'low' });
    manager.add({ content: 'B', status: 'done', priority: 'low' });
    manager.add({ content: 'C', status: 'pending', priority: 'low' });
    expect(manager.getByStatus('pending')).toHaveLength(2);
    expect(manager.getByStatus('done')).toHaveLength(1);
    expect(manager.getByStatus('in_progress')).toHaveLength(0);
  });

  it('updates a task', () => {
    const task = manager.add({ content: 'Update me', status: 'pending', priority: 'high' });
    const updated = manager.update(task.id, { status: 'done', priority: 'low' });
    expect(updated?.status).toBe('done');
    expect(updated?.priority).toBe('low');
    expect(updated?.updatedAt).toBeTruthy();
  });

  it('returns undefined updating nonexistent task', () => {
    expect(manager.update('bad-id', { status: 'done' })).toBeUndefined();
  });

  it('removes a task', () => {
    const task = manager.add({ content: 'Remove me', status: 'pending', priority: 'low' });
    expect(manager.remove(task.id)).toBe(true);
    expect(manager.getAll()).toHaveLength(0);
  });

  it('returns false removing nonexistent task', () => {
    expect(manager.remove('bad-id')).toBe(false);
  });

  it('reorders tasks', () => {
    const a = manager.add({ content: 'A', status: 'pending', priority: 'low' });
    const b = manager.add({ content: 'B', status: 'pending', priority: 'low' });
    const c = manager.add({ content: 'C', status: 'pending', priority: 'low' });
    manager.reorder([c.id, a.id, b.id]);
    const all = manager.getAll();
    expect(all[0].id).toBe(c.id);
    expect(all[1].id).toBe(a.id);
    expect(all[2].id).toBe(b.id);
  });

  it('clears all tasks', () => {
    manager.add({ content: 'X', status: 'pending', priority: 'low' });
    manager.add({ content: 'Y', status: 'pending', priority: 'low' });
    manager.clear();
    expect(manager.getAll()).toHaveLength(0);
  });

  it('returns active counts', () => {
    manager.add({ content: 'P', status: 'pending', priority: 'low' });
    manager.add({ content: 'IP', status: 'in_progress', priority: 'low' });
    manager.add({ content: 'D1', status: 'done', priority: 'low' });
    manager.add({ content: 'D2', status: 'done', priority: 'low' });
    manager.add({ content: 'B', status: 'blocked', priority: 'low' });
    manager.add({ content: 'F', status: 'failed', priority: 'low' });
    const counts = manager.getActiveCount();
    expect(counts.pending).toBe(1);
    expect(counts.inProgress).toBe(1);
    expect(counts.done).toBe(2);
    expect(counts.blocked).toBe(1);
    expect(counts.failed).toBe(1);
  });

  it('generates prompt string with counts', () => {
    manager.add({ content: 'Task A', status: 'in_progress', priority: 'high' });
    manager.add({ content: 'Task B', status: 'done', priority: 'medium' });
    const prompt = manager.toPromptString();
    expect(prompt).toContain('in progress');
    expect(prompt).toContain('1 done');
    expect(prompt).toContain('Task A');
    expect(prompt).toContain('Task B');
  });
});
