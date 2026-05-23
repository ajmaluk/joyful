import { Square, Play, RotateCcw, Pause } from 'lucide-react';

interface AgentControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  status: string;
  onStop: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onRetry?: () => void;
}

export function AgentControls({
  isRunning, isPaused, status,
  onStop, onPause, onResume, onRetry,
}: AgentControlsProps) {
  return (
    <div className="flex items-center gap-2">
      {isRunning && !isPaused && (
        <>
          {onPause && (
            <button
              onClick={onPause}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </button>
          )}
          <button
            onClick={onStop}
            className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
          >
            <Square className="h-3.5 w-3.5" />
            Stop
          </button>
        </>
      )}

      {isRunning && isPaused && onResume && (
        <button
          onClick={onResume}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
        >
          <Play className="h-3.5 w-3.5" />
          Resume
        </button>
      )}

      {status === 'failed' && onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
