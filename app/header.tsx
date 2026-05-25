import Link from 'next/link'
import { BrandLogo } from '@/components/joyful/brand-logo'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export function Header({ className }: Props) {
  return (
    <header className={cn('flex items-center justify-between rounded-md border border-border/70 bg-card/70 px-2 py-1.5 backdrop-blur-sm', className)}>
      <Link href="/builder" className="flex items-center gap-2 text-foreground transition-opacity hover:opacity-90">
        <BrandLogo className="h-6 w-6" />
        <span className="hidden text-xs font-semibold uppercase tracking-wide md:inline">Builder Workspace</span>
      </Link>
    </header>
  )
}
