export default function ManagerLoading() {
  return (
    <div className="space-y-6 animate-pulse motion-reduce:animate-none">
      <div className="h-12 bg-surface-subtle rounded-xl" />
      <div className="h-[400px] bg-surface-subtle rounded-2xl" />
      <div className="h-20 bg-surface-subtle rounded-xl" />
    </div>
  );
}
