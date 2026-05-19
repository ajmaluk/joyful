import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChatPanel } from '@/components/panels/ChatPanel';
import { FileExplorer } from '@/components/panels/FileExplorer';
import { CodeEditor } from '@/components/panels/CodeEditor';
import { PreviewPanel } from '@/components/panels/PreviewPanel';
import { useChat } from '@/hooks/useChat';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';
import type { Project, ProjectFile } from '@/types';
import { exportProjectAsZip, getFileType, validatePath } from '@/services/fileSystem';
import {
  ChevronDown, ChevronLeft, Download, Play, X, Menu
} from 'lucide-react';

interface BuilderPageProps {
  projects: Project[];
  onUpdateProject: (project: Project) => void;
}

export function BuilderPage({ projects, onUpdateProject }: BuilderPageProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toasts, addToast, removeToast } = useToast();

  // Get or create project
  const project = projects.find(p => p.id === projectId);

  const [files, setFiles] = useState<ProjectFile[]>(project?.files || []);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [openFiles, setOpenFiles] = useState<ProjectFile[]>([]);
  const [mobileSection, setMobileSection] = useState<'chat' | 'workspace'>('chat');
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('preview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      setMobileSection('workspace');
    }
  }, [files, sendMessage, persistFiles, addToast]);

  // Open file in editor
  const handleSelectFile = useCallback((file: ProjectFile) => {
    setSelectedFile(file);
    setViewMode('code');
    setMobileSection('workspace');
    setOpenFiles(prev => {
      if (prev.find(f => f.path === file.path)) return prev;
      return [...prev, file];
    });
  }, []);

  const handleShowPreview = useCallback(() => {
    setViewMode('preview');
    setMobileSection('workspace');
  }, []);

  const handleShowCode = useCallback(() => {
    setViewMode('code');
    setMobileSection('workspace');
    if (!selectedFile && files.length > 0) {
      handleSelectFile(files[0]);
    }
  }, [files, selectedFile, handleSelectFile]);

  const handleOpenWorkspace = useCallback(() => {
    setMobileSection('workspace');
    setViewMode('preview');
  }, []);

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
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-[#6366F1] text-white text-sm rounded-lg"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden bg-black p-0 text-gray-900 md:p-2">
      <div className="flex h-full min-h-0 overflow-hidden border border-[#1A1A1A] bg-white shadow-2xl shadow-black/60 md:rounded-xl">
        {/* Conversation column */}
        <aside className={`${mobileSection === 'chat' ? 'flex' : 'hidden'} min-h-0 w-full flex-shrink-0 flex-col border-r border-[#1A1A1A] bg-white md:flex md:w-[390px] xl:w-[420px]`}>
          <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-[#1A1A1A] bg-white px-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-gray-900 transition-colors hover:text-white"
              >
                <span className="truncate">Joyful AI Web Builder</span>
                <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
              </button>
            </div>
            <button
              onClick={handleOpenWorkspace}
              className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-gray-900 transition-colors hover:border-gray-400 hover:bg-white hover:text-white md:hidden"
              title="Run preview"
              aria-label="Open code and preview"
            >
              <Play className="h-4 w-4 fill-current" />
            </button>
          </div>
          <ChatPanel
            messages={messages}
            isGenerating={isGenerating}
            onSendMessage={handleSendMessage}
            onOpenFile={handleOpenFileFromChat}
            onRegenerateMessage={handleRegenerateMessage}
          />
        </aside>

        {/* Workspace column */}
        <section className={`${mobileSection === 'workspace' ? 'flex' : 'hidden'} relative min-w-0 flex-1 flex-col md:flex`}>
          <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-[#1A1A1A] bg-white px-3 gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                onClick={() => setMobileSection('chat')}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-gray-100/95 px-3 py-1.5 text-xs font-medium text-gray-900 transition-colors hover:border-gray-400 hover:bg-white hover:text-white md:hidden flex-shrink-0"
                title="Back to chat"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                chat
              </button>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-600 transition-colors hover:bg-white hover:text-gray-900 md:hidden flex-shrink-0"
                title="Toggle file explorer"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="rounded-lg bg-white p-1 flex-shrink-0">
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

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={handleExport}
                className="rounded-md p-1.5 text-[#C9CBD4] transition-colors hover:bg-white hover:text-white"
                title="Export ZIP"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="rounded-md p-1.5 text-[#C9CBD4] transition-colors hover:bg-white hover:text-white"
                title="Close builder"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {viewMode === 'code' ? (
              <div className="flex h-full min-h-0 w-full min-w-0">
                <div className={`${sidebarOpen ? 'flex' : 'hidden'} w-[230px] flex-shrink-0 md:flex xl:w-[260px] flex-col border-r border-[#242424] bg-white`}>
                  <FileExplorer
                    files={files}
                    selectedFile={selectedFile}
                    onSelectFile={handleSelectFile}
                    onCreateFile={handleCreateFile}
                    onDeleteFile={handleDeleteFile}
                    onRenameFile={handleRenameFile}
                    readOnly
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <CodeEditor
                    files={files}
                    openFiles={openFiles}
                    activeFile={selectedFile}
                    onSelectFile={handleSelectFile}
                    onCloseFile={handleCloseFile}
                    onUpdateFile={handleUpdateFile}
                    readOnly
                  />
                </div>
              </div>
            ) : (
              <PreviewPanel files={files} />
            )}
          </div>
        </section>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
