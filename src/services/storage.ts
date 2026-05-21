import type { Project, UserSettings, ChatMessage, UserSkill, SavedGenerationState } from '@/types';
import { joyfulProviderConfig } from '@/services/joyfulProvider';

const STORAGE_KEYS = {
  PROJECTS: 'joyful_projects',
  SETTINGS: 'joyful_settings',
  USER_SKILLS: 'joyful_user_skills',
  AUTH_SESSION: 'joyful_auth_session',
  CHAT_PREFIX: 'joyful_chat_',
  PROJECT_PREFIX: 'joyful_project_',
  GENERATION_PREFIX: 'joyful_generation_',
};

// Projects
export function getProjects(): Project[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.warn(`localStorage quota exceeded for key: ${key}`);
      window.dispatchEvent(new CustomEvent('joyful_storage_quota', { detail: { key, size: value.length } }));
    }
    return false;
  }
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
}

export function deleteProject(projectId: string): void {
  const projects = getProjects().filter(p => p.id !== projectId);
  safeSetItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  localStorage.removeItem(`${STORAGE_KEYS.PROJECT_PREFIX}${projectId}`);
  localStorage.removeItem(`${STORAGE_KEYS.CHAT_PREFIX}${projectId}`);
  localStorage.removeItem(`${STORAGE_KEYS.GENERATION_PREFIX}${projectId}`);
}

export function getProject(projectId: string): Project | null {
  try {
    const data = localStorage.getItem(`${STORAGE_KEYS.PROJECT_PREFIX}${projectId}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// Chat history
export function getChatHistory(projectId: string): ChatMessage[] {
  try {
    const data = localStorage.getItem(`${STORAGE_KEYS.CHAT_PREFIX}${projectId}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveChatHistory(projectId: string, messages: ChatMessage[]): void {
  safeSetItem(`${STORAGE_KEYS.CHAT_PREFIX}${projectId}`, JSON.stringify(messages));
}

export function getSavedGenerationState(projectId: string): SavedGenerationState | null {
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
  localStorage.removeItem(`${STORAGE_KEYS.GENERATION_PREFIX}${projectId}`);
}

// Settings
export function getSettings(): UserSettings {
  const defaults: UserSettings = {
    theme: 'system',
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
