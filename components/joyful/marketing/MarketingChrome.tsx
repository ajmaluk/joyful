"use client";

import { useVoiceInput, mergeVoiceTranscript, readImageAttachment } from './stubs';
import { useState, useEffect, useRef, useCallback, type ChangeEvent, type KeyboardEvent } from 'react';
import { ImagePlus, Loader2, Mic, Pause, ArrowUp, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ChatAttachment } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';




const promptExamples = [
  "Landing page for a SaaS startup",
  "Portfolio with dark mode",
  "Restaurant website with menu",
  "E-commerce product page",
];

interface PromptBoxProps {
  compact?: boolean;
  onSubmit?: (prompt: string, attachments?: ChatAttachment[]) => void;
}

export function PromptBox({ compact = false, onSubmit }: PromptBoxProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState('');
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [attachmentError, setAttachmentError] = useState('');
  const [placeholder, setPlaceholder] = useState(promptExamples[0]);
  const exampleIndexRef = useRef(Math.floor(Math.random() * promptExamples.length));
  const { isAuthed, isAuthReady } = useAuth();

  useEffect(() => {
    if (compact) return;
    const interval = setInterval(() => {
      exampleIndexRef.current = (exampleIndexRef.current + 1) % promptExamples.length;
      setPlaceholder(promptExamples[exampleIndexRef.current]);
    }, 3000);
    return () => clearInterval(interval);
  }, [compact]);

  const handleSubmit = () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt && !attachment) {
      textareaRef.current?.focus();
      return;
    }
    const request = trimmedPrompt || 'Use the attached image as a visual reference and build the website from it.';
    const attachments = attachment ? [attachment] : [];
    if (onSubmit) {
      onSubmit(request, attachments);
    } else if (isAuthReady) {
      if (isAuthed) {
        router.push(`/builder?prompt=${encodeURIComponent(request)}`);
      } else {
        router.push(`/login?prompt=${encodeURIComponent(request)}`);
      }
    }
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleInput = useCallback(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, compact ? 112 : 180)}px`;
  }, [compact]);

  const handleVoiceTranscript = useCallback((transcript: string) => {
    setPrompt(prev => mergeVoiceTranscript(prev, transcript));
    requestAnimationFrame(() => handleInput());
  }, [handleInput]);

  const {
    isSupported: isVoiceSupported,
    isRecording,
    isProcessing,
    toggleRecording,
  } = useVoiceInput({
    onTranscript: handleVoiceTranscript,
  });

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={`mx-auto w-full ${compact ? 'max-w-xl' : 'max-w-3xl'}`}>
      <div className="rounded-[1.15rem] border border-gray-200/80 bg-white/90 p-2.5 text-left shadow-[0_22px_70px_rgba(15,23,42,0.11)] ring-1 ring-black/5 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_26px_80px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-[#1d1f1d]/90 dark:shadow-[0_22px_70px_rgba(0,0,0,0.3)] dark:ring-black/40 dark:hover:shadow-[0_26px_80px_rgba(0,0,0,0.36)]">
        <textarea
          ref={textareaRef}
          value={prompt}
          rows={compact ? 2 : 4}
          onChange={(event) => {
            setPrompt(event.target.value);
            handleInput();
          }}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={compact ? 'Ask Joyful to create...' : placeholder}
          className={`block w-full resize-none bg-transparent px-2.5 text-left font-medium text-gray-900 outline-none placeholder:text-gray-400 dark:text-[#e7e4dc] dark:placeholder:text-gray-500 ${compact ? 'min-h-12 pt-1.5 text-xs' : 'min-h-24 pt-2.5 text-sm sm:text-base'}`}
          aria-label="Describe what you want Joyful to build"
        />
        <div className="flex items-center justify-between gap-2 pt-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              aria-label="Attach image"
              title="Attach one image"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100/80 text-gray-500 transition-all duration-200 hover:bg-gray-200 hover:text-gray-950 hover:scale-105 hover:shadow-md dark:bg-white/5 dark:text-[#aaa69d] dark:hover:bg-white/10 dark:hover:text-white"
            >
              <ImagePlus className="h-3.5 w-3.5" />
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            {attachment && (
              <div className="flex min-w-0 max-w-[150px] items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-[#d8d3ca]">
                <img src={attachment.dataUrl} alt="" className="h-5 w-5 rounded object-cover" />
                <span className="truncate">{attachment.name}</span>
                <button type="button" onClick={() => setAttachment(null)} aria-label="Remove image" className="hover:text-gray-950 dark:hover:text-white">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {attachmentError && <span className="text-[10px] font-medium text-red-500">{attachmentError}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (isProcessing) return;
                toggleRecording();
              }}
              disabled={(!isVoiceSupported && !isRecording && !isProcessing) || isProcessing}
              aria-label={isProcessing ? 'Processing voice input' : isRecording ? 'Pause recording' : isVoiceSupported ? 'Start voice input' : 'Voice input is not supported in this browser'}
              title={isProcessing ? 'Processing voice input' : isRecording ? 'Pause recording' : isVoiceSupported ? 'Start voice input' : 'Voice input is not supported in this browser'}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                isRecording
                  ? 'bg-red-500 text-white hover:bg-red-500/90'
                  : isProcessing
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-950 dark:text-[#aaa69d] dark:hover:bg-white/5 dark:hover:text-white'
              }`}
            >
              {isProcessing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isRecording ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Mic className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!prompt.trim() && !attachment}
              aria-label={(prompt.trim() || attachment) ? 'Start building' : "Can't submit an empty request"}
              title={(prompt.trim() || attachment) ? 'Start building' : "Can't submit an empty request"}
              className={`flex h-9 w-9 items-center justify-center rounded-full shadow-lg transition-transform ${
                prompt.trim() || attachment
                  ? 'bg-[#2f5bff] text-white shadow-[#2f5bff]/25 hover:scale-105'
                  : 'bg-gray-200 text-gray-500 shadow-none hover:scale-100 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white/10 dark:text-[#aaa69d]'
              }`}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


