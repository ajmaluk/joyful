import { useState, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Copy, Download, FileCode2, FileText, FileJson, Code2, X, Braces } from 'lucide-react';
import type { ProjectFile } from '@/types';
import { getFileType } from '@/services/fileSystem';

interface CodeEditorProps {
  files: ProjectFile[];
  openFiles: ProjectFile[];
  activeFile: ProjectFile | null;
  onSelectFile: (file: ProjectFile) => void;
  onCloseFile: (file: ProjectFile) => void;
  onUpdateFile: (path: string, content: string) => void;
  readOnly?: boolean;
}

const FILE_ICONS: Record<string, typeof FileCode2> = {
  html: FileCode2,
  css: FileCode2,
  js: Braces,
  jsx: Code2,
  tsx: Code2,
  json: FileJson,
  md: FileText,
};

const FILE_COLORS: Record<string, string> = {
  html: 'text-orange-400',
  css: 'text-blue-400',
  js: 'text-yellow-400',
  jsx: 'text-cyan-400',
  tsx: 'text-blue-400',
  json: 'text-green-400',
  md: 'text-purple-400',
};

function getLanguage(path: string): string {
  const type = getFileType(path);
  const langMap: Record<string, string> = {
    html: 'html',
    css: 'css',
    js: 'javascript',
    json: 'json',
    jsx: 'javascript',
    tsx: 'typescript',
    md: 'markdown',
  };
  return langMap[type] || 'plaintext';
}

function getFileIcon(path: string) {
  const type = getFileType(path);
  return FILE_ICONS[type] || FileCode2;
}

function getFileColor(path: string) {
  const type = getFileType(path);
  return FILE_COLORS[type] || 'text-gray-400';
}

function Breadcrumb({ path }: { path: string }) {
  const parts = path.split('/');
  return (
    <div className="flex items-center gap-1 text-xs text-gray-400">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-gray-600">/</span>}
          <span className={i === parts.length - 1 ? 'text-gray-300 font-medium' : 'hover:text-gray-300 cursor-default'}>
            {part}
          </span>
        </span>
      ))}
    </div>
  );
}

export function CodeEditor({
  openFiles,
  activeFile,
  onSelectFile,
  onCloseFile,
  onUpdateFile,
  readOnly = false,
}: CodeEditorProps) {
  const [content, setContent] = useState('');

  useEffect(() => {
    if (activeFile) {
      setContent(activeFile.content);
    } else {
      setContent('');
    }
  }, [activeFile]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!readOnly && value !== undefined && activeFile) {
      setContent(value);
    }
  }, [activeFile, readOnly]);

  const handleSave = useCallback(() => {
    if (!readOnly && activeFile && content !== activeFile.content) {
      onUpdateFile(activeFile.path, content);
    }
  }, [activeFile, content, onUpdateFile, readOnly]);

  const handleCopy = useCallback(async () => {
    if (!activeFile) return;
    await navigator.clipboard?.writeText(content);
  }, [activeFile, content]);

  const handleDownload = useCallback(() => {
    if (!activeFile) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = activeFile.path.split('/').pop() || activeFile.path;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [activeFile, content]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSave();
    }, 500);
    return () => clearTimeout(timer);
  }, [content, handleSave]);

  if (!activeFile) {
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col items-center justify-center bg-[#0D0D0F] p-6">
        <div className="w-full max-w-md rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 text-left backdrop-blur-sm">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <FileCode2 className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-medium text-gray-200">No file selected</h3>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            Open a file from the explorer, or ask the AI to generate your site.
          </p>
          <div className="mt-5 space-y-2">
            {[
              { key: 'Ctrl+S', desc: 'Save changes' },
              { key: 'Ctrl+Z', desc: 'Undo' },
              { key: 'Ctrl+Shift+F', desc: 'Format code' },
            ].map(({ key, desc }) => (
              <div key={key} className="flex items-center gap-3 text-xs">
                <kbd className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-gray-400">
                  {key}
                </kbd>
                <span className="text-gray-500">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-[#0D0D0F]">
      {/* Tab bar */}
      <div className="flex h-10 flex-shrink-0 items-center gap-0 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex min-w-0 flex-1 items-center overflow-x-auto scrollbar-none">
          {openFiles.map((file) => {
            const isActive = activeFile?.path === file.path;
            const Icon = getFileIcon(file.path);
            const iconColor = getFileColor(file.path);
            return (
              <button
                key={file.path}
                onClick={() => onSelectFile(file)}
                className={`group relative flex h-full min-w-0 flex-shrink-0 items-center gap-1.5 px-3 text-xs transition-all duration-150 ${
                  isActive
                    ? 'bg-[#0D0D0F] text-gray-200 border-b-2 border-indigo-500'
                    : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] border-b-2 border-transparent'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? iconColor : 'text-gray-600'}`} />
                <span className="truncate max-w-[120px]">{file.path.split('/').pop()}</span>
                {file.isModified && !readOnly && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                )}
                {!readOnly && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseFile(file);
                    }}
                    className="ml-1 flex-shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/[0.08]"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1 pr-3">
          {readOnly && (
            <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-gray-600">
              Read-only
            </span>
          )}
          <button
            onClick={handleCopy}
            className="rounded-md p-1.5 text-gray-600 transition-colors hover:bg-white/[0.06] hover:text-gray-300"
            title="Copy file"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDownload}
            className="rounded-md p-1.5 text-gray-600 transition-colors hover:bg-white/[0.06] hover:text-gray-300"
            title="Download file"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <Editor
          key={activeFile.path}
          value={content}
          language={getLanguage(activeFile.path)}
          theme="vs-dark"
          onChange={handleEditorChange}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontLigatures: true,
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: 'line',
            lineHeight: 1.7,
            tabSize: 2,
            bracketPairColorization: { enabled: true },
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            readOnly,
            domReadOnly: readOnly,
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 3,
          }}
          onMount={(editor) => {
            editor.addCommand(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (window as any).monaco?.KeyMod?.CtrlCmd | (window as any).monaco?.KeyCode?.KeyS,
              () => handleSave()
            );
          }}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-white/[0.06] bg-white/[0.02] px-3 py-1">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-600">{getLanguage(activeFile.path).toUpperCase()}</span>
          <span className="text-[10px] text-gray-700">UTF-8</span>
        </div>
        <Breadcrumb path={activeFile.path} />
      </div>
    </div>
  );
}
