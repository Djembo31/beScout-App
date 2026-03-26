'use client';

import React from 'react';
import {
  Crown, CheckCircle2, AlertCircle,
  Lock, Play, Sparkles,
  Briefcase, Building2, BarChart3, Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';
import type { FantasyEvent, LineupPlayer, UserDpcHolding } from '@/components/fantasy/types';
import type { SynergyDetail } from '@/types';

export interface SynergyPreviewProps {
  event: FantasyEvent;
  synergyPreview: { totalPct: number; details: SynergyDetail[] };
  ownedPlayerIds?: Set<string>;
  ownershipBonusIds: Set<string>;
  captainSlot: string | null;
  slotDbKeys: string[];
  getSelectedPlayer: (slot: number) => UserDpcHolding | null;
  isPlayerLocked: (playerId: string) => boolean;
  isScored: boolean;
  isReadOnly: boolean;
  isLineupComplete: boolean;
  selectedPlayersCount: number;
  formationSlotsCount: number;
  formationSlots: { pos: string; slot: number }[];
  reqCheck: { ok: boolean; message: string };
  wildcardSlots?: Set<string>;
  isPartiallyLocked: boolean;
  nextKickoff: number | null;
  scoringJustFinished: boolean;
  progressiveScores: Map<string, number>;
  setCaptainSlot: (slot: string | null) => void;
  selectedPlayers: LineupPlayer[];
}

export function SynergyPreview({
  event,
  synergyPreview,
  ownedPlayerIds,
  ownershipBonusIds,
  captainSlot,
  slotDbKeys,
  getSelectedPlayer,
  isPlayerLocked,
  isScored,
  isReadOnly,
  isLineupComplete,
  selectedPlayersCount,
  formationSlotsCount,
  formationSlots,
  reqCheck,
  wildcardSlots,
  isPartiallyLocked,
  nextKickoff,
  scoringJustFinished,
  progressiveScores,
  setCaptainSlot,
  selectedPlayers,
}: SynergyPreviewProps) {
  const t = useTranslations('fantasy');
  const locale = useLocale();

  const isFullyLocked = event.status === 'ended';

  return (
    <>
      {/* Status banner -- fully locked */}
      {isFullyLocked && !isScored && (
        <div className="flex items-center gap-2 p-3 bg-surface-subtle border border-white/10 rounded-lg">
          <Lock aria-hidden="true" className="size-4 text-white/40" />
          <span className="text-sm text-white/50">{t('eventEndedBanner')}</span>
        </div>
      )}
      {/* Status banner -- partially locked (per-fixture) */}
      {isPartiallyLocked && !isScored && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <Lock aria-hidden="true" className="size-4 text-amber-400" />
          <span className="text-sm text-amber-300">{t('partiallyLockedBanner')}</span>
          {nextKickoff && (
            <span className="text-xs text-amber-400/60 ml-auto font-mono tabular-nums">
              {t('nextKickoffLabel', { time: new Date(nextKickoff).toLocaleTimeString(locale === 'tr' ? 'tr-TR' : 'de-DE', { hour: '2-digit', minute: '2-digit' }) })}
            </span>
          )}
        </div>
      )}
      {/* Wild Card counter -- shown when event allows wild cards */}
      {event?.wildcardsAllowed && !isScored && !isReadOnly && (
        <div className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <Sparkles aria-hidden="true" className="size-4 text-purple-400" />
          <span className="text-sm text-purple-300">
            {t('wildcardCounter', { used: wildcardSlots?.size ?? 0, max: event.maxWildcardsPerLineup ?? 0 })}
          </span>
        </div>
      )}
      {/* Status banner -- all fixtures running */}
      {event.status === 'running' && !isPartiallyLocked && !isScored && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <Play aria-hidden="true" className="size-4 text-green-400" />
          <span className="text-sm text-green-300">{t('allRunningBanner')}</span>
        </div>
      )}
      {/* Progressive Score Banner */}
      {event.status === 'running' && event.isJoined && progressiveScores.size > 0 && !isScored && (
        <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 aria-hidden="true" className="size-4 text-green-400" />
            <span className="text-xs font-semibold text-green-300">{t('livePointsLabel')}</span>
          </div>
          <div className="text-sm font-mono font-bold text-green-400 tabular-nums">
            {(() => {
              let total = 0;
              let playersScored = 0;
              formationSlots.forEach(slot => {
                const player = getSelectedPlayer(slot.slot);
                if (!player) return;
                const score = progressiveScores.get(player.id);
                if (score == null) return;
                const isCpt = captainSlot === slotDbKeys[slot.slot];
                total += isCpt ? Math.min(225, Math.round(score * 1.5)) : score;
                playersScored++;
              });
              return t('livePtsCount', { total, scored: playersScored, max: formationSlots.length });
            })()}
          </div>
        </div>
      )}
      {isScored && (
        <div className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <Award aria-hidden="true" className="size-4 text-purple-400" />
          <span className="text-sm text-purple-300 font-bold">
            {scoringJustFinished ? t('gwScoredResults') : t('statusScored')}
            {event.scoredAt && !scoringJustFinished && (
              <span className="font-normal text-purple-300/60"> {t('scoredAt', { date: new Date(event.scoredAt).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) })}</span>
            )}
          </span>
        </div>
      )}

      {/* Captain Selection Hint */}
      {!isScored && !isReadOnly && selectedPlayers.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-gold/5 border border-gold/20 rounded-lg">
          <Crown aria-hidden="true" className="size-4 text-gold" />
          <span className="text-xs text-gold/80">
            {captainSlot ? t('captainSet', { name: (() => { const idx = slotDbKeys.indexOf(captainSlot); const p = idx >= 0 ? getSelectedPlayer(idx) : null; return p ? `${p.first} ${p.last}` : captainSlot; })() }) : t('captainHint')}
          </span>
          {captainSlot && (() => {
            const captainIdx = slotDbKeys.indexOf(captainSlot);
            const captainPlayer = captainIdx >= 0 ? getSelectedPlayer(captainIdx) : null;
            const captainLocked = captainPlayer ? isPlayerLocked(captainPlayer.id) : false;
            return !captainLocked ? (
              <button onClick={() => setCaptainSlot(null)} className="ml-auto text-xs text-white/40 hover:text-white/60">{t('captainRemove')}</button>
            ) : (
              <span className="ml-auto text-xs text-white/20">{t('captainLocked')}</span>
            );
          })()}
        </div>
      )}

      {/* Synergy Banner (during lineup building) */}
      {!isScored && !isReadOnly && synergyPreview.totalPct > 0 && (
        <div className="flex items-center gap-2 p-3 bg-sky-500/5 border border-sky-500/20 rounded-lg">
          <Building2 aria-hidden="true" className="size-4 text-sky-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-sky-300 font-bold">Synergy +{synergyPreview.totalPct}%</span>
            <span className="text-xs text-white/40 ml-2">
              {synergyPreview.details.map(d => `${d.source} \u00d7${Math.ceil(d.bonus_pct / 5) + 1}`).join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* DPC Ownership Bonus Banner (during lineup building) */}
      {!isScored && ownedPlayerIds && ownedPlayerIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-gold/[0.06] border border-gold/20 rounded-lg">
          <Briefcase aria-hidden="true" className="size-4 text-gold flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-gold font-bold">{t('ownershipBonus')}</span>
            <span className="text-xs text-white/40 ml-2">{t('ownershipBonusDesc')}</span>
          </div>
          <span className={cn(
            'text-xs font-mono font-bold px-2 py-0.5 rounded',
            ownershipBonusIds.size > 0
              ? 'bg-gold/15 text-gold'
              : 'bg-white/5 text-white/30'
          )}>
            {ownershipBonusIds.size > 0
              ? t('ownershipBonusActive', { count: ownershipBonusIds.size })
              : t('ownershipBonusInactive')}
          </span>
        </div>
      )}

      {/* Lineup Status (only when not scored) */}
      {!isScored && !isReadOnly && (
        isLineupComplete ? (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
            <CheckCircle2 aria-hidden="true" className="size-5 text-green-500 shrink-0" />
            <span className="text-sm font-bold text-green-500">{t('lineupComplete')}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-surface-subtle rounded-lg">
            <span className="text-sm text-white/60">{t('playersSelected', { n: selectedPlayersCount, m: formationSlotsCount })}</span>
            {!reqCheck.ok && (
              <span className="text-xs text-orange-400 flex items-center gap-1">
                <AlertCircle aria-hidden="true" className="size-3" />
                {reqCheck.message}
              </span>
            )}
          </div>
        )
      )}
    </>
  );
}
