import { ARCHITECT_SYSTEM } from './architect';
import { BUILDER_SYSTEM } from './builder';
import { DEBUGGER_SYSTEM } from './debugger';
import { REVIEWER_SYSTEM } from './reviewer';
import { EXPLORER_SYSTEM } from './explorer';
import { MEMORY_SYSTEM } from './memory';

export const PROMPTS: Record<string, string> = {
  architect: ARCHITECT_SYSTEM,
  builder: BUILDER_SYSTEM,
  debugger: DEBUGGER_SYSTEM,
  reviewer: REVIEWER_SYSTEM,
  explorer: EXPLORER_SYSTEM,
  memory: MEMORY_SYSTEM,
};

export function getSystemPrompt(mode: string, additionalContext = ''): string {
  const base = PROMPTS[mode] || PROMPTS.builder;
  if (additionalContext) {
    return `${base}\n\n## Additional Context\n${additionalContext}`;
  }
  return base;
}

export { ARCHITECT_SYSTEM } from './architect';
export { BUILDER_SYSTEM } from './builder';
export { DEBUGGER_SYSTEM } from './debugger';
export { REVIEWER_SYSTEM } from './reviewer';
export { EXPLORER_SYSTEM } from './explorer';
export { MEMORY_SYSTEM } from './memory';
