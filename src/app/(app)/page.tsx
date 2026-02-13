'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Trophy,
  Users,
  Clock,
  ChevronRight,
  Star,
  Zap,
  BarChart3,
  Rocket,
  CircleDollarSign,
  Activity,
  Award,
  Briefcase,
  FileText,
  Vote,
  Target,
  Flame,
  ArrowRightLeft,
  Banknote,
} from 'lucide-react';
import { Card, Button, Chip, ErrorState, Skeleton, SkeletonCard, InfoTooltip } from '@/components/ui';
import { PositionBadge } from '@/components/player';
import { PlayerDisplay } from '@/components/player/PlayerRow';
import { useUser, displayName } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { fmtBSD, cn } from '@/lib/utils';
import { getPlayers, dbToPlayers, centsToBsd } from '@/lib/services/players';
import { getEvents } from '@/lib/services/events';
import { getAllOpenSellOrders, getRecentGlobalTrades, getTopTraders, getPlatformStats } from '@/lib/services/trading';
import type { GlobalTrade, TopTrader, PlatformStats } from '@/lib/services/trading';
import { getHoldings, getTransactions, formatBsd } from '@/lib/services/wallet';
import { useWallet } from '@/components/providers/WalletProvider';
import { withTimeout } from '@/lib/cache';
import { getUserStats, getLeaderboard } from '@/lib/services/social';
import { val } from '@/lib/settledHelpers';
import dynamic from 'next/dynamic';

const MissionBanner = dynamic(() => import('@/components/missions/MissionBanner'), { ssr: false });
import { getActivityColor as actColor, getActivityLabel, getRelativeTime, getActivityIcon as actIconName } from '@/lib/activityHelpers';
import { getPosts } from '@/lib/services/posts';
import type { Player, DpcHolding, DbTransaction, DbEvent, DbOrder, Pos, DbUserStats, LeaderboardUser, PostWithAuthor } from '@/types';
import { getLevelTier } from '@/types';

// ============================================
// SECTION HEADER (Sorare-style)
// ============================================

function SectionHeader({ title, href, badge }: { title: string; href?: string; badge?: React.ReactNode }) {
  const content = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <h2 className="text-lg md:text-xl font-black uppercase tracking-wide">{title}</h2>
        {badge}
      </div>
      {href && <ChevronRight className="w-5 h-5 text-white/30" />}
    </div>
  );
  if (href) {
    return <Link href={href} className="block hover:opacity-80 transition-opacity">{content}</Link>;
  }
  return content;
}

// ============================================
// HELPERS
// ============================================

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Gute Nacht';
  if (h < 12) return 'Guten Morgen';
  if (h < 18) return 'Guten Tag';
  return 'Guten Abend';
}

// Icon name → React element mapping for activity helpers
const ICON_MAP: Record<string, React.ElementType> = { CircleDollarSign, Trophy, Award, Users, Zap, FileText, Vote, Activity, Target, Flame, Banknote };
function renderActivityIcon(type: string) {
  const Icon = ICON_MAP[actIconName(type)] ?? Activity;
  return <Icon className="w-4 h-4" />;
}
function getActivityColorLocal(type: string): string { return actColor(type); }

function formatPrize(bsd: number): string {
  return bsd >= 1000 ? `${(bsd / 1000).toFixed(0)}K` : String(bsd);
}

function getTimeUntil(dateStr: string | null): string {
  if (!dateStr) return '—';
  const ms = Math.max(0, new Date(dateStr).getTime() - Date.now());
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  return `${hours}h ${mins}m`;
}

// ============================================
// SKELETON
// ============================================

function HomeSkeleton() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-9 w-40" />
        </div>
        <Skeleton className="hidden md:block h-10 w-28 rounded-xl" />
      </div>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-xl" />
        ))}
      </div>
      {/* IPO Banner */}
      <Skeleton className="h-20 rounded-2xl" />
      {/* Event Card */}
      <div>
        <Skeleton className="h-6 w-36 mb-3" />
        <SkeletonCard className="h-40" />
      </div>
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Portfolio */}
          <div>
            <Skeleton className="h-6 w-32 mb-3" />
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          </div>
          {/* Marktbewegungen */}
          <div>
            <Skeleton className="h-6 w-40 mb-3" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Sidebar */}
        <div className="space-y-6">
          <div>
            <Skeleton className="h-6 w-24 mb-3" />
            <SkeletonCard className="h-64" />
          </div>
          <div>
            <Skeleton className="h-6 w-20 mb-3" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <SkeletonCard key={i} className="h-28" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// WELCOME BANNER (first-time users)
// ============================================

const WELCOME_KEY = 'bescout-welcome-dismissed';

function WelcomeBanner({ name }: { name: string }) {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem(WELCOME_KEY);
  });

  if (!visible) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#FFD700]/20 bg-gradient-to-r from-[#FFD700]/[0.08] via-purple-500/[0.04] to-[#22C55E]/[0.04]">
      <div className="p-4 md:p-5">
        <button
          onClick={() => { localStorage.setItem(WELCOME_KEY, '1'); setVisible(false); }}
          className="absolute top-3 right-3 text-white/30 hover:text-white/60 text-xs"
          aria-label="Schließen"
        >✕</button>
        <div className="flex items-center gap-2 mb-2">
          <Rocket className="w-5 h-5 text-[#FFD700]" />
          <span className="text-sm font-black text-[#FFD700]">Willkommen, {name}!</span>
        </div>
        <p className="text-xs text-white/50 mb-3">
          Verdiene BSD durch Trading, Fantasy-Turniere und Analysen. Wähle dein erstes Ziel:
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/market?tab=scouting">
            <Button variant="gold" size="sm" className="gap-1.5 text-xs">
              <Zap className="w-3.5 h-3.5" />
              Ersten Spieler kaufen
            </Button>
          </Link>
          <Link href="/fantasy">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Trophy className="w-3.5 h-3.5 text-purple-400" />
              Fantasy spielen
            </Button>
          </Link>
          <Link href="/community">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              Community entdecken
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================
// LOGIN STREAK (localStorage-based)
// ============================================

const STREAK_KEY = 'bescout-login-streak';

function getLoginStreak(): { current: number; lastDate: string } {
  if (typeof window === 'undefined') return { current: 0, lastDate: '' };
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { current: 0, lastDate: '' };
    return JSON.parse(raw);
  } catch { return { current: 0, lastDate: '' }; }
}

function updateLoginStreak(): number {
  const today = new Date().toISOString().slice(0, 10);
  const { current, lastDate } = getLoginStreak();

  if (lastDate === today) return current; // Already counted today

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newStreak = lastDate === yesterday ? current + 1 : 1;
  localStorage.setItem(STREAK_KEY, JSON.stringify({ current: newStreak, lastDate: today }));
  return newStreak;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function HomePage() {
  const { user, profile, loading } = useUser();
  const { balanceCents } = useWallet();
  const { addToast } = useToast();
  const name = profile?.display_name || displayName(user);
  const firstName = name.split(' ')[0];

  const [players, setPlayers] = useState<Player[]>([]);
  const [holdings, setHoldings] = useState<DpcHolding[]>([]);
  const [transactions, setTransactions] = useState<DbTransaction[]>([]);
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [userStats, setUserStats] = useState<DbUserStats | null>(null);
  const [topScouts, setTopScouts] = useState<LeaderboardUser[]>([]);
  const [recentTrades, setRecentTrades] = useState<GlobalTrade[]>([]);
  const [topTraders, setTopTraders] = useState<TopTrader[]>([]);
  const [communityPosts, setCommunityPosts] = useState<PostWithAuthor[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    let cancelled = false;

    async function loadData() {
      try {
        const results = await withTimeout(Promise.allSettled([
          getPlayers(),
          getHoldings(uid),
          getTransactions(uid, 10),
          getEvents(),
          getAllOpenSellOrders(),
          getUserStats(uid),
          getLeaderboard(10),
          getRecentGlobalTrades(10),
          getTopTraders(5),
          getPosts({ limit: 5 }),
          getPlatformStats(),
        ]), 10000);
        if (cancelled) return;

        const dbPlayers = val(results[0], []);
        const dbHoldings = val(results[1], []);
        const dbTransactions = val(results[2], []);
        const dbEvents = val(results[3], []);
        const dbOrders = val(results[4], []);
        const stats = val(results[5], null);
        const lb = val(results[6], []);
        const trades = val(results[7], []);
        const traders = val(results[8], []);
        const posts = val(results[9], []);
        const pStats = val(results[10], null);

        // Critical: players must load for meaningful page
        if (results[0].status === 'rejected') {
          if (!cancelled) setDataError(true);
          return;
        }

        setPlayers(dbToPlayers(dbPlayers));
        setTransactions(dbTransactions);
        setEvents(dbEvents);
        setOrders(dbOrders);
        setUserStats(stats);
        setTopScouts(lb);
        setRecentTrades(trades);
        setTopTraders(traders);
        setCommunityPosts(posts);
        setPlatformStats(pStats);

        const mapped: DpcHolding[] = dbHoldings.map((h) => ({
          id: h.id,
          playerId: h.player_id,
          player: `${h.player.first_name} ${h.player.last_name}`,
          club: h.player.club,
          pos: h.player.position as Pos,
          qty: h.quantity,
          avgBuy: centsToBsd(h.avg_buy_price),
          floor: centsToBsd(h.player.floor_price),
          change24h: Number(h.player.price_change_24h),
          listedByUser: 0,
          ticket: h.player.shirt_number ?? 0,
          age: h.player.age ?? 0,
          perfL5: h.player.perf_l5 ?? 0,
          matches: h.player.matches ?? 0,
          goals: h.player.goals ?? 0,
          assists: h.player.assists ?? 0,
        }));
        setHoldings(mapped);
        setDataError(false);
      } catch {
        if (!cancelled) setDataError(true);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    loadData();

    // Fire-and-forget: track daily login mission
    import('@/lib/services/missions').then(({ trackMissionProgress }) => {
      trackMissionProgress(uid, 'daily_login');
    }).catch(() => {});

    // Update login streak (localStorage for instant UI)
    setStreak(updateLoginStreak());

    // Server-side streak: record + auto-claim milestones
    import('@/lib/services/streaks').then(({ recordLoginStreak }) => {
      recordLoginStreak(uid).then(result => {
        if (cancelled) return;
        // Override localStorage with server value
        setStreak(result.current_streak);
        localStorage.setItem(STREAK_KEY, JSON.stringify({ current: result.current_streak, lastDate: new Date().toISOString().slice(0, 10) }));
        // Toast for milestone rewards
        if (result.rewards_given && result.rewards_given.length > 0) {
          result.rewards_given.forEach(r => {
            addToast(`Streak-Bonus: ${r.milestone} Tage! +${Math.round(r.reward_cents / 100)} BSD`, 'success');
          });
        }
      }).catch(() => {});
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [user, retryCount]);

  const portfolioValue = useMemo(
    () => holdings.reduce((s, h) => s + h.qty * h.floor, 0),
    [holdings]
  );
  const portfolioCost = useMemo(
    () => holdings.reduce((s, h) => s + h.qty * h.avgBuy, 0),
    [holdings]
  );
  const pnl = portfolioValue - portfolioCost;
  const pnlPct = portfolioCost > 0 ? (pnl / portfolioCost) * 100 : 0;
  const totalDpcs = useMemo(() => holdings.reduce((s, h) => s + h.qty, 0), [holdings]);
  const posCounts = useMemo(() => {
    const counts = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
    holdings.forEach(h => { if (counts[h.pos] !== undefined) counts[h.pos]++; });
    return counts;
  }, [holdings]);

  const sortedByChange = useMemo(
    () => [...players].sort((a, b) => b.prices.change24h - a.prices.change24h),
    [players]
  );
  const topGainers = sortedByChange.filter((p) => p.prices.change24h > 0).slice(0, 3);
  const topLosers = sortedByChange.filter((p) => p.prices.change24h < 0).slice(0, 3);

  const recentListings = useMemo(() => {
    const playerMap = new Map(players.map(p => [p.id, p]));
    return [...orders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6)
      .map(o => ({ order: o, player: playerMap.get(o.player_id) }))
      .filter((item): item is { order: DbOrder; player: Player } => !!item.player);
  }, [orders, players]);

  const activeIPOs = useMemo(
    () => players.filter((p) => p.ipo.status === 'open' || p.ipo.status === 'early_access'),
    [players]
  );

  // "Unter Wert" — high L5 perf relative to floor price
  const bargains = useMemo(() => {
    if (players.length === 0) return [];
    const withValue = players
      .filter(p => p.perf.l5 > 0 && (p.prices.floor ?? 0) > 0)
      .map(p => {
        const floor = centsToBsd(p.prices.floor ?? 0);
        // Value ratio: perf per BSD — higher = more undervalued
        const valueRatio = p.perf.l5 / floor;
        return { player: p, floor, valueRatio };
      })
      .sort((a, b) => b.valueRatio - a.valueRatio)
      .slice(0, 5);
    return withValue;
  }, [players]);

  const nextEvent = useMemo(() => {
    const active = events.filter(e => e.status === 'registering' || e.status === 'late-reg' || e.status === 'running');
    active.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    return active[0] ?? null;
  }, [events]);

  const displayEvents = useMemo(() => {
    const priority: Record<string, number> = { running: 0, 'late-reg': 1, registering: 2, scoring: 3, upcoming: 4, ended: 5 };
    return [...events]
      .filter(e => e.status !== 'ended')
      .sort((a, b) => (priority[a.status] ?? 9) - (priority[b.status] ?? 9));
  }, [events]);

  if (dataLoading) return <HomeSkeleton />;

  if (dataError && players.length === 0) {
    return (
      <div className="max-w-[1600px] mx-auto py-12">
        <ErrorState onRetry={() => { setDataLoading(true); setDataError(false); setRetryCount(c => c + 1); }} />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">

      {/* ━━━ GREETING — compact on mobile ━━━ */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs md:text-sm text-white/40 tracking-wide">
            {getGreeting()},
          </div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight" suppressHydrationWarning>
            {loading ? '...' : firstName}
            <span className="text-[#FFD700]">.</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {streak >= 2 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-400/20">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-black text-orange-300">{streak}</span>
              <span className="text-[10px] text-orange-400/60 hidden sm:inline">Tage</span>
              {(() => {
                const milestones = [3, 7, 14, 30];
                const next = milestones.find(m => m > streak);
                if (!next) return null;
                return <span className="text-[10px] text-orange-400/40 hidden md:inline ml-1">• noch {next - streak}d bis {next}d Bonus</span>;
              })()}
            </div>
          )}
          <Link href="/market" className="hidden md:block">
            <Button variant="gold" className="gap-2">
              <Briefcase className="w-4 h-4" />
              Manager Office
            </Button>
          </Link>
        </div>
      </div>

      {/* ━━━ WELCOME BANNER (first-time only) ━━━ */}
      <WelcomeBanner name={firstName} />

      {/* ━━━ STATS — 2x2 grid on mobile, 4-col on desktop ━━━ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">Spielerkader</span>
            <InfoTooltip text="Der Gesamtwert aller DPCs in deinem Kader, berechnet zum aktuellen Floor-Preis." />
          </div>
          <div className="font-mono font-black text-base md:text-xl text-white truncate">{fmtBSD(portfolioValue)}</div>
          <div className="text-[10px] text-white/40">{holdings.length} Spieler · {totalDpcs} DPC</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">P&L</span>
            <InfoTooltip text="Profit & Loss — die Differenz zwischen aktuellem Wert und deinem durchschnittlichen Kaufpreis." />
          </div>
          <div className={cn('font-mono font-black text-base md:text-xl truncate', pnl >= 0 ? 'text-[#22C55E]' : 'text-red-400')}>
            {pnl >= 0 ? '+' : ''}{fmtBSD(pnl)}
          </div>
          <div className={cn('text-[10px]', pnl >= 0 ? 'text-[#22C55E]/60' : 'text-red-400/60')}>
            {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
          </div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">Guthaben</span>
            <InfoTooltip text="Dein verfügbares BSD-Guthaben zum Kaufen, Handeln und Abstimmen." />
          </div>
          {balanceCents === null ? (
            <div className="h-6 md:h-7 w-20 rounded bg-[#FFD700]/10 animate-pulse mt-1" />
          ) : (
            <div className="font-mono font-black text-base md:text-xl text-[#FFD700] truncate">{fmtBSD(centsToBsd(balanceCents))}</div>
          )}
          <div className="text-[10px] text-white/40">BSD</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">Scout Score</span>
            <InfoTooltip text="Deine Gesamt-Reputation: 35% Trading-Skill + 40% Manager-Fähigkeit + 25% Scouting-Expertise." />
          </div>
          <div className="font-mono font-black text-base md:text-xl text-[#FFD700]">
            {userStats?.total_score ?? 0}<span className="text-white/30 text-xs">/100</span>
          </div>
          <div className="text-[10px] text-white/40">
            {userStats && userStats.rank > 0 ? `Rang #${userStats.rank}` : getLevelTier(profile?.level ?? 1).name}
          </div>
        </div>
      </div>

      {/* ━━━ LIVE TRADE FEED ━━━ */}
      {recentTrades.length > 0 && (
        <div className="overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#FFD700]/60" />
            <span className="text-[10px] font-black uppercase tracking-wider text-white/30">Letzte Trades</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
            {recentTrades.map(t => (
              <Link
                key={t.id}
                href={`/player/${t.playerId}`}
                className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:bg-white/[0.04] transition-all shrink-0"
              >
                <PositionBadge pos={t.playerPos} size="sm" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold truncate max-w-[120px]">{t.playerName}</div>
                  <div className="text-[10px] text-white/30">{getRelativeTime(t.executedAt)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] font-mono font-bold text-[#FFD700]">{fmtBSD(centsToBsd(t.price))}</div>
                  <div className="text-[9px] text-white/25">{t.quantity}x · {t.isP2P ? 'P2P' : 'IPO'}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ━━━ UNTER WERT / BARGAINS ━━━ */}
      {bargains.length > 0 && (
        <div className="overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3.5 h-3.5 text-[#22C55E]/60" />
            <span className="text-[10px] font-black uppercase tracking-wider text-white/30">Unter Wert</span>
            <span className="text-[9px] text-white/20 ml-auto">Hohe Leistung, günstiger Preis</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
            {bargains.map(({ player: p, floor }) => (
              <Link
                key={p.id}
                href={`/player/${p.id}`}
                className="flex items-center gap-2.5 px-3 py-2.5 bg-[#22C55E]/[0.03] border border-[#22C55E]/10 rounded-xl hover:bg-[#22C55E]/[0.06] transition-all shrink-0"
              >
                <PositionBadge pos={p.pos} size="sm" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold truncate max-w-[110px]">{p.first} {p.last}</div>
                  <div className="text-[10px] text-white/30">{p.club}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] font-mono font-bold text-[#FFD700]">{fmtBSD(floor)} BSD</div>
                  <div className="text-[10px] font-mono text-[#22C55E]">L5: {p.perf.l5}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ━━━ MISSIONS ━━━ */}
      <MissionBanner />

      {/* ━━━ NÄCHSTES EVENT (Hero card — prominent for engagement) ━━━ */}
      {nextEvent && (
        <div>
          <SectionHeader
            title="Nächstes Event"
            href="/fantasy"
            badge={
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-400/25">
                <Clock className="w-3 h-3 text-purple-400" />
                <span className="text-[10px] font-bold text-purple-300">
                  {nextEvent.status === 'running' ? getTimeUntil(nextEvent.ends_at) : getTimeUntil(nextEvent.starts_at)}
                </span>
              </span>
            }
          />
          <Link href="/fantasy" className="block mt-3">
            <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-600/10 via-purple-500/5 to-transparent">
              <div className="p-4 md:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="w-4 h-4 text-purple-400" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">{nextEvent.format}</span>
                    </div>
                    <h3 className="text-lg md:text-2xl font-black">{nextEvent.name}</h3>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-white/50">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {nextEvent.current_entries}/{nextEvent.max_entries ?? '∞'}
                      </span>
                      <span>Eintritt: {nextEvent.entry_fee === 0 ? 'Gratis' : `${fmtBSD(centsToBsd(nextEvent.entry_fee))} BSD`}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-white/40 mb-0.5">Preisgeld</div>
                    <div className="text-xl md:text-3xl font-black font-mono text-[#FFD700]">
                      {formatPrize(centsToBsd(nextEvent.prize_pool))}
                    </div>
                    <div className="text-[10px] text-white/40">BSD</div>
                  </div>
                </div>
                {nextEvent.max_entries && (
                  <div className="mt-3">
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full"
                        style={{ width: `${Math.min(100, (nextEvent.current_entries / nextEvent.max_entries) * 100)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[10px] text-white/30">
                      {Math.round((nextEvent.current_entries / nextEvent.max_entries) * 100)}% belegt
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* ━━━ IPO BANNER ━━━ */}
      {activeIPOs.length > 0 && (
        <Link href={`/player/${activeIPOs[0].id}`} className="block">
          <div className="relative overflow-hidden rounded-2xl border border-[#22C55E]/20 bg-gradient-to-r from-[#22C55E]/[0.08] via-transparent to-[#FFD700]/[0.04]">
            <div className="relative flex items-center justify-between p-4 md:p-5 gap-4">
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-[#22C55E]/15 border border-[#22C55E]/25 shrink-0">
                  <Rocket className="w-5 h-5 md:w-6 md:h-6 text-[#22C55E]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-wider text-[#22C55E]">Live IPO</span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]" />
                    </span>
                  </div>
                  <div className="font-black text-sm md:text-lg truncate">
                    {activeIPOs.map((p) => `${p.first} ${p.last}`).join(', ')}
                  </div>
                  <div className="text-xs text-white/50 truncate">
                    {activeIPOs[0].club} · {activeIPOs[0].ipo.progress}% verkauft
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono font-black text-[#FFD700] text-lg md:text-2xl">{activeIPOs[0].ipo.price}</div>
                <div className="text-[10px] text-white/40">BSD/DPC</div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* ━━━ MAIN CONTENT — Desktop: 2/3 + 1/3, Mobile: single column ━━━ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ═══ LEFT / MAIN COLUMN ═══ */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── MEIN SPIELERKADER ── */}
          <div>
            <SectionHeader title="Mein Spielerkader" href="/market?tab=kader" />
            {holdings.length > 0 && (() => {
              const uniqueClubs = new Set(holdings.map(h => h.club)).size;
              const uniquePositions = Object.values(posCounts).filter(c => c > 0).length;
              const diversityScore = Math.min(100, Math.round((uniqueClubs * 25 + uniquePositions * 15 + Math.min(holdings.length, 10) * 3)));
              const topPerformer = [...holdings].sort((a, b) => {
                const aPnl = (a.floor - a.avgBuy) * a.qty;
                const bPnl = (b.floor - b.avgBuy) * b.qty;
                return bPnl - aPnl;
              })[0];
              const topPnl = topPerformer ? (topPerformer.floor - topPerformer.avgBuy) * topPerformer.qty : 0;
              const posTotal = Object.values(posCounts).reduce((s, c) => s + c, 0) || 1;
              return (
                <>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg font-bold">{posCounts.GK} GK</span>
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg font-bold">{posCounts.DEF} DEF</span>
                    <span className="text-[10px] text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-1 rounded-lg font-bold">{posCounts.MID} MID</span>
                    <span className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg font-bold">{posCounts.ATT} ATT</span>
                    <div className="ml-auto flex items-center gap-1.5">
                      <div className="flex h-2 w-20 rounded-full overflow-hidden bg-black/30">
                        {posCounts.GK > 0 && <div className="bg-emerald-400" style={{ width: `${(posCounts.GK / posTotal) * 100}%` }} />}
                        {posCounts.DEF > 0 && <div className="bg-amber-400" style={{ width: `${(posCounts.DEF / posTotal) * 100}%` }} />}
                        {posCounts.MID > 0 && <div className="bg-sky-400" style={{ width: `${(posCounts.MID / posTotal) * 100}%` }} />}
                        {posCounts.ATT > 0 && <div className="bg-rose-400" style={{ width: `${(posCounts.ATT / posTotal) * 100}%` }} />}
                      </div>
                    </div>
                  </div>
                  {holdings.length >= 3 && (
                    <div className="mt-2 flex items-center gap-3 text-[10px]">
                      <div className="flex items-center gap-1 px-2 py-1 bg-white/[0.03] border border-white/[0.06] rounded-lg">
                        <Activity className="w-3 h-3 text-purple-400" />
                        <span className="text-white/40">Diversität</span>
                        <span className={cn('font-mono font-bold', diversityScore >= 60 ? 'text-[#22C55E]' : diversityScore >= 30 ? 'text-[#FFD700]' : 'text-red-400')}>{diversityScore}</span>
                      </div>
                      {topPerformer && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-white/[0.03] border border-white/[0.06] rounded-lg">
                          <Trophy className="w-3 h-3 text-[#FFD700]" />
                          <span className="text-white/40">Top:</span>
                          <span className="font-bold text-white/80 truncate max-w-[80px]">{topPerformer.player}</span>
                          <span className={cn('font-mono font-bold', topPnl >= 0 ? 'text-[#22C55E]' : 'text-red-400')}>
                            {topPnl >= 0 ? '+' : ''}{fmtBSD(Math.round(topPnl))}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
            <div className="mt-3 space-y-2">
              {holdings.length === 0 ? (
                <Card className="p-6 text-center">
                  <Briefcase className="w-8 h-8 mx-auto mb-2 text-white/20" />
                  <div className="text-sm font-medium text-white/50">Starte mit deinem ersten Spieler</div>
                  <div className="text-xs text-white/30 mt-1">Kaufe DPCs, handle am Markt und baue dein Portfolio auf.</div>
                  <Link href="/market?tab=scouting" className="inline-block mt-3">
                    <Button variant="gold" size="sm" className="gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      Ersten Spieler kaufen
                    </Button>
                  </Link>
                </Card>
              ) : (
                <div className="space-y-1.5">
                  {holdings.slice(0, 5).map((h) => (
                    <PlayerDisplay key={h.id} variant="compact"
                      player={{
                        id: h.playerId,
                        first: h.player.split(' ')[0] || '',
                        last: h.player.split(' ').slice(1).join(' ') || '',
                        club: h.club,
                        pos: h.pos,
                        age: h.age,
                        ticket: h.ticket,
                        status: 'fit' as const,
                        contractMonthsLeft: 24,
                        country: '',
                        league: '',
                        isLiquidated: false,
                        stats: { matches: h.matches, goals: h.goals, assists: h.assists },
                        perf: { l5: h.perfL5, l15: 0, trend: 'FLAT' as const },
                        prices: { lastTrade: 0, floor: h.floor, change24h: h.change24h },
                        dpc: { supply: 0, float: 0, circulation: 0, onMarket: 0, owned: h.qty },
                        ipo: { status: 'none' as const },
                        listings: [],
                        topOwners: [],
                      }}
                      holding={{ quantity: h.qty, avgBuyPriceBsd: h.avgBuy }}
                      showActions={false}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── AKTIVITÄT + EVENTS (vor Marktbewegungen) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Aktivität */}
            <div>
              <SectionHeader title="Aktivität" />
              <Card className="mt-3">
                <div className="p-3 md:p-4 space-y-0.5">
                  {transactions.length === 0 ? (
                    <div className="text-center py-6">
                      <Activity className="w-6 h-6 mx-auto mb-2 text-white/15" />
                      <div className="text-sm text-white/40">Noch keine Aktivität</div>
                      <div className="text-[11px] text-white/25 mt-1">Kaufe oder handle DPCs, um loszulegen.</div>
                    </div>
                  ) : (
                    transactions.slice(0, 6).map((tx) => {
                      const positive = tx.amount > 0;
                      return (
                        <div
                          key={tx.id}
                          className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors"
                        >
                          <div className={cn(
                            'flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mt-0.5',
                            getActivityColorLocal(tx.type)
                          )}>
                            {renderActivityIcon(tx.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium leading-snug">{getActivityLabel(tx)}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={cn(
                                'text-xs font-mono font-bold',
                                positive ? 'text-[#22C55E]' : 'text-white/40'
                              )}>
                                {positive ? '+' : ''}{formatBsd(tx.amount)} BSD
                              </span>
                              <span className="text-[10px] text-white/25">· {getRelativeTime(tx.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>

            {/* Events */}
            <div>
              <SectionHeader title="Events" href="/fantasy" />
              <div className="mt-3 space-y-2">
                {displayEvents.length === 0 ? (
                  <div className="p-6 text-center text-sm text-white/30 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                    Keine aktiven Events
                  </div>
                ) : displayEvents.slice(0, 3).map((evt) => {
                  const isLive = evt.status === 'running';
                  const fillPct = evt.max_entries ? (evt.current_entries / evt.max_entries) * 100 : 0;
                  return (
                    <Link
                      key={evt.id}
                      href="/fantasy"
                      className="block bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 md:p-4 hover:border-purple-400/30 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0">
                          <div className="font-bold text-sm truncate">{evt.name}</div>
                          <div className="text-[11px] text-white/40">{evt.format}</div>
                        </div>
                        {isLive ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/25 shrink-0">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#22C55E]" />
                            </span>
                            <span className="text-[10px] font-black text-[#22C55E]">LIVE</span>
                          </span>
                        ) : evt.status === 'late-reg' ? (
                          <span className="px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-400/25 text-[10px] font-black text-orange-300 shrink-0">Late Reg</span>
                        ) : evt.status === 'registering' ? (
                          <span className="px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/25 text-[10px] font-black text-sky-300 shrink-0">Anmelden</span>
                        ) : evt.status === 'scoring' ? (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-400/25 text-[10px] font-black text-purple-300 shrink-0">Auswertung</span>
                        ) : (
                          <Chip>Bald</Chip>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-white/50 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {isLive ? `Endet in ${getTimeUntil(evt.ends_at)}` : `Start: ${getTimeUntil(evt.starts_at)}`}
                        </span>
                        <span className="font-mono font-bold text-[#FFD700]">
                          {formatPrize(centsToBsd(evt.prize_pool))} BSD
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-white/40 mb-2">
                        <span>{evt.entry_fee === 0 ? <span className="text-[#22C55E] font-bold">Gratis</span> : `Eintritt: ${centsToBsd(evt.entry_fee)} BSD`}</span>
                        <span>{evt.current_entries} Spieler</span>
                      </div>
                      {evt.max_entries ? (
                        <>
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                isLive ? 'bg-[#22C55E]/50' : 'bg-purple-500/50'
                              )}
                              style={{ width: `${fillPct}%` }}
                            />
                          </div>
                          <div className="mt-1 text-[10px] text-white/30">
                            {evt.current_entries}/{evt.max_entries} Teilnehmer
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px] text-white/30">
                          {evt.current_entries} Teilnehmer
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── PLATFORM PULSE ── */}
          {platformStats && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-[#22C55E]" />
                <span className="text-[10px] font-black uppercase tracking-wider text-white/30">Plattform-Puls</span>
                <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Card className="p-3 text-center">
                  <div className="font-mono font-bold text-lg text-white">{platformStats.totalUsers}</div>
                  <div className="text-[10px] text-white/40">Scouts</div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="font-mono font-bold text-lg text-sky-300">{platformStats.trades24h}</div>
                  <div className="text-[10px] text-white/40">Trades (24h)</div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="font-mono font-bold text-lg text-[#FFD700]">{fmtBSD(centsToBsd(platformStats.volume24h))}</div>
                  <div className="text-[10px] text-white/40">Volumen (24h)</div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="font-mono font-bold text-lg text-[#22C55E]">{platformStats.activePlayers}</div>
                  <div className="text-[10px] text-white/40">Aktive Spieler</div>
                </Card>
              </div>
            </div>
          )}

          {/* ── COMMUNITY HIGHLIGHTS ── */}
          {communityPosts.length > 0 && (
            <div>
              <SectionHeader title="Community" href="/community" />
              <div className="mt-3 space-y-2">
                {communityPosts.slice(0, 3).map(post => (
                  <Link key={post.id} href="/community" className="block">
                    <Card className="p-3 hover:bg-white/[0.04] transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFD700]/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-[10px] font-black shrink-0">
                          {(post.author_display_name || post.author_handle || '?')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold">{post.author_display_name || post.author_handle}</span>
                            {post.category && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/5 text-white/40 border border-white/10">{post.category}</span>
                            )}
                            <span className="text-[10px] text-white/25 ml-auto shrink-0">{getRelativeTime(post.created_at)}</span>
                          </div>
                          <div className="text-xs text-white/60 line-clamp-2">{post.content}</div>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/30">
                            <span>▲ {post.upvotes}</span>
                            {post.replies_count > 0 && <span>{post.replies_count} Antworten</span>}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── MARKTBEWEGUNGEN ── */}
          <div>
            <SectionHeader title="Marktbewegungen" href="/market" />
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Gewinner */}
              <div>
                <div className="text-xs font-bold text-[#22C55E] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Gewinner (24h)
                </div>
                <div className="space-y-2">
                  {topGainers.map((p, i) => (
                    <PlayerDisplay variant="compact" key={p.id} player={p} rank={i + 1} showSparkline />
                  ))}
                  {topGainers.length === 0 && (
                    <div className="text-sm text-white/30 p-3 text-center rounded-xl bg-white/[0.02]">Keine Gewinner heute</div>
                  )}
                </div>
              </div>
              {/* Verlierer */}
              <div>
                <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  Verlierer (24h)
                </div>
                <div className="space-y-2">
                  {topLosers.map((p, i) => (
                    <PlayerDisplay variant="compact" key={p.id} player={p} rank={i + 1} showSparkline />
                  ))}
                  {topLosers.length === 0 && (
                    <div className="text-sm text-white/30 p-3 text-center rounded-xl bg-white/[0.02]">Keine Verlierer heute</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── NEUE ANGEBOTE (Transfermarkt) ── */}
          <div>
            <SectionHeader title="Neue Angebote" href="/market" />
            <div className="mt-3 space-y-2">
              {recentListings.length === 0 ? (
                <Card className="p-6 text-center">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 text-white/20" />
                  <div className="text-sm text-white/40">Noch keine Angebote auf dem Markt</div>
                  <div className="text-xs text-white/25 mt-1">Stöbere im Manager Office nach Spielern.</div>
                  <Link href="/market" className="inline-block mt-3">
                    <Button variant="gold" size="sm" className="gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" />
                      Manager Office
                    </Button>
                  </Link>
                </Card>
              ) : (
                recentListings.map(({ order, player }) => (
                  <Link
                    key={order.id}
                    href={`/player/${player.id}`}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-[#FFD700]/20 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <PositionBadge pos={player.pos} size="sm" />
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">{player.first} {player.last}</div>
                        <div className="text-[11px] text-white/40">{player.club} · {order.quantity} DPC</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-[#FFD700] text-sm">{fmtBSD(centsToBsd(order.price))} BSD</div>
                      <div className="text-[10px] text-white/30">{getRelativeTime(order.created_at)}</div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* ── INVITE BANNER ── */}
          <Card className="p-5 bg-gradient-to-r from-[#FFD700]/[0.06] to-purple-500/[0.04] border-[#FFD700]/15">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-[#FFD700]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-sm">Lade Freunde ein!</div>
                <div className="text-xs text-white/50 mt-0.5">Teile BeScout mit anderen Fußball-Fans und baut gemeinsam euren Kader auf.</div>
              </div>
              <Button variant="gold" size="sm" className="shrink-0 gap-1.5"
                onClick={async () => {
                  const url = window.location.origin;
                  const text = 'Schau dir BeScout an — DPC-Trading, Fantasy & mehr für Fußball-Fans!';
                  if (navigator.share) {
                    try { await navigator.share({ title: 'BeScout', text, url }); } catch {}
                  } else {
                    await navigator.clipboard.writeText(`${text} ${url}`);
                  }
                }}>
                <Star className="w-3.5 h-3.5" />
                Einladen
              </Button>
            </div>
          </Card>
        </div>

        {/* ═══ RIGHT COLUMN (desktop sidebar) ═══ */}
        <div className="space-y-6">

          {/* ── TOP SCOUTS (Desktop only) ── */}
          {topScouts.length > 0 && (
            <div className="hidden lg:block">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[#FFD700]" />
                    <span className="text-xs text-white/30 uppercase tracking-wider font-bold">Top Scouts</span>
                  </div>
                  <Link href="/community" className="text-xs text-[#FFD700] hover:underline">Alle</Link>
                </div>
                <div className="space-y-2">
                  {topScouts.slice(0, 5).map((s, i) => {
                    const isMe = s.userId === user?.id;
                    return (
                      <Link key={s.userId} href={`/profile/${s.handle}`} className={cn(
                        'flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white/[0.04] transition-colors',
                        isMe && 'bg-[#FFD700]/[0.06] border border-[#FFD700]/15'
                      )}>
                        <span className={cn(
                          'w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black',
                          i === 0 ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-white/5 text-white/50'
                        )}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{s.displayName || s.handle}</div>
                        </div>
                        <span className="text-xs font-mono text-[#FFD700]">{s.totalScore}</span>
                      </Link>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* ── TOP TRADER (Desktop only) ── */}
          {topTraders.length > 0 && (
            <div className="hidden lg:block">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-[#22C55E]" />
                    <span className="text-xs text-white/30 uppercase tracking-wider font-bold">Top Trader</span>
                  </div>
                  <span className="text-[10px] text-white/20">7 Tage</span>
                </div>
                <div className="space-y-2">
                  {topTraders.map((t, i) => {
                    const isMe = t.userId === user?.id;
                    return (
                      <Link key={t.userId} href={`/profile/${t.handle}`} className={cn(
                        'flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white/[0.04] transition-colors',
                        isMe && 'bg-[#22C55E]/[0.06] border border-[#22C55E]/15'
                      )}>
                        <span className={cn(
                          'w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black',
                          i === 0 ? 'bg-[#22C55E]/20 text-[#22C55E]' : 'bg-white/5 text-white/50'
                        )}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{t.displayName || t.handle}</div>
                          <div className="text-[10px] text-white/30">{t.tradeCount} Trades</div>
                        </div>
                        <span className="text-xs font-mono text-[#22C55E]">{fmtBSD(centsToBsd(t.totalVolume))}</span>
                      </Link>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* ── FOLLOW SUGGESTIONS (Desktop only) ── */}
          {topScouts.filter(s => s.userId !== user?.id).length > 0 && (
            <div className="hidden lg:block">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-white/30 uppercase tracking-wider font-bold">Entdecken</span>
                  </div>
                  <Link href="/community" className="text-xs text-[#FFD700] hover:underline">Alle</Link>
                </div>
                <div className="space-y-2">
                  {topScouts.filter(s => s.userId !== user?.id).slice(0, 3).map(s => (
                    <Link key={s.userId} href={`/profile/${s.handle}`} className="flex items-center gap-3 py-2 px-2 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-sky-500/20 border border-white/10 flex items-center justify-center text-[10px] font-black">
                        {(s.displayName || s.handle || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{s.displayName || s.handle}</div>
                        <div className="text-[10px] text-white/30">Lv {s.level} · {s.followersCount} Follower</div>
                      </div>
                      <span className="text-[10px] font-bold text-purple-300 bg-purple-500/15 border border-purple-500/20 px-2 py-1 rounded-lg">
                        Ansehen
                      </span>
                    </Link>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ── SCHNELLZUGRIFF (Desktop only) ── */}
          <div className="hidden lg:block">
            <Card className="p-4">
              <div className="text-xs text-white/30 uppercase tracking-wider font-bold mb-3">Schnellzugriff</div>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/market">
                  <Button variant="outline" fullWidth size="sm" className="justify-start gap-2">
                    <Briefcase className="w-4 h-4 text-[#FFD700]" />
                    Manager
                  </Button>
                </Link>
                <Link href="/fantasy">
                  <Button variant="outline" fullWidth size="sm" className="justify-start gap-2">
                    <Trophy className="w-4 h-4 text-purple-400" />
                    Fantasy
                  </Button>
                </Link>
                <Link href="/club">
                  <Button variant="outline" fullWidth size="sm" className="justify-start gap-2">
                    <Users className="w-4 h-4 text-sky-400" />
                    Club
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button variant="outline" fullWidth size="sm" className="justify-start gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    Profil
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
