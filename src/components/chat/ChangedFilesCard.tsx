import type { FileChange } from '@/lib/agent/eventBus';
import { FileCode2, FileEdit, FilePlus, FileX, ArrowRight } from 'lucide-react';

interface ChangedFilesCardProps {
  changes: FileChange[];
  onOpenFile?: (path: string) => void;
  compact?: boolean;
}

function FileIcon({ action }: { action: string }) {
  switch (action) {
    case 'created': return <FilePlus className="h-3.5 w-3.5 text-emerald-400" />;
    case 'updated': return <FileEdit className="h-3.5 w-3.5 text-amber-400" />;
    case 'deleted': return <FileX className="h-3.5 w-3.5 text-red-400" />;
    case 'renamed': return <ArrowRight className="h-3.5 w-3.5 text-blue-400" />;
    default: return <FileCode2 className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

export function ChangedFilesCard({ changes, onOpenFile, compact }: ChangedFilesCardProps) {
  if (changes.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card/50 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
        <FileCode2 className="h-3.5 w-3.5" />
        Changed files ({changes.length})
      </div>
      <div className="space-y-1">
        {changes.map((change) => (
          <button
            key={`${change.path}-${change.timestamp}`}
            onClick={() => onOpenFile?.(change.path)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-white/[0.04]"
          >
            <FileIcon action={change.action} />
            <span className="min-w-0 flex-1 truncate font-medium text-foreground">
              {change.path}
            </span>
            {!compact && change.summary && (
              <span className="hidden truncate text-muted-foreground sm:block max-w-[120px]">
                {change.summary}
              </span>
            )}
            <span className={`text-[9px] uppercase ${
              change.action === 'created' ? 'text-emerald-400' :
              change.action === 'deleted' ? 'text-red-400' :
              change.action === 'renamed' ? 'text-blue-400' :
              'text-amber-400'
            }`}>
              {change.action}
            </span>
            {change.additions !== undefined && change.deletions !== undefined && (
              <span className="text-[9px] text-muted-foreground">
                +{change.additions}/-{change.deletions}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
