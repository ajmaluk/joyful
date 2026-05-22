import { describe, it, expect, beforeEach } from 'vitest';
import {
  composeSkills,
  mergeSkillBriefs,
  scoreSkillWithConfidence,
  selectSkillsWithConfidence,
  defaultBuilderSkills,
  type BuilderSkill,
} from '@/services/skills';

// ─── Skill Composition ────────────────────────────────────────────

describe('composeSkills', () => {
  const baseSkills = defaultBuilderSkills.slice(0, 6);

  it('groups skills by frontend/validation/context', () => {
    const composed = composeSkills(baseSkills, 'Build a dashboard');
    expect(composed.length).toBeGreaterThanOrEqual(2);

    const groups = composed.map(c => c.id);
    expect(groups.some(g => g.includes('frontend'))).toBe(true);
    expect(groups.some(g => g.includes('validation'))).toBe(true);
  });

  it('assigns priorities correctly', () => {
    const composed = composeSkills(baseSkills, 'Build a website');
    const frontend = composed.find(c => c.id.includes('frontend'));
    const validation = composed.find(c => c.id.includes('validation'));

    if (frontend && validation) {
      expect(frontend.priority).toBeLessThan(validation.priority);
    }
  });

  it('handles empty skills list gracefully', () => {
    const composed = composeSkills([], 'test');
    expect(composed.length).toBe(0);
  });

  it('includes remaining skills not in groups', () => {
    const smallGroup = defaultBuilderSkills.filter(s => s.id === 'web-development-master');
    const composed = composeSkills(smallGroup, 'Build a site');
    expect(composed.length).toBeGreaterThanOrEqual(1);
  });

  it('maps web-development-master to the frontend group', () => {
    const skills = defaultBuilderSkills.filter(s =>
      ['web-development-master', 'testing-workflow'].includes(s.id),
    );
    const composed = composeSkills(skills, 'Build a site');
    const frontendGroup = composed.find(c => c.id.includes('frontend'));
    expect(frontendGroup).toBeDefined();
    expect(frontendGroup!.skills.some(s => s.id === 'web-development-master')).toBe(true);

    const validationGroup = composed.find(c => c.id.includes('validation'));
    expect(validationGroup).toBeDefined();
    expect(validationGroup!.skills.some(s => s.id === 'testing-workflow')).toBe(true);
  });
});

// ─── Merge Skill Briefs ───────────────────────────────────────────

describe('mergeSkillBriefs', () => {
  it('returns empty array for empty composed skills', () => {
    const result = mergeSkillBriefs([], 'test');
    expect(result).toEqual([]);
  });

  it('merges skill instructions into briefs', () => {
    const skill = defaultBuilderSkills[0];
    const composed = [
      {
        id: 'composed_test',
        skills: [skill],
        priority: 1,
        conflictActions: ['merge'] as ('merge' | 'override' | 'skip')[],
      },
    ];
    const result = mergeSkillBriefs(composed, 'test');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]).toContain(skill.name);
  });
});

// ─── Confidence Scoring ───────────────────────────────────────────

describe('scoreSkillWithConfidence', () => {
  it('returns high confidence for matching keywords', () => {
    const webDevSkill = defaultBuilderSkills.find(s => s.id === 'web-development-master')!;
    const score = scoreSkillWithConfidence(webDevSkill, 'Build a React dashboard with TypeScript', [], []);
    expect(score.normalizedConfidence).toBeGreaterThan(0);
    expect(score.rawScore).toBeGreaterThan(0);
  });

  it('returns low confidence for unrelated prompts', () => {
    const webDevSkill = defaultBuilderSkills.find(s => s.id === 'web-development-master')!;
    const score = scoreSkillWithConfidence(webDevSkill, 'What is the weather today', [], []);
    // Might still match some generic terms but should be low
    expect(score.normalizedConfidence).toBeLessThanOrEqual(0.5);
  });

  it('boosts vision skills when attachments present', () => {
    const visionSkill = defaultBuilderSkills.find(s => s.id === 'vision-reference')!;
    const score = scoreSkillWithConfidence(
      visionSkill,
      'Build this design from the screenshot',
      [{ id: '1', type: 'image', name: 'screenshot.png', mimeType: 'image/png', dataUrl: 'data:image/png;base64,abc', size: 100 }],
      [],
    );
    expect(score.rawScore).toBeGreaterThanOrEqual(50);
    expect(score.signals).toContain('attachments present and skill supports vision');
  });

  it('boosts fix/validation skills for issue requests', () => {
    const reviewSkill = defaultBuilderSkills.find(s => s.id === 'code-review-pass')!;
    const score = scoreSkillWithConfidence(reviewSkill, 'Fix this broken login page', [], []);
    expect(score.signals.some(s => s.includes('fix') || s.includes('validation'))).toBe(true);
  });

  it('returns matched keywords for analysis', () => {
    const reactSkill = defaultBuilderSkills.find(s => s.id === 'react-product-architecture')!;
    const score = scoreSkillWithConfidence(reactSkill, 'Create a React app with components', [], []);
    expect(score.matchedKeywords.length).toBeGreaterThan(0);
    expect(score.matchedKeywords).toContain('react');
  });
});

// ─── Skill Selection with Confidence ──────────────────────────────

describe('selectSkillsWithConfidence', () => {
  it('returns top matching skills sorted by confidence', () => {
    const result = selectSkillsWithConfidence('Build a React dashboard with responsive design', [], []);
    expect(result.selected.length).toBeGreaterThanOrEqual(1);
    expect(result.confidences.length).toBeGreaterThanOrEqual(1);

    // Results should be sorted by confidence descending
    for (let i = 1; i < result.confidences.length; i++) {
      expect(result.confidences[i].normalizedConfidence)
        .toBeLessThanOrEqual(result.confidences[i - 1].normalizedConfidence);
    }
  });

  it('respects maxSkills limit', () => {
    const result = selectSkillsWithConfidence('Build a website', [], [], 0, 2);
    expect(result.selected.length).toBeLessThanOrEqual(2);
    expect(result.confidences.length).toBeLessThanOrEqual(2);
  });

  it('respects minConfidence threshold', () => {
    // With high threshold, should fall back to defaults
    const result = selectSkillsWithConfidence('irrelevant unmatched text', [], [], 0.9, 4);
    expect(result.selected.length).toBeGreaterThanOrEqual(1);
  });

  it('provides fallback when nothing matches', () => {
    const result = selectSkillsWithConfidence('xyzzy quantum flux capacitor', [], [], 0.99, 4);
    expect(result.selected.length).toBeGreaterThanOrEqual(1);
    expect(result.confidences.some(c => c.signals.includes('fallback selection'))).toBe(true);
  });

  it('returns confidences with proper structure', () => {
    const result = selectSkillsWithConfidence('Create an accessible login form', []);
    if (result.confidences.length > 0) {
      const confidence = result.confidences[0];
      expect(confidence).toHaveProperty('skill');
      expect(confidence).toHaveProperty('rawScore');
      expect(confidence).toHaveProperty('normalizedConfidence');
      expect(confidence).toHaveProperty('matchedKeywords');
      expect(confidence).toHaveProperty('signals');
      expect(confidence.normalizedConfidence).toBeGreaterThanOrEqual(0);
      expect(confidence.normalizedConfidence).toBeLessThanOrEqual(1);
    }
  });
});
