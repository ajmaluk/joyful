const fs = require('fs');

let content = fs.readFileSync('components/joyful/marketing/MarketingChrome.tsx', 'utf8');

// Fix `@/types` to `@/lib/types`
content = content.replace(/from '@\/types'/g, "from '@/lib/types'");

// Replace state navigation
content = content.replace(/navigate\('\/builder', \{ state: \{ prompt: request, initialMode: mode, initialAttachments: attachments \} \}\);/g, "router.push(`/builder?prompt=${encodeURIComponent(request)}&mode=${mode}`);");

// Stub useVoiceInput, mergeVoiceTranscript, useClickOutside, readImageAttachment
content = `import { useVoiceInput, mergeVoiceTranscript, useClickOutside, readImageAttachment } from './stubs';\n` + content;

fs.writeFileSync('components/joyful/marketing/MarketingChrome.tsx', content);

// Create stubs file
const stubs = `
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
`;
fs.writeFileSync('components/joyful/marketing/stubs.ts', stubs);
console.log('Fixed MarketingChrome.tsx');
