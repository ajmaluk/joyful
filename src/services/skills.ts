import type { ChatAttachment, ProjectFile, UserSkill } from '@/types';
import * as storage from '@/services/storage';
import { QualityGateOrchestrator, qualityGates } from '@/services/agentRuntime';

const skillDocModules = import.meta.glob('/skills/**/SKILL.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

export interface BuilderSkill {
  id: string;
  name: string;
  description: string;
  instructions: string;
  keywords: string[];
  sourcePath: string;
}

export const defaultBuilderSkills: BuilderSkill[] = [
  {
    id: 'react-product-architecture',
    name: 'React Product Architecture',
    description: 'Prefer maintainable React/Vite structures, component boundaries, and reusable state patterns.',
    instructions: 'Create production-ready React apps by default with clear component structure, predictable state, and framework-friendly file paths.',
    keywords: ['react', 'vite', 'component', 'state', 'app', 'website', 'dashboard', 'route', 'architecture'],
    sourcePath: 'skills/react-product-architecture/SKILL.md',
  },
  {
    id: 'file-context-graph',
    name: 'File Context Graph',
    description: 'Read the smallest useful file set before editing and include dependency neighbors.',
    instructions: 'Rank files by prompt relevance, entry-point importance, imports, styling links, and likely runtime impact before making changes.',
    keywords: ['read', 'file', 'context', 'inspect', 'modify', 'fix', 'bug', 'refactor', 'existing'],
    sourcePath: 'skills/file-context-graph/SKILL.md',
  },
  {
    id: 'code-review-pass',
    name: 'Code Review Pass',
    description: 'Check edits for runtime errors, broken references, preview failures, and missing states.',
    instructions: 'After each build, review changed files for syntax, imports, UI regressions, empty states, responsiveness, and preview compatibility.',
    keywords: ['review', 'test', 'fix', 'error', 'runtime', 'preview', 'bug', 'validate', 'lint', 'build'],
    sourcePath: 'skills/code-review-pass/SKILL.md',
  },
  {
    id: 'responsive-ui-polish',
    name: 'Responsive UI Polish',
    description: 'Keep layouts clean, professional, accessible, and stable across viewport sizes.',
    instructions: 'Use consistent spacing, readable contrast, responsive constraints, keyboard-friendly controls, and no overlapping UI.',
    keywords: ['responsive', 'mobile', 'design', 'ui', 'layout', 'polish', 'accessibility', 'style', 'page'],
    sourcePath: 'skills/responsive-ui-polish/SKILL.md',
  },
  {
    id: 'vision-reference',
    name: 'Vision Reference',
    description: 'Use attached screenshots, mockups, and visual references when the request includes an image.',
    instructions: 'When an image is attached, inspect it as visual product context. Mention visible layout, styling, content, and defects that influence the generated files. Do not claim pixel-perfect certainty when details are ambiguous.',
    keywords: ['image', 'screenshot', 'mockup', 'visual', 'reference', 'photo', 'upload', 'vision'],
    sourcePath: 'skills/vision-reference/SKILL.md',
  },
  {
    id: 'accessibility-audit',
    name: 'Accessibility Audit',
    description: 'Check keyboard support, semantic structure, contrast, focus states, and screen-reader readiness.',
    instructions: 'Prefer semantic HTML, labeled controls, visible focus states, correct heading order, sufficient contrast, and accessible empty or error states.',
    keywords: ['accessibility', 'a11y', 'keyboard', 'contrast', 'aria', 'screen reader', 'focus', 'semantic', 'wcag'],
    sourcePath: 'skills/accessibility-audit/SKILL.md',
  },
  {
    id: 'testing-workflow',
    name: 'Testing Workflow',
    description: 'Push the AI to validate behavior with build, lint, and preview-safe checks.',
    instructions: 'Add or preserve the smallest meaningful verification path, including build, lint, and user-flow checks when changes affect behavior.',
    keywords: ['test', 'testing', 'build', 'lint', 'qa', 'verify', 'validation', 'preview', 'workflow'],
    sourcePath: 'skills/testing-workflow/SKILL.md',
  },
  {
    id: 'performance-budget',
    name: 'Performance Budget',
    description: 'Keep the AI aware of render cost, bundle size, image weight, and avoidable rerenders.',
    instructions: 'Favor lightweight components, avoid unnecessary rerenders, keep asset payloads reasonable, and call out obvious performance tradeoffs in generated work.',
    keywords: ['performance', 'speed', 'bundle', 'rerender', 'render', 'lighthouse', 'budget', 'lazy load', 'optimize'],
    sourcePath: 'skills/performance-budget/SKILL.md',
  },
  {
    id: 'design-system-consistency',
    name: 'Design System Consistency',
    description: 'Keep the generated UI visually coherent with reusable tokens, spacing, and component patterns.',
    instructions: 'Preserve a consistent visual language across sections, reuse shared component patterns, and avoid one-off styling that breaks the product system.',
    keywords: ['design system', 'tokens', 'consistency', 'brand', 'components', 'spacing', 'typography', 'visual language', 'theme'],
    sourcePath: 'skills/design-system-consistency/SKILL.md',
  },
  {
    id: 'web-development-master',
    name: 'Web Development Master',
    description: 'Plan, build, check, repeat — full lifecycle web development with UI testing, task management, memory, and quality gates.',
    instructions: 'Orchestrate end-to-end web development: plan architecture and component tree, build with React/Tailwind/shadcn, verify with build/lint/preview/UI checks, then iterate until all quality gates pass.',
    keywords: ['website', 'webapp', 'app', 'web development', 'build', 'develop', 'create', 'complex', 'full stack', 'plan', 'architect', 'orchestrate', 'quality', 'test', 'verify', 'iterate', 'polish', 'fix', 'debug', 'pwa', 'dashboard', 'landing', 'ecommerce', 'saas', 'multi page', 'responsive', 'typescript', 'react', 'tailwind', 'component', 'page', 'route', 'feature', 'frontend', 'fullstack'],
    sourcePath: 'skills/web-development-master/SKILL.md',
  },
];

export function getActiveUserSkills(): UserSkill[] {
  return storage.getUserSkills().filter(skill => skill.enabled);
}

export function getSkillManifest() {
  const userSkills = getActiveUserSkills();
  return [
    ...defaultBuilderSkills.map(skill => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      sourcePath: skill.sourcePath,
      builtIn: true,
    })),
    ...userSkills.map(skill => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      sourcePath: `localStorage:user-skills/${skill.id}`,
      builtIn: false,
    })),
  ];
}

function getSkillDoc(sourcePath: string) {
  return skillDocModules[`/${sourcePath}`]?.trim() || '';
}

function scoreSkill(skill: BuilderSkill | UserSkill, promptTokens: Set<string>, attachments: ChatAttachment[], files: ProjectFile[]) {
  const lowerPrompt = Array.from(promptTokens).join(' ');
  const haystack = `${skill.name} ${skill.description} ${'keywords' in skill ? skill.keywords.join(' ') : ''}`.toLowerCase();
  let score = 0;

  for (const token of promptTokens) {
    if (haystack.includes(token)) score += 3;
  }

  if (attachments.length > 0 && /vision|image|screenshot|mockup|visual|reference/.test(haystack)) score += 50;
  if (files.length > 0 && /file|context|review|fix|modify|existing/.test(haystack)) score += 8;
  if (/build|create|website|app|page|dashboard|react|vite/.test(lowerPrompt) && /react|architecture|ui|responsive/.test(haystack)) score += 8;
  if (/fix|bug|error|broken|issue|console|runtime|lint|build/.test(lowerPrompt) && /review|context|file|runtime|preview/.test(haystack)) score += 12;
  if (/accessibility|a11y|keyboard|contrast|aria|screen reader/.test(lowerPrompt) && /accessibility|a11y|keyboard|contrast|aria|screen reader/.test(haystack)) score += 12;
  if (/test|testing|qa|validate|verify|lint|preview|build/.test(lowerPrompt) && /test|testing|qa|validate|verify|lint|preview|build/.test(haystack)) score += 12;
  if (/performance|speed|bundle|rerender|lighthouse|optimize|lazy load/.test(lowerPrompt) && /performance|speed|bundle|rerender|lighthouse|optimize/.test(haystack)) score += 12;
  if (/design|system|brand|token|typography|visual|consistency/.test(lowerPrompt) && /design system|design|system|brand|token|typography|consistency/.test(haystack)) score += 10;

  // Web Development Master — trigger on build/development requests
  if (/build|develop|create|make|website|app|page|web|site|component|feature|dashboard|landing|ecommerce|saas|complex|full.?stack|frontend|ui|interface/.test(lowerPrompt) && /web.?development|build|develop|create|complex|full.?stack|orchestrat|plan|architect/.test(haystack)) score += 15;
  if (/fix|bug|error|broken|issue|console|runtime|lint|type.?error|crash|not working/.test(lowerPrompt) && /fix|debug|verif|quality|test|check|iterate/.test(haystack)) score += 15;
  if (/plan|architect|design|structure|organize|scaffold|organize/.test(lowerPrompt) && /plan|architect|structure|component.?tree/.test(haystack)) score += 18;
  if (/test|verify|check|qa|quality|build|lint|validate|preview|ui.?test|responsive/.test(lowerPrompt) && /verif|check|quality|test|build|lint|preview/.test(haystack)) score += 18;

  return score;
}

export function selectSkillsForPrompt(
  prompt: string,
  files: ProjectFile[] = [],
  attachments: ChatAttachment[] = [],
  limit = 4,
) {
  const promptTokens = tokenize(prompt);
  const userSkills = getActiveUserSkills();
  const builtInMatches = defaultBuilderSkills
    .map(skill => ({ skill, score: scoreSkill(skill, promptTokens, attachments, files) }))
    .filter(item => item.score > 0);
  const userMatches = userSkills
    .map(skill => ({ skill, score: scoreSkill(skill, promptTokens, attachments, files) }))
    .filter(item => item.score > 0);

  const selected = [...builtInMatches, ...userMatches]
    .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name))
    .slice(0, Math.max(1, limit))
    .map(item => item.skill);

  if (selected.length === 0) {
    return defaultBuilderSkills.slice(0, 2);
  }

  return selected;
}

export function getSkillBrief(prompt: string, files: ProjectFile[] = [], attachments: ChatAttachment[] = []) {
  return selectSkillsForPrompt(prompt, files, attachments).map(skill => {
    const doc = 'sourcePath' in skill ? getSkillDoc(skill.sourcePath) : '';
    const content = doc || skill.instructions;
    return `## ${skill.name}\n${content}`;
  });
}

export function buildJoyfulManifestMarkdown() {
  const lines = [
    '# Joyful Agent Manifest',
    '',
    'Joyful keeps a lightweight skill manifest in the system context and activates full skill instructions only when a request needs them.',
    '',
    '## Available skills',
    '',
    ...getSkillManifest().map(skill => `- ${skill.name} (${skill.id}): ${skill.description} [${skill.sourcePath}]`),
  ];
  return lines.join('\n');
}

export interface ContextFileNode {
  path: string;
  score: number;
  reason: string;
}

function tokenize(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9_/.-]+/g, ' ')
      .split(/\s+/)
      .filter(Boolean),
  );
}

function dependencyReason(file: ProjectFile, allFiles: ProjectFile[]) {
  const reasons: string[] = [];
  if (/package\.json$/.test(file.path)) reasons.push('framework and scripts');
  if (/src\/(main|app|page)\.(jsx|tsx|js|ts)$/i.test(file.path)) reasons.push('application entry point');
  if (/\.(css|scss)$/i.test(file.path)) reasons.push('shared styling surface');
  if (/index\.html$/i.test(file.path)) reasons.push('preview shell');

  const importsThisFile = allFiles.some(other => {
    if (other.path === file.path) return false;
    const baseName = file.path.split('/').pop()?.replace(/\.[^.]+$/, '');
    return Boolean(baseName && new RegExp(`from ['"].*${baseName}|import ['"].*${baseName}|href=['"].*${file.path}`, 'i').test(other.content));
  });
  if (importsThisFile) reasons.push('referenced by another file');

  return reasons;
}

// ── Skill Composition Engine ──────────────────────────────────────

export interface ComposedSkill {
  id: string;
  skills: BuilderSkill[];
  priority: number;
  conflictActions: ('override' | 'merge' | 'skip')[];
}

/**
 * Compose multiple skills together, detecting conflicts and resolving them.
 */
export function composeSkills(
  selectedSkills: BuilderSkill[],
  prompt: string,
): ComposedSkill[] {
  void prompt;
  const composed: ComposedSkill[] = [];

  // Group related skills
  const groups: Record<string, string[]> = {
    frontend: ['web-development-master', 'react-product-architecture', 'responsive-ui-polish', 'design-system-consistency'],
    validation: ['code-review-pass', 'testing-workflow', 'accessibility-audit', 'performance-budget'],
    context: ['file-context-graph', 'vision-reference'],
  };

  const assigned = new Set<string>();

  // Assign skills to groups
  for (const [groupName, skillIds] of Object.entries(groups)) {
    const groupSkills = skillIds
      .map(id => selectedSkills.find(s => s.id === id))
      .filter(Boolean) as BuilderSkill[];

    if (groupSkills.length > 0) {
      composed.push({
        id: `composed_${groupName}`,
        skills: groupSkills,
        priority: groupName === 'frontend' ? 1 : groupName === 'validation' ? 2 : 3,
        conflictActions: groupSkills.map(s => s.id === 'web-development-master' ? 'override' : 'merge'),
      });
      groupSkills.forEach(s => assigned.add(s.id));
    }
  }

  // Any remaining skills not in groups
  const remaining = selectedSkills.filter(s => !assigned.has(s.id));
  if (remaining.length > 0) {
    composed.push({
      id: `composed_remaining`,
      skills: remaining,
      priority: 4,
      conflictActions: remaining.map(() => 'merge' as const),
    });
  }

  return composed.sort((a, b) => a.priority - b.priority);
}

/**
 * Merge skill instructions into a cohesive brief.
 */
export function mergeSkillBriefs(
  composedSkills: ComposedSkill[],
  prompt: string,
): string[] {
  void prompt;
  const merged: string[] = [];

  for (const group of composedSkills) {
    if (group.skills.length === 0) continue;

    // The highest-priority skill in the group provides the main instruction
    const primary = group.skills[0];
    const doc = 'sourcePath' in primary ? getSkillDoc(primary.sourcePath) : '';
    const mainContent = doc || primary.instructions;

    // Secondary skills provide supplementary constraints
    const supplements = group.skills.slice(1).map(s => {
      const doc2 = 'sourcePath' in s ? getSkillDoc(s.sourcePath) : '';
      return doc2 || s.instructions;
    });

    merged.push(`## ${primary.name} (Group: ${group.id})\n${mainContent}`);

    for (const sup of supplements) {
      merged.push(`## Supplementary Constraint\n${sup}`);
    }
  }

  return merged;
}

// ── Confidence Scoring ────────────────────────────────────────────

export interface SkillConfidence {
  skill: BuilderSkill | UserSkill;
  rawScore: number;
  normalizedConfidence: number; // 0-1
  matchedKeywords: string[];
  signals: string[];
}

/**
 * Score a skill with detailed confidence breakdown.
 */
export function scoreSkillWithConfidence(
  skill: BuilderSkill | UserSkill,
  prompt: string,
  attachments: ChatAttachment[],
  files: ProjectFile[],
): SkillConfidence {
  const promptTokens = tokenize(prompt);
  const lowerPrompt = prompt.toLowerCase();
  const keywords = 'keywords' in skill ? skill.keywords : [];
  const haystack = `${skill.name} ${skill.description} ${keywords.join(' ')}`.toLowerCase();

  let rawScore = 0;
  const matchedKeywords: string[] = [];
  const signals: string[] = [];

  // Direct keyword matches
  for (const keyword of keywords) {
    if (lowerPrompt.includes(keyword)) {
      rawScore += 3;
      matchedKeywords.push(keyword);
    }
  }

  // Token-level matches
  for (const token of promptTokens) {
    if (haystack.includes(token)) {
      rawScore += 2;
    }
  }

  // Specific signal detection
  if (attachments.length > 0 && /vision|image|screenshot|mockup|visual|reference/.test(haystack)) {
    rawScore += 50;
    signals.push('attachments present and skill supports vision');
  }

  if (files.length > 0 && /file|context|review|fix|modify|existing/.test(haystack)) {
    rawScore += 8;
    signals.push('existing files and skill handles modifications');
  }

  if (/build|create|website|app|page|dashboard|react|vite/.test(lowerPrompt) && /react|architecture|ui|responsive/.test(haystack)) {
    rawScore += 8;
    signals.push('build request matches frontend skill');
  }

  if (/fix|bug|error|broken|issue/.test(lowerPrompt) && /review|context|fix|validate/.test(haystack)) {
    rawScore += 12;
    signals.push('fix/issue request matches validation skill');
  }

  if (/test|verify|check|qa|build|lint/.test(lowerPrompt) && /test|verify|check|qa|build|lint/.test(haystack)) {
    rawScore += 12;
    signals.push('test/verify request matches QA skill');
  }

  // Normalize to 0-1
  const maxPossibleScore = 100;
  const normalizedConfidence = Math.min(1, rawScore / maxPossibleScore);

  return {
    skill,
    rawScore,
    normalizedConfidence,
    matchedKeywords: [...new Set(matchedKeywords)],
    signals: [...new Set(signals)],
  };
}

/**
 * Select skills with confidence thresholds.
 */
export function selectSkillsWithConfidence(
  prompt: string,
  files: ProjectFile[] = [],
  attachments: ChatAttachment[] = [],
  minConfidence = 0.1,
  maxSkills = 4,
): { selected: (BuilderSkill | UserSkill)[]; confidences: SkillConfidence[] } {
  const userSkills = getActiveUserSkills();
  const allSkills = [...defaultBuilderSkills, ...userSkills];

  const scored = allSkills
    .map(skill => scoreSkillWithConfidence(skill, prompt, attachments, files))
    .filter(score => score.normalizedConfidence >= minConfidence)
    .sort((a, b) => b.normalizedConfidence - a.normalizedConfidence);

  const selected = scored
    .slice(0, maxSkills)
    .map(s => s.skill);

  if (selected.length === 0) {
    return {
      selected: defaultBuilderSkills.slice(0, 2),
      confidences: defaultBuilderSkills.slice(0, 2).map(s => ({
        skill: s,
        rawScore: 1,
        normalizedConfidence: 0.5,
        matchedKeywords: [],
        signals: ['fallback selection'],
      })),
    };
  }

  return { selected, confidences: scored.slice(0, maxSkills) };
}

// ── Quality Gate Integration ──────────────────────────────────────

export function buildQualityGatesForPrompt(
  prompt: string,
  files: ProjectFile[],
): ReturnType<QualityGateOrchestrator['buildGates']> {
  const lower = prompt.toLowerCase();
  const hasPackageJson = files.some(f => f.path === 'package.json');
  const hasTsConfig = files.some(f => /tsconfig/.test(f.path));

  const complexity =
    /complex|dashboard|app|auth|database|workflow|kanban|crm|commerce|multi.?page/i.test(lower)
      ? 'complex'
      : /form|component|section|page.?with|route/i.test(lower)
        ? 'medium'
        : 'simple';

  return qualityGates.buildGates(hasPackageJson, hasTsConfig, complexity);
}

export function buildFileContextGraph(prompt: string, files: ProjectFile[], limit = 8): ContextFileNode[] {
  const promptTokens = tokenize(prompt);
  return files
    .map((file) => {
      const pathTokens = tokenize(file.path);
      const contentTokens = tokenize(file.content.slice(0, 6000));
      let score = 0;
      const reasons = dependencyReason(file, files);

      for (const token of promptTokens) {
        if (pathTokens.has(token)) score += 8;
        if (contentTokens.has(token)) score += 2;
      }

      if (/package\.json$/.test(file.path)) score += 18;
      if (/src\/(main|app|page)\.(jsx|tsx|js|ts)$/i.test(file.path)) score += 20;
      if (/src\/App\.(jsx|tsx|js|ts)$/i.test(file.path)) score += 22;
      if (/index\.html$/i.test(file.path)) score += 12;
      if (/\.(css|scss)$/i.test(file.path)) score += 10;
      if (reasons.length > 0) score += reasons.length * 4;

      return {
        path: file.path,
        score,
        reason: reasons.length > 0 ? reasons.join(', ') : 'matches request context',
      };
    })
    .filter(node => node.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, limit);
}
