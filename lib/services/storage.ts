import type { Project, UserSettings, ChatMessage, UserSkill, SavedGenerationState } from '@/lib/types';
import { joyfulProviderConfig } from '@/lib/services/joyfulProvider';

const STORAGE_KEYS = {
  PROJECTS: 'joyful_projects',
  SETTINGS: 'joyful_settings',
  USER_SKILLS: 'joyful_user_skills',
  AUTH_SESSION: 'joyful_auth_session',
  CHAT_PREFIX: 'joyful_chat_',
  PROJECT_PREFIX: 'joyful_project_',
  GENERATION_PREFIX: 'joyful_generation_',
};

const MAX_CHAT_MESSAGES = 50;
const MAX_CHAT_SIZE_BYTES = 500_000;

// Projects
export function getProjects(): Project[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.warn(`localStorage quota exceeded for key: ${key}`);
      window.dispatchEvent(new CustomEvent('joyful_storage_quota', { detail: { key, size: value.length } }));
      tryEvictOldest(key);
      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

function tryEvictOldest(excludeKey: string): void {
  if (typeof window === 'undefined') return;
  const chatKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_KEYS.CHAT_PREFIX) && key !== excludeKey) {
      chatKeys.push(key);
    }
  }
  if (chatKeys.length === 0) return;
  try {
    const withAge = chatKeys.map((key) => {
      try {
        const raw = localStorage.getItem(key)
        if (raw) {
          const parsed = JSON.parse(raw)
          const ts = parsed.updatedAt
            ? new Date(parsed.updatedAt).getTime()
            : parsed.timestamp
            ? new Date(parsed.timestamp).getTime()
            : 0
          return { key, age: isNaN(ts) ? 0 : ts }
        }
      } catch {
        // fall through
      }
      return { key, age: 0 }
    })
    withAge.sort((a, b) => a.age - b.age)
    localStorage.removeItem(withAge[0].key)
    console.warn(`Evicted oldest chat: ${withAge[0].key}`)
  } catch {
    const oldest = chatKeys.sort()[0]
    localStorage.removeItem(oldest)
    console.warn(`Evicted oldest chat (fallback sort): ${oldest}`)
  }
}

function truncateMessages(messages: ChatMessage[]): ChatMessage[] {
  let truncated = messages.slice(-MAX_CHAT_MESSAGES);
  let serialized = JSON.stringify(truncated);
  while (serialized.length > MAX_CHAT_SIZE_BYTES && truncated.length > 5) {
    const removeCount = Math.max(2, Math.floor(truncated.length * 0.2));
    truncated = truncated.slice(removeCount);
    serialized = JSON.stringify(truncated);
  }
  if (serialized.length > MAX_CHAT_SIZE_BYTES) {
    truncated = truncated.slice(-5);
  }
  return truncated;
}

export function saveProject(project: Project): void {
  const projects = getProjects();
  const idx = projects.findIndex(p => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = project;
  } else {
    projects.push(project);
  }
  safeSetItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  safeSetItem(`${STORAGE_KEYS.PROJECT_PREFIX}${project.id}`, JSON.stringify(project));
  window.dispatchEvent(new CustomEvent('joyful_projects_changed'));
}

export function deleteProject(projectId: string): void {
  if (typeof window === 'undefined') return;
  const projects = getProjects().filter(p => p.id !== projectId);
  safeSetItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  localStorage.removeItem(`${STORAGE_KEYS.PROJECT_PREFIX}${projectId}`);
  localStorage.removeItem(`${STORAGE_KEYS.CHAT_PREFIX}${projectId}`);
  localStorage.removeItem(`${STORAGE_KEYS.GENERATION_PREFIX}${projectId}`);
  localStorage.removeItem(`vibe-sandbox-${projectId}`);
  localStorage.removeItem(`vibe-file-explorer-${projectId}`);
  window.dispatchEvent(new CustomEvent('joyful_projects_changed'));
}

export function getProject(projectId: string): Project | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(`${STORAGE_KEYS.PROJECT_PREFIX}${projectId}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// Chat history
export function getChatHistory(projectId: string): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(`${STORAGE_KEYS.CHAT_PREFIX}${projectId}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveChatHistory(projectId: string, messages: ChatMessage[]): void {
  const truncated = truncateMessages(messages);
  safeSetItem(`${STORAGE_KEYS.CHAT_PREFIX}${projectId}`, JSON.stringify(truncated));
}

export function getSavedGenerationState(projectId: string): SavedGenerationState | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(`${STORAGE_KEYS.GENERATION_PREFIX}${projectId}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveGenerationState(projectId: string, state: SavedGenerationState): void {
  safeSetItem(`${STORAGE_KEYS.GENERATION_PREFIX}${projectId}`, JSON.stringify(state));
}

export function clearGenerationState(projectId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${STORAGE_KEYS.GENERATION_PREFIX}${projectId}`);
}

// Settings
export function getSettings(): UserSettings {
  const defaults: UserSettings = {
    theme: 'system',
    skills: [],
    editorFontSize: 14,
    editorLineHeight: 1.6,
    editorFontFamily: 'jetbrains-mono',
    editorMinimap: false,
    editorWordWrap: true,
    editorLineNumbers: true,
    explorerDensity: 'compact',
    autoSave: true,
    livePreview: true,
    aiProvider: 'joyful',
    aiModel: joyfulProviderConfig.model,
    aiTemperature: 0.7,
  };

  if (typeof window === 'undefined') return defaults;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (data) {
      const parsed = JSON.parse(data) as Partial<UserSettings>;
      return {
        ...defaults,
        ...parsed,
        aiProvider: 'joyful' as const,
        aiModel: parsed.aiModel || defaults.aiModel,
      };
    }
  } catch { /* ignore */ }
  return defaults;
}

export function saveSettings(settings: UserSettings): void {
  safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('joyful_settings_changed', { detail: settings }));
}

// User-created skills. Built-in skills are fixed in code and intentionally not stored here.
export function getUserSkills(): UserSkill[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USER_SKILLS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveUserSkills(skills: UserSkill[]): void {
  safeSetItem(STORAGE_KEYS.USER_SKILLS, JSON.stringify(skills));
  window.dispatchEvent(new CustomEvent('joyful_user_skills_changed', { detail: skills }));
}

// Lightweight local session used by the demo app.
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEYS.AUTH_SESSION) === 'true';
}

export function setAuthenticated(value: boolean): void {
  if (value) {
    safeSetItem(STORAGE_KEYS.AUTH_SESSION, 'true');
  } else {
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
  }
  window.dispatchEvent(new CustomEvent('joyful_auth_changed', { detail: value }));
}
