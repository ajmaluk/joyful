import { useState, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Copy, Download, FileCode2, Sparkles, X } from 'lucide-react';
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

  // Debounced auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSave();
    }, 500);
    return () => clearTimeout(timer);
  }, [content, handleSave]);

  if (!activeFile) {
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-xl border border-gray-300 bg-gray-100 p-5 text-left shadow-2xl shadow-black/20">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-indigo-600">
            <FileCode2 className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-medium text-gray-900">No file selected</h3>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            Open a file from the explorer, or ask the assistant to generate the first version of your site.
          </p>
          <div className="mt-4 rounded-md border border-gray-300 bg-gray-50 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-gray-900">
              <Sparkles className="h-3 w-3 text-indigo-600" />
              Suggested next step
            </div>
            <p className="text-[11px] leading-relaxed text-gray-500">
              Try: “Create a clean SaaS homepage with a hero, features, pricing, FAQ, and mobile layout.”
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-gray-50">
      {/* Tab bar */}
      <div className="flex h-12 flex-shrink-0 items-center justify-between gap-3 overflow-hidden border-b border-gray-300 bg-gray-100">
        <div className="flex min-w-0 flex-1 items-center overflow-x-auto">
          {openFiles.map((file) => {
            const isActive = activeFile?.path === file.path;
            return (
              <button
                key={file.path}
                onClick={() => onSelectFile(file)}
                className={`flex h-full min-w-0 flex-shrink-0 items-center gap-2 border-b-2 px-3 text-xs transition-colors ${
                  isActive
                    ? 'border-b-[#A7ADF8] bg-gray-50 text-gray-900'
                    : 'border-b-transparent bg-gray-100 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="truncate max-w-[120px]">{file.path.split('/').pop()}</span>
                {file.isModified && !readOnly && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] flex-shrink-0" />
                )}
                {!readOnly && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseFile(file);
                    }}
                    className="ml-1 flex-shrink-0 rounded p-0.5 transition-colors hover:bg-gray-200"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1 pr-2">
          <span className="hidden rounded-md border border-gray-300 px-2 py-1 text-[10px] text-gray-600 sm:inline">
            Read-only
          </span>
          <button
            onClick={handleCopy}
            className="rounded-md p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-white"
            title="Copy file"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDownload}
            className="rounded-md p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-white"
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
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            padding: { top: 16 },
            renderLineHighlight: 'all',
            lineHeight: 1.6,
            tabSize: 2,
            bracketPairColorization: { enabled: true },
            readOnly,
            domReadOnly: readOnly,
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
      <div className="flex items-center justify-between border-t border-gray-300 bg-gray-100 px-3 py-1 text-[10px] text-gray-500">
        <span>{getLanguage(activeFile.path).toUpperCase()}</span>
        <span>{activeFile.path}</span>
        <span>UTF-8</span>
      </div>
    </div>
  );
}
