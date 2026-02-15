'use client';

import { TrikotBadge } from '@/components/player/PlayerRow';
import { PositionBadge } from '@/components/player';
import type { Pos } from '@/types';

const posGradients: Record<string, string> = {
  GK: 'from-emerald-500/30 to-emerald-500/5',
  DEF: 'from-amber-500/30 to-amber-500/5',
  MID: 'from-sky-500/30 to-sky-500/5',
  ATT: 'from-rose-500/30 to-rose-500/5',
};

interface PlayerImagePlaceholderProps {
  pos: Pos;
  shirtNumber: number;
  club: string;
  imageUrl?: string | null;
}

export default function PlayerImagePlaceholder({
  pos, shirtNumber, club, imageUrl,
}: PlayerImagePlaceholderProps) {
  const gradient = posGradients[pos] || posGradients.MID;

  if (imageUrl) {
    return (
      <div className="w-24 h-28 md:w-32 md:h-36 rounded-2xl overflow-hidden shrink-0">
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`w-24 h-28 md:w-32 md:h-36 rounded-2xl bg-gradient-to-b ${gradient} flex items-center justify-center shrink-0 border border-white/10`}>
      {shirtNumber > 0 ? (
        <TrikotBadge number={shirtNumber} pos={pos} club={club} size="lg" />
      ) : (
        <PositionBadge pos={pos} size="lg" />
      )}
    </div>
  );
}
