import { Bug, Wrench, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ErrorDebugCardProps {
  type: 'compile_error' | 'runtime_error' | 'missing_import' | 'blank_preview' | 'unknown';
  file: string;
  line: number;
  message: string;
  likelyCause?: string;
  repairAttempt?: number;
  maxRepairAttempts?: number;
  fixed?: boolean;
  onOpenFile?: (path: string) => void;
}

const typeLabel: Record<string, string> = {
  compile_error: 'Compile Error',
  runtime_error: 'Runtime Error',
  missing_import: 'Missing Import',
  blank_preview: 'Blank Preview',
  unknown: 'Error',
};

export function ErrorDebugCard({ type, file, line, message, likelyCause, repairAttempt, maxRepairAttempts, fixed, onOpenFile }: ErrorDebugCardProps) {
  return (
    <div className={`rounded-xl border p-3 ${
      fixed
        ? 'border-emerald-500/15 bg-emerald-500/5'
        : 'border-red-500/20 bg-red-500/5'
    }`}>
      <div className="flex items-start gap-2">
        {fixed ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
        ) : (
          <Bug className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${fixed ? 'text-emerald-300' : 'text-red-300'}`}>
              {fixed ? 'Fixed' : typeLabel[type] || 'Error'}
            </span>
            {repairAttempt !== undefined && maxRepairAttempts !== undefined && (
              <span className="rounded bg-background/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                Attempt {repairAttempt}/{maxRepairAttempts}
              </span>
            )}
          </div>

          <button
            onClick={() => onOpenFile?.(file)}
            className="mt-1 flex items-center gap-1 text-left text-[11px] text-red-300 transition-colors hover:text-red-200"
          >
            <span className="font-mono text-[10px] text-red-400">{file}:{line}</span>
            <Wrench className="h-2.5 w-2.5" />
          </button>

          <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-red-300/80">{message}</p>

          {likelyCause && !fixed && (
            <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-2 py-1.5">
              <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-400" />
              <p className="text-[11px] text-amber-300/80">{likelyCause}</p>
            </div>
          )}

          {repairAttempt !== undefined && !fixed && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-amber-400">
              <Wrench className="h-3 w-3" />
              <span>Repairing... (attempt {repairAttempt})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
