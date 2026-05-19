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
    <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-white via-gray-50 to-white px-4 py-2.5">
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
              className="w-full min-w-0 text-xs font-medium text-gray-900 bg-white rounded-md px-2.5 py-1.5 outline-none ring-1 ring-indigo-300 focus:ring-2 focus:ring-indigo-500 shadow-sm"
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
            className="group flex items-center gap-1.5 text-xs font-semibold text-gray-900 hover:text-indigo-600 transition-colors truncate"
          >
            <span className="truncate">{sessionName}</span>
            <Edit3 className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-600 flex-shrink-0">
          {messageCount} msg{messageCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          onClick={onExportChat}
          className="rounded-lg p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700"
          title="Export chat as markdown"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleClear}
          className={`rounded-lg p-2 transition-all ${
            showClearConfirm
              ? 'text-red-600 bg-red-50 hover:bg-red-100'
              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
          }`}
          title={showClearConfirm ? 'Click again to confirm' : 'Clear chat'}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function exportChatAsMarkdown(messages: { role: string; content: string; timestamp: string }[]): string {
  const lines: string[] = ['# Joyful Chat Export', ''];

  for (const msg of messages) {
    const time = new Date(msg.timestamp).toLocaleString();
    const role = msg.role === 'user' ? '**You**' : msg.role === 'assistant' ? '**Joyful AI**' : '**System**';
    lines.push(`### ${role} — ${time}`, '', msg.content, '', '---', '');
  }

  return lines.join('\n');
}
