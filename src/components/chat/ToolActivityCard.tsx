import { useState, useCallback } from 'react';
import {
  Loader2, CheckCircle2, AlertCircle, FileCode2,
  FolderOpen, Trash2, Edit3, Search, FileText,
  ExternalLink,
} from 'lucide-react';
import type { ToolActivity } from '@/lib/agent/eventBus';

interface ToolActivityCardProps {
  activity: ToolActivity;
  showInput?: boolean;
  onOpenFile?: (path: string) => void;
}

const toolLabels: Record<string, { icon: typeof FileCode2; label: string }> = {
  read_file: { icon: FileCode2, label: 'Read file' },
  write_file: { icon: Edit3, label: 'Create file' },
  edit_file: { icon: Edit3, label: 'Edit file' },
  patch_file: { icon: Edit3, label: 'Patch file' },
  create_file: { icon: FileCode2, label: 'Create file' },
  delete_file: { icon: Trash2, label: 'Delete file' },
  create_directory: { icon: FolderOpen, label: 'Create folder' },
  list_directory: { icon: FolderOpen, label: 'List directory' },
  search_files: { icon: Search, label: 'Search' },
  search_code: { icon: Search, label: 'Search code' },
  execute_command: { icon: FileText, label: 'Run command' },
  compile_and_preview: { icon: Loader2, label: 'Compile' },
  update_todos: { icon: CheckCircle2, label: 'Update tasks' },
  write_message: { icon: FileText, label: 'Message' },
};

export function ToolActivityCard({ activity, showInput, onOpenFile }: ToolActivityCardProps) {
  const [expanded, setExpanded] = useState(false);

  const toolInfo = toolLabels[activity.tool] || { icon: Loader2, label: activity.tool };

  const pathMatch = activity.display.match(/(\/[^\s]*)/);
  const parsedPath = pathMatch?.[1];

  const handleOpen = useCallback(() => {
    if (parsedPath && onOpenFile) {
      onOpenFile(parsedPath);
    }
  }, [parsedPath, onOpenFile]);

  return (
    <div className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
      activity.status === 'running'
        ? 'border-sky-500/20 bg-sky-500/5'
        : activity.status === 'failed'
        ? 'border-red-500/20 bg-red-500/5'
        : 'border-emerald-500/15 bg-emerald-500/5'
    }`}>
      <div className="flex items-center gap-2">
        {activity.status === 'running' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />
        ) : activity.status === 'failed' ? (
          <AlertCircle className="h-3.5 w-3.5 text-red-400" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        )}
        <span className="flex-shrink-0 rounded bg-background/60 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
          {toolInfo.label}
        </span>
        <span className="flex-1 truncate font-medium text-foreground">
          {activity.display}
        </span>
        {activity.status === 'running' && (
          <span className="flex-shrink-0 text-[10px] text-sky-400">Running...</span>
        )}
        {activity.status === 'success' && (
          <span className="flex-shrink-0 text-[10px] text-emerald-400">Done</span>
        )}
      </div>

      {/* File path clickable */}
      {parsedPath && onOpenFile && activity.status !== 'running' && (
        <button
          onClick={handleOpen}
          className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-2.5 w-2.5" />
          <span className="truncate font-mono">{parsedPath}</span>
        </button>
      )}

      {/* Show details for failed or expanded view */}
      {(showInput || activity.status === 'failed' || expanded) && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-[10px] text-muted-foreground hover:text-foreground"
        >
          {expanded ? 'Hide details' : 'Show details'}
        </button>
      )}

      {expanded && activity.input ? (
        <pre className="mt-1 max-h-32 overflow-auto rounded bg-background/60 p-2 text-[10px] text-muted-foreground">
          {typeof activity.input === 'string'
            ? activity.input
            : JSON.stringify(activity.input, null, 2)}
        </pre>
      ) : null}

      {activity.status === 'failed' && activity.error && (
        <p className="mt-1 text-[10px] text-red-400">{activity.error}</p>
      )}
    </div>
  );
}
