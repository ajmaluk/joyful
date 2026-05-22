import { cn } from '@/lib/utils';
import type { CSSProperties } from 'react';

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className,
      )}
      style={style}
    />
  );
}

interface PageSkeletonProps {
  type?: 'dashboard' | 'builder' | 'settings' | 'templates' | 'generic';
}

export function PageSkeleton({ type = 'generic' }: PageSkeletonProps) {
  if (type === 'dashboard') {
    return (
      <div className="flex h-full flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (type === 'builder') {
    return (
      <div className="flex h-full">
        <div className="w-64 border-r p-4">
          <Skeleton className="mb-4 h-6 w-32" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="mb-2 h-5 w-full" />
          ))}
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="mb-4 h-8 w-64" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-2 h-4 w-3/4" />
          <Skeleton className="mb-2 h-4 w-5/6" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
