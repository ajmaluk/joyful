import { Helmet } from 'react-helmet-async';
import { useState, useCallback } from 'react';
import { routeMeta } from '@/lib/seo';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { uniqueId } from '@/utils/ids';
import {
  ArrowRight, Search, Star, Sparkles, Check,
  Layout, Globe, Heart,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { TemplatePreview } from '@/components/templates/TemplatePreview';
import { appTemplates, templateCategories, type AppTemplate } from '@/data/templates';
import { generateWithAI } from '@/services/aiService';
import { getFileType } from '@/services/fileSystem';
import type { Project, ProjectFile } from '@/types';

interface TemplatesPageProps {
  onCreateProject: (name: string, description: string) => Project;
  onUpdateProject: (project: Project) => void;
}

export function TemplatesPage({ onCreateProject, onUpdateProject }: TemplatesPageProps) {
  const meta = routeMeta['/templates'];
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filtered = appTemplates.filter((template) => {
    const term = search.trim().toLowerCase();
    const matchesCategory = activeCategory === 'All' || template.category === activeCategory;
    const matchesSearch =
      term.length === 0 ||
      template.name.toLowerCase().includes(term) ||
      template.description.toLowerCase().includes(term) ||
      template.features.some((f) => f.toLowerCase().includes(term)) ||
      template.sections.some((s) => s.toLowerCase().includes(term));
    return matchesCategory && matchesSearch;
  });

  const handleUseTemplate = useCallback(async (template: AppTemplate) => {
    if (creatingTemplateId) return;
    setCreatingTemplateId(template.id);
    try {
      const project = onCreateProject(template.name, template.description);
      const response = await generateWithAI(template.prompt, []);
      const files: ProjectFile[] = response.files
        .filter((file) => file.action !== 'delete' && file.content !== undefined)
        .map((file) => ({
          id: uniqueId('file'),
          path: file.path,
          content: file.content || '',
          type: getFileType(file.path),
        }));
      onUpdateProject({
        ...project,
        files,
        templateId: template.id,
        description: template.description,
        updatedAt: new Date().toISOString(),
      });
      navigate(`/builder/${project.id}`);
    } finally {
      setCreatingTemplateId(null);
    }
  }, [creatingTemplateId, onCreateProject, onUpdateProject, navigate]);

  return (
    <div className="h-full overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_20%,#d4dcff_38%,#f0e0ff_56%,#ffe0ec_72%,#fff0e0_100%)] text-gray-950 dark:bg-[linear-gradient(180deg,#0a0a0a_0%,#161719_20%,#21365f_38%,#3a2040_56%,#4a1030_72%,#4a2010_100%)] dark:text-[#f6f2ea]">
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <link rel="canonical" href={meta.canonical} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:url" content={meta.canonical} />
        <meta property="og:description" content={meta.description} />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
      </Helmet>
      <div className="w-full px-4 py-8 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-950 dark:text-white">Template Gallery</h1>
              <p className="text-sm text-gray-600 dark:text-[#aaa69d]">Choose a template and customize it with AI</p>
            </div>
          </div>

          {/* Search and filters */}
          <div className="flex flex-col gap-4 rounded-xl border border-gray-200/60 bg-white/60 p-4 shadow-lg backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between dark:border-white/8 dark:bg-[#17120f]/60">
            <div className="flex flex-wrap gap-2">
              {templateCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition-all duration-200 ${
                    activeCategory === cat
                      ? 'bg-gray-950 text-white shadow-md dark:bg-[#f5f2ea] dark:text-[#171816]'
                      : 'border border-gray-200/60 bg-gray-50/60 text-gray-600 hover:border-gray-300 hover:bg-white hover:text-gray-950 dark:border-white/10 dark:bg-white/[0.03] dark:text-[#aaa69d] dark:hover:border-white/20 dark:hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-[#aaa69d]" />
                <input
                  name="template-search"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search templates..."
                  className="h-10 w-full rounded-lg border border-gray-200/60 bg-white/60 pl-9 pr-4 text-sm font-medium text-gray-950 outline-none placeholder:text-gray-400 focus:border-[#6387ff] focus:ring-2 focus:ring-[#6387ff]/20 sm:w-72 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-[#6f6b64]"
                />
              </div>
              <div className="flex rounded-lg border border-gray-200/60 bg-white/60 p-1 dark:border-white/10 dark:bg-white/[0.03]">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`rounded-md p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-white/10' : 'text-gray-400 hover:text-gray-600 dark:hover:text-white'}`}
                >
                  <Layout className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`rounded-md p-1.5 transition-colors ${viewMode === 'list' ? 'bg-gray-100 dark:bg-white/10' : 'text-gray-400 hover:text-gray-600 dark:hover:text-white'}`}
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Template grid */}
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-4'}>
          <AnimatePresence mode="popLayout">
            {filtered.map((template, index) => (
              <motion.article
                key={template.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className={`group relative flex flex-col overflow-hidden rounded-xl border border-gray-200/60 bg-white/60 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-xl dark:border-white/8 dark:bg-[#211f1b]/60 dark:hover:border-white/18 dark:hover:shadow-[0_18px_60px_rgba(0,0,0,0.38)] ${
                  viewMode === 'list' ? 'sm:flex-row' : ''
                }`}
              >
                {/* Preview area */}
                <div className={`relative overflow-hidden bg-gray-100 dark:bg-[#120f0d] ${viewMode === 'list' ? 'h-44 sm:h-auto sm:w-56 sm:flex-shrink-0' : 'aspect-video'}`}>
                  <button
                    type="button"
                    onClick={() => handleUseTemplate(template)}
                    disabled={creatingTemplateId !== null}
                    aria-label={`Use ${template.name} template`}
                    className="relative block h-full w-full cursor-pointer text-left disabled:cursor-wait"
                  >
                    <TemplatePreview template={template} />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 backdrop-blur-sm transition-all group-hover:bg-black/45 group-hover:opacity-100 group-focus-within:bg-black/45 group-focus-within:opacity-100">
                      <span className={`inline-flex items-center gap-2 rounded-lg bg-gradient-to-r ${template.color} px-4 py-2.5 text-sm font-bold text-white shadow-xl shadow-black/25 ring-1 ring-white/25 transition-transform group-hover:scale-105`}>
                        {creatingTemplateId === template.id ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Building...
                          </>
                        ) : (
                          <>
                            Use Template <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </span>
                    </span>
                  </button>
                  {template.complexity === 'advanced' && (
                    <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                      <Star className="h-3 w-3 fill-white" /> Pro
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className={`flex min-w-0 flex-1 flex-col p-4 ${viewMode === 'list' ? 'sm:min-h-44' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-gray-950 dark:text-white">{template.name}</h3>
                      <p className="mt-1 text-sm leading-5 text-gray-600 dark:text-[#aaa69d] line-clamp-2">{template.description}</p>
                    </div>
                    <button
                      onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-white"
                    >
                      {expandedId === template.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Sections */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {template.sections.slice(0, 4).map((section) => (
                      <span
                        key={section}
                        className="rounded-md bg-gray-100/80 px-2 py-1 text-[10px] font-medium text-gray-600 dark:bg-white/[0.05] dark:text-[#aaa69d]"
                      >
                        {section}
                      </span>
                    ))}
                    {template.sections.length > 4 && (
                      <span className="rounded-md bg-gray-100/80 px-2 py-1 text-[10px] font-medium text-gray-600 dark:bg-white/[0.05] dark:text-[#aaa69d]">
                        +{template.sections.length - 4}
                      </span>
                    )}
                  </div>
                  {/* Expanded details */}
                  <AnimatePresence>
                    {expandedId === template.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-gray-200/60 pt-3 mt-3 dark:border-white/8">
                          <p className="text-xs font-semibold text-gray-950 dark:text-white mb-2">Features</p>
                          <div className="flex flex-wrap gap-1.5">
                            {template.features.map((feature) => (
                              <span
                                key={feature}
                                className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary"
                              >
                                <Check className="h-2.5 w-2.5" />
                                {feature}
                              </span>
                            ))}
                          </div>
                          <button
                            onClick={() => handleUseTemplate(template)}
                            disabled={creatingTemplateId !== null}
                            className={`mt-3 w-full rounded-lg bg-gradient-to-r ${template.color} px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {creatingTemplateId === template.id ? 'Building...' : 'Use this template'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 flex flex-col items-center justify-center rounded-xl border border-gray-200/60 bg-white/60 px-6 py-20 text-center backdrop-blur-sm dark:border-white/8 dark:bg-white/[0.02]"
          >
            <Search className="mb-4 h-8 w-8 text-gray-400 dark:text-[#aaa69d]" />
            <h2 className="text-lg font-bold text-gray-950 dark:text-white">No templates match your search</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-[#aaa69d]">Try another category or keyword, or describe what you want to build.</p>
            <button
              onClick={() => navigate('/builder')}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-[#f5f2ea] dark:text-[#171816] dark:hover:bg-[#e5e2da]"
            >
              Start from scratch <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        {/* Stats */}
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Templates', value: appTemplates.length.toString(), icon: <Layout className="h-5 w-5" /> },
            { label: 'Categories', value: templateCategories.length.toString(), icon: <Globe className="h-5 w-5" /> },
            { label: 'Features', value: '50+', icon: <Sparkles className="h-5 w-5" /> },
            { label: 'Free Forever', value: '$0', icon: <Heart className="h-5 w-5" /> },
          ].map((stat) => (
            <div
              key={stat.label}
              className="group rounded-xl border border-gray-200/60 bg-white/60 p-4 text-center backdrop-blur-sm transition-all duration-300 hover:border-gray-300 hover:bg-white dark:border-white/8 dark:bg-white/[0.03] dark:hover:border-white/16"
            >
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-white">
                {stat.icon}
              </div>
              <p className="text-2xl font-bold text-gray-950 dark:text-white">{stat.value}</p>
              <p className="text-xs text-gray-600 dark:text-[#aaa69d]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
