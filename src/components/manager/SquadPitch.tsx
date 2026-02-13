'use client';

import React from 'react';
import type { Player, Pos } from '@/types';
import type { SquadFormation } from './types';
import { getPosColor, getScoreColor, getSlotPosition } from './helpers';
import { Plus } from 'lucide-react';

interface SquadPitchProps {
  formation: SquadFormation;
  assignments: Map<number, Player>; // slotIndex → Player
  onSlotClick: (slotIndex: number, pos: Pos) => void;
}

export default function SquadPitch({ formation, assignments, onSlotClick }: SquadPitchProps) {
  // Count players per row for position calculations
  const rowCounts = new Map<number, number>();
  formation.slots.forEach(s => rowCounts.set(s.row, (rowCounts.get(s.row) ?? 0) + 1));

  // Track col index per row
  const rowColIndex = new Map<number, number>();

  return (
    <div className="relative w-full bg-gradient-to-b from-[#1a5c1a]/40 via-[#1e6b1e]/30 to-[#1a5c1a]/40 rounded-2xl overflow-hidden border border-white/10">
      {/* Aspect ratio container */}
      <div className="relative" style={{ paddingBottom: '125%' /* 500/400 */ }}>
        {/* SVG Field Markings */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 400 500">
          {/* Grass stripes */}
          {[0, 1, 2, 3, 4].map(i => (
            <rect key={i} x="20" y={15 + i * 94} width="360" height="47" fill="white" fillOpacity="0.015" />
          ))}
          {/* Outer border */}
          <rect x="20" y="15" width="360" height="470" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="1.5" />
          {/* Center line */}
          <line x1="20" y1="250" x2="380" y2="250" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
          {/* Center circle */}
          <circle cx="200" cy="250" r="50" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
          <circle cx="200" cy="250" r="3" fill="white" fillOpacity="0.1" />
          {/* Top penalty area */}
          <rect x="100" y="15" width="200" height="80" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
          <rect x="140" y="15" width="120" height="35" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
          {/* Bottom penalty area */}
          <rect x="100" y="405" width="200" height="80" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
          <rect x="140" y="450" width="120" height="35" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
        </svg>

        {/* Player Circles Overlay */}
        <div className="absolute inset-0">
          {formation.slots.map((slot, idx) => {
            const colIdx = rowColIndex.get(slot.row) ?? 0;
            rowColIndex.set(slot.row, colIdx + 1);
            const count = rowCounts.get(slot.row) ?? 1;
            const { x, y } = getSlotPosition(slot.row, colIdx, count);
            const player = assignments.get(idx);
            const posColor = getPosColor(slot.pos);

            // Convert SVG coords to percentage
            const left = `${(x / 400) * 100}%`;
            const top = `${(y / 500) * 100}%`;

            return (
              <button
                key={idx}
                onClick={() => onSlotClick(idx, slot.pos)}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group"
                style={{ left, top }}
              >
                {player ? (
                  <>
                    {/* Filled slot */}
                    <div
                      className="relative w-11 h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center border-2 bg-black/40 group-hover:scale-110 transition-transform"
                      style={{
                        borderColor: player.perf.l5 > 0 ? getScoreColor(player.perf.l5) : posColor,
                        boxShadow: `0 0 12px ${posColor}40`,
                      }}
                    >
                      <span className="font-bold text-xs md:text-sm" style={{ color: posColor }}>
                        {player.first[0]}{player.last[0]}
                      </span>
                    </div>
                    {/* L5 Score Badge */}
                    {player.perf.l5 > 0 && (
                      <div
                        className="absolute -top-2 -right-3 z-20 min-w-[1.75rem] px-1 py-0.5 rounded-full text-[9px] md:text-[10px] font-mono font-black text-center shadow-lg"
                        style={{
                          backgroundColor: player.perf.l5 >= 100 ? '#FFD700' : player.perf.l5 >= 70 ? 'rgba(255,255,255,0.9)' : '#ff6b6b',
                          color: player.perf.l5 >= 100 ? '#000' : player.perf.l5 >= 70 ? '#000' : '#fff',
                        }}
                      >
                        {player.perf.l5}
                      </div>
                    )}
                    {/* Name */}
                    <div className="text-[9px] md:text-[10px] mt-1 font-medium truncate max-w-[60px] md:max-w-[80px] text-center" style={{ color: posColor + 'cc' }}>
                      {player.last.slice(0, 8)}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Empty slot */}
                    <div
                      className="w-11 h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center border-2 border-dashed bg-black/20 group-hover:bg-black/40 group-hover:scale-110 transition-all"
                      style={{ borderColor: posColor + '60' }}
                    >
                      <Plus className="w-4 h-4 md:w-5 md:h-5" style={{ color: posColor + '80' }} />
                    </div>
                    <div className="text-[9px] md:text-[10px] mt-1 font-bold" style={{ color: posColor + '80' }}>
                      {slot.pos}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
