import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectConflicts,
  smartMerge,
  analyzeDependencies,
  ChangeTracker,
  findOrphanFiles,
  validatePath,
  normalizeProjectPath,
  getFileType,
  generatePreview,
} from '@/services/fileSystem';
import type { FileOperation, ProjectFile } from '@/types';

describe('validatePath', () => {
  it('rejects path traversal', () => {
    expect(validatePath('../outside')).toBe(false);
    expect(validatePath('folder/../../etc')).toBe(false);
  });

  it('rejects absolute paths', () => {
    expect(validatePath('/usr/bin')).toBe(false);
  });

  it('rejects invalid characters', () => {
    expect(validatePath('file$.ts')).toBe(false);
  });

  it('accepts valid paths', () => {
    expect(validatePath('src/components/Button.tsx')).toBe(true);
    expect(validatePath('index.html')).toBe(true);
    expect(validatePath('folder/file.test.tsx')).toBe(true);
  });
});

describe('normalizeProjectPath', () => {
  it('removes leading ./', () => {
    expect(normalizeProjectPath('./src/App.tsx')).toBe('src/App.tsx');
  });

  it('removes leading /', () => {
    expect(normalizeProjectPath('/src/App.tsx')).toBe('src/App.tsx');
  });

  it('collapses double slashes', () => {
    expect(normalizeProjectPath('src//App.tsx')).toBe('src/App.tsx');
  });
});

describe('getFileType', () => {
  it('returns correct types', () => {
    expect(getFileType('index.html')).toBe('html');
    expect(getFileType('styles.css')).toBe('css');
    expect(getFileType('script.js')).toBe('js');
    expect(getFileType('component.tsx')).toBe('tsx');
    expect(getFileType('types.ts')).toBe('ts');
    expect(getFileType('data.json')).toBe('json');
  });
});

// ── Conflict Detection ────────────────────────────────────────────

describe('detectConflicts', () => {
  const makeFile = (path: string): ProjectFile => ({
    id: '1',
    path,
    content: '',
    type: 'tsx',
  });

  const makeOp = (path: string, action: FileOperation['action']): FileOperation => ({
    path,
    action,
    content: action === 'delete' ? undefined : 'content',
  });

  it('detects create on existing file', () => {
    const conflicts = detectConflicts(
      [makeOp('src/App.tsx', 'create')],
      [makeFile('src/App.tsx')],
    );
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].type).toBe('create_exists');
  });

  it('detects delete + modify conflict', () => {
    const conflicts = detectConflicts(
      [makeOp('src/App.tsx', 'delete'), makeOp('src/App.tsx', 'modify')],
      [makeFile('src/App.tsx')],
    );
    expect(conflicts.some(c => c.type === 'delete_modify_conflict')).toBe(true);
  });

  it('detects concurrent modifies', () => {
    const conflicts = detectConflicts(
      [makeOp('src/App.tsx', 'modify'), makeOp('src/App.tsx', 'modify')],
      [makeFile('src/App.tsx')],
    );
    expect(conflicts.some(c => c.type === 'concurrent_modify')).toBe(true);
  });

  it('returns empty for clean operations', () => {
    const conflicts = detectConflicts(
      [makeOp('src/new.ts', 'create')],
      [],
    );
    expect(conflicts.length).toBe(0);
  });
});

// ── Smart Merge ───────────────────────────────────────────────────

describe('smartMerge', () => {
  it('returns original when no changes', () => {
    const result = smartMerge('original', [], []);
    expect(result.content).toBe('original');
    expect(result.merged).toBe(false);
  });

  it('accepts their changes when ours is empty', () => {
    const result = smartMerge('original', [], ['their line']);
    expect(result.content).toBe('their line');
    expect(result.merged).toBe(true);
  });

  it('accepts our changes when theirs is empty', () => {
    const result = smartMerge('original', ['our line'], []);
    expect(result.content).toBe('our line');
    expect(result.merged).toBe(true);
  });

  it('detects identical changes', () => {
    const result = smartMerge('original', ['identical'], ['identical']);
    expect(result.content).toBe('identical');
    expect(result.merged).toBe(true);
  });

  it('detects merge conflicts on different lines', () => {
    const result = smartMerge('line1\nline2\nline3', ['line1\nour2\nline3'], ['line1\ntheir2\nline3']);
    expect(result.conflicts.length).toBeGreaterThan(0);
  });
});

// ── Dependency Analysis ───────────────────────────────────────────

describe('analyzeDependencies', () => {
  const makeFile = (path: string, content: string): ProjectFile => ({
    id: path,
    path,
    content,
    type: path.endsWith('.css') ? 'css' : 'tsx',
  });

  it('detects missing imports', () => {
    const files = [
      makeFile('src/App.tsx', "import { Button } from './Button';"),
    ];
    const { issues } = analyzeDependencies(files);
    expect(issues.some(i => i.type === 'missing_import')).toBe(true);
  });

  it('reports clean for valid imports', () => {
    const files = [
      makeFile('src/Button.tsx', 'export function Button() {}'),
      makeFile('src/App.tsx', "import { Button } from './Button';"),
    ];
    const { issues } = analyzeDependencies(files);
    expect(issues.filter(i => i.type === 'missing_import').length).toBe(0);
  });

  it('detects missing @/ imports', () => {
    const files = [
      makeFile('src/App.tsx', "import { helper } from '@/utils/helper';"),
    ];
    const { issues } = analyzeDependencies(files);
    expect(issues.some(i => i.type === 'missing_import')).toBe(true);
  });

  it('ignores external node_modules imports', () => {
    const files = [
      makeFile('src/App.tsx', "import React from 'react';\nimport { BrowserRouter } from 'react-router-dom';"),
    ];
    const { issues } = analyzeDependencies(files);
    const externalsIssues = issues.filter(i => i.specifier === 'react' || i.specifier === 'react-router-dom');
    expect(externalsIssues.length).toBe(0);
  });
});

// ── ChangeTracker ─────────────────────────────────────────────────

describe('ChangeTracker', () => {
  let tracker: ChangeTracker;

  beforeEach(() => {
    tracker = new ChangeTracker();
  });

  it('records and retrieves actions', () => {
    tracker.recordAction({ path: 'src/App.tsx', action: 'modify', summary: 'Updated App component', previousContent: 'old', newContent: 'new' });

    const changes = tracker.getChanges('src/App.tsx');
    expect(changes.length).toBe(1);
    expect(changes[0].action).toBe('modify');
    expect(changes[0].summary).toBe('Updated App component');
    expect(changes[0].timestamp).toBeGreaterThan(0);
  });

  it('returns all changes sorted by timestamp', () => {
    tracker.recordAction({ path: 'src/B.ts', action: 'create', summary: 'Created B' });
    tracker.recordAction({ path: 'src/A.ts', action: 'modify', summary: 'Modified A' });

    const all = tracker.getChanges();
    expect(all.length).toBe(2);
    expect(all[0].path).toBe('src/B.ts');
    expect(all[1].path).toBe('src/A.ts');
  });

  it('returns latest change for a file', () => {
    tracker.recordAction({ path: 'src/App.tsx', action: 'create', summary: 'Created App' });
    tracker.recordAction({ path: 'src/App.tsx', action: 'modify', summary: 'Modified App' });

    const latest = tracker.getLatestChange('src/App.tsx');
    expect(latest).not.toBeNull();
    expect(latest!.summary).toBe('Modified App');
  });

  it('returns null for unknown file latest change', () => {
    expect(tracker.getLatestChange('nonexistent.ts')).toBeNull();
  });

  it('returns modified file paths', () => {
    tracker.recordAction({ path: 'src/A.ts', action: 'modify', summary: '' });
    tracker.recordAction({ path: 'src/B.ts', action: 'create', summary: '' });

    const files = tracker.getModifiedFiles();
    expect(files).toContain('src/A.ts');
    expect(files).toContain('src/B.ts');
  });

  it('caps changes at 50 per file', () => {
    for (let i = 0; i < 60; i++) {
      tracker.recordAction({ path: 'src/App.tsx', action: 'modify', summary: `Change ${i}` });
    }
    const changes = tracker.getChanges('src/App.tsx');
    expect(changes.length).toBe(50);
  });

  it('clears all changes', () => {
    tracker.recordAction({ path: 'src/A.ts', action: 'create', summary: '' });
    tracker.clear();
    expect(tracker.getChanges().length).toBe(0);
  });
});

// ── Orphan File Detection ─────────────────────────────────────────

describe('findOrphanFiles', () => {
  const makeFile = (path: string, content: string, type: string = 'tsx'): ProjectFile => ({
    id: path,
    path,
    content,
    type: type as ProjectFile['type'],
  });

  it('finds orphaned files not referenced by others', () => {
    const files = [
      makeFile('index.html', '<!DOCTYPE html>'),
      makeFile('src/App.tsx', 'export function App() {}'),
      makeFile('src/old-component.tsx', 'export function OldComponent() {}'),
    ];
    const orphans = findOrphanFiles(files);
    expect(orphans.some(o => o.path === 'src/old-component.tsx')).toBe(true);
  });

  it('does not flag entry points as orphans', () => {
    const files = [
      makeFile('index.html', '<!DOCTYPE html>'),
      makeFile('src/main.tsx', 'import App from "./App"'),
    ];
    const orphans = findOrphanFiles(files);
    expect(orphans.length).toBe(0);
  });

  it('does not flag CSS or config files as orphans', () => {
    const files = [
      makeFile('index.html', '<!DOCTYPE html>'),
      makeFile('styles.css', 'body { margin: 0; }', 'css'),
      makeFile('.eslintrc.json', '{}', 'json'),
    ];
    const orphans = findOrphanFiles(files);
    expect(orphans.length).toBe(0);
  });

  it('detects files referenced by imports', () => {
    const files = [
      makeFile('src/App.tsx', 'export function App() {}'),
      makeFile('src/index.ts', "import { App } from './App';"),
    ];
    const orphans = findOrphanFiles(files);
    expect(orphans.filter(o => o.path === 'src/App.tsx').length).toBe(0);
  });

  it('correctly distinguishes orphaned from non-orphaned files in mixed projects', () => {
    const files = [
      makeFile('index.html', '<!DOCTYPE html>'),
      makeFile('src/App.tsx', 'export function App() {}'),
      makeFile('src/index.ts', "import { App } from './App';"),
      makeFile('src/unused-legacy.ts', 'export function legacy() {}'),
      makeFile('src/dead-util.ts', 'export function format() {}'),
    ];
    const orphans = findOrphanFiles(files);
    expect(orphans.some(o => o.path === 'src/unused-legacy.ts')).toBe(true);
    expect(orphans.some(o => o.path === 'src/dead-util.ts')).toBe(true);
    expect(orphans.some(o => o.path === 'src/App.tsx')).toBe(false);
    expect(orphans.some(o => o.path === 'index.html')).toBe(false);
  });
});

describe('generatePreview', () => {
  it('inlines JSON imports for React previews', () => {
    const files: ProjectFile[] = [
      {
        id: 'app',
        path: 'src/App.jsx',
        type: 'jsx',
        content: `import data from './data.json';

export default function App() {
  return <div>{data.title}</div>;
}`,
      },
      {
        id: 'data',
        path: 'src/data.json',
        type: 'json',
        content: JSON.stringify({ title: 'Hello from JSON' }),
      },
    ];

    const preview = generatePreview(files);

    expect(preview).toContain('const data = {');
    expect(preview).toContain('"title": "Hello from JSON"');
    expect(preview).not.toContain('ReferenceError: data is not defined');
  });
});
