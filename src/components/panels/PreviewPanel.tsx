import { useState, useEffect, useRef, useCallback } from 'react';
import { Home, RotateCcw, ExternalLink, Smartphone, Tablet, Monitor, ShieldCheck, PlayCircle, Terminal, Network, Activity, ChevronDown, ChevronUp, MousePointer2 } from 'lucide-react';
import type { ProjectFile } from '@/types';
import { generatePreview } from '@/services/fileSystem';
import { SANDBOX_BRIDGE_SCRIPT } from '@/utils/sandboxBridge';
import { useSandboxMessages } from '@/hooks/useSandboxMessages';
import { ConsolePanel } from '@/components/sandbox/ConsolePanel';
import { NetworkPanel } from '@/components/sandbox/NetworkPanel';
import { PerformanceMetrics } from '@/components/sandbox/PerformanceMetrics';

interface PreviewPanelProps {
  files: ProjectFile[];
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';
type BottomTab = 'console' | 'network' | 'performance';

const BOTTOM_HEIGHT = 200;

export function PreviewPanel({ files }: PreviewPanelProps) {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [srcDoc, setSrcDoc] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bottomOpen, setBottomOpen] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>('console');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const {
    logs,
    network,
    metrics,
    inspectorSelection,
    inspectorEnabled,
    toggleInspector,
    requestMetrics,
    clearLogs,
    clearNetwork,
  } = useSandboxMessages(iframeRef);

  const refreshPreview = useCallback(() => {
    setIsLoading(true);
    const html = generatePreview(files);
    const bridgeHtml = html.includes('</body>')
      ? html.replace('</body>', `${SANDBOX_BRIDGE_SCRIPT}</body>`)
      : html + SANDBOX_BRIDGE_SCRIPT;
    setSrcDoc(bridgeHtml);
    setTimeout(() => {
      setIsLoading(false);
      requestMetrics();
    }, 300);
  }, [files, requestMetrics]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshPreview();
    }, 500);
    return () => clearTimeout(timer);
  }, [files, refreshPreview]);

  const deviceWidths: Record<DeviceMode, string> = {
    desktop: '100%',
    tablet: '768px',
    mobile: '390px',
  };

  const tabConfig: { tab: BottomTab; icon: typeof Terminal; label: string; badge?: number }[] = [
    { tab: 'console', icon: Terminal, label: 'Console', badge: logs.filter(l => l.level === 'error').length || undefined },
    { tab: 'network', icon: Network, label: 'Network', badge: network.filter(r => r.pending).length || undefined },
    { tab: 'performance', icon: Activity, label: 'Perf' },
  ];

  return (
    <div className="flex h-full min-h-0 w-full flex-col border-l border-gray-300 bg-gray-100">
      {/* Browser chrome — original design */}
      <div className="flex h-12 items-center justify-between border-b border-gray-300 bg-gray-100 px-3">
        <div className="flex items-center gap-1">
          <button
            onClick={refreshPreview}
            className="rounded-md p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            title="Home"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={refreshPreview}
            className="rounded-md p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            title="Refresh preview"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Address bar */}
        <div className="flex-1 mx-3 min-w-0">
          <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-gray-100 px-3 py-1.5">
            <Home className="h-3 w-3 text-gray-600" />
            <span className="truncate text-xs text-gray-700">local-sandbox:/</span>
            <span className="ml-auto hidden items-center gap-1 text-[10px] text-[#66D28E] sm:flex">
              <ShieldCheck className="h-3 w-3" />
              Safe preview
            </span>
          </div>
        </div>

        {/* Device toggle */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setDevice('desktop')}
            className={`rounded-md p-1.5 transition-colors ${device === 'desktop' ? 'bg-white text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
            title="Desktop preview"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDevice('tablet')}
            className={`rounded-md p-1.5 transition-colors ${device === 'tablet' ? 'bg-white text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
            title="Tablet preview"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDevice('mobile')}
            className={`rounded-md p-1.5 transition-colors ${device === 'mobile' ? 'bg-white text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
            title="Mobile preview"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          className="ml-1 rounded-md p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          title="Open preview in new tab"
          onClick={() => {
            const html = generatePreview(files);
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
          }}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Inspector bar */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleInspector(!inspectorEnabled)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
              inspectorEnabled
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
            title={inspectorEnabled ? 'Disable inspector' : 'Enable element inspector'}
          >
            <MousePointer2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Inspect</span>
          </button>
          {inspectorEnabled && inspectorSelection && (
            <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs">
              <span className="font-bold text-indigo-700">&lt;{inspectorSelection.tag}&gt;</span>
              {inspectorSelection.id && (
                <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-mono text-indigo-600">#{inspectorSelection.id}</span>
              )}
              {inspectorSelection.classes.length > 0 && (
                <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-mono text-indigo-600">
                  .{inspectorSelection.classes[0]}
                </span>
              )}
              <div className="w-px h-3 bg-indigo-200" />
              <span className="text-indigo-500 tabular-nums">{inspectorSelection.width} x {inspectorSelection.height}</span>
            </div>
          )}
          {inspectorEnabled && !inspectorSelection && (
            <span className="text-[10px] text-indigo-500 animate-pulse">Click an element in the preview...</span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          {metrics.domNodes > 0 && <span>{metrics.domNodes} nodes</span>}
          {metrics.heapMB > 0 && <span className="ml-2">{metrics.heapMB} MB</span>}
        </div>
      </div>

      {/* Preview iframe — original design */}
      <div className="flex min-h-0 flex-1 justify-center overflow-auto bg-gray-50 p-4" style={{ flex: bottomOpen ? `1 1 calc(100% - ${BOTTOM_HEIGHT}px)` : '1 1 100%' }}>
        {files.length === 0 ? (
          <div className="flex w-full max-w-[460px] flex-col justify-center">
            <div className="rounded-xl border border-gray-300 bg-gray-100 p-4 shadow-2xl shadow-black/20">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                  <Monitor className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Ready for preview</p>
                  <p className="text-[11px] text-gray-500">Your generated site will render here.</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border border-gray-300 bg-white">
                <div className="flex h-7 items-center gap-1.5 border-b border-gray-200 bg-white px-3">
                  <span className="h-2 w-2 rounded-full bg-[#E5E7EB]" />
                  <span className="h-2 w-2 rounded-full bg-[#E5E7EB]" />
                  <span className="h-2 w-2 rounded-full bg-[#E5E7EB]" />
                </div>
                <div className="space-y-3 p-4">
                  <div className="h-4 w-2/5 rounded bg-gray-100" />
                  <div className="h-20 rounded bg-gray-100" />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-11 rounded bg-gray-100" />
                    <div className="h-11 rounded bg-gray-100" />
                    <div className="h-11 rounded bg-gray-100" />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-[11px] text-gray-500">
                <PlayCircle className="h-3.5 w-3.5 text-[#66D28E]" />
                Local iframe sandbox. No paid runner.
              </div>
            </div>
          </div>
        ) : (
          <div
            className="relative min-h-full overflow-hidden rounded-lg border border-gray-300 bg-white shadow-2xl shadow-black/25 transition-all duration-300"
            style={{ width: deviceWidths[device], maxWidth: '100%' }}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                <div className="w-5 h-5 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <iframe
              ref={iframeRef}
              srcDoc={srcDoc}
              sandbox="allow-scripts allow-forms"
              className="w-full h-full bg-white"
              title="Preview"
            />
          </div>
        )}
      </div>

      {/* DevTools bottom panel */}
      {bottomOpen && (
        <div className="border-t border-gray-200 bg-white flex-shrink-0" style={{ height: BOTTOM_HEIGHT }}>
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-2 flex-shrink-0">
              <div className="flex items-center">
                {tabConfig.map(tc => {
                  const Icon = tc.icon;
                  return (
                    <button
                      key={tc.tab}
                      onClick={() => setBottomTab(tc.tab)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                        bottomTab === tc.tab
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tc.label}
                      {tc.badge != null && tc.badge > 0 && (
                        <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                          {tc.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setBottomOpen(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
                title="Close panel"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              {bottomTab === 'console' && <ConsolePanel logs={logs} onClear={clearLogs} />}
              {bottomTab === 'network' && <NetworkPanel requests={network} onClear={clearNetwork} />}
              {bottomTab === 'performance' && <PerformanceMetrics metrics={metrics} onRequestMetrics={requestMetrics} />}
            </div>
          </div>
        </div>
      )}

      {/* DevTools toggle */}
      {!bottomOpen && (
        <div className="flex items-center justify-center border-t border-gray-200 bg-gray-50 py-1 flex-shrink-0">
          <button
            onClick={() => setBottomOpen(true)}
            className="flex items-center gap-2 rounded-md px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <ChevronUp className="h-3 w-3" />
            <span>DevTools</span>
            {logs.filter(l => l.level === 'error').length > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                {logs.filter(l => l.level === 'error').length}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
