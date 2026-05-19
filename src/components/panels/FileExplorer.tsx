import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Folder, FolderOpen, ChevronDown,
  FileCode, FileJson, FileText, File, Plus, FolderPlus, Minus, Trash2, Sparkles
} from 'lucide-react';
import type { ProjectFile, FileType } from '@/types';
import { buildFileTree, getFileColor } from '@/services/fileSystem';
import type { FileTreeNode } from '@/services/fileSystem';

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
  readOnly: boolean;
}) {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = node.type === 'file' && selectedFile?.path === node.path;
  const paddingLeft = level * 16 + 12;

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => toggleFolder(node.path)}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-all duration-150 hover:bg-muted rounded-md mx-1"
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
          <span className="truncate text-[13px] font-medium text-foreground">{node.name}</span>
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
      className={`group flex w-full items-center gap-2 px-3 py-1.5 text-left transition-all duration-150 rounded-md mx-1 ${
        isSelected
          ? 'bg-primary/10 text-primary shadow-sm'
          : 'hover:bg-muted'
      }`}
      style={{ paddingLeft: `${paddingLeft + 20}px` }}
    >
      <button onClick={() => onSelectFile(projectFile)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <FileIcon type={node.fileType || 'other'} />
        <span className={`truncate text-[13px] ${isSelected ? 'font-semibold text-primary' : 'text-foreground'}`}>
          {node.name}
        </span>
      </button>
      {projectFile.isModified && (
        <span className="w-2 h-2 rounded-full bg-primary ml-auto flex-shrink-0 animate-pulse" />
      )}
      {!readOnly && (
        <button
          onClick={() => onDeleteFile(projectFile.path)}
          className="rounded p-1 text-muted-foreground opacity-0 transition-all duration-150 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          title={`Delete ${node.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function FileExplorer({
  files,
  selectedFile,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  readOnly = false,
}: FileExplorerProps) {
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
    setExpandedFolders(prev => (prev.size === 0 ? allFolders : prev));
  }, [tree]);

  const collapseAll = useCallback(() => setExpandedFolders(new Set()), []);

  const fileCount = files.length;

  return (
    <div className="flex h-full min-h-0 w-full flex-col border-r border-border bg-muted/30">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <Folder className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Files</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {fileCount} item{fileCount === 1 ? '' : 's'}{readOnly ? ' · read-only' : ''}
              </p>
            </div>
          </div>
          {fileCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {fileCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {!readOnly && (
            <>
              <button
                onClick={() => onCreateFile('new-file.html')}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="New File"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => onCreateFile('new-folder/index.html')}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="New Folder"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={collapseAll}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Collapse All"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* File tree */}
      <div className="min-h-0 flex-1 overflow-y-auto py-2 px-1">
        {files.length === 0 ? (
          <div className="mx-3 mt-4 rounded-xl border border-dashed border-border bg-card p-6 text-center">
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
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary shadow-sm"
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
              readOnly={readOnly}
            />
          ))
        )}
      </div>
    </div>
  );
}
