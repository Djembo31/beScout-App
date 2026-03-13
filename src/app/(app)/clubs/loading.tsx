export default function ClubsLoading() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-5 animate-pulse motion-reduce:animate-none">
      <div className="h-8 w-36 bg-white/[0.04] rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 bg-surface-base border border-white/10 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
