import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Folder, FolderOpen, ChevronRight, ChevronDown,
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
  const paddingLeft = level * 10 + 10;

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => toggleFolder(node.path)}
          className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left transition-colors hover:bg-gray-100"
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-gray-600" />
          ) : (
            <ChevronRight className="h-3 w-3 text-gray-600" />
          )}
          {isExpanded ? (
            <FolderOpen className="h-3.5 w-3.5 text-yellow-700" />
          ) : (
            <Folder className="h-3.5 w-3.5 text-yellow-700" />
          )}
          <span className="truncate text-xs text-gray-700">{node.name}</span>
        </button>
        {isExpanded && node.children.map((child) => (
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
    );
  }

  const projectFile = allFiles.find(f => f.path === node.path);
  if (!projectFile) return null;

  return (
    <div
      className={`group flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors ${
        isSelected
          ? 'bg-gray-100 text-gray-900'
          : 'hover:bg-gray-100'
      }`}
      style={{ paddingLeft: `${paddingLeft + 16}px` }}
    >
      <button onClick={() => onSelectFile(projectFile)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <FileIcon type={node.fileType || 'other'} />
        <span className={`truncate text-xs ${isSelected ? 'text-gray-900' : 'text-[#A7ABBC]'}`}>
          {node.name}
        </span>
      </button>
      {projectFile.isModified && (
        <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] ml-auto flex-shrink-0" />
      )}
      {!readOnly && (
        <button
          onClick={() => onDeleteFile(projectFile.path)}
          className="rounded p-0.5 text-gray-500 opacity-0 transition-colors hover:bg-gray-200 hover:text-red-300 group-hover:opacity-100"
          title={`Delete ${node.name}`}
        >
          <Trash2 className="h-3 w-3" />
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

  return (
    <div className="flex h-full min-h-0 w-full flex-col border-r border-gray-300 bg-gray-100">
      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b border-gray-300 px-3">
        <div>
          <h3 className="text-[13px] font-medium text-gray-900">Files</h3>
          <p className="text-[10px] text-gray-500">{files.length} item{files.length === 1 ? '' : 's'}{readOnly ? ' · read-only' : ''}</p>
        </div>
        <div className="flex items-center gap-0.5">
          {!readOnly && (
            <>
              <button
                onClick={() => onCreateFile('new-file.html')}
                className="rounded p-1 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                title="New File"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onCreateFile('new-folder/index.html')}
                className="rounded p-1 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                title="New Folder"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button
            onClick={collapseAll}
            className="rounded p-1 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            title="Collapse All"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* File tree */}
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {files.length === 0 ? (
          <div className="mx-3 rounded-lg border border-dashed border-gray-300 bg-gray-100 p-4">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-gray-600">
              <Folder className="h-4 w-4" />
            </div>
            <p className="text-xs font-medium text-gray-900">No project files</p>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
              {readOnly ? 'Generated files will appear here for browsing.' : 'Generate from a prompt or create a file manually.'}
            </p>
            {!readOnly && (
              <button
                onClick={() => onCreateFile('index.html')}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-gray-100 px-2.5 py-1.5 text-[11px] text-gray-900 transition-colors hover:border-gray-400 hover:bg-white"
              >
                <Sparkles className="h-3 w-3 text-indigo-600" />
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
