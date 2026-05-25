"use client";


import { RefObject, useEffect } from 'react';
import type { ChatAttachment } from '@/lib/types';

export function useVoiceInput(opts: any) {
  return { isSupported: false, isRecording: false, isProcessing: false, toggleRecording: () => {} };
}
export function mergeVoiceTranscript(prev: string, curr: string) { return prev + ' ' + curr; }
export function useClickOutside(ref: RefObject<HTMLElement | null>, handler: (e: MouseEvent | TouchEvent) => void, active = true) {
  useEffect(() => {
    if (!active) return;
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, active]);
}
export async function readImageAttachment(file: File): Promise<ChatAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, dataUrl: reader.result as string, file });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
