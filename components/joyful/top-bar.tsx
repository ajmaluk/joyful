
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, Undo2, Redo2, RotateCcw, Monitor, Share2, Sparkles, Menu, X, LogOut, Settings, User, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { BrandLogo } from '@/components/joyful/brand-logo'
import { useAuth } from '@/lib/auth-context'
import { signOutUser } from '@/lib/firebase'

const marketingPaths = new Set(['/', '/pricing', '/about', '/templates', '/docs', '/contact', '/privacy', '/terms', '/cookies', '/security', '/support'])

export function TopBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  
  const { theme, setTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = mounted && (theme === 'dark' || (theme === 'system' && systemTheme === 'dark'))
  
  const isWorkspace = pathname?.startsWith('/builder')
  const isMarketingPage = marketingPaths.has(pathname) || (!isWorkspace && !pathname.startsWith('/dashboard') && pathname !== '/builder')

  const { user } = useAuth()
  const userLabel = user?.displayName || user?.email || 'Profile'
  const avatarLetter = userLabel.trim().charAt(0).toUpperCase() || 'U'

  const handleSignOut = async () => {
    await signOutUser()
    setProfileOpen(false)
    setMobileMenuOpen(false)
    window.location.href = '/'
  }

  const cycleTheme = () => {
    const currentTheme = theme === 'system' ? systemTheme : theme
    setTheme(currentTheme === 'dark' ? 'light' : 'dark')
  }

  useEffect(() => {
    if (!isMarketingPage) {
      setIsScrolled(false)
      return
    }

    const scrollContainer = document.querySelector('main')
    const getScrollTop = () => Math.max(window.scrollY, scrollContainer?.scrollTop ?? 0)
    const handleScroll = () => setIsScrolled(getScrollTop() > 10)

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    scrollContainer?.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      scrollContainer?.removeEventListener('scroll', handleScroll)
    }
  }, [isMarketingPage, pathname])

  if (isWorkspace) {
    return null
  }

  if (isMarketingPage) {
    return (
      <header
        className={`fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-center px-4 transition-all duration-300 ${
          isScrolled
            ? 'border-b border-border/40 bg-background/30 shadow-[0_12px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/10 dark:border-white/5 dark:shadow-[0_12px_36px_rgba(0,0,0,0.24)]'
            : 'border-b border-transparent bg-transparent shadow-none'
        }`}
      >
        <div className="flex w-full max-w-7xl items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 transition-all hover:scale-[1.02]"
          >
            <BrandLogo className="h-7 w-7" />
            <span className="text-lg font-bold tracking-tight text-foreground">Joyful</span>
          </Link>

          <nav className="hidden items-center gap-1 text-sm font-medium text-muted-foreground md:flex">
            <Link 
              href="/templates" 
              className="rounded-lg px-4 py-2 transition-colors hover:bg-muted hover:text-foreground"
            >
              Templates
            </Link>
            <Link 
              href="/docs" 
              className="rounded-lg px-4 py-2 transition-colors hover:bg-muted hover:text-foreground"
            >
              Docs
            </Link>
            <Link 
              href="/pricing" 
              className="rounded-lg px-4 py-2 transition-colors hover:bg-muted hover:text-foreground"
            >
              Pricing
            </Link>
          </nav>

          <div className="relative flex items-center gap-3">
            <button
              type="button"
              onClick={cycleTheme}
              className="hidden h-10 w-10 items-center justify-center rounded-lg border border-border bg-background/70 text-muted-foreground transition-colors hover:bg-background hover:text-foreground sm:flex dark:border-white/10 dark:text-white/75"
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
                  className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-sm font-bold text-foreground shadow-lg transition-transform hover:scale-[1.03]"
                  aria-label="Open profile menu"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    avatarLetter
                  )}
                </button>
                {profileOpen && (
                  <div className="absolute right-12 top-12 w-64 overflow-hidden rounded-xl border border-border bg-card p-2 text-left shadow-2xl dark:border-white/10">
                    <div className="border-b border-border px-3 py-2 dark:border-white/8">
                      <p className="truncate text-sm font-bold text-foreground">{userLabel}</p>
                      {user.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
                    </div>
                    <button onClick={() => { setProfileOpen(false); router.push('/builder'); }} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
                      <Sparkles className="h-4 w-4" /> Builder
                    </button>
                    <button onClick={() => { setProfileOpen(false); router.push('/settings'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
                      <Settings className="h-4 w-4" /> Settings
                    </button>
                    <button onClick={() => void handleSignOut()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10">
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push('/login')}
                  className="hidden rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted sm:block dark:border-white/10"
                >
                  Log in
                </button>
                <button
                  onClick={() => router.push('/signup')}
                  className="rounded-xl bg-gradient-to-r from-[#2f5bff] to-[#f23c78] px-5 py-2 text-sm font-bold text-white shadow-lg shadow-[#2f5bff]/20 transition-all hover:scale-[1.02] hover:shadow-xl"
                >
                  Get Started
                </button>
              </>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border md:hidden dark:border-white/10"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="absolute left-4 right-4 top-14 rounded-xl border border-border bg-card p-4 shadow-xl dark:border-white/10 md:hidden">
            <nav className="space-y-1">
              <button onClick={() => { router.push('/templates'); setMobileMenuOpen(false); }} className="block w-full rounded-lg px-4 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                Templates
              </button>
              <button onClick={() => { router.push('/docs'); setMobileMenuOpen(false); }} className="block w-full rounded-lg px-4 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                Docs
              </button>
              <button onClick={() => { router.push('/pricing'); setMobileMenuOpen(false); }} className="block w-full rounded-lg px-4 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                Pricing
              </button>
              <button onClick={() => { cycleTheme(); setMobileMenuOpen(false); }} className="block w-full rounded-lg px-4 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                {isDark ? 'Light theme' : 'Dark theme'}
              </button>
              <div className="border-t border-border pt-2 mt-2 dark:border-white/10">
                {user ? (
                  <>
                    <button onClick={() => { router.push('/builder'); setMobileMenuOpen(false); }} className="block w-full rounded-lg px-4 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                      Builder
                    </button>
                    <button onClick={() => { router.push('/settings'); setMobileMenuOpen(false); }} className="block w-full rounded-lg px-4 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                      Settings
                    </button>
                    <button onClick={() => void handleSignOut()} className="block w-full rounded-lg px-4 py-2 text-left text-sm font-medium text-destructive hover:bg-destructive/10">
                      Sign out
                    </button>
                  </>
                ) : (
                  <button onClick={() => { router.push('/login'); setMobileMenuOpen(false); }} className="block w-full rounded-lg px-4 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                    Log in
                  </button>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>
    )
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex h-12 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md">
      {/* Left cluster */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-85"
        >
          <BrandLogo className="h-6 w-6" />
          <span className="text-base font-semibold text-foreground">Joyful</span>
        </Link>
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
            onClick={() => router.push('/settings')}
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
  )
}
