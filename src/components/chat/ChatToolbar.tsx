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
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <MessageSquare className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
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
              className="w-full min-w-0 text-xs font-medium text-gray-900 bg-gray-100 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
            <button onClick={handleRename} className="p-1 text-green-600 hover:bg-green-50 rounded">
              <Check className="h-3 w-3" />
            </button>
            <button onClick={() => setIsEditing(false)} className="p-1 text-gray-500 hover:bg-gray-100 rounded">
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setEditName(sessionName);
              setIsEditing(true);
            }}
            className="flex items-center gap-1 text-xs font-medium text-gray-900 hover:text-indigo-600 transition-colors truncate"
          >
            <span className="truncate">{sessionName}</span>
            <Edit3 className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100" />
          </button>
        )}
        <span className="rounded-full border border-gray-300 px-2 py-0.5 text-[10px] text-gray-500 flex-shrink-0">
          {messageCount} msg{messageCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onExportChat}
          className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          title="Export chat as markdown"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleClear}
          className={`rounded-md p-1.5 transition-colors ${
            showClearConfirm
              ? 'text-red-600 bg-red-50 hover:bg-red-100'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
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
