import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, Pencil } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SiteConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function SiteConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onOpenChange,
  onConfirm,
}: SiteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md gap-0 overflow-hidden rounded-xl border border-white/10 bg-[#171816] p-0 text-[#f6f2ea] shadow-2xl shadow-black/45">
        <AlertDialogHeader className="border-b border-white/8 px-5 py-4 text-left">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-lg ${
                destructive ? 'bg-red-500/12 text-red-300 ring-1 ring-red-400/20' : 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/20'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <AlertDialogTitle className="text-base font-bold text-white">{title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-1 text-sm leading-5 text-[#aaa69d]">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 px-5 py-4 sm:flex-row sm:justify-end">
          <AlertDialogCancel className="mt-0 border-white/10 bg-white/[0.03] text-[#aaa69d] hover:bg-white/[0.06] hover:text-white">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              destructive
                ? 'bg-red-500 text-white hover:bg-red-400 focus-visible:ring-red-500/30'
                : 'bg-[#f5f2ea] text-[#171816] hover:bg-white'
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface SitePromptDialogProps {
  open: boolean;
  title: string;
  description: string;
  label: string;
  initialValue: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (value: string) => void;
}

export function SitePromptDialog({
  open,
  title,
  description,
  label,
  initialValue,
  confirmLabel = 'Save',
  cancelLabel = 'Cancel',
  onOpenChange,
  onConfirm,
}: SitePromptDialogProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [initialValue, open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-0 overflow-hidden rounded-xl border border-white/10 bg-[#171816] p-0 text-[#f6f2ea] shadow-2xl shadow-black/45"
      >
        <DialogHeader className="border-b border-white/8 px-5 py-4 text-left">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/20">
              <Pencil className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold text-white">{title}</DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-5 text-[#aaa69d]">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="px-5 py-4">
          <label className="mb-1.5 block text-sm font-bold text-[#f6f2ea]" htmlFor="site-prompt-value">
            {label}
          </label>
          <input
            id="site-prompt-value"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="h-11 w-full rounded-md border border-white/10 bg-white/[0.03] px-3 text-sm font-medium text-white outline-none transition-colors placeholder:text-[#6f6b64] hover:border-white/18 focus:border-[#6387ff] focus:ring-2 focus:ring-[#6387ff]/25"
            autoFocus
          />
          <DialogFooter className="mt-5 gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold text-[#aaa69d] transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="inline-flex h-9 items-center justify-center rounded-md bg-[#f5f2ea] px-4 text-sm font-bold text-[#171816] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {confirmLabel}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
