import { Search, Code2, Package, FolderTree } from 'lucide-react';

interface Dependency {
  name: string;
  version: string;
}

interface ProjectScanCardProps {
  framework: string;
  buildTool: string;
  fileCount: number;
  entryPoint: string;
  storageBackend: string;
  dependencies?: Dependency[];
}

export function ProjectScanCard({ framework, buildTool, fileCount, entryPoint, storageBackend, dependencies }: ProjectScanCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
        <Search className="h-3.5 w-3.5" />
        Project scan
      </div>

      <div className="mb-2 grid grid-cols-2 gap-1.5">
        <div className="rounded-lg border border-border bg-card/60 px-2.5 py-2">
          <div className="flex items-center gap-1 text-[10px] font-medium uppercase text-muted-foreground">
            <Code2 className="h-3 w-3" />
            Framework
          </div>
          <p className="mt-0.5 text-xs font-semibold text-foreground">{framework}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/60 px-2.5 py-2">
          <div className="flex items-center gap-1 text-[10px] font-medium uppercase text-muted-foreground">
            <FolderTree className="h-3 w-3" />
            Build tool
          </div>
          <p className="mt-0.5 text-xs font-semibold text-foreground">{buildTool}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/60 px-2.5 py-2">
          <div className="flex items-center gap-1 text-[10px] font-medium uppercase text-muted-foreground">
            <FolderTree className="h-3 w-3" />
            Files
          </div>
          <p className="mt-0.5 text-xs font-semibold text-foreground">{fileCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/60 px-2.5 py-2">
          <div className="flex items-center gap-1 text-[10px] font-medium uppercase text-muted-foreground">
            <FolderTree className="h-3 w-3" />
            Storage
          </div>
          <p className="mt-0.5 text-xs font-semibold text-foreground">{storageBackend}</p>
        </div>
      </div>

      {entryPoint && (
        <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Code2 className="h-3 w-3" />
          <span className="font-mono">{entryPoint}</span>
        </div>
      )}

      {dependencies && dependencies.length > 0 && (
        <div>
          <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
            <Package className="h-3 w-3" />
            Dependencies ({dependencies.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {dependencies.slice(0, 12).map((dep) => (
              <span
                key={dep.name}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/60 px-2 py-1 text-[10px] text-muted-foreground"
              >
                <Package className="h-2.5 w-2.5" />
                {dep.name}@{dep.version}
              </span>
            ))}
            {dependencies.length > 12 && (
              <span className="inline-flex items-center px-2 py-1 text-[10px] text-muted-foreground">
                +{dependencies.length - 12} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
