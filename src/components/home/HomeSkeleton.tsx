import { Skeleton } from '@/components/ui';

export default function HomeSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-4 md:space-y-6">
      {/* Story Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-3 w-56 mt-2" />
          </div>
          <Skeleton className="h-8 w-16 rounded-xl" />
        </div>
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-9 w-20 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      {/* Spotlight Card */}
      <Skeleton className="h-24 rounded-2xl" />

      {/* Live Ticker */}
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-7 w-36 rounded-lg shrink-0" />
        ))}
      </div>

      {/* Portfolio Strip */}
      <div>
        <Skeleton className="h-5 w-40 mb-3" />
        <div className="flex gap-2.5">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-[140px] rounded-xl shrink-0" />
          ))}
        </div>
      </div>

      {/* Trending */}
      <div>
        <Skeleton className="h-5 w-28 mb-3" />
        <div className="flex gap-2.5">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-[140px] rounded-xl shrink-0" />
          ))}
        </div>
      </div>
    </div>
  );
}
