import { Database, Save, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { virtualFS } from '@/lib/vfs/VirtualFileSystem';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

interface StorageStats {
  backend: 'IndexedDB' | 'OPFS' | 'localStorage';
  projectSize: number;
  fileCount: number;
  storageUsed: number;
  storageTotal: number;
  lastSaved?: number;
  persistenceStatus: 'granted' | 'denied' | 'unknown';
}

async function fetchStorageStats(): Promise<StorageStats> {
  try {
    const files = await virtualFS.getAllFiles();
    let totalBytes = 0;
    for (const f of files) {
      totalBytes += f.content.length;
    }

    const estimate = await navigator.storage?.estimate?.();
    const persisted = await navigator.storage?.persisted?.();

    return {
      backend: 'IndexedDB',
      projectSize: totalBytes,
      fileCount: files.length,
      storageUsed: estimate?.usage ?? totalBytes,
      storageTotal: estimate?.quota ?? 50 * 1024 * 1024,
      persistenceStatus: persisted === true ? 'granted' : persisted === false ? 'denied' : 'unknown',
    };
  } catch {
    return {
      backend: 'IndexedDB',
      projectSize: 0,
      fileCount: 0,
      storageUsed: 0,
      storageTotal: 50 * 1024 * 1024,
      persistenceStatus: 'unknown',
    };
  }
}

export function StorageCard() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStorageStats().then(s => {
      setStats(s);
      setLoading(false);
    });
  }, []);

  const usagePercent = stats && stats.storageTotal > 0
    ? Math.round((stats.storageUsed / stats.storageTotal) * 100)
    : 0;

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card/50 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
          <Database className="h-3.5 w-3.5" />
          Storage
        </div>
        <p className="text-[11px] text-muted-foreground">Loading storage info…</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="rounded-xl border border-border bg-card/50 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
        <Database className="h-3.5 w-3.5" />
        Storage
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Backend</span>
          <span className="font-medium text-foreground">{stats.backend}</span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Project size</span>
          <span className="font-medium text-foreground">{formatBytes(stats.projectSize)}</span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Files</span>
          <span className="font-medium text-foreground">{stats.fileCount}</span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Usage</span>
          <span className="font-medium text-foreground">{formatBytes(stats.storageUsed)} / {formatBytes(stats.storageTotal)}</span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={`h-full rounded-full transition-all ${
              usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Persistence</span>
          <span className={`font-medium ${
            stats.persistenceStatus === 'granted' ? 'text-emerald-400' :
            stats.persistenceStatus === 'denied' ? 'text-red-400' :
            'text-amber-400'
          }`}>
            {stats.persistenceStatus === 'granted' ? 'Granted' :
             stats.persistenceStatus === 'denied' ? 'Denied' : 'Unknown'}
          </span>
        </div>

        {stats.lastSaved && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Save className="h-3 w-3" />
            <span>Saved {new Date(stats.lastSaved).toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={async () => {
            try {
              const blob = await virtualFS.exportAsZip();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `joyful-export-${Date.now()}.zip`;
              a.click();
              URL.revokeObjectURL(url);
            } catch {}
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
        >
          <Download className="h-3 w-3" />
          Export
        </button>
        {typeof navigator.storage?.persist === 'function' && (
          <button
            onClick={async () => {
              try {
                const granted = await navigator.storage!.persist();
                setStats(prev => prev ? { ...prev, persistenceStatus: granted ? 'granted' : 'denied' } : prev);
              } catch {}
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
          >
            <Database className="h-3 w-3" />
            {stats.persistenceStatus === 'granted' ? 'Persisted' : 'Request Persist'}
          </button>
        )}
      </div>
    </div>
  );
}
