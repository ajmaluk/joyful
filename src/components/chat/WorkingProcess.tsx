import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { GENERATION_STEPS } from '@/hooks/useChat';

interface WorkingProcessProps {
  generationStep: number;
}

function StepIcon({ status }: { status: 'pending' | 'active' | 'done' }) {
  if (status === 'done') {
    return <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />;
  }
  if (status === 'active') {
    return <Loader2 className="h-4 w-4 text-indigo-500 animate-spin flex-shrink-0" />;
  }
  return <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />;
}

export function WorkingProcess({ generationStep }: WorkingProcessProps) {
  if (generationStep < 0) return null;

  const completedCount = Math.min(generationStep + 1, GENERATION_STEPS.length);
  const progressPercent = Math.round((completedCount / GENERATION_STEPS.length) * 100);

  return (
    <div className="animate-[fade-in_200ms_ease-out] rounded-xl border border-border bg-card p-4 shadow-lg shadow-black/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
            <div className="absolute inset-0 h-4 w-4 rounded-full bg-indigo-400/20 animate-ping" />
          </div>
          <span className="text-sm font-bold text-foreground">AI build plan</span>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{progressPercent}%</span>
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary shadow-sm shadow-indigo-500/30"
          initial={{ width: '0%' }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-0.5">
        <AnimatePresence mode="popLayout">
          {GENERATION_STEPS.map((label, i) => {
            const status: 'pending' | 'active' | 'done' =
              i < generationStep ? 'done' : i === generationStep ? 'active' : 'pending';

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3, ease: 'easeOut' }}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-all duration-300 ${
                  status === 'active' ? 'bg-primary/10 shadow-sm ring-1 ring-primary/20' : ''
                } ${status === 'done' ? 'opacity-50' : ''}`}
              >
                <StepIcon status={status} />
                <span className={`text-xs transition-colors ${
                  status === 'active' ? 'font-semibold text-primary' :
                  status === 'done' ? 'text-muted-foreground line-through' :
                  'text-muted-foreground'
                }`}>
                  {label}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
