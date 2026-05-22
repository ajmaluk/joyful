import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Loader2, Sparkles, Clock, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface BuildTodo {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
  detail?: string;
}

interface WorkingProcessProps {
  todos: BuildTodo[];
  isComplete: boolean;
}

function StepIcon({ status }: { status: BuildTodo['status'] }) {
  if (status === 'done') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />;
  }
  if (status === 'error') {
    return <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />;
  }
  if (status === 'active') {
    return <Loader2 className="h-4 w-4 text-sky-400 animate-spin flex-shrink-0" />;
  }
  return <Circle className="h-4 w-4 text-muted-foreground/45 flex-shrink-0" />;
}

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

export function WorkingProcess({ todos, isComplete }: WorkingProcessProps) {
  const [elapsed, setElapsed] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const firstTodoId = todos[0]?.id;

  useEffect(() => {
    if (todos.length > 0 && !isComplete) {
      setStartTime(Date.now());
      setElapsed(0);
    }
  }, [todos.length, isComplete, firstTodoId]);

  useEffect(() => {
    if (isComplete) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [isComplete, startTime]);

  if (todos.length === 0) return null;

  const completedCount = todos.filter(t => t.status === 'done').length;
  const activeTodo = todos.find(t => t.status === 'active');
  const hasErrors = todos.some(t => t.status === 'error');
  const progressPercent = isComplete ? 100 : Math.round((completedCount / todos.length) * 100);

  return (
    <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${
            hasErrors ? 'bg-red-500/10' : isComplete ? 'bg-emerald-500/15' : 'bg-sky-500/10'
          }`}>
            {hasErrors ? (
              <AlertCircle className="h-4 w-4 text-red-400" />
            ) : isComplete ? (
              <Sparkles className="h-4 w-4 text-emerald-400" />
            ) : (
              <Loader2 className="h-4 w-4 text-sky-400 animate-spin" />
            )}
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-100">
              {hasErrors ? 'Needs attention' : isComplete ? 'Build complete' : 'Building'}
            </span>
            {!isComplete && elapsed > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                <Clock className="h-3 w-3" />
                <span>{formatElapsed(elapsed)}</span>
              </div>
            )}
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          hasErrors
            ? 'bg-red-500/10 text-red-400'
            : isComplete
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'bg-sky-500/10 text-sky-400'
        }`}>
          {completedCount}/{todos.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className={`h-full rounded-full ${hasErrors ? 'bg-red-500' : isComplete ? 'bg-emerald-500' : 'bg-sky-500'}`}
          initial={{ width: '0%' }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Active step highlight */}
      {activeTodo && !isComplete && (
        <div className="mb-2 rounded-lg border border-sky-500/10 bg-sky-500/5 px-3 py-2 text-xs text-sky-200/90">
          <span className="font-medium">{activeTodo.label}</span>
          {activeTodo.detail && <span className="mt-0.5 block text-sky-200/60">{activeTodo.detail}</span>}
        </div>
      )}

      {/* Todo steps */}
      <div className="space-y-0.5">
        <AnimatePresence mode="popLayout">
          {todos.map((todo, i) => (
            <motion.div
              key={todo.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.22 }}
              className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-all duration-150 ${
                todo.status === 'active' ? 'bg-white/[0.04]' : todo.status === 'error' ? 'bg-red-500/5' : ''
              }`}
            >
              <StepIcon status={todo.status} />
              <span className={`min-w-0 flex-1 text-[13px] transition-colors ${
                todo.status === 'active' ? 'font-medium text-gray-200' :
                todo.status === 'error' ? 'text-red-300' :
                todo.status === 'done' ? 'text-gray-500' :
                'text-gray-600'
              }`}>
                {todo.label}
                {todo.detail && (
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/70">
                    {todo.detail}
                  </span>
                )}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
