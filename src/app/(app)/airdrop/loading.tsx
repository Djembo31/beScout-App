export default function AirdropLoading() {
  return (
    <div className="space-y-6 animate-pulse motion-reduce:animate-none">
      <div className="h-8 w-48 bg-surface-subtle rounded-lg" />
      <div className="h-24 bg-surface-base border border-white/10 rounded-2xl" />
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-14 bg-surface-base border border-white/10 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
