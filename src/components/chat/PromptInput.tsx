import { useState, useRef, useCallback, useEffect, type ChangeEvent } from 'react';
import { ArrowUp, ChevronDown, ImagePlus, Loader2, ListChecks, Mic, Pause, Square, Wand2, X } from 'lucide-react';
import type { ChatAttachment, ChatMode } from '@/types';
import { mergeVoiceTranscript, useVoiceInput } from '@/hooks/useVoiceInput';
import { useClickOutside } from '@/hooks/useClickOutside';
import { readImageAttachment } from '@/services/attachments';

interface PromptInputProps {
  onSend: (content: string, mode?: ChatMode, attachments?: ChatAttachment[]) => void;
  disabled?: boolean;
  placeholder?: string;
  onCancel?: () => void;
  isGenerating?: boolean;
  mode?: ChatMode;
  onModeChange?: (mode: ChatMode) => void;
  externalContext?: string;
}

const modeOptions: Array<{ value: ChatMode; label: string; hint: string; icon: typeof Wand2 }> = [
  { value: 'build', label: 'Build', hint: 'Apply file changes', icon: Wand2 },
  { value: 'plan', label: 'Plan', hint: 'Review approach first', icon: ListChecks },
];

export function PromptInput({
  onSend,
  disabled,
  placeholder = 'Ask Joyful to create a prototype...',
  onCancel,
  isGenerating,
  mode = 'build',
  onModeChange,
  externalContext,
}: PromptInputProps) {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [attachmentError, setAttachmentError] = useState('');
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const lastExternalContextRef = useRef<string | null>(null);
  const activeMode = modeOptions.find(option => option.value === mode) || modeOptions[0];
  const ActiveIcon = activeMode.icon;

  useClickOutside(modeMenuRef, () => setModeMenuOpen(false), modeMenuOpen);

  const handleTextareaInput = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, []);

  useEffect(() => {
    const context = externalContext?.trim();
    if (!context || lastExternalContextRef.current === context) return;
    lastExternalContextRef.current = context;
    setInput(prev => prev.trim() ? `${prev.trim()}\n\n${context}` : context);
    requestAnimationFrame(() => {
      handleTextareaInput();
      textareaRef.current?.focus();
    });
  }, [externalContext, handleTextareaInput]);

  const appendTranscript = useCallback((transcript: string) => {
    setInput(prev => mergeVoiceTranscript(prev, transcript));
    requestAnimationFrame(() => handleTextareaInput());
  }, [handleTextareaInput]);

  const {
    isSupported: isVoiceSupported,
    isRecording,
    isProcessing,
    toggleRecording,
  } = useVoiceInput({
    onTranscript: appendTranscript,
  });

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed && !attachment) {
      textareaRef.current?.focus();
      return;
    }
    if (disabled) return;
    const content = trimmed || 'Use the attached image as a visual reference and build or update the project accordingly.';
    setPromptHistory(prev => [content, ...prev.slice(0, 49)]);
    setHistoryIndex(-1);
    onSend(content, mode, attachment ? [attachment] : []);
    setInput('');
    setAttachment(null);
    setAttachmentError('');
    setModeMenuOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, attachment, disabled, onSend, mode]);

  const handleImageChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setAttachment(await readImageAttachment(file));
      setAttachmentError('');
    } catch (error) {
      setAttachment(null);
      setAttachmentError(error instanceof Error ? error.message : 'Could not attach that image.');
    } finally {
      event.target.value = '';
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
      return;
    }
    if (e.key === 'Escape') {
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      return;
    }
    if (e.key === 'ArrowUp' && !input && promptHistory.length > 0) {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, promptHistory.length - 1);
      setHistoryIndex(newIndex);
      setInput(promptHistory[newIndex]);
      return;
    }
    if (e.key === 'ArrowDown' && historyIndex >= 0) {
      e.preventDefault();
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setInput(newIndex >= 0 ? promptHistory[newIndex] : '');
    }
  }, [handleSend, input, promptHistory, historyIndex]);

  const charCount = input.length;
  const trimmedInput = input.trim();
  const canSend = Boolean(trimmedInput || attachment) && !disabled && !isGenerating;
  const sendButtonLabel = isGenerating
    ? 'Generating'
    : canSend
      ? mode === 'plan'
        ? 'Create implementation plan'
        : 'Start building'
      : "Can't submit an empty request";
  const voiceButtonLabel = isProcessing
    ? 'Processing voice input'
    : isRecording
      ? 'Pause recording'
      : isVoiceSupported
        ? 'Start voice input'
        : 'Voice input is not supported in this browser';

  return (
    <div className="relative z-30 min-w-0 overflow-visible border-t border-border bg-background px-4 py-4">
      <div className="relative flex min-w-0 flex-col overflow-visible rounded-2xl border border-border bg-card p-3 text-left shadow-sm transition-colors duration-200 focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/15">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); handleTextareaInput(); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={2}
          disabled={disabled}
          aria-label="Describe what you want Joyful to build"
          className="min-h-16 max-h-[120px] resize-none bg-transparent px-2 pt-1 text-left text-sm font-medium leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
        <div className="flex items-center justify-between gap-3 pt-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isGenerating}
              aria-label="Attach image"
              title="Attach one image"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            {attachment && (
              <div className="flex min-w-0 max-w-[180px] items-center gap-1.5 rounded-full border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground">
                <img src={attachment.dataUrl} alt="" className="h-5 w-5 rounded object-cover" />
                <span className="truncate">{attachment.name}</span>
                <button type="button" onClick={() => setAttachment(null)} aria-label="Remove image" className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {attachmentError && <span className="text-[10px] text-red-500">{attachmentError}</span>}
          </div>
          <div className="flex items-center gap-2">
            {isGenerating && onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/10"
              >
                <Square className="h-3 w-3" />
                Stop
              </button>
            ) : (
              <>
                <div ref={modeMenuRef} className="relative hidden overflow-visible sm:block">
                  <button
                    type="button"
                    onClick={() => setModeMenuOpen(prev => !prev)}
                    disabled={disabled || isRecording || isProcessing}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                    aria-haspopup="menu"
                    aria-expanded={modeMenuOpen}
                  >
                    <ActiveIcon className="h-3.5 w-3.5 text-primary" />
                    {activeMode.label}
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  {modeMenuOpen && (
                    <div className="absolute bottom-full right-0 z-[100] mb-2 w-56 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-2xl shadow-black/30">
                      {modeOptions.map((option) => {
                        const Icon = option.icon;
                        const selected = option.value === mode;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              onModeChange?.(option.value);
                              setModeMenuOpen(false);
                            }}
                            className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                              selected ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                            }`}
                          >
                            <Icon className="mt-0.5 h-3.5 w-3.5 text-primary" />
                            <span className="min-w-0">
                              <span className="block text-xs font-semibold">{option.label}</span>
                              <span className="block text-[10px] leading-snug text-muted-foreground">{option.hint}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isProcessing) return;
                    if (isRecording) {
                      toggleRecording();
                      return;
                    }
                    toggleRecording();
                  }}
                  disabled={(!isVoiceSupported && !isRecording && !isProcessing) || isProcessing || (disabled && !isRecording)}
                  aria-label={voiceButtonLabel}
                  title={voiceButtonLabel}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    isRecording
                      ? 'bg-red-500 text-white hover:bg-red-500/90'
                      : isProcessing
                        ? 'bg-secondary text-secondary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isRecording ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!canSend && !isGenerating}
                  aria-label={sendButtonLabel}
                  title={sendButtonLabel}
                  className={`flex h-9 w-9 items-center justify-center rounded-full shadow-lg transition-transform ${
                    isGenerating
                      ? 'bg-red-500 text-white shadow-red-500/20 hover:scale-105'
                      : canSend
                        ? 'bg-primary text-primary-foreground shadow-primary/20 hover:scale-105'
                        : 'bg-secondary text-secondary-foreground shadow-none hover:scale-100 disabled:cursor-not-allowed disabled:opacity-70'}
                  `}
                >
                  {isGenerating ? <Square className="h-3.5 w-3.5" /> : <ArrowUp className="h-4 w-4" />}
                </button>
              </>
            )}
            {charCount > 0 && (
              <span className={`hidden text-[10px] sm:inline ${charCount > 500 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                {charCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
