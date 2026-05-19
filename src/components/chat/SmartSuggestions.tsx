import { motion } from 'framer-motion';
import { Wand2, Layout, Code2, Palette, Smartphone, Search, Zap, Globe } from 'lucide-react';
import type { ProjectFile } from '@/types';

interface Suggestion {
  label: string;
  prompt: string;
  icon: React.ReactNode;
  category: 'start' | 'improve' | 'style' | 'feature';
}

interface SmartSuggestionsProps {
  files: ProjectFile[];
  nextSteps?: string[];
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

export function SmartSuggestions({ files, nextSteps, onSelect, disabled }: SmartSuggestionsProps) {
  const hasFiles = files.length > 0;
  const baseSuggestions = hasFiles ? fileBasedSuggestions : emptySuggestions;

  const suggestions: Suggestion[] = [];

  if (nextSteps && nextSteps.length > 0) {
    nextSteps.slice(0, 3).forEach((step) => {
      suggestions.push({
        label: step.length > 30 ? step.slice(0, 30) + '...' : step,
        prompt: step,
        icon: <Wand2 className="h-4 w-4" />,
        category: 'improve',
      });
    });
  }

  const usedLabels = new Set(suggestions.map(s => s.label.toLowerCase()));
  for (const suggestion of baseSuggestions) {
    if (suggestions.length >= 4) break;
    if (!usedLabels.has(suggestion.label.toLowerCase())) {
      suggestions.push(suggestion);
    }
  }

  return (
    <div className="min-w-0 space-y-2 overflow-x-hidden">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {nextSteps && nextSteps.length > 0 ? 'Suggested next steps' : hasFiles ? 'Quick actions' : 'Get started'}
      </p>
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
              <p className="text-xs font-medium text-foreground transition-colors group-hover:text-primary">
                {item.label}
              </p>
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
