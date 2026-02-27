'use client';

import React, { memo } from 'react';
import Image from 'next/image';

/** Static stadium atmosphere background — renders exactly once via memo */
export const BackgroundEffects = memo(function BackgroundEffects() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Stadium photo — Spotify-style top gradient */}
      <Image
        src="/stadiums/default.jpg"
        alt=""
        fill
        quality={40}
        priority={false}
        className="object-cover blur-[25px] scale-110 opacity-[0.3]"
        style={{ maskImage: 'linear-gradient(to bottom, black 20%, transparent 65%)', WebkitMaskImage: 'linear-gradient(to bottom, black 20%, transparent 65%)' }}
      />
      {/* Top floodlight — golden wash from above */}
      <div className="absolute top-0 inset-x-0 h-[350px] bg-gradient-to-b from-[#FFD700]/[0.05] via-[#FFD700]/[0.02] to-transparent" />
      {/* Gold ambient blob — top right */}
      <div className="absolute -top-[200px] right-[10%] w-[700px] h-[700px] bg-[#FFD700]/[0.06] rounded-full blur-[160px]" />
      {/* Green ambient blob — bottom left */}
      <div className="absolute -bottom-[200px] left-[15%] w-[800px] h-[800px] bg-[#22C55E]/[0.04] rounded-full blur-[180px]" />
      {/* Subtle purple accent — center */}
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[600px] h-[400px] bg-purple-500/[0.02] rounded-full blur-[200px]" />
      {/* Noise texture — DexScreener-inspired grain */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
});
