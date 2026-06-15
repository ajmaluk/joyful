/**
 * Project Metadata — lightweight project index stored in localStorage.
 *
 * Provides instant loading of the project list for the sidebar without
 * needing to scan IndexedDB (which stores full message history).
 *
 * Architecture:
 *   - localStorage: quick index (id, urlId, description, timestamp)
 *   - IndexedDB:    full messages + optional thumbnail data URL
 *
 * Sync flow:
 *   On save -> write full data to IndexedDB + write metadata to localStorage
 *   On load -> read localStorage for list, IndexedDB for full messages
 */

import { atom } from 'nanostores';

const STORAGE_KEY = 'joyful_projects';

export interface ProjectMeta {
  id: string;
  urlId?: string;
  description?: string;
  timestamp: string;
}

// ── Reactive store (components subscribe to this) ────────────

export const projectList = atom<ProjectMeta[]>([]);

// ── localStorage helpers ────────────────────────────────────

function readAll(): ProjectMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProjectMeta[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: ProjectMeta[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // localStorage may be full — silently degrade
  }
}

// ── Public API ──────────────────────────────────────────────

/** Load project list from localStorage and update the reactive store. */
export function loadProjectList(): ProjectMeta[] {
  const list = readAll();
  projectList.set(list);
  return list;
}

/** Save or update a single project's metadata. */
export function saveProjectMeta(meta: ProjectMeta): void {
  const list = readAll();
  const idx = list.findIndex((p) => p.id === meta.id);

  if (idx >= 0) {
    list[idx] = { ...list[idx], ...meta, timestamp: new Date().toISOString() };
  } else {
    list.push(meta);
  }

  writeAll(list);
  projectList.set(list);
}

/** Update specific fields of an existing project. */
export function updateProjectMeta(
  id: string,
  updates: Partial<Pick<ProjectMeta, 'urlId' | 'description' | 'timestamp'>>,
): void {
  const list = readAll();
  const idx = list.findIndex((p) => p.id === id);

  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updates };
    writeAll(list);
    projectList.set(list);
  }
}

/** Remove a project from the index. */
export function removeProjectMeta(id: string): void {
  const list = readAll().filter((p) => p.id !== id);
  writeAll(list);
  projectList.set(list);
}

/** Sync the full list from IndexedDB (used on first load). */
export function syncFromIndexedDB(entries: ProjectMeta[]): void {
  writeAll(entries);
  projectList.set(entries);
}
