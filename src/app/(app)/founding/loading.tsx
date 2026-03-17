export default function FoundingLoading() {
  return (
    <div className="space-y-6 animate-pulse motion-reduce:animate-none">
      <div className="h-8 w-56 bg-white/[0.04] rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-48 bg-surface-base border border-white/10 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
