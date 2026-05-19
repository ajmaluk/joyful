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
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
        {nextSteps && nextSteps.length > 0 ? 'Suggested next steps' : hasFiles ? 'Quick actions' : 'Get started'}
      </p>
      <div className="grid gap-2">
        {suggestions.map((item, index) => (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.25, ease: 'easeOut' }}
            onClick={() => onSelect(item.prompt)}
            disabled={disabled}
            className="group flex w-full items-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-left transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-gray-100 text-gray-600 transition-all duration-200 group-hover:border-indigo-300 group-hover:bg-indigo-50 group-hover:text-indigo-600">
              {item.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                {item.label}
              </p>
              <p className="text-[11px] text-gray-500 truncate">{item.prompt}</p>
            </div>
            <svg className="h-4 w-4 text-gray-400 transition-all duration-200 group-hover:text-indigo-500 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
