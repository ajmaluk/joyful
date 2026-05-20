import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Loader2, Sparkles } from 'lucide-react';

export interface BuildTodo {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done';
}

interface WorkingProcessProps {
  todos: BuildTodo[];
  isComplete: boolean;
}

function StepIcon({ status }: { status: 'pending' | 'active' | 'done' }) {
  if (status === 'done') {
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />;
  }
  if (status === 'active') {
    return <Loader2 className="h-3.5 w-3.5 text-indigo-500 animate-spin flex-shrink-0" />;
  }
  return <Circle className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />;
}

export function WorkingProcess({ todos, isComplete }: WorkingProcessProps) {
  if (todos.length === 0) return null;

  const completedCount = todos.filter(t => t.status === 'done').length;
  const progressPercent = isComplete ? 100 : Math.round((completedCount / todos.length) * 100);

  return (
    <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            </div>
          ) : (
            <div className="relative flex h-6 w-6 items-center justify-center">
              <Loader2 className="h-3.5 w-3.5 text-indigo-500 animate-spin" />
            </div>
          )}
          <span className="text-sm font-semibold text-foreground">
            {isComplete ? 'Build complete' : 'Building your site'}
          </span>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          isComplete
            ? 'bg-emerald-500/10 text-emerald-500'
            : 'bg-primary/10 text-primary'
        }`}>
          {completedCount}/{todos.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={`h-full rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-primary'}`}
          initial={{ width: '0%' }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Todo steps */}
      <div className="space-y-1">
        <AnimatePresence mode="popLayout">
          {todos.map((todo, i) => (
            <motion.div
              key={todo.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.2 }}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-all duration-200 ${
                todo.status === 'active' ? 'bg-primary/8 text-primary' : ''
              } ${todo.status === 'done' ? 'opacity-60' : ''}`}
            >
              <StepIcon status={todo.status} />
              <span className={`text-xs transition-colors ${
                todo.status === 'active' ? 'font-semibold text-primary' :
                todo.status === 'done' ? 'text-muted-foreground' :
                'text-muted-foreground/50'
              }`}>
                {todo.label}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
