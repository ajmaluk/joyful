import type { ProjectFile, UserSkill } from '@/types';
import * as storage from '@/services/storage';

export interface BuilderSkill {
  id: string;
  name: string;
  description: string;
  instructions: string;
}

export const defaultBuilderSkills: BuilderSkill[] = [
  {
    id: 'react-product-architecture',
    name: 'React Product Architecture',
    description: 'Prefer maintainable React/Vite structures, component boundaries, and reusable state patterns.',
    instructions: 'Create production-ready React apps by default with clear component structure, predictable state, and framework-friendly file paths.',
  },
  {
    id: 'file-context-graph',
    name: 'File Context Graph',
    description: 'Read the smallest useful file set before editing and include dependency neighbors.',
    instructions: 'Rank files by prompt relevance, entry-point importance, imports, styling links, and likely runtime impact before making changes.',
  },
  {
    id: 'code-review-pass',
    name: 'Code Review Pass',
    description: 'Check edits for runtime errors, broken references, preview failures, and missing states.',
    instructions: 'After each build, review changed files for syntax, imports, UI regressions, empty states, responsiveness, and preview compatibility.',
  },
  {
    id: 'responsive-ui-polish',
    name: 'Responsive UI Polish',
    description: 'Keep layouts clean, professional, accessible, and stable across viewport sizes.',
    instructions: 'Use consistent spacing, readable contrast, responsive constraints, keyboard-friendly controls, and no overlapping UI.',
  },
];

export function getActiveUserSkills(): UserSkill[] {
  return storage.getUserSkills().filter(skill => skill.enabled);
}

export function getSkillBrief() {
  const userSkills = getActiveUserSkills();
  return [
    ...defaultBuilderSkills.map(skill => `${skill.name}: ${skill.instructions}`),
    ...userSkills.map(skill => `${skill.name}: ${skill.instructions}`),
  ];
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

