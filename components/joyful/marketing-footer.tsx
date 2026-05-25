'use client'

import Link from 'next/link'
import { Github, Twitter, Mail, Heart, Zap } from 'lucide-react'
import { BrandLogo } from '@/components/joyful/brand-logo'
import { marketingFooterLinks, marketingFooterRoutes } from '@/components/joyful/marketing/marketingRoutes'

export function MarketingFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-muted px-4 py-12 shadow-[0_-18px_60px_rgba(15,23,42,0.05)] sm:px-6 lg:px-8 dark:shadow-[0_-18px_60px_rgba(0,0,0,0.24)]">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#2f5bff]/5 dark:to-[#2f5bff]/10" />
      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-8 md:grid-cols-[1.2fr_3fr]">
          <div>
            <Link href="/" className="flex items-center gap-3">
              <BrandLogo className="h-9 w-9" showText />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
              Build beautiful websites in minutes with AI. No coding required, export anytime.
            </p>
            <div className="mt-5 flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="h-4 w-4 text-[#2f5bff]" />
                <span>100% Free</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Heart className="h-4 w-4 text-[#f23c78]" />
                <span>Open Source</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:gap-8">
            {Object.entries(marketingFooterLinks).map(([category, links]) => (
              <div key={category}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{category}</h3>
                <ul className="mt-4 space-y-3">
                  {links.map((link) => (
                    <li key={link}>
                      <Link
                        href={marketingFooterRoutes[link] ?? '/docs'}
                        className="text-left text-sm text-muted-foreground transition-all hover:text-[#2f5bff] hover:translate-x-1"
                      >
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <p className="text-xs text-muted-foreground">&copy; 2026 Joyful. All rights reserved.</p>
            <span className="hidden text-sm text-muted-foreground sm:inline">•</span>
            <p className="text-xs text-muted-foreground/60">Made with care in San Francisco</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-all hover:border-[#2f5bff] hover:text-[#2f5bff]"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-all hover:border-[#2f5bff] hover:text-[#2f5bff]"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href="mailto:hello@joyful.com"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-all hover:border-[#2f5bff] hover:text-[#2f5bff]"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
