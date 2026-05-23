import { useState } from 'react';
import { ChevronDown, ChevronRight, Bug, Code, Cpu, Database, Layers } from 'lucide-react';

interface DeveloperDetailsProps {
  rawInput?: unknown;
  rawOutput?: unknown;
  tokenEstimate?: number;
  contextFiles?: string[];
  memoryRecords?: number;
  repoMapEntries?: number;
  storageUsage?: { backend: string; size: number; files: number };
  open: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DeveloperDetails({
  rawInput, rawOutput, tokenEstimate, contextFiles,
  memoryRecords, repoMapEntries, storageUsage, open,
}: DeveloperDetailsProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!open) return null;

  const sections = [
    {
      id: 'context',
      label: 'Context',
      icon: Layers,
      content: contextFiles && contextFiles.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">Context files: {contextFiles.length}</p>
          <div className="flex flex-wrap gap-1">
            {contextFiles.map((f) => (
              <span key={f} className="rounded bg-background/60 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">{f}</span>
            ))}
          </div>
          {repoMapEntries !== undefined && <p className="text-[10px] text-muted-foreground">Repo map entries: {repoMapEntries}</p>}
          {memoryRecords !== undefined && <p className="text-[10px] text-muted-foreground">Memory records: {memoryRecords}</p>}
        </div>
      ),
    },
    {
      id: 'tokens',
      label: 'Tokens',
      icon: Cpu,
      content: tokenEstimate !== undefined && (
        <p className="text-[10px] text-muted-foreground">Estimated tokens: {tokenEstimate.toLocaleString()}</p>
      ),
    },
    {
      id: 'input',
      label: 'Raw Input',
      icon: Code,
      content: rawInput ? (
        <pre className="max-h-48 overflow-auto rounded bg-background/60 p-2 text-[9px] text-muted-foreground">
          {JSON.stringify(rawInput, null, 2)}
        </pre>
      ) : null,
    },
    {
      id: 'output',
      label: 'Raw Output',
      icon: Bug,
      content: rawOutput ? (
        <pre className="max-h-48 overflow-auto rounded bg-background/60 p-2 text-[9px] text-muted-foreground">
          {JSON.stringify(rawOutput, null, 2)}
        </pre>
      ) : null,
    },
    {
      id: 'storage',
      label: 'Storage',
      icon: Database,
      content: storageUsage && (
        <div className="space-y-0.5 text-[10px] text-muted-foreground">
          <p>Backend: {storageUsage.backend}</p>
          <p>Size: {formatBytes(storageUsage.size)}</p>
          <p>Files: {storageUsage.files}</p>
        </div>
      ),
    },
  ].filter(s => s.content);

  if (sections.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-card/30 p-2">
      <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase text-muted-foreground">
        Developer Details
      </p>
      <div className="space-y-0.5">
        {sections.map((section) => {
          const isExpanded = expanded === section.id;
          const SectionIcon = section.icon;
          return (
            <div key={section.id}>
              <button
                onClick={() => setExpanded(isExpanded ? null : section.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] text-muted-foreground hover:bg-white/[0.04]"
              >
                <SectionIcon className="h-3 w-3" />
                <span className="flex-1 font-medium">{section.label}</span>
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
              {isExpanded && <div className="px-3 pb-2">{section.content}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
