import { Database, AlertTriangle, Clock, Download, Archive, ShieldAlert, HardDrive } from 'lucide-react';

interface StorageStatusProps {
  backend: 'IndexedDB' | 'OPFS' | 'localStorage';
  projectSize: number;
  files: number;
  lastSaved: number;
  persistence: boolean;
  onExport?: () => void;
  onBackup?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StorageStatus({
  backend, projectSize, files, lastSaved, persistence,
  onExport, onBackup,
}: StorageStatusProps) {
  const isLow = backend === 'localStorage';
  const timeSinceSave = Date.now() - lastSaved;
  const isLarge = projectSize > 5 * 1024 * 1024; // > 5MB
  const isVeryLarge = projectSize > 10 * 1024 * 1024; // > 10MB
  const isStale = timeSinceSave > 60000; // > 1 minute since save

  const warnings: { icon: typeof AlertTriangle; message: string; severity: 'warning' | 'error' }[] = [];

  if (isLow) {
    warnings.push({
      icon: AlertTriangle,
      message: 'localStorage has size limits (~5MB). Switch to IndexedDB for larger projects.',
      severity: 'warning',
    });
  }

  if (isVeryLarge) {
    warnings.push({
      icon: HardDrive,
      message: `Project is ${formatBytes(projectSize)}. Consider exporting a backup.`,
      severity: 'warning',
    });
  } else if (isLarge) {
    warnings.push({
      icon: HardDrive,
      message: `Project is ${formatBytes(projectSize)}. Back up regularly.`,
      severity: 'warning',
    });
  }

  if (!persistence) {
    warnings.push({
      icon: ShieldAlert,
      message: 'Storage persistence not granted. Data may be cleared by the browser.',
      severity: 'warning',
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
        <Database className="h-3.5 w-3.5" />
        Storage Health
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Backend</span>
          <span className="font-medium text-foreground">{backend}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Project size</span>
          <span className="font-medium text-foreground">{formatBytes(projectSize)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Files</span>
          <span className="font-medium text-foreground">{files}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Last saved</span>
          <span className={`flex items-center gap-1 font-medium ${isStale ? 'text-amber-400' : 'text-foreground'}`}>
            <Clock className="h-3 w-3 text-muted-foreground" />
            {timeSinceSave < 5000 ? 'Just now' : `${Math.round(timeSinceSave / 1000)}s ago`}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Persistence</span>
          <span className={persistence ? 'text-emerald-400' : 'text-amber-400'}>
            {persistence ? 'Granted' : 'Not granted'}
          </span>
        </div>
      </div>

      {/* Health warnings */}
      {warnings.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {warnings.map((w, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 ${
                w.severity === 'error'
                  ? 'border-red-500/20 bg-red-500/10'
                  : 'border-amber-500/20 bg-amber-500/10'
              }`}
            >
              <w.icon className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-400" />
              <p className="text-[10px] leading-relaxed text-amber-200">{w.message}</p>
            </div>
          ))}
        </div>
      )}

      {(onExport || onBackup) && (
        <div className="mt-3 flex gap-2">
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-1 rounded-lg bg-background/60 px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              <Download className="h-3 w-3" />
              Export ZIP
            </button>
          )}
          {onBackup && (
            <button
              onClick={onBackup}
              className="flex items-center gap-1 rounded-lg bg-background/60 px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              <Archive className="h-3 w-3" />
              Backup
            </button>
          )}
        </div>
      )}
    </div>
  );
}
