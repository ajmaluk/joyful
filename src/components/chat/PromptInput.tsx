import { useState, useRef, useCallback } from 'react';
import { ArrowUp, Mic, Image, History, Command } from 'lucide-react';

interface PromptInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const promptTemplates = [
  { label: 'Add section', prompt: 'Add a {section} section to the page' },
  { label: 'Change colors', prompt: 'Change the color scheme to {colors}' },
  { label: 'Fix layout', prompt: 'Fix the layout on mobile devices' },
  { label: 'Add animation', prompt: 'Add smooth scroll animations' },
];

export function PromptInput({ onSend, disabled, placeholder = 'Ask Joyful to build or improve...' }: PromptInputProps) {
  const [input, setInput] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    setPromptHistory(prev => [trimmed, ...prev.slice(0, 49)]);
    setHistoryIndex(-1);
    onSend(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, disabled, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
      return;
    }
    if (e.key === 'Escape') {
      setInput('');
      setShowTemplates(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      return;
    }
    if (e.key === 'ArrowUp' && !input && promptHistory.length > 0) {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, promptHistory.length - 1);
      setHistoryIndex(newIndex);
      setInput(promptHistory[newIndex]);
      return;
    }
    if (e.key === 'ArrowDown' && historyIndex >= 0) {
      e.preventDefault();
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setInput(newIndex >= 0 ? promptHistory[newIndex] : '');
    }
  }, [handleSend, input, promptHistory, historyIndex]);

  const handleTextareaInput = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, []);

  const insertTemplate = useCallback((template: string) => {
    setInput(template);
    setShowTemplates(false);
    textareaRef.current?.focus();
  }, []);

  const charCount = input.length;

  return (
    <div className="min-w-0 overflow-x-hidden border-t border-border bg-card px-4 py-4">
      {/* Templates dropdown */}
      {showTemplates && (
        <div className="mb-2 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          <div className="border-b border-border px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Quick Templates</p>
          </div>
          <div className="p-1">
            {promptTemplates.map((template) => (
              <button
                key={template.label}
                onClick={() => insertTemplate(template.prompt)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
              >
                <span className="text-xs font-medium text-popover-foreground">{template.label}</span>
                <span className="truncate text-[11px] text-muted-foreground">{template.prompt}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col rounded-2xl border border-border bg-background shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-200 focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); handleTextareaInput(); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className="max-h-[120px] resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-1">
            {/* Templates button */}
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className={`rounded-md p-1.5 transition-colors ${showTemplates ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
              title="Prompt templates"
            >
              <Command className="h-3.5 w-3.5" />
            </button>

            {/* History button */}
            {promptHistory.length > 0 && (
              <button
                onClick={() => {
                  if (promptHistory.length > 0) {
                    setHistoryIndex(0);
                    setInput(promptHistory[0]);
                  }
                }}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Prompt history"
              >
                <History className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Voice input (UI only) */}
            <button
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Voice input (coming soon)"
            >
              <Mic className="h-3.5 w-3.5" />
            </button>

            {/* Image upload (UI only) */}
            <button
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Upload screenshot (coming soon)"
            >
              <Image className="h-3.5 w-3.5" />
            </button>

            {/* Keyboard shortcut hint */}
            <span className="ml-1 hidden items-center gap-1 text-[10px] text-muted-foreground sm:inline-flex">
              <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[9px]">⌘</kbd>
              <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[9px]">↵</kbd>
              <span>send</span>
            </span>

            {/* Character count */}
            {charCount > 0 && (
              <span className={`ml-1 text-[10px] ${charCount > 500 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                {charCount}
              </span>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            className="rounded-lg bg-primary p-2.5 text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
