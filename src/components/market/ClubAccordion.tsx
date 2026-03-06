'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { getClub } from '@/lib/clubs';
import PlayerIPORow from './PlayerIPORow';
import type { Player, DbIpo, Pos } from '@/types';

const POS_ORDER: { pos: Pos; label: string }[] = [
  { pos: 'GK', label: 'TW' },
  { pos: 'DEF', label: 'DEF' },
  { pos: 'MID', label: 'MID' },
  { pos: 'ATT', label: 'STU' },
];

interface ClubAccordionProps {
  clubName: string;
  players: Player[];
  ipoMap: Map<string, DbIpo>;
  onBuy?: (playerId: string) => void;
  buyingId: string | null;
  onClose: () => void;
}

export default function ClubAccordion({ clubName, players, ipoMap, onBuy, buyingId, onClose }: ClubAccordionProps) {
  const t = useTranslations('market');
  const club = getClub(clubName);
  const primaryColor = club?.colors.primary ?? '#666';

  const groups = useMemo(() => {
    return POS_ORDER.map(({ pos, label }) => {
      const posPlayers = players
        .filter(p => p.pos === pos)
        .sort((a, b) => b.perf.l5 - a.perf.l5);
      return { pos, label, players: posPlayers };
    }).filter(g => g.players.length > 0);
  }, [players]);

  if (groups.length === 0) return null;

  return (
    <div className="col-span-full border border-white/[0.08] rounded-2xl overflow-hidden anim-fade">
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]"
        style={{ borderLeft: `3px solid ${primaryColor}` }}
      >
        {club?.logo ? (
          <img src={club.logo} alt="" className="size-5 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="size-5 rounded-full flex-shrink-0 border border-white/10" style={{ backgroundColor: primaryColor }} />
        )}
        <span className="font-bold text-sm flex-1">{clubName}</span>
        <span className="text-[10px] text-white/40 tabular-nums">{players.length} DPCs</span>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          aria-label={t('closeClub', { defaultMessage: 'Schliessen' })}
        >
          <X className="size-4 text-white/40" aria-hidden="true" />
        </button>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {groups.map(({ pos, label, players: posPlayers }) => (
          <div key={pos} role="group" aria-label={`${label} — ${posPlayers.length} ${t('players', { defaultMessage: 'Spieler' })}`}>
            <div className="px-4 py-2 bg-white/[0.02]">
              <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-wide">
                {label} <span className="tabular-nums">({posPlayers.length})</span>
              </h4>
            </div>
            <div>
              {posPlayers.map(p => {
                const ipo = ipoMap.get(p.id);
                if (!ipo) return null;
                return (
                  <PlayerIPORow
                    key={p.id}
                    player={p}
                    ipo={ipo}
                    onBuy={onBuy}
                    buying={buyingId === p.id}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
