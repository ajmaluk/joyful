import { useState, useCallback, useEffect, useRef } from 'react';
import type { Project, ProjectFile } from '@/types';
import * as storage from '@/services/storage';
import { storageManager } from '@/engine/storage';
import { createReactViteStarterFiles } from '@/services/projectScaffold';
import { virtualFS } from '@/lib/vfs/VirtualFileSystem';

function filesToVFS(files: ProjectFile[]): Promise<void> {
  return virtualFS.writeMultipleFiles(
    files.map(f => ({ path: f.path, content: f.content })),
  );
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(() => storage.getProjects());
  const [storageReady, setStorageReady] = useState(false);
  const syncedRef = useRef(false);

  useEffect(() => {
    storageManager.init()
      .then(() => {
        setStorageReady(true);
        if (!syncedRef.current) {
          syncedRef.current = true;
          // Sync localStorage projects to IndexedDB on first init
          const local = storage.getProjects();
          if (local.length > 0) {
            Promise.all(local.map(p => storageManager.saveProject({
              id: p.id,
              name: p.name,
              description: p.description,
              status: p.status,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
              templateId: p.templateId,
              previewUrl: p.previewUrl,
            }))).catch(() => {});
          }
        }
      })
      .catch(() => {});
  }, []);

  const refresh = useCallback(() => {
    setProjects(storage.getProjects());
  }, []);

  const createProject = useCallback((name: string, description: string, templateId?: string) => {
    const project: Project = {
      id: `proj_${Date.now()}`,
      name,
      description,
      files: createReactViteStarterFiles(name),
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      templateId,
    };

    storage.saveProject(project);
    setProjects(prev => [...prev, project]);

    // Async: write files to VFS and sync to StorageManager
    filesToVFS(project.files).catch(() => {});
    if (storageReady) {
      storageManager.saveProject({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        templateId: project.templateId,
        previewUrl: project.previewUrl,
      }).catch(() => {});
    }

    return project;
  }, [storageReady]);

  const updateProject = useCallback((project: Project) => {
    project.updatedAt = new Date().toISOString();
    storage.saveProject(project);
    setProjects(prev => prev.map(p => p.id === project.id ? project : p));

    if (storageReady) {
      filesToVFS(project.files).catch(() => {});
      storageManager.saveProject({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        templateId: project.templateId,
        previewUrl: project.previewUrl,
      }).catch(() => {});
    }
  }, [storageReady]);

  const removeProject = useCallback((projectId: string) => {
    storage.deleteProject(projectId);
    setProjects(prev => prev.filter(p => p.id !== projectId));

    if (storageReady) {
      storageManager.deleteProject(projectId).catch(() => {});
    }
  }, [storageReady]);

  return { projects, refresh, createProject, updateProject, removeProject };
}
