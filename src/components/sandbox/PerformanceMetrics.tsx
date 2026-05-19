import { useEffect, useState } from 'react';
import { Activity, Cpu, Timer, Layers } from 'lucide-react';
import type { SandboxMetrics } from '@/hooks/useSandboxMessages';

interface PerformanceMetricsProps {
  metrics: SandboxMetrics;
  onRequestMetrics: () => void;
}

export function PerformanceMetrics({ metrics, onRequestMetrics }: PerformanceMetricsProps) {
  const [lastUpdated, setLastUpdated] = useState<number>(0);

  useEffect(() => {
    onRequestMetrics();
    const interval = setInterval(onRequestMetrics, 5000);
    return () => clearInterval(interval);
  }, [onRequestMetrics]);

  useEffect(() => {
    if (metrics.domNodes > 0) {
      setLastUpdated(Date.now());
    }
  }, [metrics]);

  const metricItems = [
    {
      icon: Layers,
      label: 'DOM Nodes',
      value: metrics.domNodes.toLocaleString(),
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50',
    },
    {
      icon: Cpu,
      label: 'JS Heap',
      value: metrics.heapMB > 0 ? `${metrics.heapMB} MB` : 'N/A',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50',
    },
    {
      icon: Timer,
      label: 'Load Time',
      value: metrics.loadMs > 0 ? `${metrics.loadMs} ms` : 'N/A',
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
    },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700">Performance</span>
          {lastUpdated > 0 && (
            <span className="text-[10px] text-gray-400">
              Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
        <button
          onClick={onRequestMetrics}
          className="rounded px-2 py-0.5 text-[10px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 gap-3">
          {metricItems.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`rounded-lg border border-gray-200 ${item.bgColor} p-4 flex flex-col items-center gap-2`}>
                <Icon className={`h-5 w-5 ${item.color}`} />
                <span className="text-2xl font-bold text-gray-900">{item.value}</span>
                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{item.label}</span>
              </div>
            );
          })}
        </div>

        {metrics.domNodes === 0 && (
          <div className="mt-4 text-center text-xs text-gray-400">
            Metrics will appear once the preview loads
          </div>
        )}
      </div>
    </div>
  );
}
