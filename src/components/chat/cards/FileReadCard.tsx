import { FileText, ChevronRight } from 'lucide-react';

interface FileReadCardProps {
  path: string;
  startLine?: number;
  endLine?: number;
  totalLines: number;
  reason: string;
  contentPreview?: string;
  onOpenFile?: (path: string) => void;
}

export function FileReadCard({ path, startLine, endLine, totalLines, reason, contentPreview, onOpenFile }: FileReadCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        File read
      </div>

      <button
        onClick={() => onOpenFile?.(path)}
        className="group mb-1 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
      >
        <FileText className="h-3.5 w-3.5 flex-shrink-0 text-sky-400" />
        <span className="min-w-0 flex-1 truncate font-mono text-xs font-medium text-foreground">
          {path}
        </span>
        <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </button>

      <div className="mb-1 flex items-center gap-2 text-[10px] text-muted-foreground">
        {startLine !== undefined && endLine !== undefined ? (
          <span className="rounded bg-background/60 px-1.5 py-0.5 font-mono">
            L{startLine}-{endLine}
          </span>
        ) : (
          <span className="rounded bg-background/60 px-1.5 py-0.5 font-mono">
            {totalLines} lines
          </span>
        )}
        <span className="rounded bg-background/60 px-1.5 py-0.5">
          {totalLines} total
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground">{reason}</p>

      {contentPreview && (
        <pre className="mt-2 max-h-24 overflow-auto rounded-lg bg-background/60 p-2 text-[10px] text-muted-foreground">
          {contentPreview}
        </pre>
      )}
    </div>
  );
}
