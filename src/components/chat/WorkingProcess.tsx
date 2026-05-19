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

  const completedCount = generationStep;
  const progressPercent = Math.round((completedCount / GENERATION_STEPS.length) * 100);

  return (
    <div className="animate-[fade-in_200ms_ease-out] rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 p-4 shadow-lg shadow-indigo-500/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
            <div className="absolute inset-0 h-4 w-4 rounded-full bg-indigo-400/20 animate-ping" />
          </div>
          <span className="text-sm font-bold text-gray-800">Building your site</span>
        </div>
        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-600">{progressPercent}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-gray-200 mb-3 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400 shadow-sm shadow-indigo-500/30"
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
                className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg transition-all duration-300 ${
                  status === 'active' ? 'bg-indigo-50 shadow-sm shadow-indigo-500/10 ring-1 ring-indigo-200/50' : ''
                } ${status === 'done' ? 'opacity-50' : ''}`}
              >
                <StepIcon status={status} />
                <span className={`text-xs transition-colors ${
                  status === 'active' ? 'font-semibold text-indigo-700' :
                  status === 'done' ? 'text-gray-500 line-through' :
                  'text-gray-400'
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
