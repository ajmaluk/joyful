"use client";

import type { Command, CommandLog } from '@/components/commands-logs/types'
import type { DataPart } from '@/ai/messages/data-parts'
import type { ChatStatus, DataUIPart } from 'ai'
import { useMonitorState } from '@/components/error-monitor/state'
import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import { saveProject, safeSetItem } from '@/lib/services/storage'

interface SandboxStore {
  addGeneratedFiles: (files: string[]) => void
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

export const useSandboxStore = create<SandboxStore>()((set) => ({
  addGeneratedFiles: (files) =>
    set((state) => {
      const updated = new Set([...state.generatedFiles, ...files])
      const pid = state.projectId
      if (pid && files.length > 0) {
        try {
          const existing = JSON.parse(localStorage.getItem(`joyful_project_${pid}`) || 'null')
          if (existing) {
            const existingPaths = new Set(existing.files.map((f: any) => f.path))
            const newFiles = files.filter((f: string) => !existingPaths.has(f)).map((path: string) => ({ path, content: '' }))
            if (newFiles.length > 0) {
              existing.files = [...existing.files, ...newFiles]
              existing.updatedAt = new Date().toISOString()
              saveProject(existing)
            }
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
  const { addPaths, setSandboxId, setUrl, upsertCommand, addGeneratedFiles, sandboxId } =
    useSandboxStore()
  const { errors } = useCommandErrorsLogs()
  const { setCursor } = useMonitorState()

  return (data: DataUIPart<DataPart>) => {
    switch (data.type) {
      case 'data-create-sandbox':
        if (data.data.sandboxId) {
          setSandboxId(data.data.sandboxId)
        }
        break
      case 'data-generating-files':
        if (data.data.sandboxId && !sandboxId) {
          setSandboxId(data.data.sandboxId)
        }
        if (data.data.status === 'uploaded') {
          setCursor(errors.length)
          addPaths(data.data.paths)
          addGeneratedFiles(data.data.paths)
        }
        break
      case 'data-run-command':
        if (data.data.sandboxId && !sandboxId) {
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

    const sandboxKey = `vibe-sandbox-${projectId}`
    const fileExplorerKey = `vibe-file-explorer-${projectId}`

    // Load initial state
    try {
      const savedSandbox = localStorage.getItem(sandboxKey)
      if (savedSandbox) {
        const parsed = JSON.parse(savedSandbox)
        useSandboxStore.setState({
          commands: parsed.commands || [],
          paths: parsed.paths || [],
          sandboxId: parsed.sandboxId,
          status: parsed.status,
          url: parsed.url,
          urlUUID: parsed.urlUUID,
          generatedFiles: new Set(parsed.generatedFiles || []),
          chatStatus: parsed.chatStatus || 'ready',
        })
      }

      const savedFileExplorer = localStorage.getItem(fileExplorerKey)
      if (savedFileExplorer) {
        const parsed = JSON.parse(savedFileExplorer)
        useFileExplorerStore.setState({
          paths: parsed.paths || [],
        })
      }
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

    return () => {
      if (saveTimeout) clearTimeout(saveTimeout)
      unsubSandbox()
      unsubFileExplorer()
    }
  }, [projectId, setProjectId, setChatStatus])
}
