import { FileCode2, FileEdit, FilePlus, FileX, ArrowRight, X } from 'lucide-react';
import type { FileChange } from '@/lib/agent/eventBus';

interface ChangedFilesPanelProps {
  changes: FileChange[];
  onOpenFile?: (path: string) => void;
  onClose?: () => void;
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

export function ChangedFilesPanel({ changes, onOpenFile, onClose }: ChangedFilesPanelProps) {
  const created = changes.filter(c => c.action === 'created');
  const updated = changes.filter(c => c.action === 'updated');
  const deleted = changes.filter(c => c.action === 'deleted');
  const renamed = changes.filter(c => c.action === 'renamed');

  if (changes.length === 0) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <span className="text-sm font-semibold text-foreground">Changes</span>
          {onClose && (
            <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-white/[0.06]">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xs text-muted-foreground">No changes yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Changes</span>
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {changes.length}
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-white/[0.06]">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {created.length > 0 && (
          <Section title="Created" color="text-emerald-400">
            {created.map(change => (
              <FileRow key={change.path + change.timestamp} change={change} onOpenFile={onOpenFile} />
            ))}
          </Section>
        )}

        {updated.length > 0 && (
          <Section title="Updated" color="text-amber-400">
            {updated.map(change => (
              <FileRow key={change.path + change.timestamp} change={change} onOpenFile={onOpenFile} />
            ))}
          </Section>
        )}

        {renamed.length > 0 && (
          <Section title="Renamed" color="text-blue-400">
            {renamed.map(change => (
              <FileRow key={change.path + change.timestamp} change={change} onOpenFile={onOpenFile} />
            ))}
          </Section>
        )}

        {deleted.length > 0 && (
          <Section title="Deleted" color="text-red-400">
            {deleted.map(change => (
              <FileRow key={change.path + change.timestamp} change={change} onOpenFile={onOpenFile} />
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className={`mb-1.5 text-[10px] font-semibold uppercase ${color}`}>{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function FileRow({ change, onOpenFile }: { change: FileChange; onOpenFile?: (path: string) => void }) {
  return (
    <button
      onClick={() => onOpenFile?.(change.path)}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-white/[0.04]"
    >
      <FileIcon action={change.action} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{change.path}</p>
        {change.oldPath && (
          <p className="truncate text-[10px] text-muted-foreground">from {change.oldPath}</p>
        )}
      </div>
      {change.additions !== undefined && change.deletions !== undefined && (
        <span className="flex-shrink-0 text-[9px] text-muted-foreground">
          <span className="text-emerald-400">+{change.additions}</span>
          {' '}
          <span className="text-red-400">-{change.deletions}</span>
        </span>
      )}
    </button>
  );
}
