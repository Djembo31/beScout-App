export default function BescoutAdminLoading() {
  return (
    <div className="space-y-6 animate-pulse motion-reduce:animate-none">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-surface-subtle rounded-lg" />
        <div className="h-8 w-24 bg-surface-subtle rounded-lg" />
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-9 w-24 bg-surface-subtle rounded-lg shrink-0" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-surface-base border border-white/10 rounded-xl" />
        ))}
      </div>
      <div className="h-96 bg-surface-base border border-white/10 rounded-2xl" />
    </div>
  );
}
