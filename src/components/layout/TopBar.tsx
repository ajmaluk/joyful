import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, Undo2, Redo2, RotateCcw, Monitor, Share2, Sparkles, Menu, X, LogOut, Settings, User, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { marketingPaths } from '@/components/marketing/marketingRoutes';
import { useAuth } from '@/hooks/useAuth';
import { signOutUser } from '@/services/firebase';
import { useThemeSetting } from '@/hooks/useThemeSetting';

export function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isWorkspace = location.pathname.match(/^\/builder\/[^/]+$/);
  const isMarketingPage = marketingPaths.has(location.pathname);
  const { user } = useAuth();
  const { cycleTheme, isDark } = useThemeSetting();

  const userLabel = user?.displayName || user?.email || 'Profile';
  const avatarLetter = userLabel.trim().charAt(0).toUpperCase() || 'U';

  const handleSignOut = async () => {
    await signOutUser();
    setProfileOpen(false);
    setMobileMenuOpen(false);
    navigate('/');
  };

  useEffect(() => {
    if (!isMarketingPage) {
      setIsScrolled(false);
      return;
    }

    const scrollContainer = document.querySelector('main');
    const getScrollTop = () => Math.max(window.scrollY, scrollContainer?.scrollTop ?? 0);
    const handleScroll = () => setIsScrolled(getScrollTop() > 10);

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    scrollContainer?.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      scrollContainer?.removeEventListener('scroll', handleScroll);
    };
  }, [isMarketingPage, location.pathname]);

  if (isMarketingPage) {
    return (
      <header
        className={`fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-center px-4 transition-all duration-300 ${
          isScrolled
            ? 'border-b border-gray-200/70 bg-white/72 shadow-[0_12px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-[#10110f]/72 dark:shadow-[0_12px_36px_rgba(0,0,0,0.24)]'
            : 'border-b border-transparent bg-transparent shadow-none'
        }`}
      >
        <div className="flex w-full max-w-7xl items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 transition-all hover:scale-[1.02]"
          >
            <BrandLogo className="h-7 w-7" />
            <span className="text-lg font-bold tracking-tight text-gray-950 dark:text-white">Joyful</span>
          </button>

          <nav className="hidden items-center gap-1 text-sm font-medium text-gray-600 md:flex dark:text-white/60">
            <button 
              onClick={() => navigate('/templates')} 
              className="rounded-lg px-4 py-2 transition-colors hover:bg-gray-100 hover:text-gray-950 dark:hover:bg-white/5 dark:hover:text-white"
            >
              Templates
            </button>
            <button 
              onClick={() => navigate('/docs')} 
              className="rounded-lg px-4 py-2 transition-colors hover:bg-gray-100 hover:text-gray-950 dark:hover:bg-white/5 dark:hover:text-white"
            >
              Docs
            </button>
            <button 
              onClick={() => navigate('/pricing')} 
              className="rounded-lg px-4 py-2 transition-colors hover:bg-gray-100 hover:text-gray-950 dark:hover:bg-white/5 dark:hover:text-white"
            >
              Pricing
            </button>
          </nav>

          <div className="relative flex items-center gap-3">
            <button
              type="button"
              onClick={cycleTheme}
              className="hidden h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white/70 text-gray-700 transition-colors hover:bg-white hover:text-gray-950 sm:flex dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Toggle theme"
              title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10 text-sm font-bold text-white shadow-lg shadow-black/10 transition-transform hover:scale-[1.03]"
                  aria-label="Open profile menu"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    avatarLetter
                  )}
                </button>
                {profileOpen && (
                  <div className="absolute right-12 top-12 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white p-2 text-left shadow-2xl dark:border-white/10 dark:bg-[#1d1f1d]">
                    <div className="border-b border-gray-200 px-3 py-2 dark:border-white/8">
                      <p className="truncate text-sm font-bold text-gray-950 dark:text-white">{userLabel}</p>
                      {user.email && <p className="truncate text-xs text-gray-500 dark:text-[#aaa69d]">{user.email}</p>}
                    </div>
                    <button onClick={() => { setProfileOpen(false); navigate('/builder'); }} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/5">
                      <Sparkles className="h-4 w-4" /> Builder
                    </button>
                    <button onClick={() => { setProfileOpen(false); navigate('/settings'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/5">
                      <Settings className="h-4 w-4" /> Settings
                    </button>
                    <button onClick={() => void handleSignOut()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-500/10">
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="hidden rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 sm:block dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5"
                >
                  Log in
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="rounded-xl bg-gradient-to-r from-[#2f5bff] to-[#f23c78] px-5 py-2 text-sm font-bold text-white shadow-lg shadow-[#2f5bff]/20 transition-all hover:scale-[1.02] hover:shadow-xl"
                >
                  Get Started
                </button>
              </>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 md:hidden dark:border-white/10"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="absolute left-4 right-4 top-14 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-[#1d1f1d] md:hidden">
            <nav className="space-y-1">
              <button onClick={() => { navigate('/templates'); setMobileMenuOpen(false); }} className="block w-full rounded-lg px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/5">
                Templates
              </button>
              <button onClick={() => { navigate('/docs'); setMobileMenuOpen(false); }} className="block w-full rounded-lg px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/5">
                Docs
              </button>
              <button onClick={() => { navigate('/pricing'); setMobileMenuOpen(false); }} className="block w-full rounded-lg px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/5">
                Pricing
              </button>
              <button onClick={() => { cycleTheme(); setMobileMenuOpen(false); }} className="block w-full rounded-lg px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/5">
                {isDark ? 'Light theme' : 'Dark theme'}
              </button>
              <div className="border-t border-gray-200 pt-2 mt-2 dark:border-white/10">
                {user ? (
                  <>
                    <button onClick={() => { navigate('/builder'); setMobileMenuOpen(false); }} className="block w-full rounded-lg px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/5">
                      Builder
                    </button>
                    <button onClick={() => { navigate('/settings'); setMobileMenuOpen(false); }} className="block w-full rounded-lg px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/5">
                      Settings
                    </button>
                    <button onClick={() => void handleSignOut()} className="block w-full rounded-lg px-4 py-2 text-left text-sm font-medium text-red-500 hover:bg-red-500/10">
                      Sign out
                    </button>
                  </>
                ) : (
                  <button onClick={() => { navigate('/login'); setMobileMenuOpen(false); }} className="block w-full rounded-lg px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/5">
                    Log in
                  </button>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>
    );
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex h-12 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md">
      {/* Left cluster */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 transition-opacity hover:opacity-85"
        >
          <BrandLogo className="h-6 w-6" />
          <span className="text-base font-semibold text-foreground">Joyful</span>
        </button>
        {isWorkspace && (
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <span>My Project</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Center cluster */}
      {isWorkspace && (
        <div className="hidden items-center gap-2 md:flex">
          <button className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs text-secondary-foreground transition-colors hover:border-primary/50">
            <Sparkles className="w-3.5 h-3.5 text-[#2f5bff]" />
            <span>Local Lite</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          <div className="mx-1 h-5 w-px bg-border" />
          <button className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
            <Undo2 className="w-4 h-4" />
          </button>
          <button className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
            <Redo2 className="w-4 h-4" />
          </button>
          <button className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Right cluster */}
      <div className="flex items-center gap-2">
        {user && !isWorkspace && (
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary text-xs font-bold text-secondary-foreground"
            title="Profile settings"
          >
            <User className="h-4 w-4" />
          </button>
        )}
        {isWorkspace && (
          <>
            <button className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs text-secondary-foreground transition-colors hover:border-primary/50 hover:bg-background">
              <Monitor className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs text-secondary-foreground transition-colors hover:border-primary/50 hover:bg-background">
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
