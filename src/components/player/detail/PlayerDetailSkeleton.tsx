'use client';

import { Skeleton, SkeletonCard } from '@/components/ui';

export default function PlayerDetailSkeleton() {
  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      {/* Hero */}
      <div className="rounded-2xl overflow-hidden border border-white/[0.06]">
        <div className="bg-[#0d0d0d] p-4 md:p-6">
          {/* Top bar */}
          <div className="flex justify-between mb-4">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
          </div>

          {/* Mobile: centered card */}
          <div className="flex flex-col items-center md:hidden">
            <Skeleton className="w-[180px] aspect-[3/4] rounded-2xl" />
            <Skeleton className="h-6 w-40 mt-4" />
            <Skeleton className="h-4 w-32 mt-2" />
            <div className="flex gap-1.5 mt-2">
              <Skeleton className="h-6 w-16 rounded-lg" />
              <Skeleton className="h-6 w-20 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-36 mt-4" />
          </div>

          {/* Desktop: horizontal */}
          <div className="hidden md:flex items-start gap-8">
            <Skeleton className="w-[220px] aspect-[3/4] rounded-2xl shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-40" />
              <div className="flex gap-1.5">
                <Skeleton className="h-6 w-16 rounded-lg" />
                <Skeleton className="h-6 w-20 rounded-lg" />
                <Skeleton className="h-6 w-24 rounded-lg" />
              </div>
              <Skeleton className="h-12 w-40 mt-2" />
              <div className="flex gap-2 mt-3">
                <Skeleton className="h-10 w-28 rounded-xl" />
                <Skeleton className="h-10 w-28 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Score Strip */}
      <Skeleton className="h-20 rounded-2xl" />

      {/* Tabs */}
      <Skeleton className="h-12 rounded-2xl" />

      {/* Content (single column — matches ProfilTab layout) */}
      <div className="space-y-4">
        {/* Quick Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-2xl" />
          ))}
        </div>
        {/* Attribute Radar */}
        <SkeletonCard className="h-[320px]" />
        {/* Spieler-Info */}
        <SkeletonCard className="h-[120px]" />
        {/* DPC Verteilung */}
        <SkeletonCard className="h-[240px]" />
      </div>
    </div>
  );
}
