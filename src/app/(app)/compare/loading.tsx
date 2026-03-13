export default function CompareLoading() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-5 animate-pulse motion-reduce:animate-none">
      <div className="h-8 w-44 bg-white/[0.04] rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-64 bg-surface-base border border-white/10 rounded-2xl" />
        ))}
      </div>
      <div className="h-80 bg-surface-base border border-white/10 rounded-2xl" />
    </div>
  );
}
