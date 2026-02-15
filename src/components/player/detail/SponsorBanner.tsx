'use client';

import { Zap } from 'lucide-react';

interface SponsorBannerProps {
  placement: 'hero' | 'mid' | 'footer';
  className?: string;
}

export default function SponsorBanner({ placement, className = '' }: SponsorBannerProps) {
  return (
    <div className={`bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-2.5 flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-[#FFD700]/50" />
        <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">
          {placement === 'hero' ? 'Präsentiert von' : placement === 'mid' ? 'Gesponsert von' : 'Partner'}
        </span>
      </div>
      <span className="text-xs font-black text-white/20">BeScout</span>
    </div>
  );
}
