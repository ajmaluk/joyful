import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, Star } from 'lucide-react';
import { NewProjectModal } from '@/components/modals/NewProjectModal';

interface TemplatesPageProps {
  onCreateProject: (name: string, description: string) => { id: string };
}

const categories = ['All', 'Portfolio', 'SaaS', 'Business', 'Dashboard', 'Content', 'Tech'];

const templates = [
  { id: 'portfolio', name: 'Portfolio', description: 'A modern personal portfolio to showcase your work and skills.', category: 'Portfolio', image: '/templates/portfolio.jpg', tags: ['Personal', 'Creative'] },
  { id: 'saas', name: 'SaaS Landing Page', description: 'Convert visitors into customers with this high-converting landing page.', category: 'SaaS', image: '/templates/saas.jpg', tags: ['Business', 'Startup'] },
  { id: 'restaurant', name: 'Restaurant', description: 'Elegant restaurant website with menu, reservations, and gallery.', category: 'Business', image: '/templates/restaurant.jpg', tags: ['Food', 'Hospitality'] },
  { id: 'dashboard', name: 'Admin Dashboard', description: 'Data-rich admin panel with charts, tables, and analytics.', category: 'Dashboard', image: '/templates/dashboard.jpg', tags: ['Admin', 'Analytics'] },
  { id: 'blog', name: 'Blog', description: 'Clean, readable blog layout for content creators and writers.', category: 'Content', image: '/templates/blog.jpg', tags: ['Writing', 'Media'] },
  { id: 'ai-tool', name: 'AI Tool Website', description: 'Futuristic landing page for AI-powered products and tools.', category: 'Tech', image: '/templates/ai-tool.jpg', tags: ['AI', 'Tech'] },
];

export function TemplatesPage({ onCreateProject }: TemplatesPageProps) {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

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

  const handleUseTemplate = (templateName: string) => {
    setSelectedTemplate(templateName);
    setShowNewProject(true);
  };

  const handleCreateProject = (name: string, description: string) => {
    const project = onCreateProject(name, description || selectedTemplate || '');
    navigate(`/builder/${project.id}`);
    return project;
  };

  return (
    <div className="h-full overflow-y-auto bg-[#0f100f] text-[#f6f2ea]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-lg border border-white/8 bg-[#171816] p-8 sm:p-10">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(79,124,255,0.24),transparent_42%,rgba(255,122,61,0.16))]" />
          <div className="relative z-10 max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-normal text-[#8fa7ff]">Templates</p>
            <h1 className="mt-3 text-4xl font-bold tracking-normal text-white">Start with a layout that already knows the job.</h1>
            <p className="mt-3 text-sm leading-6 text-[#aaa69d]">
              Choose a practical website pattern, then use Joyful to reshape the copy, sections, and theme.
            </p>
          </div>
        </section>

        <div className="mt-6 flex flex-col gap-4 rounded-lg border border-white/8 bg-[#17120f] p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-md px-3 py-2 text-xs font-bold transition-colors ${
                  activeCategory === cat
                    ? 'bg-[#f5f2ea] text-[#171816]'
                    : 'border border-white/10 bg-white/[0.03] text-[#aaa69d] hover:border-white/20 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aaa69d]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="h-10 w-full rounded-md border border-white/10 bg-white/[0.03] pl-9 pr-4 text-sm font-medium text-white outline-none placeholder:text-[#6f6b64] focus:border-[#6387ff] lg:w-72"
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => (
            <article
              key={template.id}
              className="group overflow-hidden rounded-lg border border-white/8 bg-[#211f1b] transition-colors hover:border-white/18"
            >
              <div className="relative aspect-video overflow-hidden bg-[#111]">
                <img
                  src={template.image}
                  alt={template.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-[#171816]/0 opacity-0 backdrop-blur-sm transition-all group-hover:bg-[#171816]/64 group-hover:opacity-100">
                  <button
                    onClick={() => handleUseTemplate(template.name)}
                    className="inline-flex items-center gap-2 rounded-md bg-[#f5f2ea] px-4 py-2 text-sm font-bold text-[#171816] transition-transform hover:scale-[1.01]"
                  >
                    Use template <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                <button className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-black/30 text-[#aaa69d] opacity-0 transition-colors hover:text-[#f4d66a] group-hover:opacity-100">
                  <Star className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4">
                <h3 className="text-base font-bold text-white">{template.name}</h3>
                <p className="mt-1 min-h-10 text-sm leading-5 text-[#aaa69d]">{template.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {template.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-normal text-[#aaa69d]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-white/8 bg-white/[0.02] px-6 py-20 text-center">
            <Search className="mb-4 h-8 w-8 text-[#aaa69d]" />
            <h2 className="text-lg font-bold text-white">No templates match your search</h2>
            <p className="mt-2 text-sm text-[#aaa69d]">Try another category or keyword.</p>
          </div>
        )}

        <NewProjectModal
          isOpen={showNewProject}
          onClose={() => setShowNewProject(false)}
          onCreate={handleCreateProject}
        />
      </div>
    </div>
  );
}
