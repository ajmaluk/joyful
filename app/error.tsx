'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled rendering error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="max-w-md">
        <div className="mb-8 text-8xl font-bold text-muted-foreground/20">500</div>
        <h1 className="mb-4 text-3xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mb-2 text-lg text-muted-foreground">
          An unexpected error occurred while rendering this page.
        </p>
        <p className="mb-8 text-sm text-muted-foreground/60 font-mono">
          {error.message || 'Unknown error'}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            Try Again
          </button>
          <Link
            href="/builder"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            Go to Builder
          </Link>
        </div>
      </div>
    </div>
  )
}
