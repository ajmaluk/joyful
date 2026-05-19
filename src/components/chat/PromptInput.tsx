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
    <div className="border-t border-gray-200 bg-gradient-to-b from-white to-gray-50 px-4 py-4">
      {/* Templates dropdown */}
      {showTemplates && (
        <div className="mb-2 rounded-xl border border-gray-300 bg-white shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-200">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Quick Templates</p>
          </div>
          <div className="p-1">
            {promptTemplates.map((template) => (
              <button
                key={template.label}
                onClick={() => insertTemplate(template.prompt)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
              >
                <span className="text-xs font-medium text-gray-900">{template.label}</span>
                <span className="text-[11px] text-gray-500 truncate">{template.prompt}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col rounded-2xl border border-gray-300 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-200 focus-within:border-indigo-300 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1),0_4px_16px_rgba(99,102,241,0.08)]">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); handleTextareaInput(); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className="max-h-[120px] resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-gray-900 outline-none placeholder:text-gray-600 disabled:opacity-50"
        />
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-1">
            {/* Templates button */}
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className={`rounded-md p-1.5 transition-colors ${showTemplates ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
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
                className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                title="Prompt history"
              >
                <History className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Voice input (UI only) */}
            <button
              className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              title="Voice input (coming soon)"
            >
              <Mic className="h-3.5 w-3.5" />
            </button>

            {/* Image upload (UI only) */}
            <button
              className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              title="Upload screenshot (coming soon)"
            >
              <Image className="h-3.5 w-3.5" />
            </button>

            {/* Keyboard shortcut hint */}
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-gray-400 ml-1">
              <kbd className="rounded border border-gray-300 px-1 py-0.5 text-[9px] font-mono">⌘</kbd>
              <kbd className="rounded border border-gray-300 px-1 py-0.5 text-[9px] font-mono">↵</kbd>
              <span>send</span>
            </span>

            {/* Character count */}
            {charCount > 0 && (
              <span className={`text-[10px] ml-1 ${charCount > 500 ? 'text-orange-500' : 'text-gray-400'}`}>
                {charCount}
              </span>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            className="rounded-lg bg-gradient-to-r from-gray-100 to-gray-50 p-2.5 text-gray-900 transition-all duration-200 hover:from-white hover:to-gray-100 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
