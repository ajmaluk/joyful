import { Loader2, CheckCircle2, AlertCircle, Circle } from 'lucide-react';

interface AgentActivityCardProps {
  icon: React.ReactNode;
  title: string;
  timestamp?: number;
  status?: 'running' | 'success' | 'failed' | 'pending';
  children: React.ReactNode;
}

const statusIcon = {
  running: Loader2,
  success: CheckCircle2,
  failed: AlertCircle,
  pending: Circle,
};

const statusColor = {
  running: 'text-sky-400',
  success: 'text-emerald-400',
  failed: 'text-red-400',
  pending: 'text-muted-foreground/40',
};

const statusBorder = {
  running: 'border-sky-500/20',
  success: 'border-emerald-500/15',
  failed: 'border-red-500/20',
  pending: 'border-border',
};

export function AgentActivityCard({ icon, title, timestamp, status, children }: AgentActivityCardProps) {
  const StatusIcon = status ? statusIcon[status] : null;
  const color = status ? statusColor[status] : '';
  const border = status ? statusBorder[status] : 'border-border';

  return (
    <div className={`rounded-xl border ${border} bg-card/50 p-3`}>
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.04]">
          {icon}
        </div>
        <span className="flex-1 text-[11px] font-semibold uppercase text-muted-foreground">
          {title}
        </span>
        {status && StatusIcon && (
          status === 'running' ? (
            <Loader2 className={`h-3.5 w-3.5 animate-spin ${color}`} />
          ) : (
            <StatusIcon className={`h-3.5 w-3.5 ${color}`} />
          )
        )}
        {timestamp && (
          <span className="text-[10px] text-muted-foreground">
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
