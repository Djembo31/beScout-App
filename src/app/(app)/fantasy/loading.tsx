export default function FantasyLoading() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-5 animate-pulse motion-reduce:animate-none">
      <div className="flex items-center justify-between">
        <div className="h-8 w-52 bg-surface-subtle rounded-lg" />
        <div className="h-9 w-32 bg-surface-subtle rounded-xl" />
      </div>
      <div className="h-[52px] bg-surface-subtle rounded-2xl" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-36 bg-surface-base border border-white/10 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
