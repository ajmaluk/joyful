import { useState, useCallback, useEffect, useRef } from 'react';
import type { Toast } from '@/types';

const MAX_TOASTS = 3;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutIdsRef = useRef<Set<NodeJS.Timeout>>(new Set());

  useEffect(() => {
    const ids = timeoutIdsRef.current;
    return () => {
      for (const id of ids) {
        clearTimeout(id);
      }
      ids.clear();
    };
  }, []);

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const toast: Toast = { id, type, message };
    setToasts(prev => [...prev.slice(-(MAX_TOASTS - 1)), toast]);
    const timeoutId = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timeoutIdsRef.current.delete(timeoutId);
    }, 4000);
    timeoutIdsRef.current.add(timeoutId);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
