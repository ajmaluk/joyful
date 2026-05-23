import { CheckCircle2, Circle, Loader2, AlertCircle, Ban } from 'lucide-react';
import type { Todo } from '@/lib/agent/eventBus';

interface TodoCardProps {
  todos: Todo[];
  compact?: boolean;
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

export function TodoCard({ todos, compact }: TodoCardProps) {
  if (todos.length === 0) return null;

  const completedCount = todos.filter(t => t.status === 'completed').length;
  const progress = Math.round((completedCount / todos.length) * 100);

  return (
    <div className="rounded-xl border border-border bg-card/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Tasks
        </div>
        <span className="text-[10px] text-muted-foreground">
          {completedCount}/{todos.length}
        </span>
      </div>

      <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-0.5">
        {todos.map((todo) => {
          const Icon = statusIcon[todo.status] || Circle;
          const color = statusColor[todo.status] || 'text-muted-foreground/40';
          const isActive = todo.status === 'in_progress';

          return (
            <div
              key={todo.id}
              className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-xs ${
                isActive ? 'bg-white/[0.04]' : ''
              }`}
            >
              {todo.status === 'in_progress' ? (
                <Loader2 className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 animate-spin ${color}`} />
              ) : (
                <Icon className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${color}`} />
              )}
              <div className="min-w-0 flex-1">
                <span className={`${todo.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'} ${isActive ? 'font-medium' : ''}`}>
                  {todo.title}
                </span>
                {todo.description && !compact && (
                  <p className="text-[10px] text-muted-foreground">{todo.description}</p>
                )}
                {todo.blockedReason && (
                  <p className="text-[10px] text-amber-400">{todo.blockedReason}</p>
                )}
                {todo.relatedFiles.length > 0 && !compact && (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {todo.relatedFiles.slice(0, 3).map((file) => (
                      <span key={file} className="truncate rounded bg-background/60 px-1 py-0.5 font-mono text-[9px] text-muted-foreground max-w-[120px]">
                        {file}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
