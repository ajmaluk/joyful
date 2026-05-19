import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import type { Toast } from '@/types';

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

export function ToastItem({ toast, onRemove }: ToastItemProps) {
  const icons = {
    success: <CheckCircle className="w-4 h-4 text-green-400" />,
    error: <AlertCircle className="w-4 h-4 text-red-400" />,
    info: <Info className="w-4 h-4 text-blue-400" />,
  };

  const borders = {
    success: 'border-l-green-400',
    error: 'border-l-red-400',
    info: 'border-l-blue-400',
  };

  return (
    <div
      className={`bg-gray-50 border border-gray-300 border-l-[3px] ${borders[toast.type]} rounded-lg p-3 flex items-center gap-2.5 shadow-lg max-w-sm animate-[toast-in_250ms_ease-out]`}
    >
      {icons[toast.type]}
      <p className="text-sm text-gray-900 flex-1">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-gray-400 hover:text-gray-900 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}
