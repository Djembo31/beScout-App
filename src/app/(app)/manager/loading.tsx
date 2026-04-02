export default function ManagerLoading() {
  return (
    <div className="space-y-6 animate-pulse motion-reduce:animate-none">
      <div className="h-12 bg-white/[0.04] rounded-xl" />
      <div className="h-[400px] bg-white/[0.04] rounded-2xl" />
      <div className="h-20 bg-white/[0.04] rounded-xl" />
    </div>
  );
}
