'use client'

import { TopBar } from '@/components/joyful/top-bar'
import { MarketingFooter } from '@/components/joyful/marketing-footer'
import type { ReactNode } from 'react'
import { useRedirectIfAuthed } from '@/hooks/joyful/useRedirectIfAuthed'
import { usePathname } from 'next/navigation'

export default function MarketingLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isHomePage = pathname === '/'
  const { isRedirecting } = useRedirectIfAuthed(isHomePage ? '/builder' : undefined)

  if (isRedirecting && isHomePage) {
    return null
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_20%,#d4dcff_38%,#f0e0ff_56%,#ffe0ec_72%,#fff0e0_100%)] text-foreground dark:bg-[linear-gradient(180deg,#0a0a0a_0%,#161719_20%,#21365f_38%,#3a2040_56%,#4a1030_72%,#4a2010_100%)]">
      <TopBar />
      <main className="pt-14">
        {children}
      </main>
      <MarketingFooter />
    </div>
  )
}
