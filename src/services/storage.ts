import type { Project, UserSettings, ChatMessage, UserSkill, SavedGenerationState } from '@/types';
import { getDefaultAIProvider, joyfulProviderConfig, normalizeProvider } from '@/services/joyfulProvider';

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

export function saveProject(project: Project): void {
  const projects = getProjects();
  const idx = projects.findIndex(p => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = project;
  } else {
    projects.push(project);
  }
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  localStorage.setItem(`${STORAGE_KEYS.PROJECT_PREFIX}${project.id}`, JSON.stringify(project));
}

export function deleteProject(projectId: string): void {
  const projects = getProjects().filter(p => p.id !== projectId);
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
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
  localStorage.setItem(`${STORAGE_KEYS.CHAT_PREFIX}${projectId}`, JSON.stringify(messages));
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
  localStorage.setItem(`${STORAGE_KEYS.GENERATION_PREFIX}${projectId}`, JSON.stringify(state));
}

export function clearGenerationState(projectId: string): void {
  localStorage.removeItem(`${STORAGE_KEYS.GENERATION_PREFIX}${projectId}`);
}

// Settings
export function getSettings(): UserSettings {
  const defaultAI = getDefaultAIProvider();
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
    aiProvider: defaultAI.aiProvider,
    aiModel: defaultAI.aiModel,
    aiTemperature: 0.7,
    connectedProviders: defaultAI.connectedProviders,
    providerKeys: {},
  };

  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (data) {
      const parsed = JSON.parse(data) as Partial<UserSettings>;
      const shouldUpgradeLegacyLocalProvider = (
        joyfulProviderConfig.enabled &&
        joyfulProviderConfig.defaultEnabled &&
        (!parsed.aiProvider || parsed.aiProvider === 'local') &&
        (!parsed.aiModel || parsed.aiModel === 'local-lite')
      );
      const shouldUpgradeDisconnectedProvider = (
        joyfulProviderConfig.enabled &&
        joyfulProviderConfig.defaultEnabled &&
        parsed.aiProvider !== undefined &&
        parsed.aiProvider !== 'local' &&
        parsed.aiProvider !== 'joyful' &&
        !parsed.providerKeys?.[parsed.aiProvider]?.trim()
      );
      const parsedProvider = shouldUpgradeLegacyLocalProvider
        || shouldUpgradeDisconnectedProvider
        ? 'joyful'
        : parsed.aiProvider ? normalizeProvider(parsed.aiProvider) : defaults.aiProvider;
      const parsedModel = parsedProvider === 'joyful' ? joyfulProviderConfig.model : parsed.aiModel;
      return {
        ...defaults,
        ...parsed,
        aiProvider: parsedProvider,
        aiModel: parsedModel || defaults.aiModel,
        connectedProviders: { ...defaults.connectedProviders, ...parsed.connectedProviders },
        providerKeys: { ...defaults.providerKeys, ...parsed.providerKeys },
      };
    }
  } catch { /* ignore */ }
  return defaults;
}

export function saveSettings(settings: UserSettings): void {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
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
  localStorage.setItem(STORAGE_KEYS.USER_SKILLS, JSON.stringify(skills));
  window.dispatchEvent(new CustomEvent('joyful_user_skills_changed', { detail: skills }));
}

// Lightweight local session used by the demo app.
export function isAuthenticated(): boolean {
  return localStorage.getItem(STORAGE_KEYS.AUTH_SESSION) === 'true';
}

export function setAuthenticated(value: boolean): void {
  if (value) {
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, 'true');
  } else {
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
  }
  window.dispatchEvent(new CustomEvent('joyful_auth_changed', { detail: value }));
}
