'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Loader2, ChevronRight } from 'lucide-react';
import { Modal } from '@/components/ui';
import { useTranslations } from 'next-intl';
import { getClub } from '@/lib/clubs';
import { getFixturePlayerStats, getFixtureSubstitutions, getFloorPricesForPlayers } from '@/lib/services/fixtures';
import type { Fixture, FixturePlayerStat, FixtureSubstitution, Pos } from '@/types';
import { PlayerPhoto } from '@/components/player';
import { ClubLogo } from './ClubLogo';
import { posColor, getPosAccent, ratingHeatStyle, getRating } from './helpers';
import { GoalIcon, AssistIcon, CleanSheetIcon, MvpCrownIcon, SubInIcon, SubOutIcon } from './MatchIcons';
import { cn } from '@/lib/utils';

// ============================================
// Lazy-loaded tab panels (non-default tabs)
// ============================================

const RankingTab = dynamic(() => import('./fixture-tabs/RankingTab'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-white/[0.02] rounded-2xl" />,
});

const FormationTab = dynamic(() => import('./fixture-tabs/FormationTab'), {
  ssr: false,
  loading: () => <div className="h-96 animate-pulse bg-white/[0.02] rounded-2xl" />,
});

// ============================================
// Shared style constants
// ============================================

const goldTextStyle = {
  background: 'linear-gradient(180deg, #FFE44D, #E6B800)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.25))',
} as const;

const scoreHeaderBg = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(255,255,255,0.04)',
} as const;

const mvpRowShadow = { boxShadow: '0 0 12px rgba(255,215,0,0.06), inset 0 1px 0 rgba(255,255,255,0.04)' } as const;
const normalRowShadow = { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' } as const;

// ============================================
// Goal Ticker — inline (different from GoalTicker.tsx which is for spieltag overview)
// ============================================

/** Goal Ticker strip between score header and tabs */
function GoalTicker({ stats, homeClubId, homeClubLogo, awayClubLogo, homeShort, awayShort }: {
  stats: FixturePlayerStat[];
  homeClubId: string;
  homeClubLogo?: ReturnType<typeof getClub>;
  awayClubLogo?: ReturnType<typeof getClub>;
  homeShort?: string;
  awayShort?: string;
}) {
  const ts = useTranslations('spieltag');
  const scorers = useMemo(() => stats
    .filter(s => s.goals > 0)
    .sort((a, b) => {
      const aHome = a.club_id === homeClubId ? 0 : 1;
      const bHome = b.club_id === homeClubId ? 0 : 1;
      if (aHome !== bHome) return aHome - bHome;
      return b.goals - a.goals;
    }), [stats, homeClubId]);

  if (scorers.length === 0) return null;

  return (
    <div className="overflow-x-auto scrollbar-hide snap-x motion-reduce:snap-none px-4 py-2 border-b border-white/[0.06]" tabIndex={0} role="region" aria-label={ts('goalScorers')}>
      <div className="flex items-center gap-2">
        {scorers.map(s => {
          const href = s.player_id ? `/player/${s.player_id}` : '#';
          const isHome = s.club_id === homeClubId;
          return (
            <Link
              key={s.id}
              href={href}
              aria-label={`${s.player_last_name || '?'} — ${ts('goalCount', { count: s.goals })}`}
              className="flex items-center gap-1.5 snap-start px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors min-h-[44px] flex-shrink-0 active:scale-[0.97] motion-reduce:active:scale-100"
            >
              <ClubLogo club={isHome ? (homeClubLogo ?? null) : (awayClubLogo ?? null)} size={14} short={isHome ? homeShort : awayShort} />
              <GoalIcon size={10} className="text-white/50" />
              <span className="text-xs font-bold text-white/90 whitespace-nowrap">
                {s.player_last_name || '?'}
              </span>
              {s.goals > 1 && <span className="text-gold font-black font-mono tabular-nums text-[10px]">&times;{s.goals}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// Overview Tab — MVP Highlight + Quick Stats + Events + Top Performers
// (kept inline as the default/first tab)
// ============================================

/** Match timeline — SofaScore-style dual-column layout (home left, away right) */
function MatchTimeline({ substitutions, homeClubId }: {
  substitutions: FixtureSubstitution[];
  homeClubId: string;
}) {
  const ts = useTranslations('spieltag');
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(() => [...substitutions].sort((a, b) => {
    const minA = a.minute + (a.extra_minute ?? 0) / 100;
    const minB = b.minute + (b.extra_minute ?? 0) / 100;
    return minA - minB;
  }), [substitutions]);

  if (substitutions.length === 0) return null;

  const visible = showAll ? sorted : sorted.slice(0, 6);
  const hasMore = sorted.length > 6;

  const fmtMinute = (sub: FixtureSubstitution) =>
    `${sub.minute}'${sub.extra_minute ? `+${sub.extra_minute}` : ''}`;

  return (
    <div className="relative z-10 mt-4 pt-3 border-t border-white/[0.08]">
      <div className="text-[10px] font-black text-white/25 uppercase tracking-wide text-center mb-2.5">{ts('matchTimeline')}</div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-start">
        {visible.map(sub => {
          const isHome = sub.club_id === homeClubId;
          const outName = sub.player_out_last_name || sub.player_out_name;
          const inName = sub.player_in_last_name || sub.player_in_name;

          return (
            <React.Fragment key={sub.id}>
              {/* Home side — right-aligned */}
              {isHome ? (
                <div className="flex items-center justify-end gap-1 pr-3 py-1.5 min-w-0">
                  <span className="text-white/90 text-xs font-semibold truncate min-w-0">{inName}</span>
                  <SubInIcon size={10} />
                  <SubOutIcon size={10} />
                  <span className="text-white/25 text-xs truncate min-w-0 line-through">{outName}</span>
                </div>
              ) : (
                <div />
              )}

              {/* Center minute pill */}
              <div className="flex flex-col items-center relative py-1">
                <div className="absolute top-0 bottom-0 w-px bg-white/[0.06]" aria-hidden="true" />
                <span className="relative z-10 px-2 py-0.5 rounded-full bg-white/[0.08] text-[10px] font-mono text-white/50 tabular-nums whitespace-nowrap shadow-sm">
                  {fmtMinute(sub)}
                </span>
              </div>

              {/* Away side — left-aligned */}
              {!isHome ? (
                <div className="flex items-center gap-1 pl-3 py-1.5 min-w-0">
                  <SubInIcon size={10} />
                  <span className="text-white/90 text-xs font-semibold truncate min-w-0">{inName}</span>
                  <SubOutIcon size={10} />
                  <span className="text-white/25 text-xs truncate min-w-0 line-through">{outName}</span>
                </div>
              ) : (
                <div />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(prev => !prev)}
          aria-expanded={showAll}
          aria-label={showAll ? ts('showLess') : ts('showMore')}
          className="mt-2 w-full text-center text-[10px] font-bold text-white/25 hover:text-white/50 transition-colors py-2 min-h-[44px]"
        >
          {showAll ? ts('showLess') : ts('showMore')} ({sorted.length - 6})
        </button>
      )}
    </div>
  );
}

function OverviewTab({ stats, homeStats, awayStats, substitutions, fixture, mvpId, floorPrices, homeClub, awayClub, homeColor, awayColor }: {
  stats: FixturePlayerStat[];
  homeStats: FixturePlayerStat[];
  awayStats: FixturePlayerStat[];
  substitutions: FixtureSubstitution[];
  fixture: Fixture;
  mvpId: string | null;
  floorPrices: Map<string, number>;
  homeClub: ReturnType<typeof getClub>;
  awayClub: ReturnType<typeof getClub>;
  homeColor: string;
  awayColor: string;
}) {
  const ts = useTranslations('spieltag');
  const mvp = mvpId ? stats.find(s => s.player_id === mvpId) : null;
  const mvpRating = mvp ? getRating(mvp) : 0;

  // Quick stats — home vs away
  const homeGoals = homeStats.reduce((sum, s) => sum + s.goals, 0);
  const awayGoals = awayStats.reduce((sum, s) => sum + s.goals, 0);
  const homeCards = homeStats.filter(s => s.yellow_card || s.red_card).length;
  const awayCards = awayStats.filter(s => s.yellow_card || s.red_card).length;
  const homeSubs = substitutions.filter(s => s.club_id === fixture.home_club_id).length;
  const awaySubs = substitutions.length - homeSubs;

  // Top 3 performers from each team (filter for minutes_played > 0)
  const homeTop3 = useMemo(() => [...homeStats].filter(s => s.minutes_played > 0).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 3), [homeStats]);
  const awayTop3 = useMemo(() => [...awayStats].filter(s => s.minutes_played > 0).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 3), [awayStats]);

  return (
    <div className="space-y-6">
      {/* MVP Highlight Card */}
      {mvp && (
        <Link
          href={mvp.player_id ? `/player/${mvp.player_id}` : '#'}
          aria-label={`${mvp.player_first_name || ''} ${mvp.player_last_name || ''} ${ts('mvpLabel')} — Rating ${mvpRating.toFixed(1)}`}
          className="block relative overflow-hidden rounded-2xl border border-gold/20 active:scale-[0.98] motion-reduce:active:scale-100 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
          style={{
            background: `linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(255,215,0,0.03) 50%, transparent 100%)`,
            boxShadow: '0 0 40px rgba(255,215,0,0.08), 0 0 80px rgba(255,215,0,0.03), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center gap-4 p-4">
            {/* MVP Photo */}
            <div className="relative flex-shrink-0">
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10">
                <MvpCrownIcon size={20} />
              </div>
              <div className="card-gold-frame rounded-full shadow-lg">
                <PlayerPhoto
                  imageUrl={mvp.player_image_url}
                  first={mvp.player_first_name || '?'}
                  last={mvp.player_last_name || '?'}
                  pos={mvp.player_position as Pos}
                  size={56}
                />
              </div>
            </div>

            {/* MVP Info */}
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-gold/60 uppercase tracking-widest mb-0.5">{ts('mvpLabel')}</div>
              <div className="text-lg font-black text-white tracking-tight truncate">
                {mvp.player_first_name ? `${mvp.player_first_name.charAt(0)}. ` : ''}{mvp.player_last_name || '?'}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', posColor(mvp.player_position))}>
                  {mvp.player_position}
                </span>
                {mvp.goals > 0 && <span className="flex items-center gap-0.5 text-[11px] text-white/60"><GoalIcon size={12} /> {mvp.goals}</span>}
                {mvp.assists > 0 && <span className="flex items-center gap-0.5 text-[11px] text-white/60"><AssistIcon size={12} /> {mvp.assists}</span>}
                {mvp.clean_sheet && <CleanSheetIcon size={14} />}
              </div>
            </div>

            {/* Rating Badge — large */}
            <div
              className="flex-shrink-0 size-14 rounded-xl flex items-center justify-center font-mono font-black text-xl tabular-nums shadow-lg"
              style={{
                ...ratingHeatStyle(mvpRating),
                boxShadow: mvpRating >= 9.0 ? '0 0 20px rgba(55,77,245,0.3)' : undefined,
              }}
            >
              {mvpRating.toFixed(1)}
            </div>
          </div>
        </Link>
      )}

      {/* Quick Stats — Home vs Away comparison bars */}
      <div className="space-y-3 rounded-xl bg-surface-subtle border border-white/[0.06] px-4 py-3" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }} role="group" aria-label={ts('matchDetails')}>
        {[
          { label: ts('quickGoals'), home: homeGoals, away: awayGoals, hColor: homeColor, aColor: awayColor },
          { label: ts('quickCards'), home: homeCards, away: awayCards, hColor: '#EAB308', aColor: '#EAB308' },
          { label: ts('quickSubs'), home: homeSubs, away: awaySubs, hColor: homeColor, aColor: awayColor },
        ].map(({ label, home, away, hColor, aColor }) => {
          const total = home + away || 1;
          const hPct = Math.round((home / total) * 100);
          const aPct = 100 - hPct;
          return (
            <div key={label} aria-label={`${label}: ${home} - ${away}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] font-bold font-mono tabular-nums text-white/90">{home}</span>
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-wide">{label}</span>
                <span className="text-[13px] font-bold font-mono tabular-nums text-white/90">{away}</span>
              </div>
              <div className="flex h-1 rounded-full overflow-hidden gap-0.5 bg-white/[0.04]">
                <div className="rounded-full transition-colors" style={{ width: `${hPct}%`, backgroundColor: hColor, opacity: home >= away ? 1 : 0.35 }} />
                <div className="rounded-full transition-colors" style={{ width: `${aPct}%`, backgroundColor: aColor, opacity: away >= home ? 1 : 0.35 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Performers — side-by-side */}
      <div>
        <div className="text-[10px] font-black text-white/25 uppercase tracking-widest mb-3">{ts('topPerformers')}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Home Top 3 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-[3px] h-4 rounded-full" style={{ backgroundColor: homeColor }} />
              <ClubLogo club={homeClub} size={16} short={fixture.home_club_short} />
              <span className="text-[11px] font-bold text-white/50 truncate">{fixture.home_club_name}</span>
            </div>
            {homeTop3.map((s, i) => (
              <TopPerformerRow key={s.id} stat={s} rank={i + 1} isMvp={s.player_id === mvpId} floorPrice={s.player_id ? floorPrices.get(s.player_id) : undefined} />
            ))}
          </div>
          {/* Away Top 3 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-[3px] h-4 rounded-full" style={{ backgroundColor: awayColor }} />
              <ClubLogo club={awayClub} size={16} short={fixture.away_club_short} />
              <span className="text-[11px] font-bold text-white/50 truncate">{fixture.away_club_name}</span>
            </div>
            {awayTop3.map((s, i) => (
              <TopPerformerRow key={s.id} stat={s} rank={i + 1} isMvp={s.player_id === mvpId} floorPrice={s.player_id ? floorPrices.get(s.player_id) : undefined} />
            ))}
          </div>
        </div>
      </div>

      {/* Match Timeline */}
      {substitutions.length > 0 && (
        <MatchTimeline substitutions={substitutions} homeClubId={fixture.home_club_id} />
      )}
    </div>
  );
}

/** Compact performer row for Overview tab */
function TopPerformerRow({ stat, rank, isMvp, floorPrice }: {
  stat: FixturePlayerStat;
  rank: number;
  isMvp: boolean;
  floorPrice?: number;
}) {
  const rating = getRating(stat);
  const href = stat.player_id ? `/player/${stat.player_id}` : '#';

  const playerName = `${(stat.player_first_name || '?').charAt(0)}. ${stat.player_last_name || '?'}`;

  return (
    <Link
      href={href}
      aria-label={`${rank} ${playerName} ${stat.player_position} — Rating ${rating.toFixed(1)}`}
      className={cn(
        'flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs transition-colors min-h-[44px] active:scale-[0.97] motion-reduce:active:scale-100 border-l-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
        isMvp
          ? 'bg-gold/[0.06] border border-gold/15'
          : 'bg-surface-minimal border border-white/[0.04] hover:bg-surface-elevated',
      )}
      style={{
        ...(isMvp ? mvpRowShadow : normalRowShadow),
        borderLeftColor: getPosAccent(stat.player_position),
      }}
    >
      {/* Rank */}
      <span className="text-[10px] font-mono font-bold text-white/20 tabular-nums w-3 text-center">{rank}</span>

      {/* Photo */}
      <PlayerPhoto
        imageUrl={stat.player_image_url}
        first={stat.player_first_name || '?'}
        last={stat.player_last_name || '?'}
        pos={stat.player_position as Pos}
        size={32}
      />

      {/* Position */}
      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0', posColor(stat.player_position))}>
        {stat.player_position}
      </span>

      {/* Name */}
      <span className="flex-1 text-[13px] font-semibold text-white/90 truncate min-w-0">
        {(stat.player_first_name || '?').charAt(0)}. {stat.player_last_name || '?'}
      </span>

      {/* Goals/Assists inline */}
      {stat.goals > 0 && <span className="flex items-center gap-0.5 flex-shrink-0"><GoalIcon size={12} />{stat.goals > 1 && <span className="text-[10px] font-mono text-white/50">{stat.goals}</span>}</span>}
      {stat.assists > 0 && <span className="flex items-center gap-0.5 flex-shrink-0"><AssistIcon size={12} />{stat.assists > 1 && <span className="text-[10px] font-mono text-white/50">{stat.assists}</span>}</span>}

      {/* Rating */}
      <span
        className="min-w-[2rem] px-1.5 py-0.5 rounded-md text-[11px] font-black font-mono tabular-nums text-center flex-shrink-0 shadow-sm"
        style={ratingHeatStyle(rating)}
      >
        {rating.toFixed(1)}
      </span>

      <ChevronRight aria-hidden="true" className="size-3 text-white/15 flex-shrink-0" />
    </Link>
  );
}

// ============================================
// Fixture Detail Modal
// ============================================

type Props = {
  fixture: Fixture | null;
  isOpen: boolean;
  onClose: () => void;
  sponsorName?: string;
  sponsorLogo?: string;
};

export function FixtureDetailModal({ fixture, isOpen, onClose, sponsorName, sponsorLogo }: Props) {
  const ts = useTranslations('spieltag');
  const [stats, setStats] = useState<FixturePlayerStat[]>([]);
  const [substitutions, setSubstitutions] = useState<FixtureSubstitution[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'ranking' | 'formation'>('overview');
  const [floorPrices, setFloorPrices] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!fixture || !isOpen) return;
    let cancelled = false;
    setLoading(true);
    setDetailTab('overview');
    Promise.all([
      getFixturePlayerStats(fixture.id),
      getFixtureSubstitutions(fixture.id),
    ]).then(([statsData, subsData]) => {
      if (!cancelled) {
        setStats(statsData);
        setSubstitutions(subsData);
        setLoading(false);
      }
    }).catch((err) => { console.error('FixtureDetailModal fetch failed:', err); if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fixture, isOpen]);

  // Load floor prices when stats arrive
  useEffect(() => {
    if (stats.length === 0) return;
    let cancelled = false;
    const playerIds = stats.map(s => s.player_id).filter((id): id is string => id != null);
    if (playerIds.length === 0) return;
    getFloorPricesForPlayers(playerIds).then(prices => {
      if (!cancelled) setFloorPrices(prices);
    }).catch(console.error);
    return () => { cancelled = true; };
  }, [stats]);

  // MVP: highest rating across ALL stats
  const mvpId = useMemo(() => {
    if (stats.length === 0) return null;
    let best: FixturePlayerStat | null = null;
    for (const s of stats) {
      if (s.minutes_played === 0) continue;
      const rating = getRating(s);
      if (!best || rating > getRating(best)) {
        best = s;
      }
    }
    return best?.player_id ?? null;
  }, [stats]);

  const { homeStats, awayStats } = useMemo(() => ({
    homeStats: stats.filter(s => s.club_id === fixture?.home_club_id),
    awayStats: stats.filter(s => s.club_id === fixture?.away_club_id),
  }), [stats, fixture?.home_club_id, fixture?.away_club_id]);

  if (!fixture) return null;

  const homeClub = getClub(fixture.home_club_short) || getClub(fixture.home_club_name);
  const awayClub = getClub(fixture.away_club_short) || getClub(fixture.away_club_name);
  const isSimulated = fixture.status === 'simulated' || fixture.status === 'finished';
  const homeColor = homeClub?.colors.primary ?? '#22C55E';
  const awayColor = awayClub?.colors.primary ?? '#3B82F6';

  return (
    <Modal open={isOpen} title="" onClose={onClose} size="lg" mobileFullScreen>
      {/* Score Header — premium glassmorphism */}
      <div
        className="relative overflow-hidden"
        style={scoreHeaderBg}
      >
        {/* Team color accents — vivid radials for premium depth */}
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 120% 100% at 5% 50%, ${homeColor}22 0%, transparent 55%),
            radial-gradient(ellipse 120% 100% at 95% 50%, ${awayColor}22 0%, transparent 55%),
            radial-gradient(ellipse 60% 120% at 50% 100%, rgba(255,215,0,0.04) 0%, transparent 50%)
          `,
        }} />

        <div className="relative flex items-center justify-center gap-3 md:gap-8 pt-3 pb-4 md:pt-5 md:pb-6 px-4">
          {/* Home Club */}
          <div className="flex flex-col items-center gap-1.5 md:gap-2.5 flex-1 min-w-0">
            <div className="relative md:hidden" style={{ filter: `drop-shadow(0 0 24px ${homeColor}40)` }}>
              <ClubLogo club={homeClub} size={56} short={fixture.home_club_short} />
            </div>
            <div className="relative hidden md:block" style={{ filter: `drop-shadow(0 0 24px ${homeColor}40)` }}>
              <ClubLogo club={homeClub} size={80} short={fixture.home_club_short} />
            </div>
            <span className="font-black text-xs md:text-base text-center leading-tight text-balance line-clamp-2 tracking-tight">{fixture.home_club_name}</span>
          </div>

          {/* Score Center */}
          <div className="text-center shrink-0">
            {isSimulated ? (
              <>
                <div className="flex items-center gap-2.5 md:gap-5">
                  <span className="font-mono font-black text-[2.75rem] md:text-[5rem] tabular-nums leading-none" style={goldTextStyle}>
                    {fixture.home_score}
                  </span>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-[3px] h-2.5 md:h-3 rounded-full bg-gold/30" />
                    <div className="w-[3px] h-2.5 md:h-3 rounded-full bg-gold/15" />
                  </div>
                  <span className="font-mono font-black text-[2.75rem] md:text-[5rem] tabular-nums leading-none" style={goldTextStyle}>
                    {fixture.away_score}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 mt-1.5 md:mt-2">
                  <span className="px-2 py-0.5 md:px-2.5 md:py-1 rounded-md bg-white/[0.08] text-[10px] font-black text-white/60 uppercase tracking-widest border border-white/[0.06]">{ts('fullTime')}</span>
                  <span className="text-[10px] text-white/30 font-medium tracking-wide">{ts('label')} {fixture.gameweek}</span>
                </div>
              </>
            ) : (
              <>
                <div className="font-mono font-black text-3xl md:text-5xl text-white/20 tracking-wider">vs</div>
                <div className="flex items-center justify-center gap-2 mt-2 md:mt-2.5">
                  <span className="text-[10px] text-white/30 font-medium tracking-wide">{ts('label')} {fixture.gameweek}</span>
                </div>
              </>
            )}
          </div>

          {/* Away Club */}
          <div className="flex flex-col items-center gap-1.5 md:gap-2.5 flex-1 min-w-0">
            <div className="relative md:hidden" style={{ filter: `drop-shadow(0 0 24px ${awayColor}40)` }}>
              <ClubLogo club={awayClub} size={56} short={fixture.away_club_short} />
            </div>
            <div className="relative hidden md:block" style={{ filter: `drop-shadow(0 0 24px ${awayColor}40)` }}>
              <ClubLogo club={awayClub} size={80} short={fixture.away_club_short} />
            </div>
            <span className="font-black text-xs md:text-base text-center leading-tight text-balance line-clamp-2 tracking-tight">{fixture.away_club_name}</span>
          </div>
        </div>
        {/* Gold accent line — premium separator */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.2), transparent)' }} />
      </div>

      {/* Goal Ticker */}
      {stats.length > 0 && (
        <GoalTicker
          stats={stats}
          homeClubId={fixture.home_club_id}
          homeClubLogo={homeClub}
          awayClubLogo={awayClub}
          homeShort={fixture.home_club_short}
          awayShort={fixture.away_club_short}
        />
      )}

      {/* Tabs — Premium segmented control */}
      {stats.length > 0 && (
        <div role="tablist" className="flex items-center justify-center gap-1 px-4 py-3 border-b border-white/[0.04] sticky top-0 z-10 bg-surface-modal">
          {(['overview', 'ranking', 'formation'] as const).map(tab => (
            <button
              key={tab}
              role="tab"
              id={`tab-${tab}`}
              onClick={() => setDetailTab(tab)}
              aria-selected={detailTab === tab}
              aria-controls="fixture-tabpanel"
              aria-label={tab === 'overview' ? ts('overviewTab') : tab === 'ranking' ? ts('ranking') : ts('formationTab')}
              className={cn(
                'px-4 py-2 rounded-lg text-[13px] font-bold transition-colors min-h-[44px] relative',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0a0a0a]',
                detailTab === tab
                  ? 'bg-gold/15 text-gold shadow-[0_0_12px_rgba(255,215,0,0.08)] border border-gold/20'
                  : 'text-white/30 hover:text-white/50 hover:bg-surface-subtle border border-transparent',
              )}
            >
              {tab === 'overview' ? ts('overviewTab') : tab === 'ranking' ? ts('ranking') : ts('formationTab')}
            </button>
          ))}
        </div>
      )}

      <div id="fixture-tabpanel" tabIndex={0} role="tabpanel" aria-labelledby={`tab-${detailTab}`}>
        <div key={detailTab} className="px-4 py-5 md:px-6 md:py-6 anim-fade">
          {loading ? (
            <div className="flex items-center justify-center py-12" role="status">
              <Loader2 aria-hidden="true" className="size-6 animate-spin motion-reduce:animate-none text-gold" />
              <span className="sr-only">{ts('loading')}</span>
            </div>
          ) : stats.length === 0 ? (
            <div className="text-center text-white/25 py-12">
              {isSimulated ? ts('noPlayerData') : ts('notSimulated')}
            </div>
          ) : detailTab === 'overview' ? (
            <OverviewTab
              stats={stats}
              homeStats={homeStats}
              awayStats={awayStats}
              substitutions={substitutions}
              fixture={fixture}
              mvpId={mvpId}
              floorPrices={floorPrices}
              homeClub={homeClub}
              awayClub={awayClub}
              homeColor={homeColor}
              awayColor={awayColor}
            />
          ) : detailTab === 'ranking' ? (
            <RankingTab
              stats={stats}
              homeStats={homeStats}
              awayStats={awayStats}
              substitutions={substitutions}
              fixture={fixture}
              mvpId={mvpId}
              floorPrices={floorPrices}
              homeClub={homeClub}
              awayClub={awayClub}
              homeColor={homeColor}
              awayColor={awayColor}
            />
          ) : (
            <FormationTab
              stats={stats}
              homeStats={homeStats}
              awayStats={awayStats}
              substitutions={substitutions}
              fixture={fixture}
              mvpId={mvpId}
              floorPrices={floorPrices}
              homeClub={homeClub}
              awayClub={awayClub}
              homeColor={homeColor}
              awayColor={awayColor}
              sponsorName={sponsorName}
              sponsorLogo={sponsorLogo}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
