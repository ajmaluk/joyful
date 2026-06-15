import { useStore } from '@nanostores/react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { IconButton } from '~/components/ui/IconButton';
import { workbenchStore } from '~/lib/stores/workbench';
import { PortDropdown } from './PortDropdown';
import { classNames } from '~/utils/classNames';

interface PreviewProps {
  deviceMode?: 'desktop' | 'tablet' | 'mobile';
}

export const Preview = memo(({ deviceMode = 'desktop' }: PreviewProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [isPortDropdownOpen, setIsPortDropdownOpen] = useState(false);
  const hasSelectedPreview = useRef(false);
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];

  const [url, setUrl] = useState('');
  const [iframeUrl, setIframeUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!activePreview) {
      setUrl('');
      setIframeUrl(undefined);

      return;
    }

    const { baseUrl } = activePreview;

    setUrl(baseUrl);
    setIframeUrl(baseUrl);
  }, [activePreview]);

  const validateUrl = useCallback(
    (value: string) => {
      if (!activePreview) {
        return false;
      }

      const { baseUrl } = activePreview;

      if (value === baseUrl) {
        return true;
      } else if (value.startsWith(baseUrl)) {
        return ['/', '?', '#'].includes(value.charAt(baseUrl.length));
      }

      return false;
    },
    [activePreview],
  );

  const findMinPortIndex = useCallback(
    (minIndex: number, preview: { port: number }, index: number, array: { port: number }[]) => {
      return preview.port < array[minIndex].port ? index : minIndex;
    },
    [],
  );

  // when previews change, display the lowest port if user hasn't selected a preview
  useEffect(() => {
    if (previews.length > 1 && !hasSelectedPreview.current) {
      const minPortIndex = previews.reduce(findMinPortIndex, 0);

      setActivePreviewIndex(minPortIndex);
    }
  }, [previews]);

  const reloadPreview = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.location.reload();
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      {isPortDropdownOpen && (
        <div className="z-iframe-overlay w-full h-full absolute" onClick={() => setIsPortDropdownOpen(false)} />
      )}
      {activePreview && (
        <div className="flex items-center gap-2 border-b border-white/10 bg-[#141418] p-3">
          <IconButton
            icon="i-ph:arrow-clockwise"
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white"
            onClick={reloadPreview}
          />
          <div className="flex flex-grow items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 focus-within:border-white/20 focus-within:bg-white/10 focus-within:text-white">
            <div className="i-ph:globe-hemisphere-west text-white/35" />
            <input
              ref={inputRef}
              className="w-full bg-transparent outline-none placeholder:text-white/20"
              type="text"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && validateUrl(url)) {
                  setIframeUrl(url);

                  if (inputRef.current) {
                    inputRef.current.blur();
                  }
                }
              }}
            />
          </div>
          {previews.length > 1 && (
            <PortDropdown
              activePreviewIndex={activePreviewIndex}
              setActivePreviewIndex={setActivePreviewIndex}
              isDropdownOpen={isPortDropdownOpen}
              setHasSelectedPreview={(value) => (hasSelectedPreview.current = value)}
              setIsDropdownOpen={setIsPortDropdownOpen}
              previews={previews}
            />
          )}
        </div>
      )}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        {activePreview ? (
          <iframe
            ref={iframeRef}
            title="Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            className={classNames(
              'border border-white/10 bg-white transition-all duration-300 shadow-2xl',
              deviceMode === 'mobile' ? 'rounded-2xl' : undefined,
              deviceMode === 'tablet' ? 'rounded-xl' : undefined,
              deviceMode === 'desktop' ? 'border-none' : undefined,
            )}
            style={{
              width: deviceMode === 'mobile' ? '375px' : deviceMode === 'tablet' ? '768px' : '100%',
              maxWidth: '100%',
              height: deviceMode === 'mobile' ? '667px' : deviceMode === 'tablet' ? '900px' : '100%',
              maxHeight: '100%',
            }}
            src={iframeUrl}
          />
        ) : null}
      </div>
    </div>
  );
});
