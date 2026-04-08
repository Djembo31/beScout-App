'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ChevronDown, ChevronRight, Trophy, Crown, Loader2, Calendar, ArrowRight,
} from 'lucide-react';
import { cn, fmtScout } from '@/lib/utils';
import { useManagerStore, type ApplyLineupTemplate } from '../../store/managerStore';
import { useLineupSnapshot } from '../../queries/historyQueries';
import { useManagerData } from '../../hooks/useManagerData';
import { useOpenEvents, pickDefaultEvent } from '../../queries/eventQueries';
import { useUser } from '@/components/providers/AuthProvider';
import { getFormationsForFormat, buildSlotDbKeys } from '@/features/fantasy/constants';
import type { UserFantasyResult } from '@/types';

// ============================================
// HELPERS
// ============================================

function rankColor(rank: number): { text: string; bg: string; emoji?: string } {
  if (rank === 1) return { text: 'text-gold', bg: 'bg-gold/15', emoji: '🥇' };
  if (rank === 2) return { text: 'text-zinc-300', bg: 'bg-zinc-300/10', emoji: '🥈' };
  if (rank === 3) return { text: 'text-amber-700', bg: 'bg-amber-700/15', emoji: '🥉' };
  if (rank <= 10) return { text: 'text-emerald-400', bg: 'bg-emerald-400/10' };
  return { text: 'text-white/50', bg: 'bg-white/[0.04]' };
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ============================================
// EXPANDED LINEUP VIEW
// ============================================

function LineupView({ eventId }: { eventId: string }) {
  const t = useTranslations('manager');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { data: lineup, isLoading } = useLineupSnapshot(eventId, true);
  const { playerMap } = useManagerData(user?.id);

  const setApplyLineupTemplate = useManagerStore((s) => s.setApplyLineupTemplate);
  const setActiveTab = useManagerStore((s) => s.setActiveTab);
  const setSelectedEventId = useManagerStore((s) => s.setSelectedEventId);
  const selectedEventId = useManagerStore((s) => s.selectedEventId);
  const { events: openEvents } = useOpenEvents();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="size-5 animate-spin motion-reduce:animate-none text-gold" aria-hidden="true" />
      </div>
    );
  }

  if (!lineup) {
    return (
      <div className="py-4 text-center text-xs text-white/40">
        {t('noLineupSnapshot', { defaultValue: 'Aufstellung nicht verfügbar' })}
      </div>
    );
  }

  // Detect format from filled slot count (7 or 11). DbLineup doesn't store format.
  const filledSlots = [
    lineup.slot_gk, lineup.slot_def1, lineup.slot_def2, lineup.slot_def3, lineup.slot_def4,
    lineup.slot_mid1, lineup.slot_mid2, lineup.slot_mid3, lineup.slot_mid4,
    lineup.slot_att, lineup.slot_att2, lineup.slot_att3,
  ].filter(Boolean).length;
  const format: '7er' | '11er' = filledSlots > 7 ? '11er' : '7er';
  const formations = getFormationsForFormat(format);
  const formation = formations.find((f) => f.id === lineup.formation) ?? formations[0];
  const slotKeys = buildSlotDbKeys(formation);

  type SlotRow = {
    slotKey: string;
    pos: string;
    playerId: string | null;
    score: number | null;
    isCaptain: boolean;
  };

  const rows: SlotRow[] = [];
  let slotIdx = 0;
  for (const s of formation.slots) {
    for (let i = 0; i < s.count; i++) {
      const key = slotKeys[slotIdx];
      const colKey = `slot_${key}` as keyof typeof lineup;
      const playerId = lineup[colKey] as string | null;
      const slotScore = lineup.slot_scores?.[key] ?? null;
      rows.push({
        slotKey: key,
        pos: s.pos,
        playerId,
        score: typeof slotScore === 'number' ? slotScore : null,
        isCaptain: lineup.captain_slot === key,
      });
      slotIdx++;
    }
  }

  const handleApplyToLineup = () => {
    // Build template: slotIndex → playerId for non-empty rows
    const slotPlayerIds: Record<number, string> = {};
    rows.forEach((row, idx) => {
      if (row.playerId) slotPlayerIds[idx] = row.playerId;
    });

    const template: ApplyLineupTemplate = {
      format,
      formation: formation.id,
      slotPlayerIds,
      sourceEventId: eventId,
    };

    // If no event selected yet, auto-pick a default open event
    if (!selectedEventId) {
      const def = pickDefaultEvent(openEvents);
      if (def) setSelectedEventId(def.id);
    }

    // Set template + switch tab (URL + store)
    setApplyLineupTemplate(template);
    setActiveTab('aufstellen');
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'aufstellen');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-1.5 mt-3">
      {rows.map((row, i) => {
        const player = row.playerId ? playerMap.get(row.playerId) : null;
        return (
          <div
            key={`${row.slotKey}-${i}`}
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06]"
          >
            <span className="w-7 text-[10px] font-mono font-bold text-white/40">{row.pos}</span>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              {player?.imageUrl ? (
                <Image
                  src={player.imageUrl}
                  alt=""
                  width={24}
                  height={24}
                  className="size-6 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="size-6 rounded-full bg-white/10 flex-shrink-0" />
              )}
              <span className="text-xs font-bold text-white truncate">
                {player ? `${player.first.charAt(0)}. ${player.last}` : '—'}
              </span>
              {row.isCaptain && (
                <Crown className="size-3 text-gold flex-shrink-0" aria-hidden="true" />
              )}
            </div>
            <span className="text-sm font-mono font-black tabular-nums text-white">
              {row.score != null ? Math.round(row.score) : '—'}
            </span>
          </div>
        );
      })}

      <button
        type="button"
        onClick={handleApplyToLineup}
        className="w-full flex items-center justify-center gap-2 mt-3 px-4 py-2.5 min-h-[44px] rounded-xl bg-gold/[0.08] border border-gold/30 text-gold text-sm font-bold hover:bg-gold/[0.12] transition-colors active:scale-[0.98]"
      >
        <ArrowRight className="size-4" aria-hidden="true" />
        {t('applyToLineup', { defaultValue: 'In Aufstellung übernehmen' })}
      </button>
    </div>
  );
}

// ============================================
// MAIN CARD
// ============================================

export type HistoryEventCardProps = {
  result: UserFantasyResult;
};

export default function HistoryEventCard({ result }: HistoryEventCardProps) {
  const t = useTranslations('manager');
  const expandedId = useManagerStore((s) => s.expandedHistoryEventId);
  const setExpandedId = useManagerStore((s) => s.setExpandedHistoryEventId);

  const isExpanded = expandedId === result.eventId;

  const handleToggle = () => {
    setExpandedId(isExpanded ? null : result.eventId);
  };

  const rankCfg = useMemo(() => rankColor(result.rank), [result.rank]);

  return (
    <div
      className={cn(
        'rounded-xl border transition-colors',
        isExpanded ? 'bg-white/[0.04] border-white/[0.12]' : 'bg-white/[0.02] border-white/10',
      )}
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="w-full text-left px-4 py-3 min-h-[44px] flex items-start gap-3"
        aria-expanded={isExpanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-white truncate">{result.eventName}</span>
            {result.gameweek != null && (
              <span className="text-[9px] font-mono tabular-nums text-white/40 flex-shrink-0">
                GW {result.gameweek}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/40">
            <Calendar className="size-3" aria-hidden="true" />
            <span className="font-mono tabular-nums">{formatDate(result.eventDate)}</span>
          </div>
        </div>

        {/* KPI Pills */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Score */}
          <div className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            <div className="text-[8px] text-white/40 uppercase font-bold leading-none mb-0.5">
              {t('historyScore', { defaultValue: 'Score' })}
            </div>
            <div className="text-sm font-mono font-black tabular-nums text-white">
              {Math.round(result.totalScore)}
            </div>
          </div>

          {/* Rank */}
          <div className={cn('px-2 py-1 rounded-lg border border-white/[0.06]', rankCfg.bg)}>
            <div className="text-[8px] text-white/40 uppercase font-bold leading-none mb-0.5">
              {t('historyRank', { defaultValue: 'Rang' })}
            </div>
            <div className={cn('text-sm font-mono font-black tabular-nums', rankCfg.text)}>
              {rankCfg.emoji ?? `#${result.rank}`}
            </div>
          </div>

          {/* Reward */}
          {result.rewardAmount > 0 && (
            <div className="px-2 py-1 rounded-lg bg-gold/10 border border-gold/20">
              <div className="text-[8px] text-gold/60 uppercase font-bold leading-none mb-0.5 flex items-center gap-0.5">
                <Trophy className="size-2.5" aria-hidden="true" />
              </div>
              <div className="text-sm font-mono font-black tabular-nums text-gold">
                +{fmtScout(Math.round(result.rewardAmount / 100))}
              </div>
            </div>
          )}

          {isExpanded ? (
            <ChevronDown className="size-4 text-white/40" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-4 text-white/40" aria-hidden="true" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-white/[0.06]">
          <LineupView eventId={result.eventId} />
        </div>
      )}
    </div>
  );
}
