'use client';

import React, { memo } from 'react';

/**
 * BeScout pitch atmosphere — CSS-only, zero blur, zero images.
 * Golden floodlight glow + subtle pitch elements + vignette.
 * Renders exactly once via memo. ~0 GPU cost vs previous 25px blur.
 */
export const BackgroundEffects = memo(function BackgroundEffects() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Floodlight glow — warm gold from above, like stadium lights */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 45% at 50% -5%, rgba(255,215,0,0.06) 0%, rgba(255,165,0,0.02) 40%, transparent 70%)',
        }}
      />

      {/* Pitch ambient — faint green tint at the bottom edge */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 30% at 50% 110%, rgba(0,230,118,0.025) 0%, transparent 60%)',
        }}
      />

      {/* Vignette — darker edges for depth, draws eye to content */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 40%, transparent 50%, rgba(0,0,0,0.4) 100%)',
        }}
      />

      {/* Center circle — subliminal pitch reference */}
      <div
        className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 'min(55vw, 420px)',
          height: 'min(55vw, 420px)',
          border: '1px solid rgba(255,255,255,0.015)',
        }}
      />

      {/* Half-way line */}
      <div
        className="absolute left-0 right-0 top-[45%] h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.015) 25%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.015) 75%, transparent 95%)',
        }}
      />

      {/* Noise grain — very light texture */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
      />
    </div>
  );
});
