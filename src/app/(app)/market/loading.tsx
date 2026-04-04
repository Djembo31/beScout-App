export default function MarketLoading() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-5 animate-pulse motion-reduce:animate-none">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-surface-subtle rounded-lg" />
        <div className="h-9 w-44 bg-surface-subtle rounded-xl" />
      </div>
      <div className="h-[52px] bg-surface-subtle rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-64 bg-surface-base border border-white/10 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
