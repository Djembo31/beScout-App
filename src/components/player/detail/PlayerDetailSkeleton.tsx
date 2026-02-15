'use client';

import { Skeleton, SkeletonCard } from '@/components/ui';

export default function PlayerDetailSkeleton() {
  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      {/* Hero */}
      <div className="rounded-2xl overflow-hidden">
        <div className="bg-white/[0.02] p-6 md:p-8">
          {/* Mobile: centered */}
          <div className="flex flex-col items-center md:hidden">
            <Skeleton className="w-24 h-28 rounded-2xl" />
            <Skeleton className="h-6 w-40 mt-3" />
            <Skeleton className="h-4 w-32 mt-2" />
            <Skeleton className="h-8 w-28 mt-3" />
            <div className="flex gap-2 mt-4 w-full">
              <Skeleton className="h-10 flex-1 rounded-xl" />
              <Skeleton className="h-10 flex-1 rounded-xl" />
            </div>
          </div>
          {/* Desktop: horizontal */}
          <div className="hidden md:flex items-start gap-6">
            <Skeleton className="w-32 h-36 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-32 mt-2" />
              <div className="flex gap-2 mt-3">
                <Skeleton className="h-10 w-28 rounded-xl" />
                <Skeleton className="h-10 w-28 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Skeleton className="h-12 rounded-2xl" />

      {/* Content (single column) */}
      <div className="space-y-4">
        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
        <SkeletonCard className="h-48" />
        <SkeletonCard className="h-36" />
        <SkeletonCard className="h-48" />
      </div>
    </div>
  );
}
