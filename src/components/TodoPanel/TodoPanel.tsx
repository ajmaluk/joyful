import {
  CheckCircle2, Circle, Loader2, AlertCircle, Ban,
  Clock, FileCode2, X,
} from 'lucide-react';
import type { Todo } from '@/lib/agent/eventBus';

interface TodoPanelProps {
  todos: Todo[];
  onClose?: () => void;
  currentTodoId?: string | null;
}

const statusIcon: Record<string, typeof CheckCircle2> = {
  completed: CheckCircle2,
  in_progress: Loader2,
  blocked: AlertCircle,
  failed: Ban,
  pending: Circle,
};

const statusColor: Record<string, string> = {
  completed: 'text-emerald-400',
  in_progress: 'text-sky-400',
  blocked: 'text-amber-400',
  failed: 'text-red-400',
  pending: 'text-muted-foreground/40',
};

const statusBg: Record<string, string> = {
  completed: 'bg-emerald-500/10',
  in_progress: 'bg-sky-500/10',
  blocked: 'bg-amber-500/10',
  failed: 'bg-red-500/10',
  pending: 'bg-transparent',
};

function TodoItem({ todo, isCurrent }: { todo: Todo; isCurrent: boolean }) {
  const Icon = statusIcon[todo.status] || Circle;
  const color = statusColor[todo.status] || 'text-muted-foreground/40';
  const bg = statusBg[todo.status] || 'bg-transparent';

  return (
    <div className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
      isCurrent ? 'border-sky-500/20 bg-sky-500/[0.03]' : 'border-transparent'
    } ${bg}`}>
      <div className="flex items-start gap-2">
        {todo.status === 'in_progress' ? (
          <Loader2 className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 animate-spin ${color}`} />
        ) : (
          <Icon className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${color}`} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isCurrent ? 'text-foreground' : 'text-muted-foreground'} ${
              todo.status === 'completed' ? 'line-through' : ''
            }`}>
              {todo.title}
            </span>
            {todo.status === 'in_progress' && (
              <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[9px] text-sky-400">
                Active
              </span>
            )}
          </div>
          {todo.description && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">{todo.description}</p>
          )}
          {todo.blockedReason && (
            <p className="mt-0.5 text-[10px] text-amber-400">{todo.blockedReason}</p>
          )}
          {todo.relatedFiles.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {todo.relatedFiles.map((file) => (
                <span
                  key={file}
                  className="inline-flex items-center gap-1 rounded bg-background/60 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground"
                >
                  <FileCode2 className="h-2.5 w-2.5" />
                  {file}
                </span>
              ))}
            </div>
          )}
          {(todo.startedAt || todo.completedAt) && (
            <div className="mt-1 flex items-center gap-2 text-[9px] text-muted-foreground">
              {todo.startedAt && (
                <span className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  Started {new Date(todo.startedAt).toLocaleTimeString()}
                </span>
              )}
              {todo.completedAt && (
                <span>Done {new Date(todo.completedAt).toLocaleTimeString()}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TodoPanel({ todos, onClose, currentTodoId }: TodoPanelProps) {
  const completed = todos.filter(t => t.status === 'completed');
  const inProgress = todos.filter(t => t.status === 'in_progress');
  const pending = todos.filter(t => t.status === 'pending');
  const blocked = todos.filter(t => t.status === 'blocked');
  const failed = todos.filter(t => t.status === 'failed');

  const progress = todos.length > 0
    ? Math.round((completed.length / todos.length) * 100)
    : 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Tasks</span>
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {completed.length}/{todos.length}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {/* Progress bar */}
        {todos.length > 0 && (
          <div className="mb-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">{progress}% complete</p>
          </div>
        )}

        {todos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CheckCircle2 className="mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">No tasks yet</p>
            <p className="text-[10px] text-muted-foreground/60">Tasks appear when the agent starts working.</p>
          </div>
        )}

        {/* In progress */}
        {inProgress.length > 0 && (
          <div className="mb-4">
            <p className="mb-1.5 text-[10px] font-semibold uppercase text-sky-400">In Progress</p>
            <div className="space-y-1">
              {inProgress.map((todo) => (
                <TodoItem key={todo.id} todo={todo} isCurrent={todo.id === currentTodoId} />
              ))}
            </div>
          </div>
        )}

        {/* Failed */}
        {failed.length > 0 && (
          <div className="mb-4">
            <p className="mb-1.5 text-[10px] font-semibold uppercase text-red-400">Failed</p>
            <div className="space-y-1">
              {failed.map((todo) => (
                <TodoItem key={todo.id} todo={todo} isCurrent={false} />
              ))}
            </div>
          </div>
        )}

        {/* Blocked */}
        {blocked.length > 0 && (
          <div className="mb-4">
            <p className="mb-1.5 text-[10px] font-semibold uppercase text-amber-400">Blocked</p>
            <div className="space-y-1">
              {blocked.map((todo) => (
                <TodoItem key={todo.id} todo={todo} isCurrent={false} />
              ))}
            </div>
          </div>
        )}

        {/* Pending */}
        {pending.length > 0 && (
          <div className="mb-4">
            <p className="mb-1.5 text-[10px] font-semibold uppercase text-muted-foreground">Pending</p>
            <div className="space-y-1">
              {pending.map((todo) => (
                <TodoItem key={todo.id} todo={todo} isCurrent={false} />
              ))}
            </div>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase text-emerald-400">Completed</p>
            <div className="space-y-1">
              {completed.map((todo) => (
                <TodoItem key={todo.id} todo={todo} isCurrent={false} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
