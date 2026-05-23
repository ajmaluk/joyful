import { ListChecks, AlertTriangle, FileSearch, ArrowRight, CheckCircle2, Loader2, Circle, AlertCircle } from 'lucide-react';

interface PlanStep {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  description?: string;
}

interface PlanCardProps {
  goal: string;
  steps: PlanStep[];
  risks?: string[];
  chosenApproach?: string;
  filesToInspect?: string[];
  onOpenFile?: (path: string) => void;
}

const stepIcon = {
  completed: CheckCircle2,
  in_progress: Loader2,
  failed: AlertCircle,
  pending: Circle,
};

const stepColor = {
  completed: 'text-emerald-400',
  in_progress: 'text-sky-400',
  failed: 'text-red-400',
  pending: 'text-muted-foreground/40',
};

export function PlanCard({ goal, steps, risks, chosenApproach, filesToInspect, onOpenFile }: PlanCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
        <ListChecks className="h-3.5 w-3.5" />
        Plan
      </div>

      <p className="mb-2 text-xs leading-relaxed text-foreground">{goal}</p>

      {steps.length > 0 && (
        <div className="mb-2 space-y-1">
          {steps.map((step) => {
            const Icon = stepIcon[step.status];
            const color = stepColor[step.status];
            return (
              <div key={step.id} className="flex items-start gap-2 text-xs">
                {step.status === 'in_progress' ? (
                  <Loader2 className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 animate-spin ${color}`} />
                ) : (
                  <Icon className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${color}`} />
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
            );
          })}
        </div>
      )}

      {risks && risks.length > 0 && (
        <div className="mb-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-2">
          <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            Risks
          </div>
          {risks.map((risk, i) => (
            <p key={i} className="text-[11px] text-amber-300/80">{risk}</p>
          ))}
        </div>
      )}

      {chosenApproach && (
        <div className="mb-2 flex items-start gap-1.5 text-xs">
          <ArrowRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-sky-400" />
          <span className="text-muted-foreground">{chosenApproach}</span>
        </div>
      )}

      {filesToInspect && filesToInspect.length > 0 && (
        <div>
          <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
            <FileSearch className="h-3 w-3" />
            Files to inspect
          </div>
          <div className="flex flex-wrap gap-1">
            {filesToInspect.map((file) => (
              <button
                key={file}
                onClick={() => onOpenFile?.(file)}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/60 px-2 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
              >
                <FileSearch className="h-2.5 w-2.5" />
                {file}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
