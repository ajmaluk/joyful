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
  ChevronDown, ChevronLeft, ChevronRight, Download, X, Menu, User, Settings, LogOut
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChatSidebar, setShowChatSidebar] = useState(true);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const { messages, isGenerating, sendMessage } = useChat(projectId || 'default');

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
      // Merge AI-generated files with existing files
      const newFiles = [...files];
      for (const file of response.files) {
        const existingIdx = newFiles.findIndex(f => f.path === file.path);
        const projectFile: ProjectFile = {
          id: existingIdx >= 0 ? newFiles[existingIdx].id : `file_${Date.now()}_${file.path}`,
          path: file.path,
          content: file.content,
          type: getFileType(file.path),
        };
        if (existingIdx >= 0) {
          newFiles[existingIdx] = projectFile;
        } else {
          newFiles.push(projectFile);
        }
      }
      setFiles(newFiles);
      persistFiles(newFiles);
      const nextActiveFile = newFiles.find(file => file.path === 'index.html') || newFiles[0] || null;
      if (nextActiveFile) {
        setSelectedFile(nextActiveFile);
        setOpenFiles(prev => {
          if (prev.find(file => file.path === nextActiveFile.path)) return prev;
          return [...prev, nextActiveFile];
        });
      }
      addToast('success', `Generated ${response.files.length} file${response.files.length > 1 ? 's' : ''}`);
      setViewMode('preview');
    }
  }, [files, sendMessage, persistFiles, addToast]);

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
    setFiles(prev => {
      const next = prev.map(f => f.path === oldPath ? { ...f, path: newPath } : f);
      persistFiles(next);
      return next;
    });
    setOpenFiles(prev => prev.map(f => f.path === oldPath ? { ...f, path: newPath } : f));
    if (selectedFile?.path === oldPath) {
      setSelectedFile(prev => prev ? { ...prev, path: newPath } : null);
    }
  }, [selectedFile, persistFiles]);

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
    <div className="h-[100dvh] overflow-hidden bg-black p-0 text-gray-900 md:p-2">
      <div className="relative flex h-full min-h-0 overflow-hidden border border-[#1A1A1A] bg-white shadow-2xl shadow-black/60 md:rounded-xl">
        {/* Main workspace area */}
        <aside className={`${sidebarOpen ? 'flex' : 'hidden'} min-h-0 w-[230px] flex-shrink-0 flex-col border-r border-[#1A1A1A] bg-white md:flex xl:w-[260px]`}>
          <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-[#1A1A1A] bg-white px-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-medium text-gray-900">Files</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-gray-700 transition-colors hover:border-gray-400 hover:bg-white"
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
            readOnly
          />
        </aside>

        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed left-3 top-1/2 z-50 -translate-y-1/2 rounded-full border border-[#1A1A1A] bg-white px-3 py-2 text-xs font-medium text-gray-900 shadow-lg transition-colors hover:bg-gray-100"
            title="Open file sidebar"
          >
            Files
          </button>
        )}

        <section className="relative min-w-0 flex-1 min-h-0 overflow-hidden flex flex-col">
          <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-[#1A1A1A] bg-white px-3 gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-600 transition-colors hover:bg-white hover:text-gray-900 md:hidden flex-shrink-0"
                title="Toggle file explorer"
              >
                <Menu className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate('/builder')}
                className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-gray-900 transition-colors hover:text-gray-600 flex-shrink-0"
              >
                <span className="truncate hidden sm:inline">Joyful AI Web Builder</span>
                <span className="truncate sm:hidden">Joyful</span>
                <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
              </button>
              <div className="rounded-lg bg-white p-1 flex-shrink-0 border border-gray-200">
                <button
                  onClick={handleShowPreview}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    viewMode === 'preview'
                      ? 'bg-[#4A4A4D] text-white shadow-sm'
                      : 'text-[#9EA2B2] hover:text-white'
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={handleShowCode}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    viewMode === 'code'
                      ? 'bg-[#4A4A4D] text-white shadow-sm'
                      : 'text-[#9EA2B2] hover:text-white'
                  }`}
                >
                  Code
                </button>
              </div>
            </div>

            <div className="relative flex items-center gap-1 flex-shrink-0">
              <button
                onClick={handleExport}
                className="rounded-md p-1.5 text-[#C9CBD4] transition-colors hover:bg-white hover:text-white"
                title="Export ZIP"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={() => setProfileOpen((open) => !open)}
                className="rounded-md p-1.5 text-[#C9CBD4] transition-colors hover:bg-gray-100 hover:text-gray-900"
                title="Profile"
                aria-label="Open profile menu"
              >
                <User className="h-4 w-4" />
              </button>
              {profileOpen && (
                <div className="absolute right-8 top-10 z-50 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white p-2 text-left shadow-2xl">
                  <div className="border-b border-gray-200 px-3 py-2">
                    <p className="truncate text-sm font-bold text-gray-900">{user?.displayName || user?.email || 'Profile'}</p>
                    {user?.email && <p className="truncate text-xs text-gray-500">{user.email}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setProfileOpen(false); navigate('/settings'); }}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    <Settings className="h-4 w-4" /> Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      void signOutUser().then(() => navigate('/'));
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
              <button
                onClick={() => navigate('/builder')}
                className="rounded-md p-1.5 text-[#C9CBD4] transition-colors hover:bg-white hover:text-white"
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
                readOnly
              />
            ) : (
              <PreviewPanel files={files} />
            )}
          </div>
        </section>

        <aside className={`${showChatSidebar ? 'hidden lg:flex' : 'hidden'} min-h-0 w-[360px] flex-shrink-0 flex-col border-l border-[#1A1A1A] bg-white xl:w-[400px]`}>
          <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-[#1A1A1A] bg-white px-4">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-gray-900">AI Chat</span>
            </div>
            <button
              onClick={() => setShowChatSidebar(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-gray-700 transition-colors hover:border-gray-400 hover:bg-white"
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
              onSendMessage={handleSendMessage}
              onOpenFile={handleOpenFileFromChat}
              onRegenerateMessage={handleRegenerateMessage}
            />
          </div>
        </aside>

        {!showChatSidebar && (
          <button
            onClick={() => setShowChatSidebar(true)}
            className="fixed right-3 top-1/2 z-50 hidden -translate-y-1/2 rounded-full border border-[#1A1A1A] bg-white px-3 py-2 text-xs font-medium text-gray-900 shadow-lg transition-colors hover:bg-gray-100 lg:flex"
            title="Open chat sidebar"
          >
            Chat
          </button>
        )}

        <div className="fixed inset-x-2 bottom-2 z-50 lg:hidden">
          {!mobileChatOpen ? (
            <button
              onClick={() => setMobileChatOpen(true)}
              className="ml-auto flex items-center gap-2 rounded-full border border-[#1A1A1A] bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-xl"
              title="Open AI chat"
            >
              AI Chat
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="overflow-hidden rounded-t-3xl border border-[#1A1A1A] bg-white shadow-2xl shadow-black/50">
              <div className="flex h-12 items-center justify-between border-b border-[#1A1A1A] bg-white px-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">AI Chat</span>
                  <span className="rounded-full border border-gray-300 px-2 py-0.5 text-[10px] text-gray-500">Overlay</span>
                </div>
                <button
                  onClick={() => setMobileChatOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-gray-700"
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
                  onSendMessage={handleSendMessage}
                  onOpenFile={handleOpenFileFromChat}
                  onRegenerateMessage={handleRegenerateMessage}
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
