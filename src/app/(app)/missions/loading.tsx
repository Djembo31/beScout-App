export default function MissionsLoading() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-5 animate-pulse motion-reduce:animate-none">
      <div className="h-8 w-40 bg-white/[0.04] rounded-lg" />
      <div className="h-5 w-64 bg-white/[0.04] rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-36 bg-surface-base border border-white/10 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
