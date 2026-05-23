import { useEffect, useState } from 'react';
import {
  Loader2, Square, Clock, FileCode2,
  Brain, AlertCircle, CheckCircle2, Sparkles,
  Search, FileEdit, FolderOpen, Play,
  Bug, BookOpen, Ban, Pause,
} from 'lucide-react';
import type { AgentStatus, AgentMode } from '@/lib/agent/eventBus';

interface AgentStatusBarProps {
  status: AgentStatus;
  mode: AgentMode;
  currentGoal: string | null;
  currentTodo: string | null;
  currentFile: string | null;
  isRunning: boolean;
  isPaused: boolean;
  elapsedMs: number;
  onStop: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onRetry?: () => void;
}

const statusConfig: Record<AgentStatus, { icon: typeof Loader2; label: string; color: string }> = {
  idle: { icon: BookOpen, label: 'Idle', color: 'text-muted-foreground' },
  understanding: { icon: Brain, label: 'Understanding', color: 'text-sky-400' },
  scanning: { icon: Search, label: 'Scanning', color: 'text-sky-400' },
  planning: { icon: FolderOpen, label: 'Planning', color: 'text-violet-400' },
  reading: { icon: FileCode2, label: 'Reading files', color: 'text-blue-400' },
  writing: { icon: FileEdit, label: 'Writing files', color: 'text-amber-400' },
  editing: { icon: FileEdit, label: 'Editing files', color: 'text-amber-400' },
  compiling: { icon: Play, label: 'Compiling', color: 'text-emerald-400' },
  debugging: { icon: Bug, label: 'Debugging', color: 'text-red-400' },
  reviewing: { icon: Sparkles, label: 'Reviewing', color: 'text-emerald-400' },
  saving: { icon: Brain, label: 'Saving memory', color: 'text-violet-400' },
  completed: { icon: CheckCircle2, label: 'Completed', color: 'text-emerald-400' },
  failed: { icon: AlertCircle, label: 'Failed', color: 'text-red-400' },
  cancelled: { icon: Ban, label: 'Cancelled', color: 'text-amber-400' },
};

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function AgentStatusBar({
  status, mode, currentGoal, currentTodo, currentFile,
  isRunning, isPaused, elapsedMs,
  onStop, onPause, onResume, onRetry,
}: AgentStatusBarProps) {
  const [now, setNow] = useState(Date.now());
  const cfg = statusConfig[status] || statusConfig.idle;
  const StatusIcon = cfg.icon;

  useEffect(() => {
    if (!isRunning || isPaused) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isRunning, isPaused]);

  const displayElapsed = isRunning ? elapsedMs + (Date.now() - now > 1000 ? 0 : 0) : elapsedMs;

  if (status === 'idle') return null;

  return (
    <div className="flex items-center gap-3 border-b border-border/60 bg-card/40 px-4 py-2 text-xs">
      <div className={`flex items-center gap-1.5 ${cfg.color}`}>
        {isRunning && !isPaused ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <StatusIcon className="h-3.5 w-3.5" />
        )}
        <span className="font-semibold">{cfg.label}</span>
      </div>

      {currentGoal && (
        <span className="hidden truncate text-muted-foreground md:block max-w-[200px]">
          {currentGoal}
        </span>
      )}

      {currentTodo && (
        <span className="hidden truncate text-muted-foreground sm:block max-w-[160px]">
          {currentTodo}
        </span>
      )}

      {currentFile && (
        <span className="hidden truncate font-mono text-[10px] text-muted-foreground lg:block max-w-[200px]">
          {currentFile}
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatElapsed(displayElapsed)}
        </span>

        <span className="rounded border border-border/60 px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
          {mode}
        </span>

        {isRunning && !isPaused && (
          <>
            {onPause && (
              <button
                onClick={onPause}
                className="flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
              >
                <Pause className="h-3 w-3" />
                Pause
              </button>
            )}
            <button
              onClick={onStop}
              className="flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-1 text-[10px] font-medium text-red-400 transition-colors hover:bg-red-500/20"
            >
              <Square className="h-3 w-3" />
              Stop
            </button>
          </>
        )}

        {isRunning && isPaused && onResume && (
          <button
            onClick={onResume}
            className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
          >
            <Play className="h-3 w-3" />
            Resume
          </button>
        )}

        {status === 'failed' && onRetry && (
          <button
            onClick={onRetry}
            className="rounded-md bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
