import { useState } from 'react';
import { Monitor, Tablet, Smartphone, RotateCcw, ExternalLink, Home, RefreshCw, Maximize2 } from 'lucide-react';

export type DeviceMode = 'desktop' | 'tablet' | 'mobile' | 'custom';

interface SandboxToolbarProps {
  device: DeviceMode;
  onDeviceChange: (device: DeviceMode) => void;
  customWidth: number;
  customHeight: number;
  onCustomSizeChange: (width: number, height: number) => void;
  onRefresh: () => void;
  onOpenExternal: () => void;
  onGoHome: () => void;
}

const devices: { mode: DeviceMode; icon: typeof Monitor; label: string; width: number }[] = [
  { mode: 'desktop', icon: Monitor, label: 'Desktop (1280px)', width: 1280 },
  { mode: 'tablet', icon: Tablet, label: 'Tablet (768px)', width: 768 },
  { mode: 'mobile', icon: Smartphone, label: 'Mobile (390px)', width: 390 },
];

export function SandboxToolbar({
  device,
  onDeviceChange,
  customWidth,
  customHeight,
  onCustomSizeChange,
  onRefresh,
  onOpenExternal,
  onGoHome,
}: SandboxToolbarProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [tempWidth, setTempWidth] = useState(customWidth.toString());
  const [tempHeight, setTempHeight] = useState(customHeight.toString());

  const handleRotate = () => {
    if (device === 'custom') {
      onCustomSizeChange(customHeight, customWidth);
      setTempWidth(customHeight.toString());
      setTempHeight(customWidth.toString());
    }
  };

  const handleCustomApply = () => {
    const w = parseInt(tempWidth, 10);
    const h = parseInt(tempHeight, 10);
    if (w > 0 && h > 0) {
      onCustomSizeChange(w, h);
      onDeviceChange('custom');
      setShowCustomInput(false);
    }
  };

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
      <div className="flex items-center gap-1">
        <button
          onClick={onGoHome}
          className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          title="Home"
        >
          <Home className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onRefresh}
          className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          title="Refresh preview"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Address bar */}
      <div className="flex-1 mx-3 min-w-0">
        <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1">
          <Home className="h-3 w-3 text-gray-400" />
          <span className="truncate text-xs text-gray-600">local-sandbox:/</span>
          <span className="ml-auto hidden items-center gap-1 text-[10px] text-green-600 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Safe preview
          </span>
        </div>
      </div>

      {/* Device toggle */}
      <div className="flex items-center gap-0.5">
        {devices.map(d => {
          const Icon = d.icon;
          return (
            <button
              key={d.mode}
              onClick={() => { onDeviceChange(d.mode); setShowCustomInput(false); }}
              className={`rounded-md p-1.5 transition-colors ${device === d.mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
              title={d.label}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })}
        <button
          onClick={() => setShowCustomInput(!showCustomInput)}
          className={`rounded-md p-1.5 transition-colors ${device === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
          title="Custom viewport"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleRotate}
          className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          title="Rotate viewport"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {showCustomInput && (
        <div className="absolute right-12 top-12 z-50 rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <input
              name="viewport-width"
              type="number"
              value={tempWidth}
              onChange={e => setTempWidth(e.target.value)}
              className="w-20 rounded border border-gray-200 px-2 py-1 text-xs text-gray-900"
              placeholder="Width"
              min="100"
            />
            <span className="text-xs text-gray-400">x</span>
            <input
              name="viewport-height"
              type="number"
              value={tempHeight}
              onChange={e => setTempHeight(e.target.value)}
              className="w-20 rounded border border-gray-200 px-2 py-1 text-xs text-gray-900"
              placeholder="Height"
              min="100"
            />
          </div>
          <button
            onClick={handleCustomApply}
            className="w-full rounded bg-indigo-500 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-600"
          >
            Apply
          </button>
        </div>
      )}

      <button
        className="ml-1 rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
        title="Open preview in new tab"
        onClick={onOpenExternal}
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
