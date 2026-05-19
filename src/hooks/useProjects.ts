import { useState, useCallback } from 'react';
import type { Project } from '@/types';
import * as storage from '@/services/storage';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(() => storage.getProjects());

  const refresh = useCallback(() => {
    setProjects(storage.getProjects());
  }, []);

  const createProject = useCallback((name: string, description: string, templateId?: string) => {
    const project: Project = {
      id: `proj_${Date.now()}`,
      name,
      description,
      files: [],
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      templateId,
    };
    storage.saveProject(project);
    setProjects(prev => [...prev, project]);
    return project;
  }, []);

  const updateProject = useCallback((project: Project) => {
    project.updatedAt = new Date().toISOString();
    storage.saveProject(project);
    setProjects(prev => prev.map(p => p.id === project.id ? project : p));
  }, []);

  const removeProject = useCallback((projectId: string) => {
    storage.deleteProject(projectId);
    setProjects(prev => prev.filter(p => p.id !== projectId));
  }, []);

  return { projects, refresh, createProject, updateProject, removeProject };
}
