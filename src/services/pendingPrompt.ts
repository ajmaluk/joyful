import type { ChatAttachment, ChatMode } from '@/types';

const PENDING_PROMPT_KEY = 'joyful_pending_prompt';

interface PendingPromptData {
  prompt: string;
  mode: ChatMode;
  attachments?: ChatAttachment[];
}

export function savePendingPrompt(prompt: string, mode: ChatMode = 'build', attachments?: ChatAttachment[]) {
  const data: PendingPromptData = { prompt, mode, attachments };
  try {
    sessionStorage.setItem(PENDING_PROMPT_KEY, JSON.stringify(data));
  } catch {
    sessionStorage.setItem(PENDING_PROMPT_KEY, JSON.stringify({ prompt, mode }));
  }
}

export function consumePendingPrompt(): string | null {
  const raw = sessionStorage.getItem(PENDING_PROMPT_KEY);
  sessionStorage.removeItem(PENDING_PROMPT_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as PendingPromptData;
    return data.prompt || null;
  } catch {
    return raw || null;
  }
}

export function consumePendingPromptFull(): PendingPromptData | null {
  const raw = sessionStorage.getItem(PENDING_PROMPT_KEY);
  sessionStorage.removeItem(PENDING_PROMPT_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as PendingPromptData;
    return { prompt: data.prompt, mode: data.mode || 'build', attachments: data.attachments };
  } catch {
    return { prompt: raw, mode: 'build' };
  }
}

export function hasPendingPrompt() {
  return sessionStorage.getItem(PENDING_PROMPT_KEY) !== null;
}
