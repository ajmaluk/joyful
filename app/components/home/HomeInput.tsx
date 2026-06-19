import { memo, useState } from 'react';
import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { classNames } from '~/utils/classNames';
import { ImageUpload } from './ImageUpload';
import { uploadedImages, uploadingImages, removeImage, type UploadedImage } from '~/lib/stores/images';

interface HomeInputProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement> | undefined;
  input?: string;
  isStreaming?: boolean;
  enhancingPrompt?: boolean;
  promptEnhanced?: boolean;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
  enhancePrompt?: () => void;
  handleStop?: () => void;
  mode?: 'home' | 'chat';
}

export const HomeInput = memo(
  ({
    textareaRef,
    input = '',
    isStreaming = false,
    enhancingPrompt = false,
    promptEnhanced = false,
    handleInputChange,
    sendMessage,
    enhancePrompt,
    handleStop,
    mode = 'home',
  }: HomeInputProps) => {
    const isChat = mode === 'chat';
    const TEXTAREA_MIN_HEIGHT = 28;
    const TEXTAREA_MAX_HEIGHT = isChat ? 400 : 200;

    const images = useStore(uploadedImages);
    const uploadingIds = useStore(uploadingImages);
    const [lightboxImage, setLightboxImage] = useState<UploadedImage | null>(null);

    const downloadImage = (img: UploadedImage) => {
      const link = document.createElement('a');
      link.href = img.dataUrl;
      link.download = img.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const copyImage = async (img: UploadedImage) => {
      try {
        const response = await fetch(img.dataUrl);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]);
        alert('Image copied to clipboard!');
      } catch {
        alert('Failed to copy image to clipboard.');
      }
    };

    const inputContent = (
      <div className={classNames(
        "w-full text-left border border-[var(--theme-border-subtle)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[2rem]",
        isChat ? "p-3 shadow-2xl bg-[var(--theme-bg-depth-3)] space-y-3" : "max-w-3xl mx-auto p-3 md:p-3.5 px-5 bg-[var(--theme-bg-input)]"
      )}>
        {/* Image previews and loading spinner cards at the TOP of prompt container */}
        {(images.length > 0 || uploadingIds.length > 0) && (
          <div className="flex gap-3 mb-3 flex-wrap pt-1 px-1">
            {/* Real images */}
            {images.map((image) => (
              <div key={image.id} className="relative group cursor-pointer w-14 h-14">
                <img
                  src={image.dataUrl}
                  alt={image.name}
                  onClick={() => setLightboxImage(image)}
                  className="w-14 h-14 rounded-xl object-cover border border-[var(--theme-border-subtle)] hover:opacity-90 transition-opacity"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(image.id);
                  }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-zinc-800 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-200 border border-zinc-200 shadow-md"
                  title="Remove image"
                >
                  <div className="i-ph:x text-[10px] font-bold" />
                </button>
              </div>
            ))}

            {/* Loading spinner cards */}
            {uploadingIds.map((id) => (
              <div key={id} className="w-14 h-14 rounded-xl bg-[var(--theme-bg-depth-2)]/60 border border-[var(--theme-border-subtle)] flex items-center justify-center relative shadow-sm">
                <div className="i-svg-spinners:90-ring-with-bg text-[var(--theme-text-muted)] text-lg animate-spin" />
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <div className="mb-0.5 px-1">
          <textarea
            ref={textareaRef}
            rows={1}
            className={classNames(
              "w-full bg-transparent border-none focus:ring-0 resize-none focus:outline-none p-0",
              isChat ? "text-sm text-[var(--theme-text-primary)] placeholder-[var(--theme-text-placeholder)] px-2 py-1" : "text-sm md:text-base text-[var(--theme-text-secondary)] placeholder-[var(--theme-text-placeholder-strong)] placeholder:text-sm md:placeholder:text-base"
            )}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                if (event.shiftKey) {
                  return;
                }
                event.preventDefault();
                sendMessage?.(event);
              }
            }}
            value={input}
            onChange={(event) => {
              handleInputChange?.(event);
            }}
            style={{
              minHeight: TEXTAREA_MIN_HEIGHT,
              maxHeight: TEXTAREA_MAX_HEIGHT,
              height: input ? undefined : '28px',
            }}
            placeholder={isChat ? "Ask Joyful..." : "Ask Joyful to build or edit an app..."}
            translate="no"
          />
        </div>

        {/* Input Actions Footer */}
        <div className="flex items-center justify-between mt-1">
          {/* Left side - Image upload (styled like plus button) */}
          <div className="flex items-center gap-1 sm:gap-2">
            <ImageUpload />
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-1 sm:gap-3">
            {/* Enhance button - magic wand */}
            <ClientOnly>
              {() => (
                <button
                  onClick={() => enhancePrompt?.()}
                  disabled={input.length === 0 || enhancingPrompt}
                  className={classNames(
                    'bg-transparent border-none px-2 transition-colors flex items-center justify-center',
                    enhancingPrompt
                      ? 'text-purple-400'
                      : (promptEnhanced ? 'text-bolt-elements-item-contentAccent!' : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]'),
                    (input.length === 0 || enhancingPrompt) ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer',
                  )}
                  title="Enhance prompt"
                >
                  {enhancingPrompt ? (
                    <div className="i-svg-spinners:90-ring-with-bg text-lg" />
                  ) : (
                    <div className="i-ph:magic-wand text-lg" />
                  )}
                </button>
              )}
            </ClientOnly>

            {/* Send/Stop Button */}
            <button
              className={classNames(
                'flex items-center justify-center rounded-full transition-all duration-200',
                isChat
                  ? (input.length > 0 || isStreaming
                      ? 'w-8 h-8 text-[var(--theme-text-primary)] bg-[var(--theme-hover-bg-strong)] hover:bg-[var(--theme-active-bg)] cursor-pointer'
                      : 'w-8 h-8 text-[var(--theme-text-muted)] bg-transparent hover:bg-[var(--theme-hover-bg)] cursor-not-allowed')
                  : (input.length > 0 || isStreaming
                      ? 'w-10 h-10 bg-white text-black hover:bg-zinc-200 active:scale-95 cursor-pointer shadow-md'
                      : 'w-10 h-10 bg-[var(--theme-accent-bg)] text-[var(--theme-text-muted)] cursor-not-allowed hover:bg-[var(--theme-accent-bg-hover)] shadow-md')
              )}
              onClick={(event) => {
                if (isStreaming) {
                  handleStop?.();
                  return;
                }
                sendMessage?.(event);
              }}
              disabled={input.length === 0 && !isStreaming}
            >
              {isStreaming ? (
                <div className={classNames(isChat ? 'i-ph:stop-fill text-sm' : 'i-ph:stop-fill text-lg')} />
              ) : (
                <div className={classNames(isChat ? 'i-ph:arrow-up text-sm font-bold' : 'i-ph:arrow-up text-lg font-bold')} />
              )}
            </button>
          </div>
        </div>
      </div>
    );

    return (
      <>
        {isChat ? (
          <div className="px-3 pb-3 pt-0 shrink-0 w-full flex">
            {inputContent}
          </div>
        ) : (
          inputContent
        )}

        {/* Lightbox / Modal View */}
        {lightboxImage && (
          <div 
            className="fixed inset-0 z-[999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <div 
              className="relative max-w-4xl w-full bg-[var(--theme-bg-dropdown)] rounded-2xl border border-[var(--theme-border-subtle)] overflow-hidden flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--theme-border-subtle)] bg-[var(--theme-bg-depth-1)]/20">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-[var(--theme-text-primary)] truncate">{lightboxImage.name}</h4>
                  <p className="text-xs text-[var(--theme-text-muted)]">Image</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => downloadImage(lightboxImage)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--theme-hover-bg)] hover:bg-[var(--theme-hover-bg-strong)] rounded-lg text-xs font-medium text-[var(--theme-text-primary)] transition-colors"
                  >
                    <div className="i-ph:download text-sm" /> Download
                  </button>
                  <button 
                    onClick={() => copyImage(lightboxImage)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--theme-hover-bg)] hover:bg-[var(--theme-hover-bg-strong)] rounded-lg text-xs font-medium text-[var(--theme-text-primary)] transition-colors"
                  >
                    <div className="i-ph:copy text-sm" /> Copy
                  </button>
                  <button 
                    onClick={() => setLightboxImage(null)}
                    className="p-1.5 bg-[var(--theme-hover-bg)] hover:bg-[var(--theme-hover-bg-strong)] rounded-lg text-[var(--theme-text-primary)] transition-colors ml-2"
                  >
                    <div className="i-ph:x text-base" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-[var(--theme-bg-depth-2)]/10">
                <img 
                  src={lightboxImage.dataUrl} 
                  alt={lightboxImage.name} 
                  className="max-h-[60vh] object-contain rounded-lg border border-[var(--theme-border-subtle)]"
                />
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[var(--theme-border-subtle)] text-center bg-[var(--theme-bg-depth-1)]/20">
                <p className="text-xs text-[var(--theme-text-muted)]">Draw on the image to annotate</p>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
);

HomeInput.displayName = 'HomeInput';
