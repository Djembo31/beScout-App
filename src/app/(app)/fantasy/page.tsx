'use client';

import dynamic from 'next/dynamic';

const FantasyContent = dynamic(() => import('./FantasyContent'), {
  loading: () => (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-4 w-20 bg-white/[0.04] rounded-lg mb-1" />
          <div className="h-9 w-48 bg-white/[0.04] rounded-lg" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 bg-white/[0.04] rounded-xl" />
          <div className="h-10 w-28 bg-white/[0.04] rounded-xl" />
        </div>
      </div>
      {/* Pill Tabs */}
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-9 w-32 bg-white/[0.04] rounded-full" />
        ))}
      </div>
      {/* Section Header */}
      <div className="h-6 w-40 bg-white/[0.04] rounded-lg" />
      {/* Event Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
            <div className="h-3 bg-purple-500/10" />
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-5 w-32 bg-white/[0.04] rounded-lg" />
                <div className="h-5 w-16 bg-white/[0.04] rounded-full" />
              </div>
              <div className="h-4 w-24 bg-white/[0.04] rounded-lg" />
              <div className="flex gap-4">
                <div className="h-4 w-20 bg-white/[0.04] rounded-lg" />
                <div className="h-4 w-20 bg-white/[0.04] rounded-lg" />
              </div>
              <div className="h-2 w-full bg-white/[0.04] rounded-full" />
              <div className="h-10 w-full bg-white/[0.04] rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
});

export default function FantasyPage() {
  return <FantasyContent />;
}
