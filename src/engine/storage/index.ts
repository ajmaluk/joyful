export { StorageManager, storageManager } from './StorageManager';
export type { StorageEventType } from './StorageManager';

export { IndexedDbAdapter } from './indexedDb';
export { runMigrations } from './migrations';
export { createOpfsAdapter } from './opfs';

export type {
  StorageAdapter,
  StorageQuota,
  ProjectRecord,
  ChatRecord,
  GenerationStateRecord,
  UserSkillRecord,
  SettingsRecord,
  AuthRecord,
} from './types';
