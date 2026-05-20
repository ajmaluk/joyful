import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { TemplatePreview } from '@/components/templates/TemplatePreview';
import { appTemplates, templateCategories, type AppTemplate } from '@/data/templates';

export type Template = AppTemplate;

interface TemplateSelectorProps {
  onSelect: (template: Template) => void;
  disabled?: boolean;
}

export function TemplateSelector({ onSelect, disabled }: TemplateSelectorProps) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = appTemplates.filter(
    (t) => activeCategory === 'All' || t.category === activeCategory
  );

  const handleSelect = useCallback(
    (template: Template) => {
      setSelectedId(template.id);
      onSelect(template);
    },
    [onSelect]
  );

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/20">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Start with a template</p>
          <p className="text-xs text-muted-foreground">Pick a template and customize with AI</p>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5">
        {templateCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              activeCategory === cat
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {filtered.map((template, index) => (
            <motion.div
              key={template.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
              className={`group relative overflow-hidden rounded-xl border transition-all duration-300 ${
                selectedId === template.id
                  ? 'border-primary/50 bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-border/60 bg-card/60 hover:border-primary/30 hover:shadow-md'
              }`}
            >
              {/* Template card */}
              <button
                onClick={() => handleSelect(template)}
                disabled={disabled}
                className="w-full p-4 text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 h-24 overflow-hidden rounded-lg bg-muted">
                      <TemplatePreview template={template} />
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{template.name}</h3>
                      {template.complexity === 'advanced' && (
                        <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500">
                          Pro
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {template.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/50 transition-all duration-200 group-hover:text-primary group-hover:translate-x-1" />
                </div>

                {/* Sections preview */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {template.sections.slice(0, 4).map((section) => (
                    <span
                      key={section}
                      className="rounded-md bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                    >
                      {section}
                    </span>
                  ))}
                  {template.sections.length > 4 && (
                    <span className="rounded-md bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      +{template.sections.length - 4}
                    </span>
                  )}
                </div>
              </button>

              {/* Expand for more details */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedId(expandedId === template.id ? null : template.id);
                }}
                className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-md bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {expandedId === template.id ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>

              {/* Expanded details */}
              <AnimatePresence>
                {expandedId === template.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-border/60 bg-muted/30"
                  >
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-1.5">Features</p>
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
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(template);
                        }}
                        disabled={disabled}
                        className={`w-full rounded-lg bg-gradient-to-r ${template.color} px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        Use this template
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Selected indicator */}
              {selectedId === template.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white"
                >
                  <Check className="h-3.5 w-3.5" />
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Custom prompt option */}
      <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-4 text-center">
        <p className="text-xs text-muted-foreground">
          Or describe what you want to build and I'll create it from scratch
        </p>
      </div>
    </div>
  );
}
