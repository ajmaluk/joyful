import { useState, useCallback } from 'react';
import { Check, Circle, ListTodo, Trash2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoListProps {
  todos: TodoItem[];
  onToggle: (id: string) => void;
  onAdd: (text: string) => void;
  onRemove: (id: string) => void;
}

export function TodoList({ todos, onToggle, onAdd, onRemove }: TodoListProps) {
  const [newTodo, setNewTodo] = useState('');

  const handleAdd = useCallback(() => {
    const trimmed = newTodo.trim();
    if (trimmed) {
      onAdd(trimmed);
      setNewTodo('');
    }
  }, [newTodo, onAdd]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500 shadow-none">
            <ListTodo className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-100">Build Tasks</span>
          {totalCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {completedCount}/{totalCount}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="h-1 bg-white/[0.06]">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      )}

      {/* Todo list */}
      <div className="max-h-48 overflow-y-auto px-2 py-2">
        <AnimatePresence mode="popLayout">
          {todos.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-5 text-center"
            >
              <ListTodo className="mb-2 h-8 w-8 text-gray-500/40" />
              <p className="text-xs text-gray-500">No tasks yet. Add one below.</p>
            </motion.div>
          ) : (
            todos.map((todo) => (
              <motion.div
                key={todo.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10, height: 0 }}
                className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.05]"
              >
                <button
                  onClick={() => onToggle(todo.id)}
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border border-white/[0.08] transition-all duration-200 hover:border-primary/50 hover:bg-white/[0.04]"
                >
                  {todo.completed ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Circle className="h-3 w-3 text-gray-500/60" />
                  )}
                </button>
                <span
                  className={`flex-1 text-xs transition-all duration-200 ${
                    todo.completed
                      ? 'line-through text-gray-500/50'
                      : 'text-gray-200'
                  }`}
                >
                  {todo.text}
                </span>
                <button
                  onClick={() => onRemove(todo.id)}
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md opacity-0 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Add todo input */}
      <div className="flex items-center gap-2 border-t border-white/[0.08] px-3 py-2">
        <Plus className="h-3.5 w-3.5 flex-shrink-0 text-gray-500/50" />
        <input
          name="new-todo"
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a task..."
          className="flex-1 bg-transparent text-xs text-gray-100 outline-none placeholder:text-gray-500/50"
        />
        {newTodo.trim() && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleAdd}
            className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Add
          </motion.button>
        )}
      </div>
    </div>
  );
}
