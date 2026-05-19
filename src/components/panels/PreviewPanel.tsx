import { useState, useEffect, useRef, useCallback } from 'react';
import { Home, RotateCcw, ExternalLink, Smartphone, Tablet, Monitor, ShieldCheck, PlayCircle } from 'lucide-react';
import type { ProjectFile } from '@/types';
import { generatePreview } from '@/services/fileSystem';

interface PreviewPanelProps {
  files: ProjectFile[];
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export function PreviewPanel({ files }: PreviewPanelProps) {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [srcDoc, setSrcDoc] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const refreshPreview = useCallback(() => {
    setIsLoading(true);
    const html = generatePreview(files);
    setSrcDoc(html);
    setTimeout(() => setIsLoading(false), 180);
  }, [files]);

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

  return (
    <div className="flex h-full min-h-0 w-full flex-col border-l border-gray-300 bg-gray-100">
      {/* Browser chrome */}
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

      {/* Preview iframe */}
      <div className="flex min-h-0 flex-1 justify-center overflow-auto bg-gray-50 p-4">
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
    </div>
  );
}
