import { memo, useState, useEffect } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { IconButton } from '~/components/ui/IconButton';
import { classNames } from '~/utils/classNames';
import { ImageUpload } from './ImageUpload';
import { uploadedImages, uploadingImages, removeImage, type UploadedImage } from '~/lib/stores/images';

interface HeroSectionProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement> | undefined;
  input?: string;
  isStreaming?: boolean;
  enhancingPrompt?: boolean;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
  enhancePrompt?: () => void;
  handleStop?: () => void;
}

export const HeroSection = memo(
  ({
    textareaRef,
    input = '',
    isStreaming = false,
    enhancingPrompt = false,
    handleInputChange,
    sendMessage,
    enhancePrompt,
    handleStop,
  }: HeroSectionProps) => {
    const TEXTAREA_MIN_HEIGHT = 28;
    const TEXTAREA_MAX_HEIGHT = 200;

    const [images, setImages] = useState<UploadedImage[]>([]);
    const [uploadingIds, setUploadingIds] = useState<string[]>([]);
    const [lightboxImage, setLightboxImage] = useState<UploadedImage | null>(null);

    useEffect(() => {
      const unsub1 = uploadedImages.subscribe((val) => {
        setImages([...val]);
      });
      const unsub2 = uploadingImages.subscribe((val) => {
        setUploadingIds([...val]);
      });
      return () => {
        unsub1();
        unsub2();
      };
    }, []);

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

    return (
      <section className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto px-4 sm:px-6 text-center my-6 md:my-10">
        {/* Heading - Pure white bold title to match screenshot exactly */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white mb-10 tracking-tight max-w-full px-2 drop-shadow-sm whitespace-nowrap">
          Build something Joyful
        </h1>

        {/* Prompt Input Area - matches prompt-container in HTML */}
        <div className="w-full max-w-3xl mx-auto rounded-[2rem] p-3 md:p-3.5 px-5 text-left bg-[#181816] border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
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
                    className="w-14 h-14 rounded-xl object-cover border border-white/5 hover:opacity-90 transition-opacity"
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
                <div key={id} className="w-14 h-14 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-center relative shadow-sm">
                  <div className="i-svg-spinners:90-ring-with-bg text-zinc-400 text-lg animate-spin" />
                </div>
              ))}
            </div>
          )}

          {/* Textarea */}
          <div className="mb-0.5 px-1">

            <textarea
              ref={textareaRef}
              rows={1}
              className="w-full bg-transparent border-none focus:ring-0 text-sm md:text-base text-zinc-300 resize-none placeholder-zinc-500 placeholder:text-sm md:placeholder:text-base focus:outline-none p-0 h-[28px]"
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
              placeholder="Ask Lovable to make a document that..."
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
                      'bg-transparent border-none text-gray-400 hover:text-white px-2 transition-colors flex items-center justify-center',
                      enhancingPrompt
                        ? 'text-purple-400'
                        : 'text-zinc-400 hover:text-white',
                      (input.length === 0 || enhancingPrompt) ? 'opacity-35 cursor-not-allowed' : '',
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
                  'w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 shadow-md',
                  input.length > 0 || isStreaming
                    ? 'bg-white text-black hover:bg-zinc-200 active:scale-95 cursor-pointer'
                    : 'bg-white/10 text-gray-400 cursor-not-allowed hover:bg-white/20',
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
                  <div className="i-ph:stop-fill text-lg" />
                ) : (
                  <div className="i-ph:arrow-up text-lg font-bold" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Lightbox / Modal View */}
        {lightboxImage && (
          <div 
            className="fixed inset-0 z-[999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <div 
              className="relative max-w-4xl w-full bg-[#18181c] rounded-2xl border border-white/5 overflow-hidden flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-950/20">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate">{lightboxImage.name}</h4>
                  <p className="text-xs text-zinc-500">Image</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => downloadImage(lightboxImage)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-white transition-colors"
                  >
                    <div className="i-ph:download text-sm" /> Download
                  </button>
                  <button 
                    onClick={() => copyImage(lightboxImage)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-white transition-colors"
                  >
                    <div className="i-ph:copy text-sm" /> Copy
                  </button>
                  <button 
                    onClick={() => setLightboxImage(null)}
                    className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors ml-2"
                  >
                    <div className="i-ph:x text-base" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-black/10">
                <img 
                  src={lightboxImage.dataUrl} 
                  alt={lightboxImage.name} 
                  className="max-h-[60vh] object-contain rounded-lg border border-white/5"
                />
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/5 text-center bg-zinc-950/20">
                <p className="text-xs text-zinc-400">Draw on the image to annotate</p>
              </div>
            </div>
          </div>
        )}
        {/* Spacer to balance the heading height and center the input container */}
        <div className="h-[76px] md:h-[100px] w-full" aria-hidden="true" />
      </section>
    );
  },
);

HeroSection.displayName = 'HeroSection';
