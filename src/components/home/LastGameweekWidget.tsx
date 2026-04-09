'use client';

/**
 * LastGameweekWidget — Track B1 of Home Polish Sweep Pass 2.
 * Shows the user's most recent scored fantasy event: event name + GW, total
 * score, rank, reward and a grouped lineup grid with per-slot scores.
 *
 * Self-contained: owns its own React-Query keys under ['home', ...] to avoid
 * cache collisions with the Manager Historie-Tab which fetches the full
 * history via a different limit. The underlying service calls live in
 * @/features/fantasy/services/lineups.queries so the backing data is shared.
 */

import { memo, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  Trophy, Calendar, ArrowRight, Crown, Swords, Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { cn, fmtScout } from '@/lib/utils';
import {
  getUserFantasyHistory,
  getLineup,
} from '@/features/fantasy/services/lineups.queries';
import {
  getFormationsForFormat,
  buildSlotDbKeys,
} from '@/features/fantasy/constants';
import type { Player, UserFantasyResult, DbLineup } from '@/types';

const ONE_MIN = 60_000;

// ============================================
// Helpers
// ============================================

/** Rank styling — mirrors manager HistoryEventCard so the visual language matches. */
function rankColor(rank: number): { text: string; bg: string; emoji?: string } {
  if (rank === 1) return { text: 'text-gold', bg: 'bg-gold/15', emoji: '🥇' };
  if (rank === 2) return { text: 'text-zinc-300', bg: 'bg-zinc-300/10', emoji: '🥈' };
  if (rank === 3) return { text: 'text-amber-700', bg: 'bg-amber-700/15', emoji: '🥉' };
  if (rank <= 10) return { text: 'text-emerald-400', bg: 'bg-emerald-400/10' };
  return { text: 'text-white/50', bg: 'bg-white/[0.04]' };
}

/** Per-slot score color (event-score scale, not perf_l5). */
function scoreColor(score: number | null): string {
  if (score == null) return 'text-white/30';
  if (score >= 100) return 'text-gold';
  if (score >= 70) return 'text-white';
  return 'text-red-400/80';
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ============================================
// Queries (home-scoped keys to avoid collision with Manager Historie)
// ============================================

function useLastFantasyResult(uid: string | undefined) {
  return useQuery<UserFantasyResult | null>({
    queryKey: ['home', 'lastFantasyResult', uid],
    queryFn: async () => {
      const results = await getUserFantasyHistory(uid!, 1);
      return results[0] ?? null;
    },
    enabled: !!uid,
    staleTime: ONE_MIN,
  });
}

function useLineupSnapshot(eventId: string | undefined, uid: string | undefined) {
  return useQuery<DbLineup | null>({
    queryKey: ['home', 'lineupSnapshot', eventId, uid],
    queryFn: () => getLineup(eventId!, uid!),
    enabled: !!eventId && !!uid,
    // Scored lineup is immutable — cache lives until window reload.
    staleTime: Infinity,
  });
}

// ============================================
// Slot-row builder (pitch order: ATT → MID → DEF → GK)
// ============================================

type SlotRow = {
  slotKey: string;
  pos: 'GK' | 'DEF' | 'MID' | 'ATT';
  playerId: string | null;
  score: number | null;
  isCaptain: boolean;
};

function buildSlotRows(lineup: DbLineup): SlotRow[] {
  // DbLineup stores neither format nor lineup_size, so we infer from filled slots.
  const filledCount = [
    lineup.slot_gk,
    lineup.slot_def1, lineup.slot_def2, lineup.slot_def3, lineup.slot_def4,
    lineup.slot_mid1, lineup.slot_mid2, lineup.slot_mid3, lineup.slot_mid4,
    lineup.slot_att, lineup.slot_att2, lineup.slot_att3,
  ].filter(Boolean).length;
  const format: '7er' | '11er' = filledCount > 7 ? '11er' : '7er';
  const formations = getFormationsForFormat(format);
  const formation = formations.find((f) => f.id === lineup.formation) ?? formations[0];
  const slotKeys = buildSlotDbKeys(formation);

  const rows: SlotRow[] = [];
  let slotIdx = 0;
  for (const s of formation.slots) {
    for (let i = 0; i < s.count; i++) {
      const key = slotKeys[slotIdx];
      const colKey = `slot_${key}` as keyof DbLineup;
      const playerId = lineup[colKey] as string | null;
      const slotScore = lineup.slot_scores?.[key] ?? null;
      rows.push({
        slotKey: key,
        pos: s.pos as 'GK' | 'DEF' | 'MID' | 'ATT',
        playerId,
        score: typeof slotScore === 'number' ? slotScore : null,
        isCaptain: lineup.captain_slot === key,
      });
      slotIdx++;
    }
  }

  // Formations iterate GK → DEF → MID → ATT (back to front). Reverse for a
  // natural pitch view where ATT is on top, GK at the bottom.
  return rows.reverse();
}

// ============================================
// Component
// ============================================

interface LastGameweekWidgetProps {
  uid: string | undefined;
  players: Player[];
}

function LastGameweekWidgetInner({ uid, players }: LastGameweekWidgetProps) {
  const t = useTranslations('home');
  const { data: result, isLoading: resultLoading } = useLastFantasyResult(uid);
  const { data: lineup, isLoading: lineupLoading } = useLineupSnapshot(result?.eventId, uid);

  const playerMap = useMemo(() => {
    const map = new Map<string, Player>();
    for (const p of players) map.set(p.id, p);
    return map;
  }, [players]);

  const rankCfg = useMemo(
    () => (result ? rankColor(result.rank) : null),
    [result?.rank],
  );

  const slotRows = useMemo<SlotRow[]>(
    () => (lineup ? buildSlotRows(lineup) : []),
    [lineup],
  );

  // Auth guard — component has nothing to show for anon users.
  if (!uid) return null;

  // Compact loading skeleton while the first history query resolves.
  if (resultLoading) {
    return (
      <Card className="p-4 shadow-card-md">
        <div className="flex items-center gap-3">
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none text-gold" aria-hidden="true" />
          <span className="text-xs text-white/40">{t('lastGameweek.title')}</span>
        </div>
      </Card>
    );
  }

  // Empty state — user has no scored fantasy events yet. Actively recruits.
  if (!result) {
    return (
      <Card className="p-4 shadow-card-md">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-purple-500/10 border border-purple-400/20 flex items-center justify-center shrink-0">
            <Swords className="size-5 text-purple-400" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white mb-1">
              {t('lastGameweek.emptyTitle')}
            </div>
            <div className="text-xs text-white/50 mb-3 text-pretty">
              {t('lastGameweek.emptyDesc')}
            </div>
            <Link
              href="/fantasy"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-purple-500/15 border border-purple-400/30 text-xs font-bold text-purple-300 hover:bg-purple-500/20 active:scale-[0.97] transition-colors"
            >
              <Swords className="size-3.5" aria-hidden="true" />
              {t('lastGameweek.emptyCta')}
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  // Populated state — header, KPI row, lineup grid and footer link.
  const rewardBsd = Math.round(result.rewardAmount / 100);

  return (
    <Card className="p-4 shadow-card-md">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="size-10 rounded-xl bg-gold/[0.08] border border-gold/15 flex items-center justify-center shrink-0">
          <Trophy className="size-5 text-gold" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-black uppercase tracking-wider text-gold/70 mb-0.5">
            {t('lastGameweek.title')}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white truncate">
              {result.eventName}
            </span>
            {result.gameweek != null && (
              <span className="text-[9px] font-mono tabular-nums text-white/40 flex-shrink-0">
                GW {result.gameweek}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-white/40 mt-0.5">
            <Calendar className="size-3" aria-hidden="true" />
            <span className="font-mono tabular-nums">{formatDate(result.eventDate)}</span>
          </div>
        </div>
      </div>

      {/* KPI Row — Score / Rank / Reward */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
          <div className="text-[9px] text-white/40 uppercase font-bold mb-0.5">
            {t('lastGameweek.score')}
          </div>
          <div className="text-base font-mono font-black tabular-nums text-white">
            {Math.round(result.totalScore)}
          </div>
        </div>
        <div className={cn(
          'px-3 py-2 rounded-lg border border-white/[0.06] text-center',
          rankCfg?.bg,
        )}>
          <div className="text-[9px] text-white/40 uppercase font-bold mb-0.5">
            {t('lastGameweek.rank')}
          </div>
          <div className={cn(
            'text-base font-mono font-black tabular-nums',
            rankCfg?.text,
          )}>
            {rankCfg?.emoji ?? `#${result.rank}`}
          </div>
        </div>
        <div className={cn(
          'px-3 py-2 rounded-lg border text-center',
          rewardBsd > 0
            ? 'bg-gold/10 border-gold/20'
            : 'bg-white/[0.03] border-white/[0.06]',
        )}>
          <div className={cn(
            'text-[9px] uppercase font-bold mb-0.5',
            rewardBsd > 0 ? 'text-gold/60' : 'text-white/40',
          )}>
            {t('lastGameweek.reward')}
          </div>
          <div className={cn(
            'text-base font-mono font-black tabular-nums',
            rewardBsd > 0 ? 'text-gold' : 'text-white/30',
          )}>
            {rewardBsd > 0 ? `+${fmtScout(rewardBsd)}` : '—'}
          </div>
        </div>
      </div>

      {/* Lineup Grid — pitch order ATT → MID → DEF → GK, one row per slot */}
      {lineupLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2
            className="size-4 animate-spin motion-reduce:animate-none text-white/30"
            aria-hidden="true"
          />
        </div>
      ) : slotRows.length > 0 ? (
        <div className="space-y-1.5">
          {slotRows.map((row, i) => {
            const player = row.playerId ? playerMap.get(row.playerId) : null;
            return (
              <div
                key={`${row.slotKey}-${i}`}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06]"
              >
                <span className="w-8 text-[9px] font-mono font-black text-white/40 tracking-wider">
                  {row.pos}
                </span>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  {player?.imageUrl ? (
                    <Image
                      src={player.imageUrl}
                      alt=""
                      width={20}
                      height={20}
                      className="size-5 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="size-5 rounded-full bg-white/10 flex-shrink-0" />
                  )}
                  <span className="text-xs font-bold text-white truncate">
                    {player ? `${player.first.charAt(0)}. ${player.last}` : '—'}
                  </span>
                  {row.isCaptain && (
                    <Crown className="size-3 text-gold flex-shrink-0" aria-hidden="true" />
                  )}
                </div>
                <span className={cn(
                  'text-xs font-mono font-black tabular-nums',
                  scoreColor(row.score),
                )}>
                  {row.score != null ? Math.round(row.score) : '—'}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Footer link to full history */}
      <Link
        href="/manager?tab=historie"
        className="mt-4 flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs font-bold text-white/60 hover:bg-white/[0.06] hover:text-white transition-colors active:scale-[0.97]"
      >
        {t('lastGameweek.allHistory')}
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </Card>
  );
}

export default memo(LastGameweekWidgetInner);
