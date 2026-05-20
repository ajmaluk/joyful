import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Folder, FolderOpen, ChevronDown,
  FileCode, FileJson, FileText, File, Plus, FolderPlus, Minus, Trash2, Sparkles, Pencil, ClipboardCopy, Copy as CopyIcon, Package, GitBranch
} from 'lucide-react';
import type { ProjectFile, FileType } from '@/types';
import { buildFileTree, getFileColor } from '@/services/fileSystem';
import type { FileTreeNode } from '@/services/fileSystem';
import { SiteConfirmDialog, SitePromptDialog } from '@/components/ui/site-dialogs';

interface FileExplorerProps {
  files: ProjectFile[];
  selectedFile: ProjectFile | null;
  onSelectFile: (file: ProjectFile) => void;
  onCreateFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
  readOnly?: boolean;
}

function FileIcon({ type }: { type: FileType }) {
  const color = getFileColor(type);
  switch (type) {
    case 'html': return <FileCode className="w-4 h-4" style={{ color }} />;
    case 'css': return <FileCode className="w-4 h-4" style={{ color }} />;
    case 'js': return <FileCode className="w-4 h-4" style={{ color }} />;
    case 'ts': return <FileCode className="w-4 h-4" style={{ color }} />;
    case 'json': return <FileJson className="w-4 h-4" style={{ color }} />;
    case 'md': return <FileText className="w-4 h-4" style={{ color }} />;
    default: return <File className="w-4 h-4" style={{ color }} />;
  }
}

function TreeNode({
  node,
  level,
  selectedFile,
  onSelectFile,
  allFiles,
  expandedFolders,
  toggleFolder,
  onDeleteFile,
  onRenameFile,
  onDuplicateFile,
  readOnly,
}: {
  node: FileTreeNode;
  level: number;
  selectedFile: ProjectFile | null;
  onSelectFile: (file: ProjectFile) => void;
  allFiles: ProjectFile[];
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
  onDuplicateFile?: (path: string) => void;
  readOnly: boolean;
}) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = node.type === 'file' && selectedFile?.path === node.path;
  const paddingLeft = level * 16 + 12;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (readOnly || node.type !== 'file') return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleAction = (action: string) => {
    setContextMenu(null);
    if (action === 'rename') {
      setRenameOpen(true);
    } else if (action === 'delete') {
      setDeleteOpen(true);
    } else if (action === 'duplicate' && onDuplicateFile) {
      onDuplicateFile(node.path);
    } else if (action === 'copyPath') {
      navigator.clipboard?.writeText(node.path);
    }
  };

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => toggleFolder(node.path)}
          className="mx-1 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left transition-all duration-150 hover:bg-white/[0.06]"
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          <ChevronDown
            className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${
              isExpanded ? 'rotate-0' : '-rotate-90'
            }`}
          />
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-amber-500 transition-colors" />
          ) : (
            <Folder className="h-4 w-4 text-amber-600 transition-colors" />
          )}
          <span className="truncate text-[13px] font-medium text-gray-300">{node.name}</span>
        </button>
        <div
          className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
            isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
          }`}
        >
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              level={level + 1}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              allFiles={allFiles}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              onDeleteFile={onDeleteFile}
              onRenameFile={onRenameFile}
              onDuplicateFile={onDuplicateFile}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>
    );
  }

  const projectFile = allFiles.find(f => f.path === node.path);
  if (!projectFile) return null;

  return (
    <div
      className={`group mx-1 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left transition-all duration-150 ${
        isSelected
          ? 'bg-indigo-500/15 text-indigo-300 shadow-sm ring-1 ring-indigo-400/15'
          : 'hover:bg-white/[0.06]'
      }`}
      style={{ paddingLeft: `${paddingLeft + 20}px` }}
      onContextMenu={handleContextMenu}
    >
      <button onClick={() => onSelectFile(projectFile)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <FileIcon type={node.fileType || 'other'} />
        <span className={`truncate text-[13px] ${isSelected ? 'font-semibold text-indigo-300' : 'text-gray-300'}`}>
          {node.name}
        </span>
      </button>
      {projectFile.isModified && (
        <span className="w-2 h-2 rounded-full bg-primary ml-auto flex-shrink-0 animate-pulse" />
      )}
      {!readOnly && (
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <button
            onClick={() => handleAction('rename')}
            className="rounded p-1 text-gray-500 transition-colors hover:bg-white/[0.08] hover:text-gray-200"
            title={`Rename ${node.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleAction('delete')}
            className="rounded p-1 text-gray-500 transition-colors hover:bg-destructive/10 hover:text-destructive"
            title={`Delete ${node.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && !readOnly && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 w-48 rounded-lg border border-white/[0.08] bg-[#202126] py-1 shadow-xl shadow-black/30"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => handleAction('rename')}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-200 transition-colors hover:bg-white/[0.06]"
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            Rename
          </button>
          {onDuplicateFile && (
            <button
              onClick={() => handleAction('duplicate')}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-200 transition-colors hover:bg-white/[0.06]"
            >
              <CopyIcon className="h-3.5 w-3.5 text-muted-foreground" />
              Duplicate
            </button>
          )}
          <button
            onClick={() => handleAction('copyPath')}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-200 transition-colors hover:bg-white/[0.06]"
          >
            <ClipboardCopy className="h-3.5 w-3.5 text-muted-foreground" />
            Copy Path
          </button>
          <div className="my-1 border-t border-border" />
          <button
            onClick={() => handleAction('delete')}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
      <SitePromptDialog
        open={renameOpen}
        title="Rename file"
        description="Update the file path or name. Folder paths can be included."
        label="File path"
        initialValue={node.path}
        confirmLabel="Rename"
        onOpenChange={setRenameOpen}
        onConfirm={(nextPath) => {
          if (nextPath !== node.path) onRenameFile(node.path, nextPath);
        }}
      />
      <SiteConfirmDialog
        open={deleteOpen}
        title="Delete file?"
        description={`Delete "${node.name}" from this project?`}
        confirmLabel="Delete"
        destructive
        onOpenChange={setDeleteOpen}
        onConfirm={() => {
          onDeleteFile(node.path);
          setDeleteOpen(false);
        }}
      />
    </div>
  );
}

export function FileExplorer({
  files,
  selectedFile,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  onDuplicateFile,
  readOnly = false,
}: FileExplorerProps & { onDuplicateFile?: (path: string) => void }) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const tree = useMemo(() => buildFileTree(files), [files]);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  // Auto-expand folders when a project first loads.
  useEffect(() => {
    const allFolders = new Set<string>();
    function collectFolders(nodes: FileTreeNode[]) {
      for (const node of nodes) {
        if (node.type === 'folder') {
          allFolders.add(node.path);
          collectFolders(node.children);
        }
      }
    }
    collectFolders(tree);
    setExpandedFolders(prev => {
      const next = new Set(prev);
      allFolders.forEach(folder => next.add(folder));
      return next;
    });
  }, [tree]);

  const collapseAll = useCallback(() => setExpandedFolders(new Set()), []);

  const fileCount = files.length;
  const folderCount = useMemo(() => {
    let count = 0;
    function walk(nodes: FileTreeNode[]) {
      for (const node of nodes) {
        if (node.type === 'folder') {
          count += 1;
          walk(node.children);
        }
      }
    }
    walk(tree);
    return count;
  }, [tree]);
  const framework = useMemo(() => {
    if (files.some(file => /^app\/page\.(tsx|jsx)$/i.test(file.path))) return 'Next.js';
    if (files.some(file => /^src\/App\.(tsx|jsx)$/i.test(file.path))) return 'React';
    if (files.some(file => file.path === 'package.json')) return 'Node';
    return 'Static';
  }, [files]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col border-r border-border bg-[#17181d]">
      {/* Header */}
      <div className="border-b border-white/[0.07] px-4 py-3">
        <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/20">
              <Folder className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-100">Explorer</h3>
              <p className="mt-0.5 text-[10px] text-gray-500">
                {fileCount} file{fileCount === 1 ? '' : 's'} · {folderCount} folder{folderCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {!readOnly && (
            <>
              <button
                onClick={() => onCreateFile('new-file.html')}
                className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-gray-200"
                title="New File"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => onCreateFile('new-folder/index.html')}
                className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-gray-200"
                title="New Folder"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={collapseAll}
            className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-gray-200"
            title="Collapse All"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.035] px-2.5 py-2">
            <Package className="h-3.5 w-3.5 text-indigo-300" />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase text-gray-500">Framework</p>
              <p className="truncate text-xs font-semibold text-gray-200">{framework}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.035] px-2.5 py-2">
            <GitBranch className="h-3.5 w-3.5 text-emerald-300" />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase text-gray-500">Mode</p>
              <p className="truncate text-xs font-semibold text-gray-200">{readOnly ? 'Read only' : 'Editable'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* File tree */}
      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-2">
        {files.length === 0 ? (
          <div className="mx-3 mt-4 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.03] p-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground mx-auto">
              <Folder className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No project files</p>
            <p className="text-xs leading-relaxed text-muted-foreground mb-4">
              {readOnly ? 'Generated files will appear here for browsing.' : 'Generate from a prompt or create a file manually.'}
            </p>
            {!readOnly && (
              <button
                onClick={() => onCreateFile('index.html')}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-gray-200 shadow-sm transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                Add index.html
              </button>
            )}
          </div>
        ) : (
          tree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              level={0}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              allFiles={files}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              onDeleteFile={onDeleteFile}
              onRenameFile={onRenameFile}
              onDuplicateFile={onDuplicateFile}
              readOnly={readOnly}
            />
          ))
        )}
      </div>
    </div>
  );
}
