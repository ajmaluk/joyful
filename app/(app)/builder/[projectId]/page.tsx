'use client'

import { Chat } from '@/app/chat'
import { FileExplorer } from '@/app/file-explorer'
import { Horizontal, Vertical } from '@/components/layout/panels'
import { Logs } from '@/app/logs'
import { Preview } from '@/app/preview'
import { TabContent, TabItem } from '@/components/tabs'
import { Welcome } from '@/components/modals/welcome'
import { ContinueBanner } from '@/components/modals/continue-banner'
import { WorkspaceHeader } from '@/components/workspace/workspace-header'
import { ProjectDeletionGuard } from '@/components/project-deletion-guard'
import { useEffect, useState } from 'react'

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [banner, setBanner] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    params.then(({ projectId }) => {
      setProjectId(projectId)
    })
  }, [params])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const hidden = document.cookie.split('; ').find(r => r.startsWith('banner-hidden='))
    if (hidden) {
      try { setBanner(!JSON.parse(hidden.split('=')[1])) } catch { setBanner(true) }
    }
    setReady(true)
  }, [])

  if (!ready || !projectId) {
    return (
      <div className="relative isolate flex h-full flex-col overflow-hidden bg-white dark:bg-[#0e0e10]" />
    )
  }

  return (
    <div className="relative isolate flex h-full flex-col overflow-hidden bg-white dark:bg-[#0e0e10]">
      <div className="flex-none border-b border-gray-200/60 bg-white/90 backdrop-blur-md dark:border-white/10 dark:bg-[#0e0e10]/90">
        <WorkspaceHeader />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-1.5 md:p-2">
        <Welcome defaultOpen={banner} onDismissAction={() => { hideBanner(); setBanner(false) }} />
        <ContinueBanner />
        <ProjectDeletionGuard projectId={projectId} />
        <ul className="flex space-x-5 font-mono text-sm tracking-tight px-1 py-2 md:hidden">
          <TabItem tabId="chat">Chat</TabItem>
          <TabItem tabId="preview">Preview</TabItem>
          <TabItem tabId="file-explorer">File Explorer</TabItem>
          <TabItem tabId="logs">Logs</TabItem>
        </ul>

        <div className="flex flex-1 w-full overflow-hidden pt-2 md:hidden">
          <TabContent tabId="chat" className="flex-1">
            <Chat className="flex-1 overflow-hidden" />
          </TabContent>
          <TabContent tabId="preview" className="flex-1">
            <Preview className="flex-1 overflow-hidden" />
          </TabContent>
          <TabContent tabId="file-explorer" className="flex-1">
            <FileExplorer className="flex-1 overflow-hidden" />
          </TabContent>
          <TabContent tabId="logs" className="flex-1">
            <Logs className="flex-1 overflow-hidden" />
          </TabContent>
        </div>

        <div className="hidden flex-1 w-full min-h-0 overflow-hidden pt-2 md:flex">
          <Horizontal
            defaultLayout={[50, 50]}
            left={<Chat className="flex-1 overflow-hidden" />}
            right={
              <Vertical
                defaultLayout={[33.33, 33.33, 33.33]}
                top={<Preview className="flex-1 overflow-hidden" />}
                middle={<FileExplorer className="flex-1 overflow-hidden" />}
                bottom={<Logs className="flex-1 overflow-hidden" />}
              />
            }
          />
        </div>
      </div>
    </div>
  )
}

function hideBanner() {
  try {
    document.cookie = 'banner-hidden=true; path=/; max-age=2592000; SameSite=Lax'
  } catch {}
}
