import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TodoManager } from '@/lib/agent/TodoManager';

describe('TodoManager', () => {
  let manager: TodoManager;

  beforeEach(() => {
    manager = new TodoManager();
  });

  it('starts empty', () => {
    expect(manager.getTodos()).toEqual([]);
    expect(manager.getActiveTodo()).toBeUndefined();
    expect(manager.getBlockedTodos()).toEqual([]);
  });

  it('creates a todo', () => {
    const todo = manager.createTodo('Build feature X', 'builder', ['/src/App.tsx']);
    expect(todo.id).toMatch(/^todo-/);
    expect(todo.title).toBe('Build feature X');
    expect(todo.mode).toBe('builder');
    expect(todo.relatedFiles).toEqual(['/src/App.tsx']);
    expect(todo.status).toBe('pending');
    expect(manager.getTodos()).toHaveLength(1);
  });

  it('updates a todo', () => {
    const todo = manager.createTodo('Test task', 'explorer');
    manager.updateTodo(todo.id, { status: 'in_progress' });
    const updated = manager.getTodos()[0];
    expect(updated.status).toBe('in_progress');
    expect(updated.startedAt).toBeDefined();
  });

  it('sets completedAt on completion', () => {
    const todo = manager.createTodo('Finish task', 'builder');
    manager.updateTodo(todo.id, { status: 'in_progress' });
    manager.updateTodo(todo.id, { status: 'completed' });
    const updated = manager.getTodos()[0];
    expect(updated.status).toBe('completed');
    expect(updated.completedAt).toBeDefined();
  });

  it('blocks a todo with reason', () => {
    const todo = manager.createTodo('Blocked task', 'debugger');
    manager.blockTodo(todo.id, 'Missing dependency');
    const blocked = manager.getBlockedTodos();
    expect(blocked).toHaveLength(1);
    expect(blocked[0].blockedReason).toBe('Missing dependency');
  });

  it('returns active todo correctly', () => {
    const t1 = manager.createTodo('Task 1', 'builder');
    manager.createTodo('Task 2', 'explorer');
    manager.updateTodo(t1.id, { status: 'in_progress' });
    expect(manager.getActiveTodo()?.id).toBe(t1.id);
  });

  it('notifies observers on changes', () => {
    const observer = vi.fn();
    const unsub = manager.subscribe(observer);
    const todo = manager.createTodo('Observed task', 'planner');
    expect(observer).toHaveBeenCalledTimes(1);
    expect(observer).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: todo.id })]));
    unsub();
    manager.updateTodo(todo.id, { status: 'completed' });
    expect(observer).toHaveBeenCalledTimes(1);
  });

  it('rejects updating non-existent todo', () => {
    expect(() => manager.updateTodo('fake-id', { status: 'completed' })).toThrow('Todo not found');
  });

  it('manages multiple todos independently', () => {
    const todos = ['A', 'B', 'C'].map(t => manager.createTodo(t, 'memory'));
    expect(manager.getTodos()).toHaveLength(3);
    manager.updateTodo(todos[0].id, { status: 'completed' });
    manager.updateTodo(todos[1].id, { status: 'blocked', blockedReason: 'blocked' });
    expect(manager.getTodos().filter(t => t.status === 'pending')).toHaveLength(1);
  });
});
