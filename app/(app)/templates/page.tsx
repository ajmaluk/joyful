'use client'

import { Search, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function TemplatesPage() {
  const router = useRouter()
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-8 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-[#2f5bff]/10 ring-1 ring-[#2f5bff]/15">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2f5bff] text-white shadow-lg shadow-[#2f5bff]/20">
          <Sparkles className="h-6 w-6" />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-gray-950 dark:text-white">Templates</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-gray-600 dark:text-[#aaa69d]">
        Choose a template to kickstart your next project in the Joyful builder.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => router.push('/builder')}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-6 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.02] dark:bg-[#f5f2ea] dark:text-[#171816]"
        >
          <Sparkles className="h-4 w-4" />
          Start from scratch
        </button>
      </div>
    </div>
  )
}
