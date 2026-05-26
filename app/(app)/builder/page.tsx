'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, ArrowUp, ChevronDown, Clock, Eye, Grid3X3, ImagePlus, Loader2, Pencil, LogOut, Search, Settings, Sparkles, Trash2, Wand2, X } from 'lucide-react'
import type { ChatAttachment, ChatMode, Project } from '@/lib/types'
import { deleteProject, getProjects, saveProject } from '@/lib/services/storage'
import { useAuth } from '@/lib/auth-context'
import { signOutUser } from '@/lib/firebase'
import { useBackgroundSandboxMonitor } from '@/hooks/use-background-sandbox-monitor'

const MAX_PROJECT_NAME_LENGTH = 54

function createProjectFromPrompt(prompt: string): Project {
  const now = new Date().toISOString()
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const trimmed = prompt.trim()
  const name = (trimmed || 'Untitled Project').slice(0, MAX_PROJECT_NAME_LENGTH)
  return {
    id,
    name,
    files: [],
    updatedAt: now,
    buildStatus: 'idle',
  }
}

function formatDate(value?: string) {
  if (!value) return 'Just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

function readImageAttachment(file: File): Promise<ChatAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type,
        dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
      })
    }
    reader.onerror = () => reject(new Error('Could not attach that image.'))
    reader.readAsDataURL(file)
  })
}

export default function BuilderHubPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useBackgroundSandboxMonitor(10_000)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const consumedQueryRef = useRef(false)
  const submittingRef = useRef(false)

  const { user } = useAuth()
  const userLabel = user?.displayName || user?.email || 'Profile'

  const [projects, setProjects] = useState<Project[]>([])
  const [search, setSearch] = useState('')
  const [prompt, setPrompt] = useState('')
  const [promptAttachment, setPromptAttachment] = useState<ChatAttachment | null>(null)
  const [promptAttachmentError, setPromptAttachmentError] = useState('')

  const refreshProjects = useCallback(() => {
    const sorted = [...getProjects()].sort((a, b) => {
      const aTime = new Date(a.updatedAt ?? 0).getTime()
      const bTime = new Date(b.updatedAt ?? 0).getTime()
      return bTime - aTime
    })
    setProjects(sorted)
  }, [])

  useEffect(() => {
    refreshProjects()
  }, [refreshProjects])

  useEffect(() => {
    const onStorageUpdate = () => refreshProjects()
    window.addEventListener('storage', onStorageUpdate)
    window.addEventListener('joyful_projects_changed', onStorageUpdate)
    return () => {
      window.removeEventListener('storage', onStorageUpdate)
      window.removeEventListener('joyful_projects_changed', onStorageUpdate)
    }
  }, [refreshProjects])

  useEffect(() => {
    if (consumedQueryRef.current) return
    const initialPrompt = searchParams.get('prompt')?.trim()
    if (!initialPrompt) return
    consumedQueryRef.current = true
    const project = createProjectFromPrompt(initialPrompt)
    saveProject(project)
    refreshProjects()
    router.replace(`/builder/${project.id}?prompt=${encodeURIComponent(initialPrompt)}`)
  }, [searchParams, router, refreshProjects])

  const filteredProjects = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return projects
    return projects.filter((project) => project.name.toLowerCase().includes(term))
  }, [projects, search])

  const handlePromptInput = useCallback(() => {
    if (!textareaRef.current) return
    textareaRef.current.style.height = 'auto'
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
  }, [])

  const handlePromptImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const attachment = await readImageAttachment(file)
      setPromptAttachment(attachment)
      setPromptAttachmentError('')
    } catch (error) {
      setPromptAttachment(null)
      setPromptAttachmentError(error instanceof Error ? error.message : 'Could not attach that image.')
    } finally {
      event.target.value = ''
    }
  }

  const handlePromptSubmit = () => {
    if (submittingRef.current) return
    const trimmed = prompt.trim()
    const request = trimmed || (promptAttachment ? 'Use the attached image as a visual reference and build the website from it.' : '')
    if (!request && !promptAttachment) {
      textareaRef.current?.focus()
      return
    }
    submittingRef.current = true
    const project = createProjectFromPrompt(request)
    saveProject(project)
    refreshProjects()
    router.push(`/builder/${project.id}?prompt=${encodeURIComponent(request)}`)
  }

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      handlePromptSubmit()
    }
  }

  const canSubmitPrompt = prompt.trim().length > 0 || Boolean(promptAttachment)

  const handleDeleteProject = (id: string) => {
    deleteProject(id)
    refreshProjects()
  }

  return (
    <div className="relative isolate min-h-full bg-white dark:bg-[#0e0e10]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2f5bff] text-white text-sm font-bold">
              J
            </div>
            <div className="h-6 w-px bg-gray-200 dark:bg-white/10" />
            <nav className="flex items-center gap-1">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-900 bg-gray-100 dark:bg-white/10 dark:text-white"
              >
                Projects
              </button>
              <button
                type="button"
                onClick={() => router.push('/templates')}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-[#aaa69d] dark:hover:text-white"
              >
                Templates
              </button>
              <button
                type="button"
                onClick={() => router.push('/docs')}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-[#aaa69d] dark:hover:text-white"
              >
                Docs
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/settings')}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => router.push(user ? '/builder' : '/login')}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300"
              aria-label="Profile"
            >
              {(user?.displayName || user?.email || 'J')[0].toUpperCase()}
            </button>
          </div>
        </div>

        {/* Hero Input Section */}
        <div className="py-8 sm:py-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl dark:text-white">
              What do you want to build?
            </h1>
            <p className="mt-2 text-base text-gray-600 dark:text-[#aaa69d]">
              Describe your idea and Joyful will build it for you
            </p>
          </div>

          <div className="mx-auto mt-6 max-w-2xl">
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg shadow-black/5 transition-shadow focus-within:border-[#2f5bff] focus-within:shadow-[#2f5bff]/10 dark:border-white/10 dark:bg-[#1a1b1e] dark:focus-within:border-[#6387ff]">
              <textarea
                ref={textareaRef}
                value={prompt}
                rows={2}
                onChange={(event) => {
                  setPrompt(event.target.value)
                  handlePromptInput()
                }}
                onInput={handlePromptInput}
                onKeyDown={handlePromptKeyDown}
                placeholder="Describe your project in plain English..."
                className="block min-h-[56px] w-full resize-none bg-transparent px-4 pt-4 text-base text-gray-900 outline-none placeholder:text-gray-400 dark:text-[#f5f2ea] dark:placeholder:text-[#6f6b64]"
                aria-label="Describe what you want Joyful to build"
              />
              <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2 dark:border-white/5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    aria-label="Attach image"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <ImagePlus className="h-4 w-4" />
                  </button>
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handlePromptImageChange} />
                  {promptAttachment && (
                    <div className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-[#d8d3ca]">
                      <img src={promptAttachment.dataUrl} alt="" className="h-4 w-4 rounded object-cover" />
                      <span className="max-w-[100px] truncate">{promptAttachment.name}</span>
                      <button type="button" onClick={() => setPromptAttachment(null)} aria-label="Remove image" className="hover:text-gray-950 dark:hover:text-white">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePromptSubmit}
                    disabled={!canSubmitPrompt}
                    className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-all ${
                      canSubmitPrompt
                        ? 'bg-[#2f5bff] text-white hover:bg-[#1a4aff]'
                        : 'bg-gray-100 text-gray-400 dark:bg-white/10 dark:text-[#6f6b64]'
                    }`}
                  >
                    <span>Build</span>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div className="pb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-950 dark:text-white">Recent Projects</h2>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="h-9 w-48 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-[#6387ff] focus:ring-2 focus:ring-[#6387ff]/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-[#6f6b64]"
              />
            </div>
          </div>

          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-16 text-center dark:border-white/10 dark:bg-white/[0.02]">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#2f5bff]/10">
                <Sparkles className="h-6 w-6 text-[#2f5bff]" />
              </div>
              <h3 className="text-lg font-bold text-gray-950 dark:text-white">No projects yet</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-[#aaa69d]">
                Describe what you want above and your first project will appear here.
              </p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-gray-50/50 px-6 py-16 text-center dark:border-white/10 dark:bg-white/[0.02]">
              <Search className="mb-3 h-6 w-6 text-gray-400" />
              <h3 className="text-base font-bold text-gray-950 dark:text-white">No matching projects</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <article
                  key={project.id}
                  className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:border-gray-300 hover:shadow-md dark:border-white/10 dark:bg-[#1a1b1e] dark:hover:border-white/20"
                >
                  <button
                    type="button"
                    onClick={() => router.push(`/builder/${project.id}`)}
                    className="relative block aspect-[16/9] w-full overflow-hidden bg-gray-100 text-left dark:bg-[#1a1a18]"
                  >
                    <PreviewThumbnail project={project} />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                      <span className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg">
                        Open Project
                      </span>
                    </div>
                  </button>
                  <div className="p-3">
                    <h3 className="truncate text-sm font-semibold text-gray-950 dark:text-white">{project.name}</h3>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-[#aaa69d]">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(project.updatedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Grid3X3 className="h-3 w-3" />
                          {project.files.length} files
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/builder/${project.id}`)}
                        className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#2f5bff] text-xs font-semibold text-white hover:bg-[#1a4aff] transition-colors"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/builder/${project.id}`)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#2f5bff]/30 hover:text-[#2f5bff] dark:border-white/10 dark:hover:text-white"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(project.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-red-400/40 hover:text-red-500 dark:border-white/10 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PreviewThumbnail({ project }: { project: Project }) {
  if (project.files.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#6387ff]/20 text-[#6387ff]">
          <Wand2 className="h-5 w-5" />
        </div>
      </div>
    )
  }

  const htmlFile = project.files.find(f => /\.html?$/.test(f.path || ''))
  const hasContent = project.files.some(f => f.content && f.content.length > 0)

  if (htmlFile && hasContent) {
    return (
      <iframe
        srcDoc={htmlFile.content}
        className="h-full w-full bg-white"
        sandbox="allow-scripts"
        style={{ pointerEvents: 'none' }}
        title={project.name}
      />
    )
  }

  const fileCount = project.files.length
  const extensions = [...new Set(project.files.map(f => {
    const ext = f.path?.split('.').pop()
    return ext ? `.${ext}` : ''
  }))].filter(Boolean).slice(0, 4).join(' ')

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4 dark:from-[#1a1a18] dark:to-[#2a2a28]">
      <div className="text-center">
        <div className="text-xs font-mono text-gray-400 dark:text-white/30">
          {fileCount} file{fileCount !== 1 ? 's' : ''}
        </div>
        {extensions && (
          <div className="mt-1 text-[10px] font-mono text-gray-400 dark:text-white/20">
            {extensions}
          </div>
        )}
      </div>
    </div>
  )
}
