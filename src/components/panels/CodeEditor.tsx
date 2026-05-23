import { useState, useCallback, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Copy, Download, FileCode2, FileText, FileJson, Code2, X, Braces, Save, Check, Clock, Zap, FileCode, FileCog } from 'lucide-react';
import type { ProjectFile } from '@/types';
import { getFileType } from '@/services/fileSystem';
import { virtualFS } from '@/lib/vfs/VirtualFileSystem';
import * as storage from '@/services/storage';

interface CodeEditorProps {
  files: ProjectFile[];
  openFiles: ProjectFile[];
  activeFile: ProjectFile | null;
  onSelectFile: (file: ProjectFile) => void;
  onCloseFile: (file: ProjectFile) => void;
  onUpdateFile: (path: string, content: string) => void;
  readOnly?: boolean;
}

type EditorFontFamily = 'jetbrains-mono' | 'fira-code' | 'source-code-pro' | 'ibm-plex-mono';

const FONT_FAMILY_MAP: Record<EditorFontFamily, string> = {
  'jetbrains-mono': "'JetBrains Mono', 'Fira Code', 'SFMono-Regular', monospace",
  'fira-code': "'Fira Code', 'JetBrains Mono', 'SFMono-Regular', monospace",
  'source-code-pro': "'Source Code Pro', 'JetBrains Mono', 'SFMono-Regular', monospace",
  'ibm-plex-mono': "'IBM Plex Mono', 'JetBrains Mono', 'SFMono-Regular', monospace",
};

const FILE_ICONS: Record<string, typeof FileCode2> = {
  html: FileCode2,
  css: FileCode2,
  js: Braces,
  ts: Code2,
  jsx: Code2,
  tsx: Code2,
  json: FileJson,
  md: FileText,
};

const FILE_COLORS: Record<string, string> = {
  html: 'text-orange-400',
  css: 'text-blue-400',
  js: 'text-yellow-400',
  ts: 'text-blue-400',
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
    ts: 'typescript',
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
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSnippets, setShowSnippets] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [lineCount, setLineCount] = useState(0);
  const [editorSettings, setEditorSettings] = useState(() => storage.getSettings());
  const editorRef = useRef<unknown>(null);

  useEffect(() => {
    const syncSettings = () => setEditorSettings(storage.getSettings());
    syncSettings();
    window.addEventListener('joyful_settings_changed', syncSettings);
    return () => window.removeEventListener('joyful_settings_changed', syncSettings);
  }, []);

  // Track content version to detect external updates to the same file reference
  const contentVersionRef = useRef(0);

  // On tab switch, read latest content from VFS cache directly (bypasses stale ProjectFile.content)
  useEffect(() => {
    if (!activeFile) {
      setContent('');
      return;
    }
    let cancelled = false;
    const vfsPath = '/' + activeFile.path.replace(/^\/+/, '');
    virtualFS.fileExists(vfsPath).then((exists) => {
      if (cancelled) return;
      if (exists) {
        virtualFS.readFile(vfsPath).then((vfsContent) => {
          if (cancelled) return;
          setContent(vfsContent);
          setLastSaved(null);
          contentVersionRef.current++;
        }).catch(() => {
          // Fallback to prop content if VFS read fails
          if (!cancelled) {
            setContent(activeFile.content);
            setLastSaved(null);
            contentVersionRef.current++;
          }
        });
      } else {
        // File doesn't exist in VFS yet — use prop content as initial value
        setContent(activeFile.content);
        setLastSaved(null);
        contentVersionRef.current++;
      }
    }).catch(() => {
      if (!cancelled) {
        setContent(activeFile.content);
        setLastSaved(null);
        contentVersionRef.current++;
      }
    });
    return () => { cancelled = true; };
  }, [activeFile]);

  // Poll activeFile content for external changes (VFS bridge updates)
  // This catches cases where the file reference didn't change but content did
  useEffect(() => {
    if (!activeFile) return;
    const interval = setInterval(() => {
      virtualFS.fileExists('/' + activeFile.path.replace(/^\/+/, '')).then((exists) => {
        if (!exists) return;
        virtualFS.readFile('/' + activeFile.path.replace(/^\/+/, '')).then((vfsContent) => {
          setContent((prev) => {
            if (prev === vfsContent) return prev;
            setLastSaved(null);
            contentVersionRef.current++;
            return vfsContent;
          });
        }).catch(() => {});
      }).catch(() => {});
    }, 1000);
    return () => clearInterval(interval);
  }, [activeFile]);

  useEffect(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const lines = content.split('\n').length;
    setWordCount(words);
    setLineCount(lines);
  }, [content]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!readOnly && value !== undefined && activeFile) {
      setContent(value);
    }
  }, [activeFile, readOnly]);

  const handleSave = useCallback(() => {
    if (!readOnly && activeFile && content !== activeFile.content) {
      setIsSaving(true);
      onUpdateFile(activeFile.path, content);
      setLastSaved(new Date());
      setTimeout(() => setIsSaving(false), 600);
    }
  }, [activeFile, content, onUpdateFile, readOnly]);

  const handleFormat = useCallback(() => {
    if (editorRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (editorRef.current as any).getAction('editor.action.formatDocument')?.run();
    }
  }, []);

  const insertSnippet = useCallback((snippet: string) => {
    if (!activeFile || readOnly) return;
    const newContent = content + '\n' + snippet;
    setContent(newContent);
    setShowSnippets(false);
  }, [activeFile, content, readOnly]);

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
    }, 1500);
    return () => clearTimeout(timer);
  }, [content, handleSave]);

  const snippets = activeFile ? getSnippetsForFile(activeFile.path) : [];
  const fontFamily = FONT_FAMILY_MAP[editorSettings.editorFontFamily];
  const editorLineHeight = Math.round(editorSettings.editorFontSize * editorSettings.editorLineHeight);

  if (!activeFile) {
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col items-center justify-center bg-[#0f1115] p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#15181d] p-5 text-left shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-sm">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
              { key: 'Shift+Alt+F', desc: 'Format code' },
              { key: 'Ctrl+Space', desc: 'Insert snippet' },
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
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-[#0f1115]">
      {/* Tab bar */}
      <div className="flex h-10 flex-shrink-0 items-stretch gap-0 border-b border-white/[0.08] bg-[#12151a]">
        <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto px-1 scrollbar-none">
          {openFiles.map((file) => {
            const isActive = activeFile?.path === file.path;
            const Icon = getFileIcon(file.path);
            const iconColor = getFileColor(file.path);
            return (
              <button
                key={file.path}
                onClick={() => onSelectFile(file)}
                className={`group relative flex h-full min-w-0 flex-shrink-0 items-center gap-1.5 border-b-2 px-3 text-xs transition-all duration-150 ${
                  isActive
                    ? 'border-primary bg-[#0f1115] text-gray-100'
                    : 'border-transparent bg-transparent text-gray-500 hover:bg-white/[0.03] hover:text-gray-300'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? iconColor : 'text-gray-600'}`} />
                <span className="max-w-[140px] truncate leading-none">{file.path.split('/').pop()}</span>
                {file.isModified && !readOnly && (
                  <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
                {!readOnly && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseFile(file);
                    }}
                    className="ml-0.5 flex-shrink-0 rounded p-0.5 text-gray-500 transition-colors hover:bg-white/[0.08] hover:text-gray-200"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-shrink-0 items-center gap-0.5 pr-2">
          {/* Auto-save indicator */}
          <div className="mr-1.5 flex items-center gap-1.5">
            {isSaving ? (
              <span className="flex items-center gap-1 text-[10px] text-indigo-400">
                <Clock className="h-3 w-3 animate-spin" />
                Saving...
              </span>
            ) : lastSaved ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <Check className="h-3 w-3" />
                Saved
              </span>
            ) : activeFile?.isModified ? (
              <span className="flex items-center gap-1 text-[10px] text-amber-400">
                <Save className="h-3 w-3" />
                Unsaved
              </span>
            ) : null}
          </div>
          {/* Snippet button */}
          {!readOnly && snippets.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowSnippets(!showSnippets)}
                className="rounded-md p-1.5 text-gray-600 transition-colors hover:bg-white/[0.06] hover:text-gray-200"
                title="Insert snippet"
              >
                <FileCode className="h-3.5 w-3.5" />
              </button>
              {showSnippets && (
                <div className="absolute right-0 top-full z-50 mt-1 w-60 overflow-hidden rounded-xl border border-white/[0.08] bg-[#171b20] shadow-2xl shadow-black/40">
                  <div className="flex items-center justify-between border-b border-white/[0.06] p-2.5">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Snippets</span>
                    <FileCog className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {snippets.map((snippet, i) => (
                      <button
                        key={i}
                        onClick={() => insertSnippet(snippet.code)}
                        className="w-full px-3 py-2 text-left text-xs text-gray-300 transition-colors hover:bg-white/[0.06]"
                      >
                        <div className="font-medium">{snippet.label}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{snippet.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {readOnly && (
            <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-gray-600">
              Read-only
            </span>
          )}
          <button
            onClick={handleFormat}
            className="rounded-md p-1.5 text-gray-600 transition-colors hover:bg-white/[0.06] hover:text-gray-200"
            title="Format code (Shift+Alt+F)"
            aria-label="Format code"
          >
            <Zap className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleCopy}
            className="rounded-md p-1.5 text-gray-600 transition-colors hover:bg-white/[0.06] hover:text-gray-200"
            title="Copy file"
            aria-label="Copy file content"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDownload}
            className="rounded-md p-1.5 text-gray-600 transition-colors hover:bg-white/[0.06] hover:text-gray-200"
            title="Download file"
            aria-label="Download file"
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
            fontSize: editorSettings.editorFontSize,
            fontFamily,
            fontLigatures: true,
            lineNumbers: editorSettings.editorLineNumbers ? 'on' : 'off',
            minimap: { enabled: editorSettings.editorMinimap },
            scrollBeyondLastLine: false,
            wordWrap: editorSettings.editorWordWrap ? 'on' : 'off',
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: 'line',
            lineHeight: editorLineHeight,
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
            lineNumbersMinChars: editorSettings.editorLineNumbers ? 3 : 0,
            formatOnPaste: true,
            formatOnType: true,
          }}
          onMount={(editor) => {
            editorRef.current = editor;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const monaco = (window as any).monaco;
            if (monaco) {
              editor.addCommand(
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
                () => handleSave()
              );
              editor.addCommand(
                monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
                () => handleFormat()
              );
            }
          }}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-white/[0.06] bg-[#111318] px-3 py-1.5">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-medium text-gray-500">{getLanguage(activeFile.path).toUpperCase()}</span>
          <span className="text-[10px] text-gray-700">UTF-8</span>
          <span className="text-[10px] text-gray-700">{lineCount} lines</span>
          <span className="text-[10px] text-gray-700">{wordCount} words</span>
        </div>
        <Breadcrumb path={activeFile.path} />
      </div>
    </div>
  );
}

interface SnippetDef {
  label: string;
  description: string;
  code: string;
}

function getSnippetsForFile(path: string): SnippetDef[] {
  const ext = path.split('.').pop()?.toLowerCase();
  const snippets: Record<string, SnippetDef[]> = {
    html: [
      { label: 'Navbar', description: 'Responsive navigation bar', code: '<nav class="navbar">\n  <div class="logo">Brand</div>\n  <ul class="nav-links">\n    <li><a href="#home">Home</a></li>\n    <li><a href="#about">About</a></li>\n    <li><a href="#contact">Contact</a></li>\n  </ul>\n</nav>' },
      { label: 'Hero Section', description: 'Full-width hero with CTA', code: '<section class="hero">\n  <h1>Welcome to Our Site</h1>\n  <p>A brief description of what we offer.</p>\n  <a href="#cta" class="btn btn-primary">Get Started</a>\n</section>' },
      { label: 'Card Grid', description: '3-column responsive card grid', code: '<div class="grid grid-3">\n  <div class="card">\n    <h3>Feature One</h3>\n    <p>Description of the feature.</p>\n  </div>\n  <div class="card">\n    <h3>Feature Two</h3>\n    <p>Description of the feature.</p>\n  </div>\n  <div class="card">\n    <h3>Feature Three</h3>\n    <p>Description of the feature.</p>\n  </div>\n</div>' },
      { label: 'Contact Form', description: 'Form with name, email, message', code: '<form class="contact-form">\n  <input type="text" placeholder="Your Name" required>\n  <input type="email" placeholder="Your Email" required>\n  <textarea rows="5" placeholder="Your Message" required></textarea>\n  <button type="submit">Send Message</button>\n</form>' },
      { label: 'Footer', description: 'Simple centered footer', code: '<footer>\n  <p>&copy; 2026 Your Company. All rights reserved.</p>\n</footer>' },
    ],
    css: [
      { label: 'CSS Reset', description: 'Basic reset and box-sizing', code: '* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\nhtml {\n  scroll-behavior: smooth;\n}' },
      { label: 'Flex Center', description: 'Flexbox centering utility', code: '.center {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}' },
      { label: 'Grid Layout', description: 'Responsive grid with auto-fit', code: '.grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));\n  gap: 1.5rem;\n}' },
      { label: 'Card Style', description: 'Card with hover effect', code: '.card {\n  background: #fff;\n  border: 1px solid #e5e7eb;\n  border-radius: 12px;\n  padding: 1.5rem;\n  transition: transform 0.2s, box-shadow 0.2s;\n}\n\n.card:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 8px 24px rgba(0,0,0,0.08);\n}' },
      { label: 'Button Styles', description: 'Primary and secondary buttons', code: '.btn {\n  display: inline-block;\n  padding: 0.75rem 1.5rem;\n  border-radius: 8px;\n  font-weight: 600;\n  text-decoration: none;\n  transition: background 0.2s;\n}\n\n.btn-primary {\n  background: #6366F1;\n  color: #fff;\n}\n\n.btn-primary:hover {\n  background: #4F46E5;\n}' },
    ],
    js: [
      { label: 'DOM Ready', description: 'Wait for DOM to load', code: 'document.addEventListener(\'DOMContentLoaded\', () => {\n  console.log(\'DOM ready\');\n});' },
      { label: 'Fetch API', description: 'Async fetch with error handling', code: 'async function fetchData(url) {\n  try {\n    const response = await fetch(url);\n    if (!response.ok) throw new Error(`HTTP ${response.status}`);\n    return await response.json();\n  } catch (error) {\n    console.error(\'Fetch failed:\', error);\n    return null;\n  }\n}' },
      { label: 'Event Delegation', description: 'Efficient event handling', code: 'document.addEventListener(\'click\', (e) => {\n  const button = e.target.closest(\'.btn\');\n  if (button) {\n    console.log(\'Button clicked:\', button.textContent);\n  }\n});' },
      { label: 'Scroll Animation', description: 'Intersection Observer for fade-in', code: 'const observer = new IntersectionObserver(\n  (entries) => {\n    entries.forEach(entry => {\n      if (entry.isIntersecting) {\n        entry.target.classList.add(\'visible\');\n        observer.unobserve(entry.target);\n      }\n    });\n  },\n  { threshold: 0.1 }\n);\n\ndocument.querySelectorAll(\'.fade-up\').forEach(el => observer.observe(el));' },
      { label: 'Form Handler', description: 'Form submit with validation', code: 'document.querySelector(\'form\')?.addEventListener(\'submit\', async (e) => {\n  e.preventDefault();\n  const form = e.target;\n  const data = new FormData(form);\n  console.log(\'Form data:\', Object.fromEntries(data));\n  const notice = document.createElement(\'div\');\n  notice.textContent = \'Form submitted!\';\n  notice.style.cssText = \'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;padding:12px 16px;border-radius:12px;background:#111827;color:white;box-shadow:0 18px 50px rgba(0,0,0,.25);font-weight:700\';\n  document.body.appendChild(notice);\n  setTimeout(() => notice.remove(), 3000);\n  form.reset();\n});' },
    ],
  };
  return snippets[ext || ''] || [];
}
