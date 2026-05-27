'use client'

import type { Command, CommandLog } from '@/components/commands-logs/types'
import type { DataPart } from '@/ai/messages/data-parts'
import type { ChatStatus, DataUIPart } from 'ai'
import { useMonitorState } from '@/components/error-monitor/state'
import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import { Sandbox } from '@/lib/sandbox'
import { saveProject, safeSetItem } from '@/lib/services/storage'

interface SandboxStore {
  addGeneratedFiles: (files: { path: string; content: string }[]) => void
  addLog: (data: { sandboxId: string; cmdId: string; log: CommandLog }) => void
  addPaths: (paths: string[]) => void
  chatStatus: ChatStatus
  clearGeneratedFiles: () => void
  commands: Command[]
  generatedFiles: Set<string>
  paths: string[]
  projectId?: string
  sandboxId?: string
  setChatStatus: (status: ChatStatus) => void
  setProjectId: (id: string) => void
  setSandboxId: (id: string) => void
  setStatus: (status: 'running' | 'stopped') => void
  setUrl: (url: string, uuid: string) => void
  status?: 'running' | 'stopped'
  upsertCommand: (command: Omit<Command, 'startedAt'>) => void
  url?: string
  urlUUID?: string
}

function getBackgroundCommandErrorLines(commands: Command[]) {
  return commands
    .flatMap(({ command, args, background, logs = [] }) =>
      logs.map((log) => ({ command, args, background, ...log }))
    )
    .sort((logA, logB) => logA.timestamp - logB.timestamp)
    .filter((log) => log.stream === 'stderr' && log.background)
}

export function useCommandErrorsLogs() {
  const { commands } = useSandboxStore()
  const errors = useMemo(
    () => getBackgroundCommandErrorLines(commands),
    [commands]
  )
  return { errors }
}

export async function syncProjectFiles(projectId: string, sandboxId: string, filePaths: string[]) {
  if (typeof window === 'undefined') return
  try {
    const sandbox = await Sandbox.get({ sandboxId })
    const fetchedResults = await Promise.all(
      filePaths.map(async (path) => {
        const cleanPath = path.startsWith('/') ? path.substring(1) : path
        try {
          const buf = await sandbox.readFile({ path: cleanPath })
          if (buf) {
            return { path, content: buf.toString('utf8') }
          }
        } catch (err) {
          console.warn(`Failed to fetch file content for ${path}:`, err)
        }
        return null
      })
    )

    const validResults = fetchedResults.filter((r): r is { path: string; content: string } => r !== null)
    if (validResults.length === 0) return

    const existing = JSON.parse(localStorage.getItem(`joyful_project_${projectId}`) || 'null')
    if (!existing) return

    const updatedFiles = [...existing.files]
    for (const result of validResults) {
      const idx = updatedFiles.findIndex((f: any) => f.path === result.path)
      if (idx >= 0) {
        updatedFiles[idx] = result
      } else {
        updatedFiles.push(result)
      }
    }

    existing.files = updatedFiles
    existing.updatedAt = new Date().toISOString()
    saveProject(existing)
  } catch (e) {
    console.warn('Failed to sync project files:', e)
  }
}

export const useSandboxStore = create<SandboxStore>()((set) => ({
  addGeneratedFiles: (files) =>
    set((state) => {
      const filePaths = files.map((f) => f.path)
      const updated = new Set([...state.generatedFiles, ...filePaths])
      const pid = state.projectId
      const sandboxId = state.sandboxId
      if (sandboxId && files.length > 0) {
        Sandbox.get({ sandboxId }).then((sandbox) => {
          sandbox.writeFiles(
            files.map((f) => ({
              path: f.path,
              content: Buffer.from(f.content || '', 'utf8'),
            }))
          )
        }).catch((err) => console.warn('Failed to sync files to sandbox in addGeneratedFiles:', err))
      }
      if (pid && files.length > 0) {
        try {
          const existing = JSON.parse(localStorage.getItem(`joyful_project_${pid}`) || 'null')
          if (existing) {
            const updatedFiles = [...existing.files]
            for (const file of files) {
              const idx = updatedFiles.findIndex((f: any) => f.path === file.path)
              if (idx >= 0) {
                updatedFiles[idx] = file
              } else {
                updatedFiles.push(file)
              }
            }
            existing.files = updatedFiles
            existing.updatedAt = new Date().toISOString()
            saveProject(existing)
          }
        } catch (e) {
          console.warn('Failed to load project for file update', pid, e)
        }
      }
      return { generatedFiles: updated }
    }),
  addLog: (data) => {
    set((state) => {
      const idx = state.commands.findIndex((c) => c.cmdId === data.cmdId)
      if (idx === -1) {
        return state
      }
      const updatedCmds = [...state.commands]
      updatedCmds[idx] = {
        ...updatedCmds[idx],
        logs: [...(updatedCmds[idx].logs ?? []), data.log],
      }
      return { commands: updatedCmds }
    })
  },
  addPaths: (paths) =>
    set((state) => ({ paths: [...new Set([...state.paths, ...paths])] })),
  chatStatus: 'ready',
  clearGeneratedFiles: () => set(() => ({ generatedFiles: new Set<string>() })),
  commands: [],
  generatedFiles: new Set<string>(),
  paths: [],
  projectId: undefined,
  setChatStatus: (status) =>
    set((state) => {
      if (state.chatStatus === status) return state
      const pid = state.projectId
      if (pid) {
        try {
          const existing = JSON.parse(localStorage.getItem(`joyful_project_${pid}`) || 'null')
          if (existing) {
            const isStreaming = status === 'streaming' || status === 'submitted'
            const isError = status === 'error'
            if (isStreaming && existing.buildStatus !== 'building') {
              existing.buildStatus = 'building'
              existing.updatedAt = new Date().toISOString()
              saveProject(existing)
            } else if (isError && existing.buildStatus === 'building') {
              existing.buildStatus = 'interrupted'
              existing.updatedAt = new Date().toISOString()
              saveProject(existing)
            } else if (status === 'ready' && existing.buildStatus === 'building') {
              existing.buildStatus = 'complete'
              existing.updatedAt = new Date().toISOString()
              saveProject(existing)
            }
          }
        } catch (e) {
          console.warn('Failed to load project for status update', pid, e)
        }
      }
      return { chatStatus: status }
    }),
  setProjectId: (projectId) => set(() => ({ projectId })),
  setSandboxId: (sandboxId) =>
    set((state) => {
      if (state.sandboxId === sandboxId) return {}

      const pid = state.projectId
      if (pid && sandboxId) {
        try {
          const savedProject = localStorage.getItem(`joyful_project_${pid}`)
          if (savedProject) {
            const project = JSON.parse(savedProject)
            if (project.files && project.files.length > 0) {
              Sandbox.get({ sandboxId }).then((sandbox) => {
                sandbox.writeFiles(
                  project.files.map((f: any) => ({
                    path: f.path,
                    content: Buffer.from(f.content || '', 'utf8'),
                  }))
                )
              }).catch((err) => console.warn('Failed to sync files on sandbox set:', err))
            }
          }
        } catch (e) {
          console.warn('Failed to read project for sync on sandbox set', e)
        }
      }

      if (state.sandboxId && state.sandboxId !== sandboxId) {
        return {
          sandboxId,
          status: 'running',
          commands: [],
          paths: [],
          url: undefined,
          generatedFiles: new Set<string>(),
        }
      }
      return {
        sandboxId,
        status: 'running',
      }
    }),
  setStatus: (status) => set(() => ({ status })),
  setUrl: (url, urlUUID) => set(() => ({ url, urlUUID })),
  upsertCommand: (cmd) => {
    set((state) => {
      const existingIdx = state.commands.findIndex((c) => c.cmdId === cmd.cmdId)
      const idx = existingIdx !== -1 ? existingIdx : state.commands.length
      const prev = state.commands[idx] ?? { startedAt: Date.now(), logs: [] }
      const cmds = [...state.commands]
      cmds[idx] = { ...prev, ...cmd }
      return { commands: cmds }
    })
  },
}))

interface FileExplorerStore {
  paths: string[]
  addPath: (path: string) => void
}

export const useFileExplorerStore = create<FileExplorerStore>()((set) => ({
  paths: [],
  addPath: (path) => {
    set((state) => {
      if (!state.paths.includes(path)) {
        return { paths: [...state.paths, path] }
      }
      return state
    })
  },
}))

export function useDataStateMapper() {
  const { addPaths, setSandboxId, setUrl, upsertCommand, addGeneratedFiles } =
    useSandboxStore()
  const { errors } = useCommandErrorsLogs()
  const { setCursor } = useMonitorState()

  return (data: DataUIPart<DataPart>) => {
    const storeState = useSandboxStore.getState()
    const activeSandboxId = storeState.sandboxId
    const activeProjectId = storeState.projectId

    switch (data.type) {
      case 'data-create-sandbox':
        if (data.data.sandboxId) {
          setSandboxId(data.data.sandboxId)
        }
        break
      case 'data-generating-files': {
        const incomingSandboxId = data.data.sandboxId
        if (incomingSandboxId && !activeSandboxId) {
          setSandboxId(incomingSandboxId)
        }
        if (data.data.paths && data.data.paths.length > 0) {
          addPaths(data.data.paths)
          addGeneratedFiles(data.data.paths.map((p) => ({ path: p, content: '' })))
        }
        if (data.data.status === 'uploaded') {
          setCursor(errors.length)
          if (data.data.files && data.data.files.length > 0) {
            addGeneratedFiles(data.data.files)
          }
          const finalSandboxId = incomingSandboxId || useSandboxStore.getState().sandboxId
          const finalProjectId = useSandboxStore.getState().projectId || activeProjectId
          if (finalSandboxId && data.data.paths.length > 0) {
            syncProjectFiles(finalProjectId || '', finalSandboxId, data.data.paths)
          }
        }
        break
      }
      case 'data-run-command':
        if (data.data.sandboxId && !activeSandboxId) {
          setSandboxId(data.data.sandboxId)
        }
        if (
          data.data.commandId &&
          (data.data.status === 'executing' || data.data.status === 'running')
        ) {
          upsertCommand({
            background: data.data.status === 'running',
            sandboxId: data.data.sandboxId,
            cmdId: data.data.commandId,
            command: data.data.command,
            args: data.data.args,
          })
        }
        break
      case 'data-get-sandbox-url':
        if (data.data.url) {
          setUrl(data.data.url, crypto.randomUUID())
        }
        break
    }
  }
}

export function useProjectPersistence(projectId?: string) {
  const { setSandboxId, setUrl, addPaths, addGeneratedFiles, upsertCommand, setStatus, setProjectId, setChatStatus } =
    useSandboxStore()

  useEffect(() => {
    if (!projectId) return

    setProjectId(projectId)

    const sandboxKey = `joyful-sandbox-${projectId}`
    const fileExplorerKey = `joyful-file-explorer-${projectId}`

    try {
      const savedSandbox = localStorage.getItem(sandboxKey)
      let sandboxIdToSync: string | undefined
      if (savedSandbox) {
        const parsed = JSON.parse(savedSandbox)
        sandboxIdToSync = parsed.sandboxId
        useSandboxStore.setState({
          projectId,
          commands: parsed.commands || [],
          paths: parsed.paths || [],
          sandboxId: parsed.sandboxId,
          status: parsed.status,
          url: parsed.url,
          urlUUID: parsed.urlUUID,
          generatedFiles: new Set(parsed.generatedFiles || []),
          chatStatus: parsed.chatStatus || 'ready',
        })
      } else {
        useSandboxStore.setState({
          projectId,
          commands: [],
          paths: [],
          sandboxId: undefined,
          status: undefined,
          url: undefined,
          urlUUID: undefined,
          generatedFiles: new Set(),
          chatStatus: 'ready',
        })
      }

      if (sandboxIdToSync) {
        const projectKey = `joyful_project_${projectId}`
        const savedProject = localStorage.getItem(projectKey)
        if (savedProject) {
          const project = JSON.parse(savedProject)
          if (project.files && project.files.length > 0) {
            Sandbox.get({ sandboxId: sandboxIdToSync }).then((sandbox) => {
              sandbox.writeFiles(
                project.files.map((f: any) => ({
                  path: f.path,
                  content: Buffer.from(f.content || '', 'utf8'),
                }))
              )
            }).catch((err) => console.warn('Failed to sync files on load:', err))
          }
        }
      }

      const savedFileExplorer = localStorage.getItem(fileExplorerKey)
      if (savedFileExplorer) {
        const parsed = JSON.parse(savedFileExplorer)
        useFileExplorerStore.setState({
          paths: parsed.paths || [],
        })
      } else {
        useFileExplorerStore.setState({
          paths: [],
        })
      }

      useMonitorState.setState({
        cursor: 0,
        scheduled: false,
      })
    } catch (e) {
      console.error('Failed to load project state', e)
    }

    // Subscribe to state changes and save (throttled)
    let saveTimeout: ReturnType<typeof setTimeout> | null = null
    const scheduleSave = (fn: () => void) => {
      if (saveTimeout) clearTimeout(saveTimeout)
      saveTimeout = setTimeout(fn, 500)
    }

    const unsubSandbox = useSandboxStore.subscribe((state) => {
      scheduleSave(() => {
        const toSave = {
          commands: state.commands,
          paths: state.paths,
          sandboxId: state.sandboxId,
          status: state.status,
          url: state.url,
          urlUUID: state.urlUUID,
          generatedFiles: Array.from(state.generatedFiles),
          chatStatus: state.chatStatus,
        }
        safeSetItem(sandboxKey, JSON.stringify(toSave))
      })
    })

    const unsubFileExplorer = useFileExplorerStore.subscribe((state) => {
      scheduleSave(() => {
        safeSetItem(fileExplorerKey, JSON.stringify({ paths: state.paths }))
      })
    })

    const handleUnloadSave = () => {
      const state = useSandboxStore.getState()
      const fileState = useFileExplorerStore.getState()
      const toSave = {
        commands: state.commands,
        paths: state.paths,
        sandboxId: state.sandboxId,
        status: state.status,
        url: state.url,
        urlUUID: state.urlUUID,
        generatedFiles: Array.from(state.generatedFiles),
        chatStatus: state.chatStatus,
      }
      localStorage.setItem(sandboxKey, JSON.stringify(toSave))
      localStorage.setItem(fileExplorerKey, JSON.stringify({ paths: fileState.paths }))
    }

    window.addEventListener('beforeunload', handleUnloadSave)

    return () => {
      // Save current state immediately — don't rely on throttled save
      if (saveTimeout) {
        clearTimeout(saveTimeout)
        saveTimeout = null
      }
      const finalState = useSandboxStore.getState()
      const finalFileState = useFileExplorerStore.getState()
      const finalToSave = {
        commands: finalState.commands,
        paths: finalState.paths,
        sandboxId: finalState.sandboxId,
        status: finalState.status,
        url: finalState.url,
        urlUUID: finalState.urlUUID,
        generatedFiles: Array.from(finalState.generatedFiles),
        chatStatus: finalState.chatStatus,
      }
      safeSetItem(sandboxKey, JSON.stringify(finalToSave))
      safeSetItem(fileExplorerKey, JSON.stringify({ paths: finalFileState.paths }))

      unsubSandbox()
      unsubFileExplorer()
      window.removeEventListener('beforeunload', handleUnloadSave)
    }
  }, [projectId, setProjectId, setChatStatus])
}
