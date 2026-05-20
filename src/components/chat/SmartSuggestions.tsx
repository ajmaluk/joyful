import { motion } from 'framer-motion';
import { Wand2, Layout, Code2, Palette, Smartphone, Search, Zap, Globe, FileCode, Bug, Layers, Sparkles } from 'lucide-react';
import type { ProjectFile } from '@/types';

interface Suggestion {
  label: string;
  prompt: string;
  icon: React.ReactNode;
  category: 'start' | 'improve' | 'style' | 'feature' | 'fix' | 'optimize';
}

interface SmartSuggestionsProps {
  files: ProjectFile[];
  activeFile?: ProjectFile | null;
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

const emptySuggestions: Suggestion[] = [
  { label: 'Portfolio', prompt: 'Create a polished developer portfolio with hero, projects, and contact sections', icon: <Layout className="h-4 w-4" />, category: 'start' },
  { label: 'SaaS Landing', prompt: 'Build a SaaS landing page with features, pricing, and testimonials', icon: <Globe className="h-4 w-4" />, category: 'start' },
  { label: 'Blog', prompt: 'Create an editorial blog with article listings and reading experience', icon: <Code2 className="h-4 w-4" />, category: 'start' },
  { label: 'Dashboard', prompt: 'Build an analytics dashboard with charts, stats cards, and navigation', icon: <Layout className="h-4 w-4" />, category: 'start' },
];

const fileBasedSuggestions: Suggestion[] = [
  { label: 'Dark Mode', prompt: 'Convert the site to a sleek dark mode theme', icon: <Palette className="h-4 w-4" />, category: 'style' },
  { label: 'Responsive', prompt: 'Make the layout fully responsive for mobile and tablet', icon: <Smartphone className="h-4 w-4" />, category: 'improve' },
  { label: 'SEO', prompt: 'Improve copy, hierarchy, and SEO metadata', icon: <Search className="h-4 w-4" />, category: 'improve' },
  { label: 'Premium', prompt: 'Make it look more premium with better typography and spacing', icon: <Zap className="h-4 w-4" />, category: 'style' },
  { label: 'Contact Form', prompt: 'Add a contact form section with validation', icon: <Wand2 className="h-4 w-4" />, category: 'feature' },
  { label: 'Pricing', prompt: 'Add a pricing section with comparison cards', icon: <Layout className="h-4 w-4" />, category: 'feature' },
];

const categoryIcons: Record<string, React.ReactNode> = {
  fix: <Bug className="h-3 w-3" />,
  optimize: <Layers className="h-3 w-3" />,
  style: <Palette className="h-3 w-3" />,
  feature: <Sparkles className="h-3 w-3" />,
  improve: <Zap className="h-3 w-3" />,
};

function analyzeFileContext(files: ProjectFile[], activeFile?: ProjectFile | null): { hasHTML: boolean; hasCSS: boolean; hasJS: boolean; fileCount: number; activeFileType: string | null; contentHints: string[] } {
  const hasHTML = files.some(f => f.path.endsWith('.html'));
  const hasCSS = files.some(f => f.path.endsWith('.css'));
  const hasJS = files.some(f => f.path.endsWith('.js'));
  const contentHints: string[] = [];

  if (hasHTML) {
    const htmlContent = files.find(f => f.path.endsWith('.html'))?.content || '';
    if (!htmlContent.includes('id="pricing"')) contentHints.push('no-pricing');
    if (!htmlContent.includes('id="contact"')) contentHints.push('no-contact');
    if (!htmlContent.includes('id="faq"')) contentHints.push('no-faq');
    if (!htmlContent.includes('id="team"')) contentHints.push('no-team');
    if (!htmlContent.includes('id="gallery"')) contentHints.push('no-gallery');
    if (!htmlContent.includes('id="testimonials"')) contentHints.push('no-testimonials');
    if (!htmlContent.includes('class="fade-up"')) contentHints.push('no-animations');
    if (!htmlContent.includes('@media')) contentHints.push('no-responsive');
  }

  if (hasCSS) {
    const cssContent = files.find(f => f.path.endsWith('.css'))?.content || '';
    if (!cssContent.includes('dark') && !cssContent.includes('#0F172A')) contentHints.push('no-dark-mode');
    if (!cssContent.includes('@keyframes')) contentHints.push('no-keyframes');
  }

  return {
    hasHTML,
    hasCSS,
    hasJS,
    fileCount: files.length,
    activeFileType: activeFile ? activeFile.path.split('.').pop() || null : null,
    contentHints,
  };
}

function getContextualSuggestions(context: ReturnType<typeof analyzeFileContext>): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (context.contentHints.includes('no-pricing')) {
    suggestions.push({ label: 'Add Pricing', prompt: 'Add a pricing section with 3-tier comparison cards', icon: <Layout className="h-4 w-4" />, category: 'feature' });
  }
  if (context.contentHints.includes('no-contact')) {
    suggestions.push({ label: 'Contact Form', prompt: 'Add a contact form section with validation', icon: <Wand2 className="h-4 w-4" />, category: 'feature' });
  }
  if (context.contentHints.includes('no-faq')) {
    suggestions.push({ label: 'FAQ Section', prompt: 'Add an interactive FAQ accordion section', icon: <Search className="h-4 w-4" />, category: 'feature' });
  }
  if (context.contentHints.includes('no-team')) {
    suggestions.push({ label: 'Team Section', prompt: 'Add a team section with member cards and avatars', icon: <Layout className="h-4 w-4" />, category: 'feature' });
  }
  if (context.contentHints.includes('no-gallery')) {
    suggestions.push({ label: 'Gallery', prompt: 'Add an image gallery with hover overlays', icon: <Palette className="h-4 w-4" />, category: 'feature' });
  }
  if (context.contentHints.includes('no-testimonials')) {
    suggestions.push({ label: 'Testimonials', prompt: 'Add a testimonials section with customer quotes', icon: <Sparkles className="h-4 w-4" />, category: 'feature' });
  }
  if (context.contentHints.includes('no-animations')) {
    suggestions.push({ label: 'Animations', prompt: 'Add scroll-triggered fade-up animations to all sections', icon: <Zap className="h-4 w-4" />, category: 'style' });
  }
  if (context.contentHints.includes('no-responsive')) {
    suggestions.push({ label: 'Responsive', prompt: 'Make the layout fully responsive for mobile and tablet', icon: <Smartphone className="h-4 w-4" />, category: 'improve' });
  }
  if (context.contentHints.includes('no-dark-mode')) {
    suggestions.push({ label: 'Dark Mode', prompt: 'Convert the site to a sleek dark mode theme', icon: <Palette className="h-4 w-4" />, category: 'style' });
  }

  if (context.activeFileType === 'js') {
    suggestions.push({ label: 'Add Fetch', prompt: 'Add a fetch API call with error handling', icon: <Code2 className="h-4 w-4" />, category: 'feature' });
    suggestions.push({ label: 'Form Handler', prompt: 'Add form submission handler with validation', icon: <FileCode className="h-4 w-4" />, category: 'feature' });
  }

  if (context.activeFileType === 'css') {
    suggestions.push({ label: 'Better Typography', prompt: 'Improve typography with better font sizes and line heights', icon: <Palette className="h-4 w-4" />, category: 'style' });
    suggestions.push({ label: 'Hover Effects', prompt: 'Add smooth hover effects to buttons and cards', icon: <Zap className="h-4 w-4" />, category: 'style' });
  }

  if (suggestions.length === 0) {
    suggestions.push({ label: 'Premium Polish', prompt: 'Make it look more premium with better spacing and micro-interactions', icon: <Sparkles className="h-4 w-4" />, category: 'style' });
    suggestions.push({ label: 'SEO Boost', prompt: 'Improve SEO with better meta tags and semantic HTML', icon: <Search className="h-4 w-4" />, category: 'improve' });
  }

  return suggestions.slice(0, 6);
}

export function SmartSuggestions({ files, activeFile, onSelect, disabled }: SmartSuggestionsProps) {
  const hasFiles = files.length > 0;
  const context = analyzeFileContext(files, activeFile);
  const contextualSuggestions = hasFiles ? getContextualSuggestions(context) : [];

  const suggestions: Suggestion[] = [];
  const usedLabels = new Set<string>();
  for (const suggestion of contextualSuggestions) {
    if (suggestions.length >= 5) break;
    if (!usedLabels.has(suggestion.label.toLowerCase())) {
      suggestions.push(suggestion);
      usedLabels.add(suggestion.label.toLowerCase());
    }
  }

  if (suggestions.length < 3) {
    const baseSuggestions = hasFiles ? fileBasedSuggestions : emptySuggestions;
    for (const suggestion of baseSuggestions) {
      if (suggestions.length >= 5) break;
      if (!usedLabels.has(suggestion.label.toLowerCase())) {
        suggestions.push(suggestion);
        usedLabels.add(suggestion.label.toLowerCase());
      }
    }
  }

  return (
    <div className="min-w-0 space-y-2 overflow-x-hidden">
      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-1 pr-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {suggestions.map((item, index) => (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.25, ease: 'easeOut' }}
            onClick={() => onSelect(item.prompt)}
            disabled={disabled}
            className="group flex min-h-16 w-[172px] flex-none snap-start items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-all duration-200 hover:border-primary/40 hover:bg-accent/60 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-all duration-200 group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary">
              {item.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium text-foreground transition-colors group-hover:text-primary">
                  {item.label}
                </p>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground capitalize">
                  {categoryIcons[item.category]}
                </span>
              </div>
              <p className="truncate text-[11px] text-muted-foreground">{item.prompt}</p>
            </div>
          </motion.button>
        ))}
          <div className="flex h-16 w-10 flex-none items-center justify-center rounded-xl border border-dashed border-border bg-card/70 text-sm font-semibold text-muted-foreground lg:flex">
            ...
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-card to-transparent" />
      </div>
    </div>
  );
}
