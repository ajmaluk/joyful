import type { StorageAdapter } from './types';

const MIGRATION_KEY = 'engine_migration_version';
const CURRENT_VERSION = 1;

let _migrationsRan = false;

const LS_KEYS = {
  PROJECTS: 'joyful_projects',
  PROJECT_PREFIX: 'joyful_project_',
  CHAT_PREFIX: 'joyful_chat_',
  GENERATION_PREFIX: 'joyful_generation_',
  SETTINGS: 'joyful_settings',
  USER_SKILLS: 'joyful_user_skills',
  AUTH_SESSION: 'joyful_auth_session',
  MEMORY: 'joyful-project-memory',
};

export async function runMigrations(adapter: StorageAdapter): Promise<void> {
  if (_migrationsRan) return;
  _migrationsRan = true;

  const migratedVersion = await adapter.getMeta(MIGRATION_KEY);
  const lastVersion = typeof migratedVersion === 'number' ? migratedVersion : 0;

  if (lastVersion >= CURRENT_VERSION) return;

  if (lastVersion < 1) {
    await migrateFromLocalStorage(adapter);
  }

  await adapter.setMeta(MIGRATION_KEY, CURRENT_VERSION);
}

async function migrateFromLocalStorage(adapter: StorageAdapter): Promise<void> {
  const migrated: string[] = [];

  // Migrate settings
  try {
    const settingsRaw = localStorage.getItem(LS_KEYS.SETTINGS);
    if (settingsRaw) {
      const settings = JSON.parse(settingsRaw);
      await adapter.saveSettings(settings);
      migrated.push('settings');
    }
  } catch { /* skip */ }

  // Migrate auth session
  try {
    const auth = localStorage.getItem(LS_KEYS.AUTH_SESSION);
    if (auth) {
      await adapter.setAuthenticated(auth === 'true');
      migrated.push('auth');
    }
  } catch { /* skip */ }

  // Migrate user skills
  try {
    const skillsRaw = localStorage.getItem(LS_KEYS.USER_SKILLS);
    if (skillsRaw) {
      const skills = JSON.parse(skillsRaw);
      await adapter.saveUserSkills(skills);
      migrated.push('skills');
    }
  } catch { /* skip */ }

  // Migrate projects
  try {
    const projectsRaw = localStorage.getItem(LS_KEYS.PROJECTS);
    if (projectsRaw) {
      const projects = JSON.parse(projectsRaw);
      for (const project of projects) {
        await adapter.saveProject({
          id: project.id,
          name: project.name,
          description: project.description || '',
          status: project.status || 'draft',
          createdAt: project.createdAt || new Date().toISOString(),
          updatedAt: project.updatedAt || new Date().toISOString(),
          templateId: project.templateId,
          previewUrl: project.previewUrl,
        });
      }
      migrated.push('projects');
    }
  } catch { /* skip */ }

  // Migrate chat history per project
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LS_KEYS.CHAT_PREFIX)) {
        const projectId = key.slice(LS_KEYS.CHAT_PREFIX.length);
        const raw = localStorage.getItem(key);
        if (raw) {
          const messages = JSON.parse(raw);
          await adapter.saveChatMessages(
            projectId,
            messages.map((m: Record<string, unknown>) => ({
              id: m.id as string,
              projectId,
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.content as string,
              timestamp: m.timestamp as string,
              mode: m.mode as string | undefined,
              metadata: m.metadata as Record<string, unknown> | undefined,
            })),
          );
        }
      }
    }
    migrated.push('chat');
  } catch { /* skip */ }

  // Migrate generation states per project
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LS_KEYS.GENERATION_PREFIX)) {
        const projectId = key.slice(LS_KEYS.GENERATION_PREFIX.length);
        const raw = localStorage.getItem(key);
        if (raw) {
          const state = JSON.parse(raw);
          await adapter.saveGenerationState(projectId, {
            id: state.id,
            projectId,
            prompt: state.prompt || '',
            status: state.status || 'failed',
            savedAt: state.savedAt || new Date().toISOString(),
            updatedAt: state.updatedAt || new Date().toISOString(),
            messageCount: state.messageCount || 0,
            filesSnapshot: state.filesSnapshot || [],
          });
        }
      }
    }
    migrated.push('generation_states');
  } catch { /* skip */ }

  // Migrate project memory
  try {
    const memoryRaw = localStorage.getItem(LS_KEYS.MEMORY);
    if (memoryRaw) {
      await adapter.setMeta('project_memory', JSON.parse(memoryRaw));
      migrated.push('memory');
    }
  } catch { /* skip */ }

  if (migrated.length > 0) {
    console.log(`[Storage] Migrated from localStorage: ${migrated.join(', ')}`);
  }
}

export function _resetMigrationGuard(): void {
  _migrationsRan = false;
}
