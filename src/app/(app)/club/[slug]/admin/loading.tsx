export default function ClubAdminLoading() {
  return (
    <div className="space-y-6 animate-pulse motion-reduce:animate-none">
      {/* Admin header */}
      <div className="bg-surface-base border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="size-14 bg-white/[0.06] rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-48 bg-white/[0.06] rounded-lg" />
            <div className="h-4 w-32 bg-white/[0.04] rounded-lg" />
          </div>
        </div>
      </div>

      {/* Admin tab bar */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-9 w-24 bg-white/[0.04] rounded-lg shrink-0" />
        ))}
      </div>

      {/* Admin content cards */}
      <div className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-surface-base border border-white/10 rounded-xl" />
          ))}
        </div>

        {/* Table/list skeleton */}
        <div className="bg-surface-base border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="h-5 w-36 bg-white/[0.06] rounded-lg" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-surface-subtle rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
