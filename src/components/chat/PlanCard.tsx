import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';
import type { AgentPlanStep } from '@/lib/agent/eventBus';

interface PlanCardProps {
  steps: AgentPlanStep[];
}

export function PlanCard({ steps }: PlanCardProps) {
  if (steps.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card/50 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Plan
      </div>
      <div className="space-y-1">
        {steps.map((step) => (
          <div key={step.id} className="flex items-start gap-2 text-xs">
            {step.status === 'completed' ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
            ) : step.status === 'in_progress' ? (
              <Loader2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 animate-spin text-sky-400" />
            ) : step.status === 'failed' ? (
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400" />
            ) : (
              <Circle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40" />
            )}
            <div className="min-w-0">
              <span className={`font-medium ${step.status === 'completed' ? 'text-muted-foreground' : 'text-foreground'}`}>
                {step.title}
              </span>
              {step.description && (
                <p className="text-[11px] text-muted-foreground">{step.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
