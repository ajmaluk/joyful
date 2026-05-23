import { Terminal, Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

interface CompileError {
  file: string;
  line: number;
  message: string;
}

interface CompileCardProps {
  status: 'running' | 'success' | 'failed' | 'not_run';
  durationMs?: number;
  errorCount?: number;
  entryPoint?: string;
  errors?: CompileError[];
  onOpenFile?: (path: string) => void;
}

const statusConfig = {
  running: { icon: Loader2, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', label: 'Compiling...' },
  success: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/15', label: 'Compiled successfully' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Compile failed' },
  not_run: { icon: Terminal, color: 'text-muted-foreground', bg: 'bg-white/[0.04]', border: 'border-border', label: 'Not compiled' },
};

export function CompileCard({ status, durationMs, errorCount, entryPoint, errors, onOpenFile }: CompileCardProps) {
  const config = statusConfig[status];

  return (
    <div className={`rounded-xl border p-3 ${config.border} ${config.bg}`}>
      <div className="flex items-center gap-2">
        {status === 'running' ? (
          <Loader2 className={`h-4 w-4 animate-spin ${config.color}`} />
        ) : (
          <config.icon className={`h-4 w-4 ${config.color}`} />
        )}
        <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
        {durationMs && (
          <span className="text-[10px] text-muted-foreground">{(durationMs / 1000).toFixed(1)}s</span>
        )}
        {status === 'failed' && errorCount !== undefined && (
          <span className="text-[10px] text-red-400">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
        )}
      </div>

      {entryPoint && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Terminal className="h-3 w-3" />
          <span className="font-mono">{entryPoint}</span>
        </div>
      )}

      {errors && errors.length > 0 && (
        <div className="mt-2 space-y-1">
          {errors.slice(0, 5).map((err, i) => (
            <button
              key={i}
              onClick={() => onOpenFile?.(err.file)}
              className="flex w-full items-start gap-1.5 rounded px-2 py-1 text-left text-[11px] text-red-300 transition-colors hover:bg-red-500/5"
            >
              <span className="flex-shrink-0 font-mono text-[10px] text-red-400">
                {err.file}:{err.line}
              </span>
              <ArrowRight className="mt-0.5 h-2.5 w-2.5 flex-shrink-0" />
              <span className="min-w-0">{err.message}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
