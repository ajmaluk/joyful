const PENDING_PROMPT_KEY = 'joyful_pending_prompt';

export function savePendingPrompt(prompt: string) {
  sessionStorage.setItem(PENDING_PROMPT_KEY, prompt);
}

export function consumePendingPrompt() {
  const prompt = sessionStorage.getItem(PENDING_PROMPT_KEY);
  sessionStorage.removeItem(PENDING_PROMPT_KEY);
  return prompt;
}

export function hasPendingPrompt() {
  return sessionStorage.getItem(PENDING_PROMPT_KEY) !== null;
}
