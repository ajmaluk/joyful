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
    <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 bg-card/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/20">
            <ListTodo className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-foreground">Build Tasks</span>
          {totalCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {completedCount}/{totalCount}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="h-1 bg-muted">
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
              className="flex flex-col items-center justify-center py-6 text-center"
            >
              <ListTodo className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">No tasks yet. Add one below!</p>
            </motion.div>
          ) : (
            todos.map((todo) => (
              <motion.div
                key={todo.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10, height: 0 }}
                className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/50"
              >
                <button
                  onClick={() => onToggle(todo.id)}
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border border-border/60 transition-all duration-200 hover:border-primary/50"
                >
                  {todo.completed ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Circle className="h-3 w-3 text-muted-foreground/50" />
                  )}
                </button>
                <span
                  className={`flex-1 text-xs transition-all duration-200 ${
                    todo.completed
                      ? 'text-muted-foreground/50 line-through'
                      : 'text-foreground'
                  }`}
                >
                  {todo.text}
                </span>
                <button
                  onClick={() => onRemove(todo.id)}
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md opacity-0 transition-all duration-200 hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Add todo input */}
      <div className="flex items-center gap-2 border-t border-border/60 bg-card/40 px-3 py-2">
        <Plus className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a task..."
          className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/50"
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
