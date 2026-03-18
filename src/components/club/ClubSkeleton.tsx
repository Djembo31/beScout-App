'use client';

import { Skeleton, SkeletonCard } from '@/components/ui';

export function ClubSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="relative h-[300px] md:h-[550px] -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-6 overflow-hidden">
        <div className="absolute inset-0 bg-surface-minimal" />
        <div className="absolute inset-0 flex items-center justify-center pt-8">
          <div className="text-center space-y-5">
            <Skeleton className="size-20 md:size-32 rounded-full mx-auto" />
            <Skeleton className="h-10 w-64 mx-auto" />
            <Skeleton className="h-4 w-48 mx-auto" />
            <div className="flex justify-center gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="text-center">
                  <Skeleton className="h-7 w-16 mx-auto mb-1" />
                  <Skeleton className="h-3 w-12 mx-auto" />
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-3">
              <Skeleton className="h-12 w-40 rounded-xl" />
              <Skeleton className="h-12 w-28 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
      <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <SkeletonCard key={i} className="h-24 p-3" />
        ))}
      </div>
      <div className="flex items-center border-b border-white/10 mb-6 gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SkeletonCard className="h-64 p-6" />
          <SkeletonCard className="h-48 p-6" />
        </div>
        <div className="space-y-6">
          <SkeletonCard className="h-48 p-6" />
          <SkeletonCard className="h-40 p-6" />
        </div>
      </div>
    </div>
  );
}
