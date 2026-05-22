import { useState, useEffect, useCallback } from 'react';
import { storageManager } from '@/engine/storage';
import type { ProjectRecord } from '@/engine/storage/types';

export interface StorageManagerHook {
  ready: boolean;
  error: string | null;
  listProjects: () => Promise<ProjectRecord[]>;
  getProject: (id: string) => Promise<ProjectRecord | undefined>;
  saveProject: (project: ProjectRecord) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export function useStorageManager(): StorageManagerHook {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await storageManager.init();
        if (mounted) setReady(true);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize storage');
        }
      }
    }

    init();
    return () => { mounted = false; };
  }, []);

  const listProjects = useCallback(async () => {
    return storageManager.listProjects();
  }, []);

  const getProject = useCallback(async (id: string) => {
    return storageManager.getProject(id);
  }, []);

  const saveProject = useCallback(async (project: ProjectRecord) => {
    await storageManager.saveProject(project);
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    await storageManager.deleteProject(id);
  }, []);

  return { ready, error, listProjects, getProject, saveProject, deleteProject };
}
