import { useState } from 'react';
import type { AppTemplate } from '@/data/templates';

interface TemplatePreviewProps {
  template: AppTemplate;
}

const previewLayouts: Record<string, string[]> = {
  ecommerce: ['w-28', 'w-14', 'w-16', 'w-14'],
  agency: ['w-24', 'w-20', 'w-14', 'w-20'],
  event: ['w-20', 'w-28', 'w-16', 'w-24'],
  photography: ['w-16', 'w-24', 'w-14', 'w-20'],
  startup: ['w-28', 'w-16', 'w-24', 'w-14'],
  fitness: ['w-20', 'w-14', 'w-28', 'w-16'],
  realestate: ['w-24', 'w-16', 'w-20', 'w-28'],
};

const tileOpacity = ['bg-white/80', 'bg-white/45', 'bg-white/70', 'bg-white/55'];

export function TemplatePreview({ template }: TemplatePreviewProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const shouldShowImage = template.previewImage && !imageFailed;
  const bars = previewLayouts[template.id] ?? ['w-24', 'w-16', 'w-28', 'w-20'];

  if (shouldShowImage) {
    return (
      <img
        src={template.previewImage}
        alt={`${template.name} template preview`}
        loading="lazy"
        onError={() => setImageFailed(true)}
        className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
      />
    );
  }

  return (
    <div className={`h-full w-full bg-gradient-to-br ${template.color} p-4 text-white`}>
      <div className="h-full rounded-lg border border-white/20 bg-white/[0.14] p-3 shadow-2xl shadow-black/15 backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-white/90" />
            <span className="h-2 w-2 rounded-full bg-white/55" />
            <span className="h-2 w-2 rounded-full bg-white/35" />
          </div>
          <span className="h-2 w-10 rounded-full bg-white/40" />
        </div>
        <div className="grid h-[calc(100%-1.25rem)] grid-cols-[1.1fr_0.9fr] gap-3">
          <div className="flex min-w-0 flex-col justify-center">
            <span className="mb-2 h-3 w-16 rounded-full bg-white/45" />
            <span className="mb-1.5 h-4 w-28 max-w-full rounded-full bg-white/90" />
            <span className="mb-1.5 h-4 w-20 rounded-full bg-white/70" />
            <span className="mt-2 h-6 w-20 rounded-md bg-white text-[0px] shadow-lg shadow-black/10" />
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-2">
            {bars.map((bar, index) => (
              <span
                key={`${template.id}-${index}`}
                className={`${bar} ${tileOpacity[index % tileOpacity.length]} max-w-full rounded-md shadow-lg shadow-black/10`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
