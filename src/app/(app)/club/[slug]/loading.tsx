export default function ClubLoading() {
  return (
    <div className="space-y-6 animate-pulse motion-reduce:animate-none">
      {/* Club hero */}
      <div className="bg-surface-base border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="size-14 bg-white/[0.06] rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-40 bg-white/[0.06] rounded-lg" />
            <div className="h-4 w-28 bg-white/[0.04] rounded-lg" />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-surface-subtle rounded-xl" />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <div className="h-10 flex-1 bg-white/[0.04] rounded-xl" />
          <div className="h-10 w-24 bg-white/[0.04] rounded-xl" />
        </div>
      </div>

      {/* Tab bar skeleton */}
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-9 w-20 bg-white/[0.04] rounded-lg" />
        ))}
      </div>

      {/* Player list skeleton */}
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-surface-base border border-white/10 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
