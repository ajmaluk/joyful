import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChatPanel } from '@/components/panels/ChatPanel';
import { FileExplorer } from '@/components/panels/FileExplorer';
import { CodeEditor } from '@/components/panels/CodeEditor';
import { PreviewPanel } from '@/components/panels/PreviewPanel';
import { useChat } from '@/hooks/useChat';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';
import type { Project, ProjectFile } from '@/types';
import { exportProjectAsZip, getFileType, validatePath } from '@/services/fileSystem';
import { useAuth } from '@/hooks/useAuth';
import { signOutUser } from '@/services/firebase';
import {
  ChevronDown, ChevronLeft, ChevronRight, Download, X, Menu, Settings, LogOut, MessageSquare, Sparkles
} from 'lucide-react';

interface BuilderPageProps {
  projects: Project[];
  onUpdateProject: (project: Project) => void;
}

export function BuilderPage({ projects, onUpdateProject }: BuilderPageProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toasts, addToast, removeToast } = useToast();
  const { user } = useAuth();
  const initialPromptRef = useRef<string | null>((location.state as { initialPrompt?: string } | null)?.initialPrompt?.trim() || null);
  const hasSubmittedInitialPrompt = useRef(false);

  // Get or create project
  const project = projects.find(p => p.id === projectId);

  const [files, setFiles] = useState<ProjectFile[]>(project?.files || []);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [openFiles, setOpenFiles] = useState<ProjectFile[]>([]);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('preview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showChatSidebar, setShowChatSidebar] = useState(true);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const { messages, isGenerating, generationStep, sendMessage, clearMessages } = useChat(projectId || 'default');

  const createUniquePath = useCallback((basePath: string) => {
    if (!files.some(file => file.path === basePath)) return basePath;
    const dotIndex = basePath.lastIndexOf('.');
    const name = dotIndex >= 0 ? basePath.slice(0, dotIndex) : basePath;
    const ext = dotIndex >= 0 ? basePath.slice(dotIndex) : '';
    let counter = 2;
    let nextPath = `${name}-${counter}${ext}`;
    while (files.some(file => file.path === nextPath)) {
      counter += 1;
      nextPath = `${name}-${counter}${ext}`;
    }
    return nextPath;
  }, [files]);

  // Load project files
  useEffect(() => {
    if (project) {
      setFiles(project.files);
    }
  }, [project]);

  useEffect(() => {
    if (!mobileChatOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileChatOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileChatOpen]);

  // Persist files to storage
  const persistFiles = useCallback((newFiles: ProjectFile[]) => {
    if (project) {
      const updated = { ...project, files: newFiles, updatedAt: new Date().toISOString() };
      onUpdateProject(updated);
    }
  }, [project, onUpdateProject]);

  // Handle AI message
  const handleSendMessage = useCallback(async (content: string) => {
    const response = await sendMessage(content, files);
    if (response) {
      const newFiles = [...files];
      for (const file of response.files) {
        if (file.action === 'delete') {
          const existingIdx = newFiles.findIndex(f => f.path === file.path);
          if (existingIdx >= 0) newFiles.splice(existingIdx, 1);
          continue;
        }
        const existingIdx = newFiles.findIndex(f => f.path === file.path);
        const projectFile: ProjectFile = {
          id: existingIdx >= 0 ? newFiles[existingIdx].id : `file_${Date.now()}_${file.path}`,
          path: file.path,
          content: file.content || '',
          type: getFileType(file.path),
        };
        if (existingIdx >= 0) {
          newFiles[existingIdx] = projectFile;
        } else {
          newFiles.push(projectFile);
        }
      }
      setFiles(newFiles);
      setOpenFiles(prev => prev.filter(openFile => newFiles.some(file => file.path === openFile.path)));
      if (selectedFile && !newFiles.some(file => file.path === selectedFile.path)) {
        setSelectedFile(newFiles.find(file => file.path === 'index.html') || newFiles[0] || null);
      }
      persistFiles(newFiles);
      const nextActiveFile = newFiles.find(file => file.path === 'index.html') || newFiles[0] || null;
      if (nextActiveFile) {
        setSelectedFile(nextActiveFile);
        setOpenFiles(prev => {
          if (prev.find(file => file.path === nextActiveFile.path)) return prev;
          return [...prev, nextActiveFile];
        });
      }
      const changedCount = response.files.length;
      addToast('success', `Applied ${changedCount} file operation${changedCount > 1 ? 's' : ''}`);
      setViewMode('preview');
    }
  }, [files, selectedFile, sendMessage, persistFiles, addToast]);

  useEffect(() => {
    if (!project || hasSubmittedInitialPrompt.current || !initialPromptRef.current) return;
    hasSubmittedInitialPrompt.current = true;
    const prompt = initialPromptRef.current;
    initialPromptRef.current = null;
    navigate(location.pathname, { replace: true, state: null });
    void handleSendMessage(prompt);
  }, [project, handleSendMessage, navigate, location.pathname]);

  // Open file in editor
  const handleSelectFile = useCallback((file: ProjectFile) => {
    setSelectedFile(file);
    setViewMode('code');
    setOpenFiles(prev => {
      if (prev.find(f => f.path === file.path)) return prev;
      return [...prev, file];
    });
  }, []);

  const handleShowPreview = useCallback(() => {
    setViewMode('preview');
  }, []);

  const handleShowCode = useCallback(() => {
    setViewMode('code');
    if (!selectedFile && files.length > 0) {
      handleSelectFile(files[0]);
    }
  }, [files, selectedFile, handleSelectFile]);

  // Close file tab
  const handleCloseFile = useCallback((file: ProjectFile) => {
    setOpenFiles(prev => {
      const next = prev.filter(f => f.path !== file.path);
      if (selectedFile?.path === file.path) {
        setSelectedFile(next.length > 0 ? next[next.length - 1] : null);
      }
      return next;
    });
  }, [selectedFile]);

  // Update file content
  const handleUpdateFile = useCallback((path: string, content: string) => {
    setFiles(prev => {
      const next = prev.map(f =>
        f.path === path ? { ...f, content, isModified: false } : f
      );
      persistFiles(next);
      return next;
    });
    setOpenFiles(prev =>
      prev.map(f => f.path === path ? { ...f, content, isModified: false } : f)
    );
    if (selectedFile?.path === path) {
      setSelectedFile(prev => prev ? { ...prev, content, isModified: false } : null);
    }
  }, [selectedFile, persistFiles]);

  // Create new file
  const handleCreateFile = useCallback((path: string) => {
    const nextPath = createUniquePath(path);
    if (!validatePath(nextPath)) {
      addToast('error', 'Use a relative file path without traversal.');
      return;
    }
    const newFile: ProjectFile = {
      id: `file_${Date.now()}`,
      path: nextPath,
      content: '',
      type: getFileType(nextPath),
    };
    setFiles(prev => {
      const next = [...prev, newFile];
      persistFiles(next);
      return next;
    });
    handleSelectFile(newFile);
    addToast('success', `Created ${nextPath}`);
  }, [createUniquePath, persistFiles, handleSelectFile, addToast]);

  // Delete file
  const handleDeleteFile = useCallback((path: string) => {
    setFiles(prev => {
      const next = prev.filter(f => f.path !== path);
      persistFiles(next);
      return next;
    });
    setOpenFiles(prev => prev.filter(f => f.path !== path));
    if (selectedFile?.path === path) {
      setSelectedFile(null);
    }
    addToast('info', `Deleted ${path}`);
  }, [selectedFile, persistFiles, addToast]);

  // Rename file
  const handleRenameFile = useCallback((oldPath: string, newPath: string) => {
    const cleanPath = newPath.trim();
    if (!validatePath(cleanPath)) {
      addToast('error', 'Use a relative file path without traversal.');
      return;
    }
    if (files.some(file => file.path === cleanPath && file.path !== oldPath)) {
      addToast('error', `${cleanPath} already exists.`);
      return;
    }
    setFiles(prev => {
      const next = prev.map(f => f.path === oldPath ? { ...f, path: cleanPath, type: getFileType(cleanPath) } : f);
      persistFiles(next);
      return next;
    });
    setOpenFiles(prev => prev.map(f => f.path === oldPath ? { ...f, path: cleanPath, type: getFileType(cleanPath) } : f));
    if (selectedFile?.path === oldPath) {
      setSelectedFile(prev => prev ? { ...prev, path: cleanPath, type: getFileType(cleanPath) } : null);
    }
    addToast('success', `Renamed ${oldPath} to ${cleanPath}`);
  }, [files, selectedFile, persistFiles, addToast]);

  // Open file from chat
  const handleOpenFileFromChat = useCallback((path: string) => {
    const file = files.find(f => f.path === path);
    if (file) handleSelectFile(file);
  }, [files, handleSelectFile]);

  // Regenerate message
  const handleRegenerateMessage = useCallback((messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex >= 0 && messageIndex > 0) {
      // Find the user message before this assistant message
      for (let i = messageIndex - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          handleSendMessage(messages[i].content);
          break;
        }
      }
    }
  }, [messages, handleSendMessage]);

  // Handle export
  const handleExport = useCallback(async () => {
    if (!project) return;
    try {
      await exportProjectAsZip(project);
      addToast('success', 'Project exported as ZIP');
    } catch {
      addToast('error', 'Failed to export project');
    }
  }, [project, addToast]);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-gray-600 mb-4">Project not found</p>
        <button
          onClick={() => navigate('/builder')}
          className="px-4 py-2 bg-[#6366F1] text-white text-sm rounded-lg"
        >
          Go to Builder
        </button>
      </div>
    );
  }

  return (
    <div className="relative isolate h-[100dvh] overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_20%,#d4dcff_38%,#f0e0ff_56%,#ffe0ec_72%,#fff0e0_100%)] p-0 text-foreground dark:bg-[linear-gradient(180deg,#0a0a0a_0%,#161719_20%,#21365f_38%,#3a2040_56%,#4a1030_72%,#4a2010_100%)] md:p-2">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_20%,#d4dcff_38%,#f0e0ff_56%,#ffe0ec_72%,#fff0e0_100%)] dark:bg-[linear-gradient(180deg,#161719_0%,#21365f_20%,#6387ff_38%,#f096dc_56%,#ee397d_76%,#ff713a_100%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.18),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.7)_0%,rgba(255,255,255,0.3)_38%,rgba(255,255,255,0)_100%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_42%),linear-gradient(180deg,rgba(18,19,18,0.72)_0%,rgba(18,19,18,0.12)_34%,rgba(18,19,18,0)_100%)]" />
      <div className="relative flex h-full min-h-0 overflow-hidden border border-white/70 bg-white/78 shadow-2xl shadow-indigo-950/10 backdrop-blur-xl dark:border-border/80 dark:bg-background/95 dark:shadow-black/40 md:rounded-2xl">
        {/* Main workspace area */}
        {sidebarOpen && (
          <button
            type="button"
            className="absolute inset-0 z-30 bg-black/45 md:hidden"
            aria-label="Close file sidebar overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`${sidebarOpen ? 'flex' : 'hidden'} absolute inset-y-0 left-0 z-40 min-h-0 w-[min(86vw,280px)] flex-shrink-0 flex-col border-r border-gray-200/70 bg-white/72 backdrop-blur-xl shadow-2xl shadow-indigo-950/10 transition-all duration-300 dark:border-border/60 dark:bg-card/80 dark:shadow-black/20 md:relative md:z-auto md:w-[248px] md:shadow-none xl:w-[280px]`}>
          <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-gray-200/70 bg-white/62 px-4 backdrop-blur-sm dark:border-border/60 dark:bg-card/50">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/20">
                <span className="text-xs font-bold text-white">P</span>
              </div>
              <span className="truncate text-sm font-semibold text-foreground">Project files</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent hover:text-foreground"
              title="Close file sidebar"
              aria-label="Close file sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
          <FileExplorer
            files={files}
            selectedFile={selectedFile}
            onSelectFile={handleSelectFile}
            onCreateFile={handleCreateFile}
            onDeleteFile={handleDeleteFile}
            onRenameFile={handleRenameFile}
          />
        </aside>

        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute left-3 top-1/2 z-40 -translate-y-1/2 flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/90 px-3 py-2.5 text-xs font-semibold text-foreground shadow-lg shadow-black/20 backdrop-blur-sm transition-all duration-200 hover:border-primary/50 hover:text-primary hover:shadow-xl"
            title="Open file sidebar"
          >
            <Menu className="h-3.5 w-3.5" />
            Files
          </button>
        )}

        <section className="relative min-w-0 flex-1 min-h-0 overflow-hidden flex flex-col">
          <div className="flex h-12 flex-shrink-0 items-center justify-between gap-3 border-b border-gray-200/70 bg-white/62 px-3 shadow-sm backdrop-blur-sm dark:border-border/60 dark:bg-card/50">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="inline-flex flex-shrink-0 items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Open file explorer"
                  aria-label="Open file explorer"
                >
                  <Menu className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => navigate('/builder')}
                className="flex min-w-0 flex-shrink-0 items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-primary"
              >
                <span className="truncate hidden sm:inline">Joyful AI Web Builder</span>
                <span className="truncate sm:hidden">Joyful</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <div className="flex-shrink-0 rounded-xl border border-border/60 bg-background/80 p-1 shadow-inner">
                <button
                  onClick={handleShowPreview}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                    viewMode === 'preview'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/25'
                      : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground'
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={handleShowCode}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                    viewMode === 'code'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/25'
                      : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground'
                  }`}
                >
                  Code
                </button>
              </div>
            </div>

            <div className="relative flex items-center gap-1 flex-shrink-0">
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:bg-accent/80 hover:text-foreground hover:shadow-sm"
                title="Export ZIP"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={() => setProfileOpen((open) => !open)}
                className="flex items-center gap-1.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Profile"
                aria-label="Open profile menu"
              >
                <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-600">
                  {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
                </div>
              </button>
              {profileOpen && (
                <div className="absolute right-8 top-10 z-50 w-64 overflow-hidden rounded-xl border border-border bg-popover text-left shadow-xl">
                  <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                      {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-popover-foreground">{user?.displayName || 'User'}</p>
                      {user?.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
                    </div>
                  </div>
                  <div className="p-1.5">
                    <button
                      type="button"
                      onClick={() => { setProfileOpen(false); navigate('/settings'); }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" /> Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        void signOutUser().then(() => navigate('/'));
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </div>
              )}
              <button
                onClick={() => navigate('/builder')}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Close builder"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {viewMode === 'code' ? (
              <CodeEditor
                files={files}
                openFiles={openFiles}
                activeFile={selectedFile}
                onSelectFile={handleSelectFile}
                onCloseFile={handleCloseFile}
                onUpdateFile={handleUpdateFile}
              />
            ) : (
              <PreviewPanel files={files} />
            )}
          </div>
        </section>

        <aside className={`${showChatSidebar ? 'hidden lg:flex' : 'hidden'} min-h-0 w-[360px] min-w-0 flex-shrink-0 flex-col overflow-x-hidden border-l border-gray-200/70 bg-white/72 backdrop-blur-xl dark:border-border/60 dark:bg-card/80 xl:w-[400px]`}>
          <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-gray-200/70 bg-white/62 px-4 backdrop-blur-sm dark:border-border/60 dark:bg-card/50">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-orange-500 shadow-md shadow-pink-500/20">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="truncate text-sm font-semibold text-foreground">AI Chat</span>
            </div>
            <button
              onClick={() => setShowChatSidebar(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent hover:text-foreground"
              title="Close chat sidebar"
              aria-label="Close chat sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <ChatPanel
              messages={messages}
              isGenerating={isGenerating}
              files={files}
              onSendMessage={handleSendMessage}
              onOpenFile={handleOpenFileFromChat}
              onRegenerateMessage={handleRegenerateMessage}
              onClearMessages={clearMessages}
              generationStep={generationStep}
            />
          </div>
        </aside>

        {!showChatSidebar && (
          <button
            onClick={() => setShowChatSidebar(true)}
            className="absolute right-3 top-1/2 z-40 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl border border-border/60 bg-card/95 text-muted-foreground shadow-lg shadow-black/20 backdrop-blur-sm transition-all duration-200 hover:border-primary/50 hover:bg-accent hover:text-primary lg:flex"
            title="Open chat sidebar"
            aria-label="Open chat sidebar"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        )}

        <div className="fixed inset-x-2 bottom-2 z-50 lg:hidden">
          {!mobileChatOpen ? (
            <button
              onClick={() => setMobileChatOpen(true)}
              className="ml-auto flex items-center gap-2 rounded-full border border-border/60 bg-card/90 px-4 py-2.5 text-sm font-semibold text-foreground shadow-xl backdrop-blur-sm transition-all duration-200 hover:border-primary/50 hover:shadow-2xl"
              title="Open AI chat"
            >
              <Sparkles className="h-4 w-4 text-indigo-500" />
              AI Chat
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="overflow-hidden rounded-t-3xl border border-border/60 bg-card/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
              <div className="flex h-12 items-center justify-between border-b border-border/60 bg-card/50 backdrop-blur-sm px-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-orange-500 shadow-md shadow-pink-500/20">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">AI Chat</span>
                  <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">Overlay</span>
                </div>
                <button
                  onClick={() => setMobileChatOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground"
                  title="Close AI chat"
                  aria-label="Close AI chat"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <div className="h-[min(72dvh,calc(100dvh-4.5rem))] max-h-[calc(100dvh-4.5rem)] overflow-hidden">
                <ChatPanel
                  messages={messages}
                  isGenerating={isGenerating}
                  files={files}
                  onSendMessage={handleSendMessage}
                  onOpenFile={handleOpenFileFromChat}
                  onRegenerateMessage={handleRegenerateMessage}
                  onClearMessages={clearMessages}
                  generationStep={generationStep}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
