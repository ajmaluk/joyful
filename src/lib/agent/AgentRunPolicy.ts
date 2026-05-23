/**
 * AgentRunPolicy — cost-aware AI call budgeting and task classification.
 *
 * Decides:
 *   - How many AI calls are allowed for a given task type
 *   - Whether planner, explorer, reviewer, memory phases need AI or can run locally
 *   - When to stop and ask the user
 */

export type TaskClass =
  | 'tiny_edit'
  | 'simple_generation'
  | 'medium_feature'
  | 'complex_feature'
  | 'bugfix'
  | 'debug_only'
  | 'review_only';

export interface AgentCallBudget {
  maxTotalCalls: number;
  maxPlannerCalls: number;
  maxExplorerCalls: number;
  maxBuilderCalls: number;
  maxDebuggerCalls: number;
  maxReviewerCalls: number;
  maxMemoryCalls: number;
}

export interface TaskClassification {
  taskClass: TaskClass;
  budget: AgentCallBudget;
  needsPlannerAI: boolean;
  needsExplorerAI: boolean;
  needsReviewerAI: boolean;
  needsMemoryAI: boolean;
  maxRepairAttempts: number;
}

const BUDGETS: Record<TaskClass, { budget: AgentCallBudget; plannerAI: boolean; explorerAI: boolean; reviewerAI: boolean; memoryAI: boolean; maxRepair: number }> = {
  tiny_edit: {
    budget: { maxTotalCalls: 1, maxPlannerCalls: 0, maxExplorerCalls: 0, maxBuilderCalls: 1, maxDebuggerCalls: 0, maxReviewerCalls: 0, maxMemoryCalls: 0 },
    plannerAI: false, explorerAI: false, reviewerAI: false, memoryAI: false, maxRepair: 0,
  },
  simple_generation: {
    budget: { maxTotalCalls: 4, maxPlannerCalls: 0, maxExplorerCalls: 0, maxBuilderCalls: 2, maxDebuggerCalls: 2, maxReviewerCalls: 0, maxMemoryCalls: 0 },
    plannerAI: false, explorerAI: false, reviewerAI: false, memoryAI: false, maxRepair: 1,
  },
  medium_feature: {
    budget: { maxTotalCalls: 4, maxPlannerCalls: 1, maxExplorerCalls: 0, maxBuilderCalls: 2, maxDebuggerCalls: 1, maxReviewerCalls: 0, maxMemoryCalls: 0 },
    plannerAI: false, explorerAI: false, reviewerAI: false, memoryAI: false, maxRepair: 2,
  },
  complex_feature: {
    budget: { maxTotalCalls: 8, maxPlannerCalls: 1, maxExplorerCalls: 1, maxBuilderCalls: 4, maxDebuggerCalls: 1, maxReviewerCalls: 1, maxMemoryCalls: 1 },
    plannerAI: true, explorerAI: false, reviewerAI: false, memoryAI: false, maxRepair: 2,
  },
  bugfix: {
    budget: { maxTotalCalls: 3, maxPlannerCalls: 0, maxExplorerCalls: 0, maxBuilderCalls: 1, maxDebuggerCalls: 2, maxReviewerCalls: 0, maxMemoryCalls: 0 },
    plannerAI: false, explorerAI: false, reviewerAI: false, memoryAI: false, maxRepair: 2,
  },
  debug_only: {
    budget: { maxTotalCalls: 3, maxPlannerCalls: 0, maxExplorerCalls: 0, maxBuilderCalls: 0, maxDebuggerCalls: 3, maxReviewerCalls: 0, maxMemoryCalls: 0 },
    plannerAI: false, explorerAI: false, reviewerAI: false, memoryAI: false, maxRepair: 3,
  },
  review_only: {
    budget: { maxTotalCalls: 1, maxPlannerCalls: 0, maxExplorerCalls: 0, maxBuilderCalls: 0, maxDebuggerCalls: 0, maxReviewerCalls: 1, maxMemoryCalls: 0 },
    plannerAI: false, explorerAI: false, reviewerAI: false, memoryAI: false, maxRepair: 0,
  },
};

export function classifyTask(userRequest: string): TaskClassification {
  const lower = userRequest.toLowerCase().trim();

  // --- tiny_edit: trivial single-line changes ---
  const tinyPatterns = [
    /^change\s+(the\s+)?(title|color|font|size|text|label|name|icon)/,
    /^rename\s+(the\s+)?(button|title|label|function|variable|component)/,
    /^make\s+it\s+(blue|red|green|bigger|smaller|bold|italic)/,
    /^update\s+(the\s+)?(text|label|heading|title)\s+(to|from)/,
    /^(fix|correct)\s+(a\s+)?(typo|spelling|grammar)/,
    /^(increase|decrease|change)\s+(padding|margin|gap|size)/,
  ];
  if (tinyPatterns.some(p => p.test(lower)) && userRequest.length < 80) {
    return buildClassification('tiny_edit');
  }

  // --- bugfix: mentions errors, bugs, crashes, broken ---
  const bugPatterns = /(error|bug|crash|broken|wrong|incorrect|not working|failing|doesn't work|issue|problem|fix|repair)/i;
  if (bugPatterns.test(lower) && lower.length < 200) {
    return buildClassification('bugfix');
  }

  // --- debug_only: if user only says "compile error" or "fix errors" with no feature request ---
  if (/^(compile|build|syntax)\s*(error|fail)/i.test(lower) || /^fix\s+(the\s+)?(compile|build)\s*(error|issue)/i.test(lower)) {
    return buildClassification('debug_only');
  }

  // --- review_only: user wants review, not changes ---
  if (/^(review|audit|check|inspect)\s/i.test(lower) && !/(create|build|add|implement|make|write)/i.test(lower)) {
    return buildClassification('review_only');
  }

  // --- simple_generation: small creation prompts ---
  if (
    /^(create|build|make|generate)\s+(a\s+)?(simple|basic|small|tiny|minimal)/i.test(lower) ||
    (/^(create|build|make|generate)\s/i.test(lower) && userRequest.length < 150)
  ) {
    return buildClassification('simple_generation');
  }

  // --- medium_feature: multi-file changes with moderate scope ---
  if (userRequest.length < 300) {
    return buildClassification('medium_feature');
  }

  // --- complex_feature: everything else large ---
  return buildClassification('complex_feature');
}

function buildClassification(taskClass: TaskClass): TaskClassification {
  const cfg = BUDGETS[taskClass];
  return {
    taskClass,
    budget: { ...cfg.budget },
    needsPlannerAI: cfg.plannerAI,
    needsExplorerAI: cfg.explorerAI,
    needsReviewerAI: cfg.reviewerAI,
    needsMemoryAI: cfg.memoryAI,
    maxRepairAttempts: cfg.maxRepair,
  };
}

/**
 * Hash a prompt + message combo for duplicate detection.
 */
export function hashPrompt(systemPrompt: string, messages: { role: string; content: string }[]): string {
  let hash = 5381;
  const input = systemPrompt + '|' + messages.map(m => m.role + ':' + m.content).join('||');
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Quick token estimation (rough, for display / logging).
 */
export function estimateTokens(text: string): number {
  return Math.ceil((text.length || 0) / 4);
}
