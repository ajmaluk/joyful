'use client'

import { Loader2Icon } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'
import { useAvailableModels } from './use-available-models'
import { useModelId } from './use-settings'

export function ModelSelector({ className, disabled }: { className?: string; disabled?: boolean }) {
  const [modelId, setModelId] = useModelId()
  const { models: available, isLoading, error } = useAvailableModels()
  const models = useMemo(
    () => available?.sort((a, b) => a.label.localeCompare(b.label)) || [],
    [available]
  )

  return (
    <Select
      value={modelId}
      onValueChange={setModelId}
      disabled={disabled || isLoading || !!error || !models?.length}
    >
      <SelectTrigger className={cn('w-[140px] bg-background text-xs', className)}>
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2Icon className="h-3 w-3 animate-spin" />
          </div>
        ) : error ? (
          <span className="text-red-500">Error</span>
        ) : !models?.length ? (
          <span>No models</span>
        ) : (
          <SelectValue placeholder="Model" />
        )}
      </SelectTrigger>

      <SelectContent>
        <SelectGroup>
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id} className="text-xs">
              {model.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
