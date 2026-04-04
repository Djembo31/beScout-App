'use client';

import { Skeleton, SkeletonCard } from '@/components/ui';

export function FantasySkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-16 rounded-2xl" />
      <div className="flex items-center gap-1 p-1 bg-surface-subtle border border-divider rounded-xl">
        {[1, 2, 3].map(i => <Skeleton key={i} className="flex-1 h-10 rounded-lg" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} className="h-48" />)}
      </div>
    </div>
  );
}
