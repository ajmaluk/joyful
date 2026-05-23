import { useState } from 'react';
import { Trash2, Download, Edit3, Check, X, ListTodo, ChevronRight } from 'lucide-react';

interface ChatToolbarProps {
  messageCount: number;
  sessionName?: string;
  onClearChat: () => void;
  onExportChat: () => void;
  onRenameSession?: (name: string) => void;
  onToggleTodos?: () => void;
  onCloseSidebar?: () => void;
  todoCount?: number;
}

export function ChatToolbar({
  messageCount,
  sessionName = 'AI Chat',
  onClearChat,
  onExportChat,
  onRenameSession,
  onToggleTodos,
  onCloseSidebar,
  todoCount = 0,
}: ChatToolbarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(sessionName);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleRename = () => {
    if (editName.trim() && onRenameSession) {
      onRenameSession(editName.trim());
    }
    setIsEditing(false);
  };

  const handleClear = () => {
    if (showClearConfirm) {
      onClearChat();
      setShowClearConfirm(false);
    } else {
      setShowClearConfirm(true);
      setTimeout(() => setShowClearConfirm(false), 3000);
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#12151a] px-3.5 py-2.5">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.03] shadow-none">
          <img src="/brand-logo-64.png" alt="Joyful" className="h-6 w-6 rounded-lg" />
        </div>
        {isEditing ? (
          <div className="flex items-center gap-1 min-w-0">
            <input
              name="chat-rename"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              className="w-full min-w-0 rounded-md border border-white/[0.08] bg-[#0f1115] px-2.5 py-1.5 text-xs font-medium text-gray-100 outline-none ring-0 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
            <button onClick={handleRename} className="rounded-md p-1 text-green-500 transition-colors hover:bg-white/[0.06]">
              <Check className="h-3 w-3" />
            </button>
            <button onClick={() => setIsEditing(false)} className="rounded-md p-1 text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-gray-200">
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setEditName(sessionName);
              setIsEditing(true);
            }}
            className="group flex items-center gap-1.5 truncate text-xs font-semibold text-gray-100 transition-colors hover:text-primary"
          >
            <span className="truncate">{sessionName}</span>
            <Edit3 className="h-3 w-3 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        )}
        <span className="flex-shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
          {messageCount} msg{messageCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex items-center gap-0.5 flex-shrink-0">
        {onToggleTodos && (
          <button
            onClick={onToggleTodos}
            className={`rounded-md p-1.5 transition-all ${
              todoCount > 0
                ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15'
                : 'text-gray-500 hover:bg-white/[0.06] hover:text-gray-200'
            }`}
            title="Toggle todo list"
          >
            <ListTodo className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={onExportChat}
          className="rounded-md p-1.5 text-gray-500 transition-all hover:bg-white/[0.06] hover:text-gray-200"
          title="Export chat as markdown"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleClear}
          className={`rounded-md p-1.5 transition-all ${
            showClearConfirm
              ? 'bg-red-500/10 text-red-500 hover:bg-red-500/15'
              : 'text-gray-500 hover:bg-white/[0.06] hover:text-gray-200'
          }`}
          title={showClearConfirm ? 'Click again to confirm' : 'Clear chat'}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        {onCloseSidebar && (
          <button
            onClick={onCloseSidebar}
            className="rounded-md border border-white/[0.08] bg-white/[0.03] p-1.5 text-gray-500 transition-all hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-gray-200"
            title="Close chat sidebar"
            aria-label="Close chat sidebar"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
