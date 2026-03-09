export default function CommunityLoading() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-white/[0.04] rounded-lg" />
        <div className="h-9 w-28 bg-white/[0.04] rounded-xl" />
      </div>
      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 w-20 bg-white/[0.04] rounded-full" />
        ))}
      </div>
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-48 bg-surface-base border border-white/10 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
