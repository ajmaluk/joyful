import { useEffect, useState } from 'react';
import {
  CheckCircle2, Circle, Loader2, AlertCircle, Ban,
  Clock, FileCode2, ChevronDown, ListTodo, Target,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Todo } from '@/lib/agent/eventBus';

interface TodoAccordionProps {
  todos: Todo[];
  currentTodoId?: string | null;
  currentFile?: string | null;
  elapsedMs?: number;
  isRunning?: boolean;
  isPaused?: boolean;
}

const statusIcon = {
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

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function TodoAccordion({
  todos,
  currentTodoId,
  currentFile,
  elapsedMs = 0,
  isRunning,
  isPaused,
}: TodoAccordionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const completedCount = todos.filter(t => t.status === 'completed').length;
  const progress = todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0;
  const activeTodo = todos.find(t => t.status === 'in_progress');
  const hasErrors = todos.some(t => t.status === 'failed');

  useEffect(() => {
    if (todos.length > 0 && !isOpen) {
      setIsOpen(true);
    }
  }, [todos.length]);

  if (todos.length === 0 && !isRunning) return null;

  const sectionInProgress = todos.filter(t => t.status === 'in_progress');
  const sectionPending = todos.filter(t => t.status === 'pending');
  const sectionCompleted = todos.filter(t => t.status === 'completed');
  const sectionBlocked = todos.filter(t => t.status === 'blocked');
  const sectionFailed = todos.filter(t => t.status === 'failed');

  return (
    <div className="mx-3 mb-2 overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-sm backdrop-blur-sm">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex w-full items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-white/[0.03]"
      >
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${
          hasErrors ? 'bg-red-500/10' : isRunning ? 'bg-sky-500/10' : 'bg-emerald-500/15'
        }`}>
          {hasErrors ? (
            <AlertCircle className="h-3.5 w-3.5 text-red-400" />
          ) : isRunning ? (
            <Loader2 className="h-3.5 w-3.5 text-sky-400 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          )}
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              {hasErrors ? 'Needs attention' : isRunning ? 'Building' : todos.length > 0 ? 'Complete' : 'Tasks'}
            </span>
            {todos.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary">
                {completedCount}/{todos.length}
              </span>
            )}
          </div>
          {activeTodo && (
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
              {activeTodo.title}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isRunning && elapsedMs > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatElapsed(elapsedMs)}
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && todos.length > 0 && (
        <div className="border-t border-border/40">
          {todos.length > 0 && (
            <div className="px-3.5 pt-2.5 pb-1">
              <div className="flex items-center gap-1.5">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className={`h-full rounded-full ${
                      hasErrors ? 'bg-red-500' : 'bg-gradient-to-r from-sky-500 to-emerald-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground">{progress}%</span>
              </div>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto px-2 py-1.5 space-y-0.5">
            {activeTodo && (
              <div className="mx-1 mb-1.5 rounded-lg border border-sky-500/10 bg-sky-500/5 px-2.5 py-1.5">
                <div className="flex items-start gap-2">
                  <Loader2 className="mt-0.5 h-3 w-3 flex-shrink-0 animate-spin text-sky-400" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-foreground">
                      {activeTodo.title}
                    </span>
                    {activeTodo.description && (
                      <p className="text-[10px] text-muted-foreground">{activeTodo.description}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {[
              { items: sectionFailed, label: 'Failed', color: 'text-red-400' },
              { items: sectionBlocked, label: 'Blocked', color: 'text-amber-400' },
              { items: sectionPending.filter(t => t.id !== activeTodo?.id), label: 'Pending', color: 'text-muted-foreground' },
              { items: sectionCompleted, label: 'Completed', color: 'text-emerald-400' },
            ].map(section => section.items.length > 0 && (
              <div key={section.label}>
                {section.items.map(todo => {
                  const Icon = statusIcon[todo.status] || Circle;
                  const color = statusColor[todo.status] || 'text-muted-foreground/40';
                  const isCurrent = todo.id === currentTodoId;
                  return (
                    <div
                      key={todo.id}
                      className={`flex items-start gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                        isCurrent ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      {todo.status === 'in_progress' ? (
                        <Loader2 className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 animate-spin ${color}`} />
                      ) : (
                        <Icon className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${color}`} />
                      )}
                      <div className="min-w-0 flex-1">
                        <span className={`block ${todo.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                          {todo.title}
                        </span>
                        {todo.description && (
                          <p className="text-[10px] text-muted-foreground">{todo.description}</p>
                        )}
                        {todo.blockedReason && (
                          <p className="text-[10px] text-amber-400">{todo.blockedReason}</p>
                        )}
                        {todo.relatedFiles.length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {todo.relatedFiles.slice(0, 3).map(file => (
                              <span key={file} className="truncate rounded bg-background/60 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground max-w-[120px]">
                                <FileCode2 className="mr-0.5 inline h-2.5 w-2.5" />
                                {file}
                              </span>
                            ))}
                          </div>
                        )}
                        {(todo.startedAt || todo.completedAt) && (
                          <div className="mt-0.5 flex items-center gap-2 text-[9px] text-muted-foreground">
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
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
