'use client';

import React, { useEffect, useState } from 'react';

const COLORS = ['#FFD700', '#22C55E', '#ffffff', '#FFA500', '#38BDF8', '#A855F7'];
const PARTICLE_COUNT = 24;

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function Confetti({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [active]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden" aria-hidden="true">
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
        const left = randomBetween(5, 95);
        const delay = randomBetween(0, 0.8);
        const duration = randomBetween(2, 3.5);
        const size = randomBetween(6, 12);
        const color = COLORS[i % COLORS.length];
        const shape = i % 3 === 0 ? 'rounded-full' : i % 3 === 1 ? 'rounded-sm' : '';

        return (
          <div
            key={i}
            className={`absolute ${shape}`}
            style={{
              left: `${left}%`,
              top: '-2%',
              width: `${size}px`,
              height: `${size * (i % 2 === 0 ? 1 : 0.6)}px`,
              backgroundColor: color,
              animation: `confetti-fall ${duration}s linear ${delay}s forwards`,
              opacity: 0.9,
            }}
          />
        );
      })}
    </div>
  );
}
