import { agentEventBus, type Todo as EventBusTodo } from './eventBus';

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'failed';
  mode: 'explorer' | 'builder' | 'debugger' | 'reviewer' | 'memory' | 'planner';
  relatedFiles: string[];
  errors?: string[];
  blockedReason?: string;
  startedAt?: number;
  completedAt?: number;
}

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `todo-${timestamp}-${random}`;
}

function toEventBusTodo(item: TodoItem): EventBusTodo {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    status: item.status,
    mode: item.mode as EventBusTodo['mode'],
    relatedFiles: item.relatedFiles,
    errors: item.errors,
    startedAt: item.startedAt,
    completedAt: item.completedAt,
    blockedReason: item.blockedReason,
  };
}

export class TodoManager {
  private todos: TodoItem[] = [];
  private observers: Set<(todos: TodoItem[]) => void> = new Set();

  subscribe(cb: (todos: TodoItem[]) => void): () => void {
    this.observers.add(cb);
    return () => this.observers.delete(cb);
  }

  getTodos(): TodoItem[] {
    return [...this.todos];
  }

  getActiveTodo(): TodoItem | undefined {
    return this.todos.find(t => t.status === 'in_progress');
  }

  getBlockedTodos(): TodoItem[] {
    return this.todos.filter(t => t.status === 'blocked');
  }

  createTodo(
    title: string,
    mode: TodoItem['mode'],
    relatedFiles?: string[],
    description?: string,
  ): TodoItem {
    const todo: TodoItem = {
      id: generateId(),
      title,
      description,
      status: 'pending',
      mode,
      relatedFiles: relatedFiles || [],
    };
    this.todos.push(todo);
    this.notify();
    this.emitEvents();
    return todo;
  }

  updateTodo(id: string, updates: Partial<TodoItem>): void {
    const idx = this.todos.findIndex(t => t.id === id);
    if (idx === -1) throw new Error(`Todo not found: ${id}`);

    const existing = this.todos[idx];
    if (updates.status === 'in_progress' && existing.status !== 'in_progress') {
      updates.startedAt = Date.now();
    }
    if (updates.status === 'completed' && existing.status !== 'completed') {
      updates.completedAt = Date.now();
    }

    this.todos[idx] = { ...existing, ...updates };
    this.notify();
    this.emitEvents();
  }

  blockTodo(id: string, reason: string): void {
    this.updateTodo(id, { status: 'blocked', blockedReason: reason });
  }

  completeTodo(id: string): void {
    this.updateTodo(id, { status: 'completed', completedAt: Date.now() });
  }

  failTodo(id: string, error: string): void {
    const existing = this.todos.find(t => t.id === id);
    const errors = [...(existing?.errors || []), error];
    this.updateTodo(id, { status: 'failed', errors });
  }

  addError(id: string, error: string): void {
    const existing = this.todos.find(t => t.id === id);
    if (existing) {
      const errors = [...(existing.errors || []), error];
      this.updateTodo(id, { errors });
    }
  }

  setRelatedFiles(id: string, files: string[]): void {
    this.updateTodo(id, { relatedFiles: files });
  }

  advanceToNext(): TodoItem | undefined {
    const current = this.getActiveTodo();
    if (current) {
      this.completeTodo(current.id);
    }
    const next = this.todos.find(t => t.status === 'pending');
    if (next) {
      this.updateTodo(next.id, { status: 'in_progress' });
    }
    return next;
  }

  estimateRemaining(): number {
    const pending = this.todos.filter(
      t => t.status === 'pending' || t.status === 'in_progress',
    ).length;
    return pending;
  }

  clear(): void {
    this.todos = [];
    this.notify();
    this.emitEvents();
  }

  isAllCompleted(): boolean {
    return (
      this.todos.length > 0 &&
      this.todos.every(t => t.status === 'completed' || t.status === 'failed')
    );
  }

  private notify(): void {
    const snapshot = [...this.todos];
    for (const cb of this.observers) {
      try {
        cb(snapshot);
      } catch {
        // observer error
      }
    }
  }

  private emitEvents(): void {
    const busTodos = this.todos.map(toEventBusTodo);
    agentEventBus.emit({ type: 'todo:updated', todos: busTodos });
  }
}

export const todoManager = new TodoManager();
