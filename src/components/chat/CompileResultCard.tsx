import { AlertCircle, CheckCircle2, Loader2, Bug } from 'lucide-react';
import type { CompileError } from '@/lib/agent/eventBus';

interface CompileResultCardProps {
  success: boolean;
  errors: CompileError[];
  durationMs?: number;
}

interface ErrorCardProps {
  error: CompileError;
  attempt?: number;
  fixAction?: string;
  isFixed?: boolean;
}

export function CompileResultCard({ success, errors, durationMs }: CompileResultCardProps) {
  return (
    <div className={`rounded-xl border p-3 ${
      success
        ? 'border-emerald-500/15 bg-emerald-500/5'
        : 'border-red-500/20 bg-red-500/5'
    }`}>
      <div className="flex items-center gap-2">
        {success ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        ) : (
          <AlertCircle className="h-4 w-4 text-red-400" />
        )}
        <span className={`text-sm font-semibold ${success ? 'text-emerald-300' : 'text-red-300'}`}>
          {success ? 'Build successful' : 'Build failed'}
        </span>
        {durationMs && (
          <span className="text-[10px] text-muted-foreground">
            {durationMs}ms
          </span>
        )}
      </div>
      {!success && errors.length > 0 && (
        <div className="mt-2 space-y-1">
          {errors.slice(0, 5).map((err, i) => (
            <p key={i} className="text-[11px] text-red-300">
              {err.file && `${err.file}:${err.line}`} {err.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function ErrorCard({ error, attempt, fixAction, isFixed }: ErrorCardProps) {
  return (
    <div className={`rounded-xl border p-3 ${
      isFixed
        ? 'border-emerald-500/15 bg-emerald-500/5'
        : 'border-red-500/20 bg-red-500/5'
    }`}>
      <div className="flex items-start gap-2">
        {isFixed ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
        ) : (
          <Bug className="mt-0.5 h-4 w-4 text-red-400" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${isFixed ? 'text-emerald-300' : 'text-red-300'}`}>
              {isFixed ? 'Fixed error' : 'Error'}
            </span>
            {attempt && (
              <span className="rounded bg-background/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                Attempt {attempt}
              </span>
            )}
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-red-300">
            {error.file && `${error.file}:${error.line}:${error.column} `}
            {error.message}
          </p>
          {fixAction && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
              {isFixed ? (
                <span className="text-emerald-400">Fixed: {fixAction}</span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Repairing: {fixAction}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
