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
    <div className="animate-[fade-in_200ms_ease-out] rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
          <span className="text-sm font-semibold text-gray-800">Building your site</span>
        </div>
        <span className="text-xs font-medium text-gray-400">{progressPercent}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-gray-200 mb-3 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
          initial={{ width: '0%' }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-0">
        <AnimatePresence mode="popLayout">
          {GENERATION_STEPS.map((label, i) => {
            const status: 'pending' | 'active' | 'done' =
              i < generationStep ? 'done' : i === generationStep ? 'active' : 'pending';

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.25 }}
                className={`flex items-center gap-2.5 py-1.5 px-1 rounded-md transition-colors ${
                  status === 'active' ? 'bg-indigo-50' : ''
                } ${status === 'done' ? 'opacity-60' : ''}`}
              >
                <StepIcon status={status} />
                <span className={`text-xs ${
                  status === 'active' ? 'font-medium text-indigo-700' :
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
