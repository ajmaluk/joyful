import { useEffect, useRef, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { virtualFS } from '@/lib/vfs/VirtualFileSystem';
import type { ProjectFile } from '@/types';
import { getFileType } from '@/services/fileSystem';

function vfsPathToProjectPath(vfsPath: string): string {
  return vfsPath.replace(/^\//, '');
}

function projectPathToVFSPath(projectPath: string): string {
  return '/' + projectPath.replace(/^\/+/, '');
}

async function vfsRecordToProjectFile(
  path: string,
  content: string,
): Promise<ProjectFile> {
  const projectPath = vfsPathToProjectPath(path);
  return {
    id: `vfs_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
    path: projectPath,
    content,
    type: getFileType(projectPath),
    isModified: false,
  };
}

export function useVFSBridge(
  setFiles: Dispatch<SetStateAction<ProjectFile[]>>,
  setSelectedFile?: Dispatch<SetStateAction<ProjectFile | null>>,
  setOpenFiles?: Dispatch<SetStateAction<ProjectFile[]>>,
) {
  const syncingRef = useRef(false);
  const subscribedRef = useRef(false);

  // Update selectedFile and openFiles when content changes from external source
  const syncFileInState = useCallback(async (path: string) => {
    const projectPath = vfsPathToProjectPath(path);
    if (setSelectedFile) {
      setSelectedFile((prev) => {
        if (!prev || prev.path !== projectPath) return prev;
        // Stale content detected — re-fetch fresh content
        virtualFS.readFile(path).then((content) => {
          setSelectedFile((prev2) =>
            prev2?.path === projectPath
              ? { ...prev2, content, isModified: false }
              : prev2
          );
        }).catch(() => {});
        return prev; // return unchanged; we update async above
      });
    }
    if (setOpenFiles) {
      setOpenFiles((prev) => {
        const idx = prev.findIndex((f) => f.path === projectPath);
        if (idx === -1) return prev;
        // Re-fetch fresh content
        virtualFS.readFile(path).then((content) => {
          setOpenFiles((prev2) =>
            prev2.map((f) =>
              f.path === projectPath ? { ...f, content, isModified: false } : f
            )
          );
        }).catch(() => {});
        return prev;
      });
    }
  }, [setSelectedFile, setOpenFiles]);

  // Initial full sync: load all VFS files into project state
  const syncVFSAll = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      await virtualFS.init();
      const allFiles = await virtualFS.getAllFiles();
      const projectFiles: ProjectFile[] = [];
      for (const f of allFiles) {
        const name = f.path.split('/').pop() || '';
        if (!name.includes('.')) continue;
        projectFiles.push(await vfsRecordToProjectFile(f.path, f.content));
      }
      setFiles(projectFiles);
    } catch (err) {
      console.error('VFS bridge: initial sync failed', err);
    } finally {
      syncingRef.current = false;
    }
  }, [setFiles]);

  // Subscribe to VFS events for incremental sync
  useEffect(() => {
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    const handleChange = async (path: string) => {
      if (syncingRef.current) return;
      const name = path.split('/').pop() || '';
      if (!name.includes('.')) return;
      try {
        const content = await virtualFS.readFile(path);
        const projectFile = await vfsRecordToProjectFile(path, content);
        setFiles((prev) => {
          const vfsPath = projectPathToVFSPath(projectFile.path);
          const exists = prev.find(f => projectPathToVFSPath(f.path) === vfsPath);
          if (exists) {
            return prev.map(f =>
              projectPathToVFSPath(f.path) === vfsPath
                ? { ...projectFile, id: f.id }
                : f,
            );
          }
          return [...prev, projectFile];
        });
        // Also sync selectedFile/openFiles if they reference this path
        syncFileInState(path);
      } catch {
        // file may have been deleted concurrently
      }
    };

    const handleDelete = (path: string) => {
      if (syncingRef.current) return;
      const projectPath = vfsPathToProjectPath(path);
      setFiles((prev) =>
        prev.filter(f => projectPathToVFSPath(f.path) !== path),
      );
      // Close the file in editor if it was open
      if (setSelectedFile) {
        setSelectedFile((prev) => prev?.path === projectPath ? null : prev);
      }
      if (setOpenFiles) {
        setOpenFiles((prev) => prev.filter((f) => f.path !== projectPath));
      }
    };

    virtualFS.on('create', handleChange);
    virtualFS.on('change', handleChange);
    virtualFS.on('delete', handleDelete);

    return () => {
      subscribedRef.current = false;
      virtualFS.off('create', handleChange);
      virtualFS.off('change', handleChange);
      virtualFS.off('delete', handleDelete);
    };
  }, [setFiles, syncFileInState, setSelectedFile, setOpenFiles]);

  // Write a project file to VFS
  const writeToVFS = useCallback(async (path: string, content: string) => {
    const vfsPath = projectPathToVFSPath(path);
    await virtualFS.writeFile(vfsPath, content);
  }, []);

  // Delete from VFS
  const deleteFromVFS = useCallback(async (path: string) => {
    const vfsPath = projectPathToVFSPath(path);
    if (await virtualFS.fileExists(vfsPath)) {
      await virtualFS.deleteFile(vfsPath);
    }
  }, []);

  // Rename in VFS
  const renameInVFS = useCallback(async (oldPath: string, newPath: string) => {
    const oldVFSPath = projectPathToVFSPath(oldPath);
    const newVFSPath = projectPathToVFSPath(newPath);
    try {
      const content = await virtualFS.readFile(oldVFSPath);
      await virtualFS.writeFile(newVFSPath, content);
      await virtualFS.deleteFile(oldVFSPath);
    } catch {
      // file may not exist in VFS
    }
  }, []);

  return {
    syncVFSAll,
    writeToVFS,
    deleteFromVFS,
    renameInVFS,
  };
}
