import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, Star } from 'lucide-react';
import { generateWithAI } from '@/services/aiService';
import { getFileType } from '@/services/fileSystem';
import type { Project, ProjectFile } from '@/types';

interface TemplatesPageProps {
  onCreateProject: (name: string, description: string) => Project;
  onUpdateProject: (project: Project) => void;
}

const categories = ['All', 'Portfolio', 'SaaS', 'Business', 'Dashboard', 'Content', 'Tech'];

const templates = [
  { id: 'portfolio', name: 'Portfolio', description: 'A modern personal portfolio to showcase your work and skills.', category: 'Portfolio', image: '/templates/portfolio.jpg', tags: ['Personal', 'Creative'], prompt: 'Create a polished developer portfolio with hero, about, projects, and contact sections' },
  { id: 'saas', name: 'SaaS Landing Page', description: 'Convert visitors into customers with this high-converting landing page.', category: 'SaaS', image: '/templates/saas.jpg', tags: ['Business', 'Startup'], prompt: 'Build a SaaS landing page with features, pricing, testimonials, and a strong call to action' },
  { id: 'restaurant', name: 'Restaurant', description: 'Elegant restaurant website with menu, reservations, and gallery.', category: 'Business', image: '/templates/restaurant.jpg', tags: ['Food', 'Hospitality'], prompt: 'Build an elegant restaurant website with menu, story, reservation form, and warm premium styling' },
  { id: 'dashboard', name: 'Admin Dashboard', description: 'Data-rich admin panel with charts, tables, and analytics.', category: 'Dashboard', image: '/templates/dashboard.jpg', tags: ['Admin', 'Analytics'], prompt: 'Build an analytics dashboard landing page with metrics, charts, feature cards, and navigation' },
  { id: 'blog', name: 'Blog', description: 'Clean, readable blog layout for content creators and writers.', category: 'Content', image: '/templates/blog.jpg', tags: ['Writing', 'Media'], prompt: 'Create an editorial blog with article listings, newsletter signup, and clean readable typography' },
  { id: 'ai-tool', name: 'AI Tool Website', description: 'Futuristic landing page for AI-powered products and tools.', category: 'Tech', image: '/templates/ai-tool.jpg', tags: ['AI', 'Tech'], prompt: 'Build a futuristic SaaS landing page for an AI tool with features, pricing, testimonials, and dark premium styling' },
];

export function TemplatesPage({ onCreateProject, onUpdateProject }: TemplatesPageProps) {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);

  const filtered = templates.filter((template) => {
    const term = search.trim().toLowerCase();
    const matchesCategory = activeCategory === 'All' || template.category === activeCategory;
    const matchesSearch =
      term.length === 0 ||
      template.name.toLowerCase().includes(term) ||
      template.description.toLowerCase().includes(term) ||
      template.tags.some((tag) => tag.toLowerCase().includes(term));
    return matchesCategory && matchesSearch;
  });

  const handleUseTemplate = async (template: (typeof templates)[number]) => {
    if (creatingTemplateId) return;
    setCreatingTemplateId(template.id);
    try {
      const project = onCreateProject(template.name, template.description);
      const response = await generateWithAI(template.prompt, []);
      const files: ProjectFile[] = response.files
        .filter((file) => file.action !== 'delete' && file.content !== undefined)
        .map((file, index) => ({
          id: `file_${Date.now()}_${index}_${file.path}`,
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
  };

  return (
    <div className="h-full overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#e8ecff_20%,#d4dcff_38%,#f0e0ff_56%,#ffe0ec_72%,#fff0e0_100%)] text-gray-950 dark:bg-[linear-gradient(180deg,#0a0a0a_0%,#161719_20%,#21365f_38%,#3a2040_56%,#4a1030_72%,#4a2010_100%)] dark:text-[#f6f2ea]">
      <div className="w-full px-4 py-8 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-5 lg:flex-row lg:items-center lg:justify-between dark:border-white/8 dark:bg-[#17120f] dark:shadow-none">
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-md px-3 py-2 text-xs font-bold transition-colors ${
                  activeCategory === cat
                    ? 'bg-gray-950 text-white dark:bg-[#f5f2ea] dark:text-[#171816]'
                    : 'border border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-white hover:text-gray-950 dark:border-white/10 dark:bg-white/[0.03] dark:text-[#aaa69d] dark:hover:border-white/20 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-[#aaa69d]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="h-10 w-full rounded-md border border-gray-200 bg-white pl-9 pr-4 text-sm font-medium text-gray-950 outline-none placeholder:text-gray-400 focus:border-[#6387ff] focus:ring-2 focus:ring-[#6387ff]/20 lg:w-80 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-[#6f6b64]"
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => (
            <article
              key={template.id}
              className="group overflow-hidden rounded-lg border border-gray-200 bg-white transition-all hover:-translate-y-1 hover:border-gray-300 hover:shadow-[0_18px_60px_rgba(15,23,42,0.14)] dark:border-white/8 dark:bg-[#211f1b] dark:hover:border-white/18 dark:hover:shadow-[0_18px_60px_rgba(0,0,0,0.38)]"
            >
              <div className="relative aspect-video overflow-hidden bg-[#111]">
                <img
                  src={template.image}
                  alt={template.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-[#171816]/0 opacity-0 backdrop-blur-sm transition-all group-hover:bg-[#171816]/64 group-hover:opacity-100">
                  <button
                    onClick={() => handleUseTemplate(template)}
                    disabled={creatingTemplateId !== null}
                    className="inline-flex items-center gap-2 rounded-md bg-[#f5f2ea] px-4 py-2 text-sm font-bold text-[#171816] transition-transform hover:scale-[1.01] disabled:cursor-wait disabled:opacity-70"
                  >
                    {creatingTemplateId === template.id ? 'Preparing...' : 'Open in builder'} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                <button className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-black/30 text-[#aaa69d] opacity-0 transition-colors hover:text-[#f4d66a] group-hover:opacity-100">
                  <Star className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4">
                <h3 className="text-base font-bold text-gray-950 dark:text-white">{template.name}</h3>
                <p className="mt-1 min-h-10 text-sm leading-5 text-gray-600 dark:text-[#aaa69d]">{template.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {template.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-gray-200 px-2 py-1 text-[10px] font-bold uppercase tracking-normal text-gray-500 dark:border-white/10 dark:text-[#aaa69d]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-6 py-20 text-center dark:border-white/8 dark:bg-white/[0.02]">
            <Search className="mb-4 h-8 w-8 text-gray-400 dark:text-[#aaa69d]" />
            <h2 className="text-lg font-bold text-gray-950 dark:text-white">No templates match your search</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-[#aaa69d]">Try another category or keyword.</p>
          </div>
        )}
      </div>
    </div>
  );
}
