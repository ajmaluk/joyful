import { Layers, Files, Brain, Hash } from 'lucide-react';

interface ContextChunk {
  path: string;
  startLine: number;
  endLine: number;
}

interface ContextCardProps {
  files: string[];
  chunks?: ContextChunk[];
  repoMapUsed: boolean;
  memoryUsed: boolean;
  estimatedTokens?: number;
  onOpenFile?: (path: string) => void;
}

export function ContextCard({ files, chunks, repoMapUsed, memoryUsed, estimatedTokens, onOpenFile }: ContextCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
        <Layers className="h-3.5 w-3.5" />
        Context
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {repoMapUsed && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-[10px] text-violet-400">
            <Brain className="h-3 w-3" />
            Repo map
          </span>
        )}
        {memoryUsed && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-[10px] text-violet-400">
            <Brain className="h-3 w-3" />
            Memory
          </span>
        )}
        {estimatedTokens && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/60 px-2 py-1 text-[10px] text-muted-foreground">
            <Hash className="h-3 w-3" />
            ~{estimatedTokens.toLocaleString()} tokens
          </span>
        )}
      </div>

      {files.length > 0 && (
        <div className="mb-2">
          <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
            <Files className="h-3 w-3" />
            Files ({files.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {files.map((file) => (
              <button
                key={file}
                onClick={() => onOpenFile?.(file)}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/60 px-2 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
              >
                {file}
              </button>
            ))}
          </div>
        </div>
      )}

      {chunks && chunks.length > 0 && (
        <div>
          <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
            <Layers className="h-3 w-3" />
            Chunks ({chunks.length})
          </div>
          <div className="space-y-0.5">
            {chunks.slice(0, 8).map((chunk, i) => (
              <button
                key={i}
                onClick={() => onOpenFile?.(chunk.path)}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[10px] transition-colors hover:bg-white/[0.04]"
              >
                <span className="truncate font-mono text-muted-foreground">{chunk.path}</span>
                <span className="flex-shrink-0 rounded bg-background/60 px-1 py-0.5 font-mono text-[9px] text-muted-foreground">
                  L{chunk.startLine}-{chunk.endLine}
                </span>
              </button>
            ))}
            {chunks.length > 8 && (
              <p className="px-2 text-[10px] text-muted-foreground">+{chunks.length - 8} more</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
