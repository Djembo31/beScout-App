export default function AppLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-white/[0.04] rounded-lg" />
        <div className="h-8 w-24 bg-white/[0.04] rounded-lg" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-white/[0.02] border border-white/10 rounded-2xl" />
        ))}
      </div>

      {/* Content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-64 bg-white/[0.02] border border-white/10 rounded-2xl" />
          <div className="h-48 bg-white/[0.02] border border-white/10 rounded-2xl" />
        </div>
        <div className="space-y-4">
          <div className="h-40 bg-white/[0.02] border border-white/10 rounded-2xl" />
          <div className="h-56 bg-white/[0.02] border border-white/10 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
