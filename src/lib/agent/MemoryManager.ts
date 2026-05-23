import { storageManager } from '@/engine/storage';
import { agentEventBus } from './eventBus';

export interface Decision {
  timestamp: number;
  topic: string;
  decision: string;
  rationale: string;
}

export interface ArchitectureNote {
  timestamp: number;
  topic: string;
  summary: string;
}

export interface MemoryNote {
  timestamp: number;
  content: string;
}

export interface FileSummaryRecord {
  path: string;
  summary: string;
  lastRead: number;
}

export interface ProjectMemory {
  id: string;
  projectId: string;
  decisions: Decision[];
  architecture: ArchitectureNote[];
  notes: MemoryNote[];
  lastSuccessfulBuild: number | null;
  lastSuccessfulPreview: number | null;
  fileSummaries: FileSummaryRecord[];
  userPreferences: Record<string, string>;
}

export interface Reflection {
  id: string;
  projectId: string;
  timestamp: number;
  trigger: 'compile_error' | 'runtime_error' | 'build_failure' | 'lint_error' | 'type_error' | 'missing_import' | 'blank_preview' | 'repeated_failure';
  errorSignature: string;
  rootCause: string;
  successfulFix: string;
  lesson: string;
  relatedFiles: string[];
  fixCount: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  whenToUse: string[];
  steps: string[];
  requiredTools: string[];
  commonMistakes: string[];
  validation: string[];
  examplePrompt?: string;
  createdAt: number;
  updatedAt: number;
  useCount: number;
}

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}`;
}

export class MemoryManager {
  async loadProjectMemory(projectId: string): Promise<ProjectMemory> {
    const existing = await storageManager.getMeta(`memory:${projectId}`);
    if (existing && typeof existing === 'object' && existing !== null) {
      return existing as ProjectMemory;
    }
    const fresh: ProjectMemory = {
      id: generateId(),
      projectId,
      decisions: [],
      architecture: [],
      notes: [],
      lastSuccessfulBuild: null,
      lastSuccessfulPreview: null,
      fileSummaries: [],
      userPreferences: {},
    };
    await storageManager.setMeta(`memory:${projectId}`, fresh);
    return fresh;
  }

  private async getOrCreateMemory(projectId: string): Promise<ProjectMemory> {
    return this.loadProjectMemory(projectId);
  }

  private async writeMemory(projectId: string, memory: ProjectMemory): Promise<void> {
    await storageManager.setMeta(`memory:${projectId}`, memory);
  }

  async saveDecision(projectId: string, topic: string, decision: string, rationale: string): Promise<void> {
    const memory = await this.getOrCreateMemory(projectId);
    memory.decisions.push({ timestamp: Date.now(), topic, decision, rationale });
    await this.writeMemory(projectId, memory);
  }

  async saveArchitectureNote(projectId: string, topic: string, summary: string): Promise<void> {
    const memory = await this.getOrCreateMemory(projectId);
    memory.architecture.push({ timestamp: Date.now(), topic, summary });
    await this.writeMemory(projectId, memory);
  }

  async saveNote(projectId: string, content: string): Promise<void> {
    const memory = await this.getOrCreateMemory(projectId);
    memory.notes.push({ timestamp: Date.now(), content });
    await this.writeMemory(projectId, memory);
  }

  async setLastSuccessfulBuild(projectId: string, timestamp: number): Promise<void> {
    const memory = await this.getOrCreateMemory(projectId);
    memory.lastSuccessfulBuild = timestamp;
    await this.writeMemory(projectId, memory);
  }

  async setLastSuccessfulPreview(projectId: string, timestamp: number): Promise<void> {
    const memory = await this.getOrCreateMemory(projectId);
    memory.lastSuccessfulPreview = timestamp;
    await this.writeMemory(projectId, memory);
  }

  async saveFileSummary(projectId: string, path: string, summary: string): Promise<void> {
    const memory = await this.getOrCreateMemory(projectId);
    const existing = memory.fileSummaries.find(fs => fs.path === path);
    if (existing) {
      existing.summary = summary;
      existing.lastRead = Date.now();
    } else {
      memory.fileSummaries.push({ path, summary, lastRead: Date.now() });
    }
    await this.writeMemory(projectId, memory);
  }

  async saveReflection(reflection: Omit<Reflection, 'id' | 'timestamp' | 'fixCount'>): Promise<void> {
    const key = `reflections:${reflection.projectId}`;
    const existing = (await storageManager.getMeta(key)) as Reflection[] | undefined;
    const reflections: Reflection[] = existing || [];

    const newReflection: Reflection = {
      ...reflection,
      id: generateId(),
      timestamp: Date.now(),
      fixCount: 1,
    };

    reflections.push(newReflection);
    await storageManager.setMeta(key, reflections);

    const index = (await storageManager.getMeta('reflections_index')) as string[] | undefined;
    const reflectionsIndex: string[] = index || [];
    if (!reflectionsIndex.includes(key)) {
      reflectionsIndex.push(key);
      await storageManager.setMeta('reflections_index', reflectionsIndex);
    }

    agentEventBus.emit({
      type: 'reflection:saved',
      reflectionId: newReflection.id,
      lesson: newReflection.lesson,
    });
  }

  async loadRelevantReflections(errorSignature: string, maxResults = 5): Promise<Reflection[]> {
    const allKeys = await this.getAllReflectionKeys();
    const sigLower = errorSignature.toLowerCase();
    const sigWords = sigLower.split(/\s+/).filter(w => w.length > 3);
    const scored: { score: number; reflection: Reflection }[] = [];

    for (const key of allKeys) {
      const reflections = (await storageManager.getMeta(key)) as Reflection[] | undefined;
      if (!reflections) continue;

      for (const ref of reflections) {
        let score = 0;
        const refSig = ref.errorSignature.toLowerCase();

        if (refSig === sigLower) {
          score += 20;
        } else if (refSig.includes(sigLower) || sigLower.includes(refSig)) {
          score += 10;
        }

        for (const word of sigWords) {
          if (refSig.includes(word)) score += 3;
          if (ref.rootCause.toLowerCase().includes(word)) score += 2;
          if (ref.lesson.toLowerCase().includes(word)) score += 1;
        }

        if (score > 0) {
          scored.push({ score, reflection: ref });
        }
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const results = scored.slice(0, maxResults).map(s => s.reflection);

    if (results.length > 0) {
      agentEventBus.emit({
        type: 'reflection:loaded',
        count: results.length,
        matchingErrors: results.map(r => r.errorSignature),
      });
    }

    return results;
  }

  async getRecentReflections(projectId: string, limit = 10): Promise<Reflection[]> {
    const key = `reflections:${projectId}`;
    const reflections = (await storageManager.getMeta(key)) as Reflection[] | undefined;
    if (!reflections) return [];
    return reflections.slice(-limit).reverse();
  }

  async incrementReflectionFixCount(reflectionId: string): Promise<void> {
    const allKeys = await this.getAllReflectionKeys();
    for (const key of allKeys) {
      const reflections = (await storageManager.getMeta(key)) as Reflection[] | undefined;
      if (!reflections) continue;
      const idx = reflections.findIndex(r => r.id === reflectionId);
      if (idx !== -1) {
        reflections[idx].fixCount++;
        await storageManager.setMeta(key, reflections);
        return;
      }
    }
  }

  async saveSkill(skill: Skill): Promise<void> {
    await storageManager.setMeta(`skill:${skill.id}`, skill);
    const index = (await storageManager.getMeta('skills_index')) as string[] | undefined;
    const skillsIndex: string[] = index || [];
    if (!skillsIndex.includes(skill.id)) {
      skillsIndex.push(skill.id);
      await storageManager.setMeta('skills_index', skillsIndex);
    }
  }

  async loadRelevantSkills(taskDescription: string, maxResults = 5): Promise<Skill[]> {
    const all = await this.getAllSkills();
    const lowerTask = taskDescription.toLowerCase();
    const taskWords = lowerTask.split(/\s+/).filter(w => w.length > 3);
    const scored: { score: number; skill: Skill }[] = [];

    for (const skill of all) {
      let score = 0;
      const skillText = `${skill.name} ${skill.description} ${skill.whenToUse.join(' ')}`.toLowerCase();

      if (skillText.includes(lowerTask)) {
        score += 10;
      }

      for (const word of taskWords) {
        if (skillText.includes(word)) score += 2;
        if (skill.name.toLowerCase().includes(word)) score += 5;
      }

      if (score > 0) {
        scored.push({ score, skill });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const results = scored.slice(0, maxResults).map(s => s.skill);

    if (results.length > 0) {
      agentEventBus.emit({
        type: 'skill:loaded',
        skills: results.map(s => s.name),
      });
    }

    return results;
  }

  async getAllSkills(): Promise<Skill[]> {
    const index = (await storageManager.getMeta('skills_index')) as string[] | undefined;
    if (!index || index.length === 0) return [];

    const skills: Skill[] = [];
    for (const id of index) {
      const skill = await storageManager.getMeta(`skill:${id}`);
      if (skill && typeof skill === 'object') {
        skills.push(skill as Skill);
      }
    }
    return skills;
  }

  async deleteSkill(id: string): Promise<void> {
    await storageManager.setMeta(`skill:${id}`, null);
    const index = (await storageManager.getMeta('skills_index')) as string[] | undefined;
    if (index) {
      const filtered = index.filter(sid => sid !== id);
      await storageManager.setMeta('skills_index', filtered);
    }
  }

  async incrementSkillUseCount(id: string): Promise<void> {
    const skill = await storageManager.getMeta(`skill:${id}`);
    if (skill && typeof skill === 'object') {
      (skill as Skill).useCount++;
      (skill as Skill).updatedAt = Date.now();
      await storageManager.setMeta(`skill:${id}`, skill);
    }
  }

  async formatProjectMemoryForPrompt(projectId: string): Promise<string> {
    const memory = await this.loadProjectMemory(projectId);
    const parts: string[] = [];

    if (memory.decisions.length > 0) {
      const recent = memory.decisions.slice(-5);
      parts.push('=== Recent Decisions ===');
      for (const d of recent) {
        parts.push(`- ${d.topic}: ${d.decision}`);
      }
    }

    if (memory.architecture.length > 0) {
      const recent = memory.architecture.slice(-5);
      parts.push('=== Architecture Notes ===');
      for (const a of recent) {
        parts.push(`- ${a.topic}: ${a.summary}`);
      }
    }

    if (memory.notes.length > 0) {
      const recent = memory.notes.slice(-5);
      parts.push('=== Notes ===');
      for (const n of recent) {
        parts.push(`- ${n.content.slice(0, 200)}`);
      }
    }

    if (memory.lastSuccessfulBuild) {
      parts.push(`Last successful build: ${new Date(memory.lastSuccessfulBuild).toLocaleString()}`);
    }

    if (memory.lastSuccessfulPreview) {
      parts.push(`Last successful preview: ${new Date(memory.lastSuccessfulPreview).toLocaleString()}`);
    }

    const prefs = Object.entries(memory.userPreferences);
    if (prefs.length > 0) {
      parts.push('=== User Preferences ===');
      for (const [key, value] of prefs) {
        parts.push(`- ${key}: ${value}`);
      }
    }

    const reflectionKey = `reflections:${projectId}`;
    const reflections = (await storageManager.getMeta(reflectionKey)) as Reflection[] | undefined;
    if (reflections && reflections.length > 0) {
      const recent = reflections.slice(-3);
      parts.push('=== Recent Failure Reflections ===');
      for (const r of recent) {
        parts.push(`- [${r.trigger}] ${r.lesson} (fixed ${r.fixCount}x)`);
      }
    }

    agentEventBus.emit({
      type: 'memory:loaded',
      summary: parts.join('\n').slice(0, 500),
    });

    return parts.join('\n') || '(no project memory)';
  }

  private async getAllReflectionKeys(): Promise<string[]> {
    // We can't enumerate keys from storageManager directly,
    // so we track reflection keys in an index
    const index = (await storageManager.getMeta('reflections_index')) as string[] | undefined;
    return index || [];
  }
}

export const memoryManager = new MemoryManager();
