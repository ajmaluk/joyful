import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function escapeHtmlOutsideCodeBlocks(text: string): string {
  if (!text) return ''
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]*?`)/g)
  return parts
    .map((part, index) => {
      if (index % 2 === 0) {
        return part
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
      }
      return part
    })
    .join('')
}
