import type { TaskTodo } from './types';

// ── Task Manager ───────────────────────────────────────────────────

export class TaskManager {
  private tasks: TaskTodo[] = [];

  constructor(tasks?: TaskTodo[]) {
    if (tasks) this.tasks = [...tasks];
  }

  getAll(): TaskTodo[] {
    return [...this.tasks];
  }

  getById(id: string): TaskTodo | undefined {
    return this.tasks.find(t => t.id === id);
  }

  getByStatus(status: TaskTodo['status']): TaskTodo[] {
    return this.tasks.filter(t => t.status === status);
  }

  add(task: Omit<TaskTodo, 'id' | 'createdAt' | 'updatedAt'>): TaskTodo {
    const newTask: TaskTodo = {
      ...task,
      id: generateTaskId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tasks.push(newTask);
    return newTask;
  }

  update(id: string, updates: Partial<Omit<TaskTodo, 'id' | 'createdAt'>>): TaskTodo | undefined {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return undefined;
    Object.assign(task, updates, { updatedAt: new Date().toISOString() });
    return task;
  }

  remove(id: string): boolean {
    const index = this.tasks.findIndex(t => t.id === id);
    if (index < 0) return false;
    this.tasks.splice(index, 1);
    return true;
  }

  reorder(orderedIds: string[]): void {
    const taskMap = new Map(this.tasks.map(t => [t.id, t]));
    this.tasks = orderedIds.map(id => taskMap.get(id)).filter((t): t is TaskTodo => !!t);
  }

  clear(): void {
    this.tasks = [];
  }

  getActiveCount(): { pending: number; inProgress: number; done: number; blocked: number; failed: number } {
    return {
      pending: this.tasks.filter(t => t.status === 'pending').length,
      inProgress: this.tasks.filter(t => t.status === 'in_progress').length,
      done: this.tasks.filter(t => t.status === 'done').length,
      blocked: this.tasks.filter(t => t.status === 'blocked').length,
      failed: this.tasks.filter(t => t.status === 'failed').length,
    };
  }

  toPromptString(): string {
    if (this.tasks.length === 0) return 'No tasks defined yet.';

    const counts = this.getActiveCount();
    const header = `Tasks: ${counts.pending} pending, ${counts.inProgress} in progress, ${counts.done} done, ${counts.blocked} blocked, ${counts.failed} failed\n`;

    const lines = this.tasks.map((t, i) => {
      const statusIcon = {
        pending: '⬜',
        in_progress: '🔄',
        done: '✅',
        blocked: '🚧',
        failed: '❌',
      }[t.status];
      return `  ${i + 1}. ${statusIcon} [${t.priority}] ${t.content}`;
    });

    return header + lines.join('\n');
  }
}

// ── ID Generation ──────────────────────────────────────────────────

let counter = 0;

function generateTaskId(): string {
  counter++;
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 6);
  const seq = counter.toString(36);
  return `task-${timestamp}-${random}-${seq}`;
}

// ── Export for tests ───────────────────────────────────────────────

export function resetTaskCounter(): void {
  counter = 0;
}
