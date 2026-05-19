import { useState, useRef, useCallback } from 'react';
import { ArrowRight, Mic, Plus, Send } from 'lucide-react';

interface PromptInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function PromptInput({ onSend, disabled, placeholder = 'Ask Joyful to create a prototype...' }: PromptInputProps) {
  const [input, setInput] = useState('');
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      textareaRef.current?.focus();
      return;
    }
    if (disabled) return;
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

  const charCount = input.length;

  return (
    <div className="min-w-0 overflow-x-hidden border-t border-border bg-card px-4 py-4">
      <div className="flex min-w-0 flex-col rounded-[1.45rem] border border-gray-200 bg-white p-3 text-left shadow-[0_18px_55px_rgba(15,23,42,0.12)] ring-1 ring-black/5 transition-all duration-200 focus-within:border-primary/40 dark:border-black/50 dark:bg-[#20211e] dark:shadow-[0_22px_70px_rgba(0,0,0,0.34)] dark:ring-white/10 dark:focus-within:border-white/20">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); handleTextareaInput(); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={2}
          disabled={disabled}
          aria-label="Describe what you want Joyful to build"
          className="min-h-16 max-h-[120px] resize-none bg-transparent px-3 pt-2 text-left text-sm font-medium leading-relaxed text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-50 dark:text-[#f5f2ea] dark:placeholder:text-[#d8d3ca]/85"
        />
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => textareaRef.current?.focus()}
              aria-label="Add context"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-950 dark:bg-white/5 dark:text-[#d8d3ca] dark:hover:bg-white/10 dark:hover:text-white"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSend}
              disabled={disabled}
              className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-40 sm:flex dark:text-[#d8d3ca] dark:hover:bg-white/5 dark:hover:text-white"
            >
              Build <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Voice prompt"
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-950 dark:text-[#d8d3ca] dark:hover:bg-white/5 dark:hover:text-white"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={disabled}
              aria-label="Start building"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-[#2f5bff] to-[#f23c78] text-white shadow-lg shadow-[#2f5bff]/20 transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 dark:bg-white/5 dark:text-white dark:shadow-none"
            >
              <Send className="h-4 w-4" />
            </button>
            {charCount > 0 && (
              <span className={`hidden text-[10px] sm:inline ${charCount > 500 ? 'text-orange-500 dark:text-orange-300' : 'text-gray-400 dark:text-[#aaa69d]'}`}>
                {charCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
