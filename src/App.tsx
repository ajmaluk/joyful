import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { LeftSidebar } from '@/components/layout/LeftSidebar';
import { LandingPage } from '@/pages/LandingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { BuilderPage } from '@/pages/BuilderPage';
import { BuilderStartPage } from '@/pages/BuilderStartPage';
import { TemplatesPage } from '@/pages/TemplatesPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { DocsPage } from '@/pages/DocsPage';
import { PricingPage } from '@/pages/PricingPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { NewProjectModal } from '@/components/modals/NewProjectModal';
import { ToastContainer } from '@/components/ui/Toast';
import { useProjects } from '@/hooks/useProjects';
import { useToast } from '@/hooks/useToast';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { UserSettings } from '@/types';
import * as storage from '@/services/storage';

function AppLayout() {
  const location = useLocation();
  const { projects, createProject, updateProject, removeProject } = useProjects();
  const { toasts, addToast, removeToast } = useToast();
  const [showNewProject, setShowNewProject] = useState(false);
  const [isAuthed, setIsAuthed] = useState(() => storage.isAuthenticated());

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

  useEffect(() => {
    const handleAuthChanged = (event: Event) => {
      setIsAuthed((event as CustomEvent<boolean>).detail);
    };

    window.addEventListener('joyful_auth_changed', handleAuthChanged);
    return () => window.removeEventListener('joyful_auth_changed', handleAuthChanged);
  }, []);

  // Pages without sidebar/topbar
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const isLanding = location.pathname === '/';
  const isBuilder = location.pathname.startsWith('/builder');

  // Show sidebar on all pages except auth and landing
  const showSidebar = !isAuthPage && !isLanding && !isBuilder;
  const showTopBar = isLanding;

  const handleCreateProject = (name: string, description: string) => {
    const project = createProject(name, description);
    addToast('success', `Created project "${name}"`);
    return project;
  };

  const handleDeleteProject = (id: string) => {
    removeProject(id);
    addToast('info', 'Project deleted');
  };

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      {showTopBar && <TopBar />}

      <div className={`flex h-full min-h-0 ${showTopBar ? 'pt-12' : ''}`}>
        {showSidebar && (
          <LeftSidebar onNewProject={() => setShowNewProject(true)} />
        )}

        <main className={`min-w-0 flex-1 ${isLanding ? 'overflow-y-auto' : 'overflow-hidden'}`}>
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
                <Route path="/" element={isAuthed ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <DashboardPage
                      projects={projects}
                      onCreateProject={handleCreateProject}
                      onDeleteProject={handleDeleteProject}
                    />
                  }
                />
                <Route
                  path="/builder"
                  element={
                    <BuilderStartPage
                      projects={projects}
                      onNewProject={() => setShowNewProject(true)}
                    />
                  }
                />
                <Route
                  path="/builder/:projectId"
                  element={
                    <BuilderPage
                      projects={projects}
                      onUpdateProject={updateProject}
                    />
                  }
                />
                <Route
                  path="/templates"
                  element={
                    <TemplatesPage onCreateProject={handleCreateProject} />
                  }
                />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/docs" element={<DocsPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Modals */}
      <NewProjectModal
        isOpen={showNewProject}
        onClose={() => setShowNewProject(false)}
        onCreate={(name, desc) => {
          handleCreateProject(name, desc);
          setShowNewProject(false);
        }}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
