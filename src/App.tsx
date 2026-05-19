import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { LeftSidebar } from '@/components/layout/LeftSidebar';
import { LandingPage } from '@/pages/LandingPage';
import { BuilderPage } from '@/pages/BuilderPage';
import { TemplatesPage } from '@/pages/TemplatesPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { DocsPage } from '@/pages/DocsPage';
import { PricingPage } from '@/pages/PricingPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { BuilderStartPage } from '@/pages/BuilderStartPage';
import { ToastContainer } from '@/components/ui/Toast';
import { useProjects } from '@/hooks/useProjects';
import { useToast } from '@/hooks/useToast';
import { useCallback, useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { UserSettings } from '@/types';
import * as storage from '@/services/storage';
import { SitePage } from '@/pages/SitePage';
import { marketingPaths } from '@/components/marketing/marketingRoutes';
import { AuthProvider } from '@/hooks/AuthProvider';
import { useAuth } from '@/hooks/useAuth';
import { consumePendingPrompt, savePendingPrompt } from '@/services/pendingPrompt';

function AuthGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isAuthed, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-sm font-medium text-muted-foreground">
        Loading Joyful...
      </div>
    );
  }

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { projects, createProject, updateProject } = useProjects();
  const { toasts, addToast, removeToast } = useToast();
  const { isAuthed, isAuthReady } = useAuth();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (theme: UserSettings['theme']) => {
      const shouldUseDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches);
      document.documentElement.classList.toggle('dark', shouldUseDark);
      document.documentElement.style.colorScheme = shouldUseDark ? 'dark' : 'light';
    };

    const syncTheme = () => applyTheme(storage.getSettings().theme);
    const handleSettingsChanged = (event: Event) => {
      applyTheme((event as CustomEvent<UserSettings>).detail.theme);
    };

    syncTheme();
    window.addEventListener('joyful_settings_changed', handleSettingsChanged);
    mediaQuery.addEventListener('change', syncTheme);

    return () => {
      window.removeEventListener('joyful_settings_changed', handleSettingsChanged);
      mediaQuery.removeEventListener('change', syncTheme);
    };
  }, []);

  // Pages without sidebar/topbar
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const isBuilder = location.pathname.match(/^\/builder\/[^/]+$/);
  const isMarketingPage = marketingPaths.has(location.pathname);

  // Show sidebar on all pages except auth and landing
  const showSidebar = !isAuthPage && !isMarketingPage && !isBuilder;
  const showTopBar = isMarketingPage && location.pathname !== '/docs';

  const handleCreateProject = (name: string, description: string) => {
    const project = createProject(name, description);
    addToast('success', `Created project "${name}"`);
    return project;
  };

  const handleStartProject = useCallback((prompt: string) => {
    const trimmedPrompt = prompt.trim();

    if (!isAuthed) {
      savePendingPrompt(trimmedPrompt);
      addToast('info', 'Log in to start building. Your prompt is saved.');
      navigate('/login', { state: { from: '/builder' } });
      return;
    }

    if (!trimmedPrompt) {
      const emptyProject = [...projects]
        .filter((project) => project.status === 'draft' && project.files.length === 0 && storage.getChatHistory(project.id).length === 0)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

      if (emptyProject) {
        navigate(`/builder/${emptyProject.id}`);
        return;
      }

      const project = createProject('Untitled project', 'Fresh blank project');
      navigate(`/builder/${project.id}`);
      addToast('success', 'Opened a fresh project');
      return;
    }

    const cleanName = trimmedPrompt
      .replace(/\s+/g, ' ')
      .slice(0, 54)
      .replace(/[.,;:!?-]+$/g, '')
      .trim();
    const project = createProject(cleanName || 'New Joyful project', trimmedPrompt);
    navigate(`/builder/${project.id}`, { state: { initialPrompt: trimmedPrompt } });
    addToast('success', `Created project "${project.name}"`);
  }, [addToast, createProject, isAuthed, navigate, projects]);

  useEffect(() => {
    if (!isAuthReady || !isAuthed || !isAuthPage) return;

    const pendingPrompt = consumePendingPrompt();
    if (pendingPrompt !== null) {
      handleStartProject(pendingPrompt);
      return;
    }

    const from = (location.state as { from?: string } | null)?.from;
    navigate(from && from !== '/login' && from !== '/signup' ? from : '/builder', { replace: true });
  }, [handleStartProject, isAuthPage, isAuthReady, isAuthed, location.state, navigate]);

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      {showTopBar && <TopBar />}

      <div className="flex h-full min-h-0">
        {showSidebar && (
          <LeftSidebar onNewProject={() => handleStartProject('')} />
        )}

        <main className={`min-w-0 flex-1 ${isMarketingPage ? 'overflow-y-auto' : 'overflow-hidden'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full min-h-0"
            >
              <Routes location={location}>
                <Route path="/" element={isAuthed ? <Navigate to="/builder" replace /> : <LandingPage onStartProject={handleStartProject} />} />
                <Route
                  path="/dashboard"
                  element={<Navigate to="/builder" replace />}
                />
                <Route
                  path="/builder"
                  element={
                    <AuthGate>
                      <BuilderStartPage
                        projects={projects}
                        onStartProject={handleStartProject}
                      />
                    </AuthGate>
                  }
                />
                <Route
                  path="/builder/:projectId"
                  element={
                    <AuthGate>
                      <BuilderPage
                        projects={projects}
                        onUpdateProject={updateProject}
                      />
                    </AuthGate>
                  }
                />
                <Route
                  path="/templates"
                  element={
                    <AuthGate>
                      <TemplatesPage onCreateProject={handleCreateProject} />
                    </AuthGate>
                  }
                />
                <Route path="/settings" element={<AuthGate><SettingsPage /></AuthGate>} />
                <Route path="/docs" element={<DocsPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/blog" element={<SitePage slug="blog" onStartProject={handleStartProject} />} />
                <Route path="/guides" element={<SitePage slug="guides" onStartProject={handleStartProject} />} />
                <Route path="/examples" element={<SitePage slug="examples" onStartProject={handleStartProject} />} />
                <Route path="/support" element={<SitePage slug="support" onStartProject={handleStartProject} />} />
                <Route path="/about" element={<SitePage slug="about" onStartProject={handleStartProject} />} />
                <Route path="/security" element={<SitePage slug="security" onStartProject={handleStartProject} />} />
                <Route path="/contact" element={<SitePage slug="contact" onStartProject={handleStartProject} />} />
                <Route path="/status" element={<SitePage slug="status" onStartProject={handleStartProject} />} />
                <Route path="/privacy" element={<SitePage slug="privacy" onStartProject={handleStartProject} />} />
                <Route path="/terms" element={<SitePage slug="terms" onStartProject={handleStartProject} />} />
                <Route path="/cookies" element={<SitePage slug="cookies" onStartProject={handleStartProject} />} />
                <Route path="/licenses" element={<SitePage slug="licenses" onStartProject={handleStartProject} />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
