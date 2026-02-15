'use client';

import { Star } from 'lucide-react';
import { Card } from '@/components/ui';
import type { PlayerGameweekScore } from '@/lib/services/scoring';

interface GameweekScoreBarProps {
  scores: PlayerGameweekScore[];
  maxDisplay?: number;
  className?: string;
}

export default function GameweekScoreBar({ scores, maxDisplay = 10, className = '' }: GameweekScoreBarProps) {
  return (
    <Card className={`p-4 md:p-6 ${className}`}>
      <h3 className="font-black text-lg mb-4 flex items-center gap-2">
        <Star className="w-5 h-5 text-[#FFD700]" />
        Spieltag-Bewertungen
      </h3>
      {scores.length === 0 ? (
        <div className="text-center py-6 text-white/40">
          Noch keine Spieltag-Bewertungen
        </div>
      ) : (
        <div className="space-y-2">
          {scores.slice(0, maxDisplay).map((gw) => {
            const barWidth = Math.min(100, Math.max(0, ((gw.score - 40) / 110) * 100));
            const scoreColor = gw.score >= 100 ? 'text-[#FFD700]' : gw.score >= 70 ? 'text-white' : 'text-red-400';
            const barColor = gw.score >= 100 ? 'bg-[#FFD700]/60' : gw.score >= 70 ? 'bg-white/30' : 'bg-red-400/40';
            return (
              <div key={gw.gameweek} className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
                <div className="w-8 text-center">
                  <div className="font-mono font-black text-sm text-white/70">{gw.gameweek}</div>
                  <div className="text-[9px] text-white/30">GW</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">Spieltag {gw.gameweek}</div>
                  <div className="text-[10px] text-white/40">
                    {new Date(gw.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div className="w-24 hidden sm:block">
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${barWidth}%` }} />
                  </div>
                </div>
                <div className={`font-mono font-black text-lg w-12 text-right ${scoreColor}`}>
                  {gw.score}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
