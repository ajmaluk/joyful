'use client'

import { LeftSidebar } from '@/components/layout/left-sidebar'
import { TopBar } from '@/components/joyful/top-bar'
import type { ReactNode } from 'react'

import { usePathname } from 'next/navigation'

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isWorkspace = Boolean(pathname?.match(/^\/builder\/[^/]+$/))
  const isBuilderDashboard = pathname === '/builder'
  const hideTopBarPadding = isWorkspace || isBuilderDashboard
  const hideSidebar = isWorkspace

  return (
    <div className="flex h-screen overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_20%,#d4dcff_38%,#f0e0ff_56%,#ffe0ec_72%,#fff0e0_100%)] text-foreground dark:bg-[linear-gradient(180deg,#0a0a0a_0%,#161719_20%,#21365f_38%,#3a2040_56%,#4a1030_72%,#4a2010_100%)]">
      <TopBar />
      <div className={`flex h-full min-h-0 w-full ${hideTopBarPadding ? '' : 'pt-12'}`}>
        {!hideSidebar && <LeftSidebar />}
        <main className="min-w-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
