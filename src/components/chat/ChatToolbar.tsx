import { useState } from 'react';
import { Trash2, Download, MessageSquare, Edit3, Check, X } from 'lucide-react';

interface ChatToolbarProps {
  messageCount: number;
  sessionName?: string;
  onClearChat: () => void;
  onExportChat: () => void;
  onRenameSession?: (name: string) => void;
}

export function ChatToolbar({
  messageCount,
  sessionName = 'AI Chat',
  onClearChat,
  onExportChat,
  onRenameSession,
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
    <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 flex-shrink-0">
          <MessageSquare className="h-3.5 w-3.5" />
        </div>
        {isEditing ? (
          <div className="flex items-center gap-1 min-w-0">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              className="w-full min-w-0 rounded-md bg-background px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm outline-none ring-1 ring-primary/30 focus:ring-2 focus:ring-primary/60"
              autoFocus
            />
            <button onClick={handleRename} className="p-1 text-green-600 hover:bg-green-50 rounded-md">
              <Check className="h-3 w-3" />
            </button>
            <button onClick={() => setIsEditing(false)} className="p-1 text-gray-500 hover:bg-gray-100 rounded-md">
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setEditName(sessionName);
              setIsEditing(true);
            }}
            className="group flex items-center gap-1.5 truncate text-xs font-semibold text-foreground transition-colors hover:text-primary"
          >
            <span className="truncate">{sessionName}</span>
            <Edit3 className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
        <span className="flex-shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
          {messageCount} msg{messageCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          onClick={onExportChat}
          className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
          title="Export chat as markdown"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleClear}
          className={`rounded-lg p-2 transition-all ${
            showClearConfirm
              ? 'bg-red-500/10 text-red-500 hover:bg-red-500/15'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
          title={showClearConfirm ? 'Click again to confirm' : 'Clear chat'}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
