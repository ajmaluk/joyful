import { useState } from 'react';
import {
  CheckCircle2, XCircle, AlertTriangle, Clock,
  FileCode2, Eye, RotateCcw,
} from 'lucide-react';

interface ChangedFileEntry {
  path: string;
  action: string;
}

interface FinalSummaryCardProps {
  status: 'completed' | 'failed' | 'cancelled';
  summary: string;
  changedFiles: ChangedFileEntry[];
  errors: number;
  warnings: number;
  durationMs: number;
  previewStatus: 'success' | 'failed' | 'not_run';
  nextActions?: string[];
  onOpenFile?: (path: string) => void;
  onRetry?: () => void;
}

const statusConfig = {
  completed: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Failed' },
  cancelled: { icon: XCircle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Cancelled' },
};

export function FinalSummaryCard({ status, summary, changedFiles, errors, warnings, durationMs, previewStatus, nextActions, onOpenFile, onRetry }: FinalSummaryCardProps) {
  const [showAll, setShowAll] = useState(false);
  const displayedFiles = showAll ? changedFiles : changedFiles.slice(0, 8);
  const hasMore = changedFiles.length > 8;
  const config = statusConfig[status];

  return (
    <div className={`rounded-xl border p-4 ${config.border} ${config.bg}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${config.bg}`}>
          <config.icon className={`h-5 w-5 ${config.color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`text-sm font-semibold ${config.color}`}>{config.label}</h3>
            {status === 'completed' && errors === 0 && (
              <span className="text-[10px] text-emerald-400/60">No errors</span>
            )}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{summary}</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{(durationMs / 1000).toFixed(1)}s</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px]">
        {errors > 0 && (
          <span className="flex items-center gap-1 text-red-400">
            <AlertTriangle className="h-3 w-3" />
            {errors} error{errors > 1 ? 's' : ''}
          </span>
        )}
        {warnings > 0 && (
          <span className="flex items-center gap-1 text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            {warnings} warning{warnings > 1 ? 's' : ''}
          </span>
        )}
        {previewStatus !== 'not_run' && (
          <span className={`flex items-center gap-1 ${
            previewStatus === 'success' ? 'text-emerald-400' : 'text-red-400'
          }`}>
            <Eye className="h-3 w-3" />
            Preview {previewStatus === 'success' ? 'working' : 'failed'}
          </span>
        )}
      </div>

      {changedFiles.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase text-muted-foreground">
            Changed files ({changedFiles.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {displayedFiles.map((file) => (
              <button
                key={file.path}
                onClick={() => onOpenFile?.(file.path)}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/60 px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
              >
                <FileCode2 className="h-3 w-3 flex-shrink-0" />
                <span className="truncate max-w-[140px]">{file.path}</span>
                <span className={`text-[9px] ${
                  file.action === 'created' ? 'text-emerald-400' :
                  file.action === 'deleted' ? 'text-red-400' :
                  'text-amber-400'
                }`}>
                  {file.action}
                </span>
              </button>
            ))}
            {hasMore && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/60 px-2 py-1 text-[10px] text-muted-foreground hover:border-primary/25"
              >
                {showAll ? 'Show less' : `+${changedFiles.length - 8} more`}
              </button>
            )}
          </div>
        </div>
      )}

      {nextActions && nextActions.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Next steps</p>
          <ul className="space-y-0.5">
            {nextActions.map((action, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <span className="mt-0.5 h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground/40" />
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {status !== 'completed' && onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
