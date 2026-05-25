import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { ChatProvider } from '@/lib/chat-context'
import { AuthProvider } from '@/lib/auth-context'
import { CommandLogsStream } from '@/components/commands-logs/commands-logs-stream'
import { ErrorMonitor } from '@/components/error-monitor/error-monitor'
import { SandboxState } from '@/components/modals/sandbox-state'
import { Toaster } from '@/components/ui/sonner'
import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const title = 'Joyful Builder'
const description = `Build and iterate on full-stack projects with an AI coding workspace powered by Next.js and the AI SDK.`

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    images: [
      {
        url: 'https://assets.vercel.com/image/upload/v1754588799/OSSvibecodingplatform/OG.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: 'https://assets.vercel.com/image/upload/v1754588799/OSSvibecodingplatform/OG.png',
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Suspense fallback={null}>
            <NuqsAdapter>
              <AuthProvider>
                <ChatProvider>
                  <ErrorMonitor>{children}</ErrorMonitor>
                </ChatProvider>
              </AuthProvider>
            </NuqsAdapter>
          </Suspense>
          <Toaster />
          <CommandLogsStream />
          <SandboxState />
        </ThemeProvider>
      </body>
    </html>
  )
}
