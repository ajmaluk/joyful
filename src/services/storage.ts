import type { Project, UserSettings, ChatMessage } from '@/types';

const STORAGE_KEYS = {
  PROJECTS: 'joyful_projects',
  SETTINGS: 'joyful_settings',
  AUTH_SESSION: 'joyful_auth_session',
  CHAT_PREFIX: 'joyful_chat_',
  PROJECT_PREFIX: 'joyful_project_',
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

// Settings
export function getSettings(): UserSettings {
  const defaults: UserSettings = {
    theme: 'system',
    editorFontSize: 14,
    editorLineHeight: 1.6,
    autoSave: true,
    livePreview: true,
    aiProvider: 'local',
    aiModel: 'local-lite',
    aiTemperature: 0.7,
    connectedProviders: { local: true },
    providerKeys: {},
  };

  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (data) {
      const parsed = JSON.parse(data) as Partial<UserSettings>;
      return {
        ...defaults,
        ...parsed,
        aiProvider: parsed.aiProvider || defaults.aiProvider,
        aiModel: parsed.aiModel || defaults.aiModel,
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
