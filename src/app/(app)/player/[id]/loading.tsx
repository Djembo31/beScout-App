export default function PlayerLoading() {
  return (
    <div className="space-y-6 animate-pulse motion-reduce:animate-none">
      {/* Back button + player header */}
      <div className="flex items-center gap-3">
        <div className="size-8 bg-surface-subtle rounded-lg" />
        <div className="h-6 w-32 bg-surface-subtle rounded-lg" />
      </div>

      {/* Player hero card */}
      <div className="bg-surface-base border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="size-16 bg-white/[0.06] rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-48 bg-white/[0.06] rounded-lg" />
            <div className="h-4 w-32 bg-surface-subtle rounded-lg" />
          </div>
          <div className="h-10 w-10 bg-surface-subtle rounded-xl" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-surface-subtle rounded-xl" />
          ))}
        </div>
      </div>

      {/* Tab bar skeleton */}
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-9 w-20 bg-surface-subtle rounded-lg" />
        ))}
      </div>

      {/* Content area */}
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-surface-base border border-white/10 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
