import { FilePlus, FileEdit, FileMinus, FileSymlink, ArrowRight } from 'lucide-react';

interface FileChangeCardProps {
  action: 'created' | 'updated' | 'deleted' | 'renamed';
  path: string;
  oldPath?: string;
  summary: string;
  additions?: number;
  deletions?: number;
  onOpenFile?: (path: string) => void;
}

const actionConfig = {
  created: { icon: FilePlus, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Created' },
  updated: { icon: FileEdit, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Updated' },
  deleted: { icon: FileMinus, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Deleted' },
  renamed: { icon: FileSymlink, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Renamed' },
};

export function FileChangeCard({ action, path, oldPath, summary, additions, deletions, onOpenFile }: FileChangeCardProps) {
  const config = actionConfig[action];

  return (
    <div className="rounded-xl border border-border bg-card/50 p-3">
      <div className="flex items-start gap-2">
        <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
          <config.icon className={`h-3.5 w-3.5 ${config.color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenFile?.(path)}
              className="min-w-0 flex-1 truncate text-left font-mono text-xs font-medium text-foreground transition-colors hover:text-primary"
            >
              {path}
            </button>
            <span className={`flex-shrink-0 text-[9px] font-semibold uppercase ${config.color}`}>
              {config.label}
            </span>
          </div>

          {action === 'renamed' && oldPath && (
            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="truncate">{oldPath}</span>
              <ArrowRight className="h-2.5 w-2.5 flex-shrink-0" />
            </div>
          )}

          <p className="mt-0.5 text-[11px] text-muted-foreground">{summary}</p>

          {additions !== undefined && deletions !== undefined && (
            <div className="mt-1 flex items-center gap-2 text-[10px]">
              <span className="text-emerald-400">+{additions}</span>
              <span className="text-red-400">-{deletions}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
