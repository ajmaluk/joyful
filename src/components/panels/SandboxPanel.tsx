import { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, Network, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import type { ProjectFile } from '@/types';
import { generatePreview } from '@/services/fileSystem';
import { SANDBOX_BRIDGE_JS } from '@/utils/sandboxBridge';
import { useSandboxMessages } from '@/hooks/useSandboxMessages';
import { SandboxToolbar, type DeviceMode } from '@/components/sandbox/SandboxToolbar';
import { ConsolePanel } from '@/components/sandbox/ConsolePanel';
import { NetworkPanel } from '@/components/sandbox/NetworkPanel';
import { PerformanceMetrics } from '@/components/sandbox/PerformanceMetrics';
import { htmlToBlobUrl, revokeBlobUrl, inlineScriptsToSrc } from '@/utils/blob';
import { ElementInspector } from '@/components/sandbox/ElementInspector';
import { useJoyfulStore } from '@/store/joyfulStore';

interface SandboxPanelProps {
  files: ProjectFile[];
}

type BottomTab = 'console' | 'network' | 'performance';

const deviceWidths: Record<DeviceMode, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 390,
  custom: 800,
};

export function SandboxPanel({ files }: SandboxPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const cleanupScriptsRef = useRef<(() => void) | null>(null);
  const delayedCleanupTimerRef = useRef<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [customWidth, setCustomWidth] = useState(800);
  const [customHeight, setCustomHeight] = useState(600);
  const [bottomTab, setBottomTab] = useState<BottomTab>('console');
  const [bottomOpen, setBottomOpen] = useState(false);
  const [bottomHeight] = useState(200);

  const storeConsoleMessages = useJoyfulStore((state) => state.consoleMessages);

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
    generatePreview(files).then(html => {
      const htmlWithBridge = html.includes('</body>')
        ? html.replace('</body>', `<script>${SANDBOX_BRIDGE_JS}</script></body>`)
        : html + `<script>${SANDBOX_BRIDGE_JS}</script>`;

      const previousCleanupScripts = cleanupScriptsRef.current;
      const previousPreviewUrl = previewUrlRef.current;
      cleanupScriptsRef.current = null;

      const url = htmlToBlobUrl(htmlWithBridge);
      previewUrlRef.current = url;
      setPreviewUrl(url);

      if (delayedCleanupTimerRef.current !== null) {
        window.clearTimeout(delayedCleanupTimerRef.current);
      }
      delayedCleanupTimerRef.current = window.setTimeout(() => {
        previousCleanupScripts?.();
        if (previousPreviewUrl) {
          revokeBlobUrl(previousPreviewUrl);
        }
      }, 1500);

      setTimeout(() => {
        setIsLoading(false);
        requestMetrics();
      }, 300);
    }).catch(() => {
      setIsLoading(false);
    });
  }, [files, requestMetrics]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshPreview();
    }, 400);
    return () => {
      clearTimeout(timer);
      if (delayedCleanupTimerRef.current !== null) {
        window.clearTimeout(delayedCleanupTimerRef.current);
      }
      cleanupScriptsRef.current?.();
      if (previewUrlRef.current) {
        revokeBlobUrl(previewUrlRef.current);
      }
    };
  }, [files, refreshPreview]);

  const handleOpenExternal = useCallback(() => {
    generatePreview(files).then(html => {
      const htmlWithBridge = html.includes('</body>')
        ? html.replace('</body>', `<script>${SANDBOX_BRIDGE_JS}</script></body>`)
        : html + `<script>${SANDBOX_BRIDGE_JS}</script>`;
      const { html: safeHtml } = inlineScriptsToSrc(htmlWithBridge);
      const blob = new Blob([safeHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    });
  }, [files]);

  const handleDeviceChange = useCallback((newDevice: DeviceMode) => {
    setDevice(newDevice);
  }, []);

  const handleCustomSizeChange = useCallback((w: number, h: number) => {
    setCustomWidth(w);
    setCustomHeight(h);
  }, []);

  const viewportWidth = device === 'custom' ? customWidth : deviceWidths[device];

  const tabConfig: { tab: BottomTab; icon: typeof Terminal; label: string; badge?: number }[] = [
    { tab: 'console', icon: Terminal, label: 'Console', badge: logs.filter(l => l.level === 'error').length || undefined },
    { tab: 'network', icon: Network, label: 'Network', badge: network.filter(r => r.pending).length || undefined },
    { tab: 'performance', icon: Activity, label: 'Perf' },
  ];

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="relative">
        <SandboxToolbar
          device={device}
          onDeviceChange={handleDeviceChange}
          customWidth={customWidth}
          customHeight={customHeight}
          onCustomSizeChange={handleCustomSizeChange}
          onRefresh={refreshPreview}
          onOpenExternal={handleOpenExternal}
          onGoHome={refreshPreview}
        />
      </div>

      {/* Inspector bar */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-gray-200 bg-white flex-shrink-0">
        <ElementInspector
          selection={inspectorSelection}
          enabled={inspectorEnabled}
          onToggle={toggleInspector}
        />
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          {metrics.domNodes > 0 && (
            <span>{metrics.domNodes} nodes</span>
          )}
          {metrics.heapMB > 0 && (
            <span className="ml-2">{metrics.heapMB} MB</span>
          )}
        </div>
      </div>

      {/* Preview area */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 justify-center overflow-auto bg-gray-50 p-4" style={{ flex: bottomOpen ? `1 1 calc(100% - ${bottomHeight}px)` : '1 1 100%' }}>
          {files.length === 0 ? (
            <div className="flex w-full max-w-[460px] flex-col justify-center">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                    <Terminal className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Advanced Sandbox Ready</p>
                    <p className="text-xs text-gray-500">Console, inspector, network, and performance tools built in.</p>
                  </div>
                </div>
                <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                  <div className="flex items-center gap-2"><Terminal className="h-3 w-3 text-gray-400" /> Console logging</div>
                  <div className="flex items-center gap-2"><Network className="h-3 w-3 text-gray-400" /> Network monitoring</div>
                  <div className="flex items-center gap-2"><Activity className="h-3 w-3 text-gray-400" /> Performance metrics</div>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="relative min-h-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl transition-all duration-300"
              style={{ width: viewportWidth, maxWidth: '100%' }}
            >
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <iframe
                ref={iframeRef}
                src={previewUrl ?? undefined}
                sandbox="allow-scripts allow-forms"
                className="w-full bg-white"
                style={{ height: device === 'custom' ? customHeight : '100%', minHeight: device === 'custom' ? customHeight : '100%' }}
                title="Sandbox preview"
              />
            </div>
          )}
        </div>

        {/* Bottom panel */}
        {bottomOpen && (
          <div className="border-t border-gray-200 bg-white flex-shrink-0" style={{ height: bottomHeight }}>
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
                {bottomTab === 'console' && <ConsolePanel logs={logs} onClear={clearLogs} systemMessages={storeConsoleMessages} />}
                {bottomTab === 'network' && <NetworkPanel requests={network} onClear={clearNetwork} />}
                {bottomTab === 'performance' && <PerformanceMetrics metrics={metrics} onRequestMetrics={requestMetrics} />}
              </div>
            </div>
          </div>
        )}

        {/* Bottom panel toggle */}
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
    </div>
  );
}
