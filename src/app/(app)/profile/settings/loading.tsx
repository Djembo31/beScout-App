export default function SettingsLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-pulse motion-reduce:animate-none">
      <div className="h-8 w-36 bg-white/[0.04] rounded-lg" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-48 bg-surface-base border border-white/10 rounded-2xl" />
      ))}
    </div>
  );
}
