'use client';

import React, { useMemo } from 'react';
import {
  Crown, Plus, Sparkles, Building2,
} from 'lucide-react';
import { PlayerPhoto } from '@/components/player';
import type { Pos, SynergyDetail } from '@/types';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';
import type { FantasyEvent, UserDpcHolding } from '@/components/fantasy/types';
import { getScoreColor, getPosAccentColor } from '@/components/fantasy/helpers';

export interface PitchViewProps {
  event: FantasyEvent;
  formationSlots: { pos: string; slot: number }[];
  slotDbKeys: string[];
  selectedFormation: string;
  getSelectedPlayer: (slot: number) => UserDpcHolding | null;
  isPlayerLocked: (playerId: string) => boolean;
  captainSlot: string | null;
  slotScores: Record<string, number> | null;
  progressiveScores: Map<string, number>;
  wildcardSlots?: Set<string>;
  ownedPlayerIds?: Set<string>;
  ownershipBonusIds: Set<string>;
  isScored: boolean;
  isReadOnly: boolean;
  onSlotClick: (slot: { pos: string; slot: number }) => void;
  onRemovePlayer: (slot: number) => void;
  onCaptainToggle: (slotDbKey: string, isCaptain: boolean) => void;
  onWildcardToggle?: (slotKey: string) => void;
}

export function PitchView({
  event,
  formationSlots,
  slotDbKeys,
  selectedFormation,
  getSelectedPlayer,
  isPlayerLocked,
  captainSlot,
  slotScores,
  progressiveScores,
  wildcardSlots,
  ownedPlayerIds,
  ownershipBonusIds,
  isScored,
  isReadOnly,
  onSlotClick,
  onRemovePlayer,
  onCaptainToggle,
  onWildcardToggle,
}: PitchViewProps) {
  const t = useTranslations('fantasy');
  const tsp = useTranslations('sponsor');
  const locale = useLocale();

  const getPlayerStatusStyle = (s: UserDpcHolding['status']) => {
    switch (s) {
      case 'fit': return { icon: '\u{1F7E2}', label: t('statusFit'), color: 'text-green-500' };
      case 'injured': return { icon: '\u{1F534}', label: t('statusInjured'), color: 'text-red-400' };
      case 'suspended': return { icon: '\u26D4', label: t('statusSuspended'), color: 'text-orange-400' };
      case 'doubtful': return { icon: '\u{1F7E1}', label: t('statusDoubtful'), color: 'text-yellow-400' };
      default: return { icon: '\u{1F7E2}', label: t('statusFit'), color: 'text-white/50' };
    }
  };

  return (
    <div className="rounded-xl overflow-hidden border border-green-500/20">
      {/* Sponsor Banner Top (Bandenwerbung) */}
      <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#1a1a2e] px-4 py-2.5 flex items-center justify-center gap-3 border-b border-white/10">
        {event.sponsorLogo ? (
          <img src={event.sponsorLogo} alt={event.sponsorName || 'Sponsor'} className="h-5 w-auto object-contain" />
        ) : (
          <div className="size-5 rounded bg-gold/20 flex items-center justify-center">
            <Sparkles aria-hidden="true" className="size-3 text-gold" />
          </div>
        )}
        <span className="text-xs font-bold text-white/50 uppercase">{event.sponsorName || tsp('sponsorPlaceholder')}</span>
        {event.sponsorLogo ? (
          <img src={event.sponsorLogo} alt="" className="h-5 w-auto object-contain" />
        ) : (
          <div className="size-5 rounded bg-gold/20 flex items-center justify-center">
            <Sparkles aria-hidden="true" className="size-3 text-gold" />
          </div>
        )}
      </div>

      {/* Pitch */}
      <div className="relative bg-gradient-to-b from-[#1a5c1a]/40 via-[#1e6b1e]/30 to-[#1a5c1a]/40 px-3 md:px-6 py-4 md:py-5">
        {/* Pitch Markings (SVG overlay) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 400 500">
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
          {/* Grass stripes */}
          {[0, 1, 2, 3, 4].map(i => (
            <rect key={i} x="20" y={15 + i * 94} width="360" height="47" fill="white" fillOpacity="0.015" />
          ))}
        </svg>

        {/* Midfield Sponsor (Center Circle) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="size-20 rounded-full border border-divider flex items-center justify-center">
            {event.sponsorLogo ? (
              <img src={event.sponsorLogo} alt="" className="size-12 object-contain opacity-30" />
            ) : (
              <span className="text-xs text-white/15 font-bold uppercase">Sponsor</span>
            )}
          </div>
        </div>

        <div className="text-xs text-white/40 text-center mb-3 relative z-10">Formation: {selectedFormation}</div>

        <div className="space-y-6 relative z-10">
          {/* Render each position group dynamically */}
          {['ATT', 'MID', 'DEF', 'GK'].map(posGroup => {
            const posSlots = formationSlots.filter(s => s.pos === posGroup);
            if (posSlots.length === 0) return null;
            return (
              <div key={posGroup} className={`flex justify-center ${posSlots.length > 1 ? 'gap-6 md:gap-16' : ''}`}>
                {posSlots.map(slot => {
                  const player = getSelectedPlayer(slot.slot);
                  const pStatus = player ? getPlayerStatusStyle(player.status) : null;
                  const finalScore = (isScored && slotScores) ? slotScores[slotDbKeys[slot.slot]] : undefined;
                  const liveScore = (!isScored && event?.status === 'running' && player)
                    ? progressiveScores.get(player.id) ?? undefined
                    : undefined;
                  const slotScore = finalScore ?? liveScore;
                  const hasScore = slotScore != null;
                  const isLiveScore = !isScored && liveScore != null;
                  const isCaptain = captainSlot === slotDbKeys[slot.slot];
                  const isOwnedPlayer = player ? (ownedPlayerIds?.has(player.id) ?? false) : false;
                  const hasActiveBonus = player ? ownershipBonusIds.has(player.id) : false;
                  const slotLocked = player ? isPlayerLocked(player.id) : false;
                  const slotReadOnly = isReadOnly || slotLocked;
                  const slotDbKey = slotDbKeys[slot.slot];
                  const isWildcard = wildcardSlots?.has(slotDbKey) ?? false;
                  return (
                    <div key={slot.slot} className="flex flex-col items-center relative">
                      {/* Wild Card badge (bottom-right) */}
                      {isWildcard && !hasScore && (
                        <div className="absolute -bottom-1 -right-2 z-30 px-1 py-0.5 rounded bg-purple-500/90 text-[9px] font-black text-white shadow-lg">WC</div>
                      )}
                      {/* DPC Ownership Bonus badge (bottom-left) */}
                      {player && isOwnedPlayer && !hasScore && !isWildcard && (
                        <div className={cn(
                          'absolute -bottom-1 -left-2 z-30 px-1 py-0.5 rounded text-[9px] font-black shadow-lg',
                          hasActiveBonus
                            ? 'bg-gold/90 text-black'
                            : 'bg-white/10 text-white/30'
                        )}>SC +5%</div>
                      )}
                      {/* LIVE badge for locked players (only if no score yet) */}
                      {player && slotLocked && !hasScore && (
                        <div className="absolute -top-2 -right-2 z-30 px-1.5 py-0.5 rounded bg-green-500 text-xs font-black text-white shadow-lg animate-pulse motion-reduce:animate-none">LIVE</div>
                      )}
                      {/* Captain Crown (top-left) */}
                      {player && isCaptain && (
                        <div className="absolute -top-2 -left-2 z-30 size-5 rounded-full bg-gold flex items-center justify-center shadow-lg">
                          <Crown aria-hidden="true" className="size-3 text-black" />
                        </div>
                      )}
                      {/* Captain x1.5 badge (scored view) */}
                      {player && hasScore && isCaptain && (
                        <div className="absolute -top-2 left-4 z-30 px-1 py-0.5 rounded bg-gold/90 text-xs font-black text-black shadow-lg">&times;1.5</div>
                      )}
                      {/* Score badge (top-right, overlapping circle) -- final or live */}
                      {player && hasScore && (
                        <div
                          className={cn(
                            "absolute -top-2 -right-3 z-20 min-w-[2rem] px-1.5 py-0.5 rounded-full text-xs font-mono font-black text-center shadow-lg",
                            isLiveScore && "ring-1 ring-green-400/50"
                          )}
                          style={{
                            backgroundColor: slotScore >= 100 ? '#FFD700' : slotScore >= 70 ? 'rgba(255,255,255,0.9)' : '#ff6b6b',
                            color: slotScore >= 100 ? '#000' : slotScore >= 70 ? '#000' : '#fff',
                          }}
                        >
                          {slotScore}
                        </div>
                      )}
                      <button
                        onClick={() => !slotReadOnly && (player ? onRemovePlayer(slot.slot) : onSlotClick(slot))}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (!isReadOnly && player) {
                            // Captain can only be set/changed on unlocked slots
                            if (slotLocked && !isCaptain) return;
                            onCaptainToggle(slotDbKeys[slot.slot], isCaptain);
                          }
                        }}
                        onDoubleClick={() => {
                          if (!isReadOnly && player) {
                            if (slotLocked && !isCaptain) return;
                            onCaptainToggle(slotDbKeys[slot.slot], isCaptain);
                          }
                        }}
                        className={`flex flex-col items-center ${slotReadOnly ? 'cursor-default' : ''}`}
                      >
                      <div
                        className={`size-11 md:size-14 rounded-full flex items-center justify-center border-2 transition-colors overflow-hidden ${player
                          ? hasScore
                            ? 'bg-black/40'
                            : player.status === 'injured' ? 'bg-red-500/20 border-red-400' :
                              player.status === 'suspended' ? 'bg-orange-500/20 border-orange-400' :
                                'bg-black/30'
                          : 'bg-white/5 border-dashed hover:brightness-125'
                        }`}
                        style={{
                          borderColor: player && isCaptain && !hasScore ? '#FFD700'
                            : player && !hasScore && player.status !== 'injured' && player.status !== 'suspended'
                              ? getPosAccentColor(player.pos)
                              : player && hasScore
                                ? getScoreColor(slotScore!)
                                : !player ? getPosAccentColor(slot.pos) + '60' : undefined,
                          boxShadow: player && isCaptain && !hasScore ? '0 0 12px rgba(255,215,0,0.3)'
                            : player && hasScore ? `0 0 12px ${getScoreColor(slotScore!)}40` : undefined,
                        }}
                      >
                        {player ? (
                          <PlayerPhoto imageUrl={player.imageUrl} first={player.first} last={player.last} pos={player.pos as Pos} size={44} className="md:size-14" />
                        ) : (
                          <Plus aria-hidden="true" className="size-5 text-white/30" />
                        )}
                      </div>
                      {pStatus && !hasScore && pStatus.icon !== '\u{1F7E2}' && !isCaptain && (
                        <span className="absolute -top-1 -right-1 text-xs">{pStatus.icon}</span>
                      )}
                      <div className="text-xs mt-1" style={{ color: player ? (hasScore ? '#ffffffcc' : isCaptain ? '#FFD700' : getPosAccentColor(player.pos) + 'aa') : getPosAccentColor(slot.pos) + '80' }}>
                        {player ? player.last.slice(0, 8) : slot.pos}
                      </div>
                      {player && !hasScore && !isWildcard && (
                        <div className="text-xs text-white/30">L5: {player.perfL5} &bull; {player.dpcAvailable}/{player.dpcOwned}</div>
                      )}
                      {player && !hasScore && isWildcard && (
                        <div className="text-xs text-purple-300/60">L5: {player.perfL5}</div>
                      )}
                      </button>
                      {/* Wild Card toggle -- only when event allows and slot is editable */}
                      {event?.wildcardsAllowed && !isReadOnly && !slotLocked && !hasScore && onWildcardToggle && (
                        <button
                          onClick={() => onWildcardToggle(slotDbKey)}
                          className={cn(
                            'mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors',
                            isWildcard
                              ? 'bg-purple-500/80 text-white'
                              : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50'
                          )}
                        >
                          {isWildcard ? 'WC \u2713' : 'WC'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sponsor Banner Bottom (Bandenwerbung unten) */}
      <div className="bg-gradient-to-r from-[#1a1a2e] via-[#0f3460] to-[#1a1a2e] px-3 py-2 flex items-center justify-between border-t border-white/10">
        <div className="flex items-center gap-2 px-3 py-1 bg-surface-subtle rounded-lg border border-divider">
          {event.sponsorLogo ? (
            <img src={event.sponsorLogo} alt="" className="h-4 w-auto object-contain" />
          ) : (
            <div className="size-4 rounded bg-gold/20 flex items-center justify-center">
              <Building2 aria-hidden="true" className="size-2.5 text-gold/60" />
            </div>
          )}
          <span className="text-xs text-white/30 font-medium">{event.sponsorName || 'Sponsor Logo'}</span>
        </div>
        <span className="text-xs text-white/20 font-bold uppercase">{event.sponsorName ? `${event.sponsorName} \u00d7 BeScout` : 'Powered by BeScout'}</span>
        <div className="flex items-center gap-2 px-3 py-1 bg-surface-subtle rounded-lg border border-divider">
          {event.sponsorLogo ? (
            <img src={event.sponsorLogo} alt="" className="h-4 w-auto object-contain" />
          ) : (
            <div className="size-4 rounded bg-gold/20 flex items-center justify-center">
              <Building2 aria-hidden="true" className="size-2.5 text-gold/60" />
            </div>
          )}
          <span className="text-xs text-white/30 font-medium">{event.sponsorName || 'Sponsor Logo'}</span>
        </div>
      </div>
    </div>
  );
}
