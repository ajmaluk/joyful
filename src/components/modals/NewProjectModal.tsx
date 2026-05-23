import { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
}

export function NewProjectModal({ isOpen, onClose, onCreate }: NewProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsCreating(true);
    onCreate(name.trim(), description.trim());
    setName('');
    setDescription('');
    setIsCreating(false);
    onClose();
  };

  const quickPrompts = [
    'Personal portfolio website',
    'SaaS landing page',
    'Restaurant website',
    'Admin dashboard',
    'Blog website',
    'AI tool website',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative mx-4 w-full max-w-lg overflow-hidden rounded-lg border border-white/10 bg-[#171816] text-[#f6f2ea] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">Create new project</h2>
            <p className="mt-1 text-xs text-[#aaa69d]">Name the workspace and describe what Joyful should build.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-[#aaa69d] transition-colors hover:bg-white/5 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-[#f6f2ea]">Project name</label>
            <input
              name="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Coffee subscription dashboard"
              className="h-11 w-full rounded-md border border-white/10 bg-white/[0.03] px-3 text-sm font-medium text-white outline-none transition-colors placeholder:text-[#6f6b64] hover:border-white/18 focus:border-[#6387ff] focus:ring-2 focus:ring-[#6387ff]/25"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-[#f6f2ea]">Description</label>
            <textarea
              name="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the pages, audience, style, and key sections..."
              rows={3}
              className="w-full resize-none rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm font-medium text-white outline-none transition-colors placeholder:text-[#6f6b64] hover:border-white/18 focus:border-[#6387ff] focus:ring-2 focus:ring-[#6387ff]/25"
            />
          </div>

          {/* Quick prompts */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-normal text-[#aaa69d]">Quick starts</label>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setDescription(prompt)}
                  className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-semibold text-[#aaa69d] transition-colors hover:border-white/20 hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-[#aaa69d] transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="flex items-center gap-2 rounded-md bg-[#f5f2ea] px-4 py-2 text-sm font-bold text-[#171816] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>Create & Generate</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
