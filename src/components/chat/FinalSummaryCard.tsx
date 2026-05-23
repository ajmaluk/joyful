import { useState } from 'react';
import {
  CheckCircle2, AlertCircle, Sparkles, Clock,
  FileCode2, ArrowRight, Ban,
} from 'lucide-react';
import type { FinalSummary } from '@/lib/agent/eventBus';

interface FinalSummaryCardProps {
  summary: FinalSummary;
  onOpenFile?: (path: string) => void;
  onRetry?: () => void;
  status: 'completed' | 'failed' | 'cancelled';
}

export function FinalSummaryCard({ summary, onOpenFile, onRetry, status }: FinalSummaryCardProps) {
  const [showAll, setShowAll] = useState(false);
  const displayedFiles = showAll ? summary.changedFiles : summary.changedFiles.slice(0, 8);
  const hasMore = summary.changedFiles.length > 8;

  const isSuccess = status === 'completed';
  const isCancelled = status === 'cancelled';

  return (
    <div className={`rounded-xl border p-4 ${
      isSuccess
        ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
        : isCancelled
        ? 'border-amber-500/20 bg-amber-500/[0.04]'
        : 'border-red-500/20 bg-red-500/[0.04]'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          isSuccess
            ? 'bg-emerald-500/10'
            : isCancelled
            ? 'bg-amber-500/10'
            : 'bg-red-500/10'
        }`}>
          {isSuccess ? (
            <Sparkles className="h-5 w-5 text-emerald-400" />
          ) : isCancelled ? (
            <Ban className="h-5 w-5 text-amber-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`text-sm font-semibold ${
            isSuccess ? 'text-emerald-300' : isCancelled ? 'text-amber-300' : 'text-red-300'
          }`}>
            {isSuccess ? 'Completed' : isCancelled ? 'Cancelled' : 'Failed'}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {summary.summary}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{(summary.durationMs / 1000).toFixed(1)}s</span>
        </div>
      </div>

      {summary.changedFiles.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase text-muted-foreground">
            Changed files ({summary.changedFiles.length})
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
                {showAll ? 'Show less' : `+${summary.changedFiles.length - 8} more`}
              </button>
            )}
          </div>
        </div>
      )}

      {summary.previewStatus !== 'not_run' && (
        <div className="mt-3 flex items-center gap-2 text-[11px]">
          <span className="text-muted-foreground">Preview:</span>
          <span className={`flex items-center gap-1 ${
            summary.previewStatus === 'success' ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {summary.previewStatus === 'success' ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            {summary.previewStatus === 'success' ? 'Working' : 'Failed'}
          </span>
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
        {summary.errors > 0 && (
          <span className="text-red-400">{summary.errors} error{summary.errors > 1 ? 's' : ''}</span>
        )}
        {summary.warnings > 0 && (
          <span className="text-amber-400">{summary.warnings} warning{summary.warnings > 1 ? 's' : ''}</span>
        )}
        {summary.errors === 0 && <span className="text-emerald-400">No errors</span>}
      </div>

      {!isSuccess && onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
