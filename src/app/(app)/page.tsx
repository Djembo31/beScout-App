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
  X,
  MessageCircle,
  Send,
  UserPlus,
} from 'lucide-react';
import { Card, Button, Chip, ErrorState, Skeleton, SkeletonCard, TabBar, TabPanel } from '@/components/ui';
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
import { getUserStats, getLeaderboard, getFollowingFeed } from '@/lib/services/social';
import { val } from '@/lib/settledHelpers';
import dynamic from 'next/dynamic';

const MissionBanner = dynamic(() => import('@/components/missions/MissionBanner'), { ssr: false });
const ScoutMissionCard = dynamic(() => import('@/components/missions/ScoutMissionCard'), { ssr: false });
const AirdropScoreCard = dynamic(() => import('@/components/airdrop/AirdropScoreCard'), { ssr: false });
const ReferralCard = dynamic(() => import('@/components/airdrop/ReferralCard'), { ssr: false });
import { getDpcOfTheWeek } from '@/lib/services/dpcOfTheWeek';
import type { DpcOfTheWeek } from '@/lib/services/dpcOfTheWeek';
import { getScoutMissions, getUserMissionProgress } from '@/lib/services/scoutMissions';
import type { ScoutMission, UserScoutMission } from '@/lib/services/scoutMissions';
import { TierBadge } from '@/components/ui/TierBadge';
import { getFanTier } from '@/types';
import type { FanTier } from '@/types';
import { getActivityColor as actColor, getActivityLabel, getRelativeTime, getActivityIcon as actIconName } from '@/lib/activityHelpers';
import { getPosts } from '@/lib/services/posts';
import type { Player, DpcHolding, DbTransaction, DbEvent, DbOrder, Pos, DbUserStats, LeaderboardUser, PostWithAuthor, FeedItem } from '@/types';
import { FEED_ACTION_LABELS } from '@/types';
import { getLevelTier } from '@/types';
import { InfoTooltip } from '@/components/ui';

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

const ICON_MAP: Record<string, React.ElementType> = { CircleDollarSign, Trophy, Award, Users, Zap, FileText, Vote, Activity, Target, Flame, Banknote };
function renderActivityIcon(type: string) {
  const Icon = ICON_MAP[actIconName(type)] ?? Activity;
  return <Icon className="w-4 h-4" />;
}
function getActivityColorLocal(type: string): string { return actColor(type); }

const FEED_ICON_MAP: Record<string, { Icon: React.ElementType; color: string }> = {
  trade_buy: { Icon: CircleDollarSign, color: 'text-[#FFD700] bg-[#FFD700]/10' },
  trade_sell: { Icon: CircleDollarSign, color: 'text-[#22C55E] bg-[#22C55E]/10' },
  research_create: { Icon: FileText, color: 'text-purple-400 bg-purple-400/10' },
  post_create: { Icon: MessageCircle, color: 'text-sky-400 bg-sky-400/10' },
  lineup_submit: { Icon: Trophy, color: 'text-purple-400 bg-purple-400/10' },
  follow: { Icon: UserPlus, color: 'text-[#22C55E] bg-[#22C55E]/10' },
  bounty_submit: { Icon: Target, color: 'text-amber-400 bg-amber-400/10' },
  bounty_create: { Icon: Target, color: 'text-amber-400 bg-amber-400/10' },
  offer_create: { Icon: Send, color: 'text-amber-400 bg-amber-400/10' },
  offer_accept: { Icon: ArrowRightLeft, color: 'text-[#22C55E] bg-[#22C55E]/10' },
  poll_create: { Icon: Vote, color: 'text-amber-400 bg-amber-400/10' },
  vote_create: { Icon: Vote, color: 'text-amber-400 bg-amber-400/10' },
};

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

function SectionHeader({ title, href, badge }: { title: string; href?: string; badge?: React.ReactNode }) {
  const content = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <h2 className="text-base md:text-lg font-black uppercase tracking-wide">{title}</h2>
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
// SKELETON
// ============================================

function HomeSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-9 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-12 rounded-2xl" />
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ============================================
// WELCOME BANNER
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
      <div className="p-4">
        <button
          onClick={() => { localStorage.setItem(WELCOME_KEY, '1'); setVisible(false); }}
          className="absolute top-2 right-2 p-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 active:scale-90 transition-all"
          aria-label="Schließen"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 mb-2">
          <Rocket className="w-5 h-5 text-[#FFD700]" />
          <span className="text-sm font-black text-[#FFD700]">Willkommen, {name}!</span>
        </div>
        <p className="text-xs text-white/50 mb-3">
          Verdiene BSD durch Trading, Fantasy-Turniere und Analysen. Wähle dein erstes Ziel:
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/fantasy">
            <Button variant="gold" size="sm" className="gap-1.5 text-xs">
              <Trophy className="w-3.5 h-3.5" />
              Fantasy spielen
            </Button>
          </Link>
          <Link href="/market?tab=kaufen">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Zap className="w-3.5 h-3.5 text-[#FFD700]" />
              Spieler kaufen
            </Button>
          </Link>
          <Link href="/community">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              Community
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================
// LOGIN STREAK
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
  if (lastDate === today) return current;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newStreak = lastDate === yesterday ? current + 1 : 1;
  localStorage.setItem(STREAK_KEY, JSON.stringify({ current: newStreak, lastDate: today }));
  return newStreak;
}

// ============================================
// TAB CONFIG
// ============================================

type HomeTab = 'mein' | 'aktuell' | 'entdecken';

const HOME_TABS = [
  { id: 'mein' as const, label: 'Mein Stand' },
  { id: 'aktuell' as const, label: 'Aktuell' },
  { id: 'entdecken' as const, label: 'Entdecken' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function HomePage() {
  const { user, profile, loading } = useUser();
  const { balanceCents } = useWallet();
  const { addToast } = useToast();
  const name = profile?.display_name || displayName(user);
  const firstName = name.split(' ')[0];

  const [activeTab, setActiveTab] = useState<HomeTab>('mein');
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
  const [streak, setStreak] = useState(0);
  const [dpcOfWeek, setDpcOfWeek] = useState<DpcOfTheWeek | null>(null);
  const [scoutMissions, setScoutMissions] = useState<ScoutMission[]>([]);
  const [missionProgress, setMissionProgress] = useState<UserScoutMission[]>([]);
  const [followingFeed, setFollowingFeed] = useState<FeedItem[]>([]);

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
          getDpcOfTheWeek(),
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
        const dpcWeek = val(results[10], null);

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
        setDpcOfWeek(dpcWeek);

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

    // Following Feed (fire-and-forget, non-critical)
    getFollowingFeed(uid, 15).then(feed => {
      if (!cancelled) setFollowingFeed(feed);
    }).catch(err => console.error('[Home] Following feed failed:', err));

    import('@/lib/services/missions').then(({ trackMissionProgress }) => {
      trackMissionProgress(uid, 'daily_login');
    }).catch(err => console.error('[Home] Mission tracking failed:', err));

    // Load scout missions (fire-and-forget, non-critical)
    Promise.allSettled([getScoutMissions()]).then(([missionsRes]) => {
      if (cancelled) return;
      const missions = val(missionsRes, []);
      setScoutMissions(missions);
      // Determine current GW from events (use max gameweek)
      getEvents().then(evts => {
        if (cancelled) return;
        const maxGw = evts.reduce((mx, e) => Math.max(mx, e.gameweek || 0), 0);
        if (maxGw > 0) {
          getUserMissionProgress(uid, maxGw).then(progress => {
            if (!cancelled) setMissionProgress(progress);
          }).catch(err => console.error('[Home] Mission progress load failed:', err));
        }
      }).catch(err => console.error('[Home] Events load for missions failed:', err));
    });

    setStreak(updateLoginStreak());

    import('@/lib/services/streaks').then(({ recordLoginStreak }) => {
      recordLoginStreak(uid).then(result => {
        if (cancelled) return;
        setStreak(result.current_streak);
        localStorage.setItem(STREAK_KEY, JSON.stringify({ current: result.current_streak, lastDate: new Date().toISOString().slice(0, 10) }));
        if (result.rewards_given && result.rewards_given.length > 0) {
          result.rewards_given.forEach(r => {
            addToast(`Streak-Bonus: ${r.milestone} Tage! +${Math.round(r.reward_cents / 100)} BSD`, 'success');
          });
        }
      }).catch(err => console.error('[Home] Login streak record failed:', err));
    }).catch(err => console.error('[Home] Streaks module load failed:', err));

    return () => { cancelled = true; };
  }, [user, retryCount]);

  // ── Derived data ──
  const portfolioValue = useMemo(() => holdings.reduce((s, h) => s + h.qty * h.floor, 0), [holdings]);
  const portfolioCost = useMemo(() => holdings.reduce((s, h) => s + h.qty * h.avgBuy, 0), [holdings]);
  const pnl = portfolioValue - portfolioCost;
  const pnlPct = portfolioCost > 0 ? (pnl / portfolioCost) * 100 : 0;
  const totalDpcs = useMemo(() => holdings.reduce((s, h) => s + h.qty, 0), [holdings]);

  const sortedByChange = useMemo(() => [...players].sort((a, b) => b.prices.change24h - a.prices.change24h), [players]);
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

  const activeIPOs = useMemo(() => players.filter((p) => p.ipo.status === 'open' || p.ipo.status === 'early_access'), [players]);

  const bargains = useMemo(() => {
    if (players.length === 0) return [];
    return players
      .filter(p => p.perf.l5 > 0 && (p.prices.floor ?? 0) > 0)
      .map(p => {
        const floor = centsToBsd(p.prices.floor ?? 0);
        const valueRatio = p.perf.l5 / floor;
        return { player: p, floor, valueRatio };
      })
      .sort((a, b) => b.valueRatio - a.valueRatio)
      .slice(0, 5);
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
      <div className="max-w-[1200px] mx-auto py-12">
        <ErrorState onRetry={() => { setDataLoading(true); setDataError(false); setRetryCount(c => c + 1); }} />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-4 md:space-y-6">

      {/* ━━━ GREETING + STREAK ━━━ */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-white/40 tracking-wide">{getGreeting()},</div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight" suppressHydrationWarning>
            {loading ? '...' : firstName}
            <span className="text-[#FFD700]">.</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {userStats?.tier && <TierBadge tier={userStats.tier} size="md" />}
          {streak >= 2 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-400/20 anim-fade">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-black text-orange-300">{streak}</span>
              <span className="text-[10px] text-orange-400/60 hidden sm:inline">Tage</span>
            </div>
          )}
        </div>
      </div>

      {/* ━━━ WELCOME BANNER ━━━ */}
      <WelcomeBanner name={firstName} />

      {/* ━━━ STAT CARDS — 2x2 mobile, 4-col desktop ━━━ */}
      <div data-tour-id="home-stats" className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2 md:gap-3">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 md:p-4 hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] text-white/50 uppercase tracking-wider">Spielerkader</span>
            <InfoTooltip text="Der Gesamtwert aller DPCs in deinem Kader, berechnet zum aktuellen Floor-Preis." />
          </div>
          <div className="font-mono font-black text-base md:text-xl text-white truncate">{fmtBSD(portfolioValue)}</div>
          <div className="text-[10px] text-white/40">{holdings.length} Spieler · {totalDpcs} DPC</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 md:p-4 hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] text-white/50 uppercase tracking-wider">P&L</span>
            <InfoTooltip text="Profit & Loss — die Differenz zwischen aktuellem Wert und deinem durchschnittlichen Kaufpreis." />
          </div>
          <div className={cn('font-mono font-black text-base md:text-xl truncate', pnl >= 0 ? 'text-[#22C55E]' : 'text-red-400')}>
            {pnl >= 0 ? '+' : ''}{fmtBSD(pnl)}
          </div>
          <div className={cn('text-[10px]', pnl >= 0 ? 'text-[#22C55E]/60' : 'text-red-400/60')}>
            {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
          </div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 md:p-4 hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] text-white/50 uppercase tracking-wider">Guthaben</span>
            <InfoTooltip text="Dein verfügbares BSD-Guthaben zum Kaufen, Handeln und Abstimmen." />
          </div>
          {balanceCents === null ? (
            <div className="h-6 md:h-7 w-20 rounded bg-[#FFD700]/10 animate-pulse mt-1" />
          ) : (
            <div className="font-mono font-black text-base md:text-xl text-[#FFD700] truncate">{fmtBSD(centsToBsd(balanceCents))}</div>
          )}
          <div className="text-[10px] text-white/40">BSD</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 md:p-4 hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] text-white/50 uppercase tracking-wider">Scout Score</span>
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

      {/* ━━━ TAB BAR ━━━ */}
      <div data-tour-id="home-tabs">
        <TabBar tabs={HOME_TABS} activeTab={activeTab} onChange={(id) => setActiveTab(id as HomeTab)} />
      </div>

      {/* ━━━ TAB: MEIN STAND ━━━ */}
      <TabPanel id="mein" activeTab={activeTab}>
        <div className="space-y-5">
          {/* Holdings Top 5 */}
          <div>
            <SectionHeader title="Mein Spielerkader" href="/market" />
            <div className="mt-3 space-y-1.5">
              {holdings.length === 0 ? (
                <Card className="p-6 text-center">
                  <Briefcase className="w-10 h-10 mx-auto mb-2 text-white/20" />
                  <div className="text-sm font-medium text-white/50">Starte mit deinem ersten Spieler</div>
                  <div className="text-xs text-white/30 mt-1">Kaufe DPCs, handle am Markt und baue dein Portfolio auf.</div>
                  <Link href="/market?tab=kaufen" className="inline-block mt-3">
                    <Button variant="gold" size="sm" className="gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      Ersten Spieler kaufen
                    </Button>
                  </Link>
                </Card>
              ) : (
                holdings.slice(0, 5).map((h) => (
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
                ))
              )}
              {holdings.length > 5 && (
                <Link href="/market" className="block text-center py-2 text-xs text-[#FFD700] hover:underline">
                  Alle {holdings.length} Spieler anzeigen
                </Link>
              )}
            </div>
          </div>

          {/* Aktivität */}
          <div>
            <SectionHeader title="Aktivität" />
            <div className="mt-3 space-y-0.5">
              {transactions.length === 0 ? (
                <Card className="p-6 text-center">
                  <Activity className="w-6 h-6 mx-auto mb-2 text-white/15" />
                  <div className="text-sm text-white/40">Noch keine Aktivität</div>
                </Card>
              ) : (
                transactions.slice(0, 5).map((tx) => {
                  const positive = tx.amount > 0;
                  return (
                    <div key={tx.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors">
                      <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mt-0.5', getActivityColorLocal(tx.type))}>
                        {renderActivityIcon(tx.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-snug">{getActivityLabel(tx)}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn('text-xs font-mono font-bold', positive ? 'text-[#22C55E]' : 'text-white/40')}>
                            {positive ? '+' : ''}{formatBsd(tx.amount)} BSD
                          </span>
                          <span className="text-[10px] text-white/25">· {getRelativeTime(tx.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {transactions.length > 5 && (
                <Link href="/profile" className="block text-center py-2 text-xs text-[#FFD700] hover:underline">
                  Alle Aktivitäten anzeigen
                </Link>
              )}
            </div>
          </div>

          {/* Following Feed */}
          <div>
            <SectionHeader title="Was deine Scouts machen" badge={followingFeed.length > 0 ?
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/25">
                <Users className="w-3 h-3 text-sky-400" />
                <span className="text-[10px] font-bold text-sky-300">{followingFeed.length}</span>
              </span> : undefined
            } />
            {followingFeed.length > 0 ? (
              <div className="mt-3 space-y-0.5">
                {followingFeed.slice(0, 8).map(item => {
                  const feedIcon = FEED_ICON_MAP[item.action] ?? { Icon: Activity, color: 'text-white/50 bg-white/5' };
                  const FIcon = feedIcon.Icon;
                  const label = FEED_ACTION_LABELS[item.action] ?? item.action;
                  const displayName = item.displayName ?? item.handle;
                  return (
                    <Link key={item.id} href={`/profile/${item.handle}`} className="block">
                      <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors">
                        <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mt-0.5', feedIcon.color)}>
                          <FIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm leading-snug">
                            <span className="font-bold text-white/80">{displayName}</span>
                            <span className="text-white/40 ml-1">{label}</span>
                          </div>
                          <div className="text-[10px] text-white/25 mt-0.5">{getRelativeTime(item.createdAt)}</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                <Users className="w-6 h-6 text-white/20 mx-auto mb-2" />
                <div className="text-xs text-white/40">Folge Scouts um ihre Aktivitäten zu sehen</div>
                <Link href="/community" className="text-xs text-[#FFD700]/70 hover:text-[#FFD700] mt-1 inline-block">
                  Community entdecken →
                </Link>
              </div>
            )}
          </div>

          {/* DPC der Woche */}
          {dpcOfWeek && (
            <div>
              <SectionHeader title="DPC der Woche" badge={
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/25">
                  <Trophy className="w-3 h-3 text-[#FFD700]" />
                  <span className="text-[10px] font-bold text-[#FFD700]">GW {dpcOfWeek.gameweek}</span>
                </span>
              } />
              <Link href={`/player/${dpcOfWeek.playerId}`} className="block mt-3">
                <div className="relative overflow-hidden rounded-2xl border border-[#FFD700]/30 bg-gradient-to-br from-[#FFD700]/10 via-[#FFD700]/5 to-transparent">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="p-4 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-[#FFD700]/20 border border-[#FFD700]/30 flex items-center justify-center">
                      <Star className="w-7 h-7 text-[#FFD700]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#FFD700] mb-0.5">Bester Spieler</div>
                      <div className="font-black text-lg truncate">{dpcOfWeek.playerFirstName} {dpcOfWeek.playerLastName}</div>
                      <div className="text-xs text-white/50">{dpcOfWeek.playerClub} • {dpcOfWeek.holderCount} Besitzer</div>
                      <div className="text-[10px] text-[#FFD700]/50 flex items-center gap-1 mt-0.5">
                        <MessageCircle className="w-3 h-3" />
                        Was sagen die Scouts?
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-mono font-black text-[#FFD700]">{dpcOfWeek.score}</div>
                      <div className="text-[10px] text-white/40">Punkte</div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Missionen */}
          <MissionBanner />

          {/* Scout Missions */}
          {scoutMissions.length > 0 && (
            <div>
              <SectionHeader
                title="Scout Aufträge"
                badge={
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/25">
                    <span className="text-[10px] font-bold text-sky-300">{scoutMissions.length} aktiv</span>
                  </span>
                }
              />
              <div className="mt-3 space-y-3">
                {scoutMissions.slice(0, 3).map(m => (
                  <ScoutMissionCard
                    key={m.id}
                    mission={m}
                    progress={missionProgress.find(p => p.missionId === m.id)}
                    userTier={getFanTier(userStats?.total_score ?? 0)}
                    onSubmit={() => addToast('Spieler-Einreichung kommt bald!', 'info')}
                    onClaim={() => addToast('Belohnung wird abgeholt...', 'info')}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </TabPanel>

      {/* ━━━ TAB: AKTUELL ━━━ */}
      <TabPanel id="aktuell" activeTab={activeTab}>
        <div className="space-y-5">

          {/* Nächstes Event */}
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
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Trophy className="w-4 h-4 text-purple-400" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">{nextEvent.format}</span>
                        </div>
                        <h3 className="text-base md:text-lg font-black">{nextEvent.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {nextEvent.current_entries}/{nextEvent.max_entries ?? '∞'}
                          </span>
                          <span>Eintritt: {nextEvent.entry_fee === 0 ? 'Gratis' : `${fmtBSD(centsToBsd(nextEvent.entry_fee))} BSD`}</span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3.5 h-3.5" />
                            Diskussion
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-white/40 mb-0.5">Preisgeld</div>
                        <div className="text-xl md:text-2xl font-black font-mono text-[#FFD700]">
                          {formatPrize(centsToBsd(nextEvent.prize_pool))}
                        </div>
                        <div className="text-[10px] text-white/40">BSD</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* IPO Banner */}
          {activeIPOs.length > 0 && (
            <Link href={`/player/${activeIPOs[0].id}`} className="block">
              <div className="relative overflow-hidden rounded-2xl border border-[#22C55E]/20 bg-gradient-to-r from-[#22C55E]/[0.08] via-transparent to-[#FFD700]/[0.04]">
                <div className="relative flex items-center justify-between p-4 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-[#22C55E]/15 border border-[#22C55E]/25 shrink-0">
                      <Rocket className="w-5 h-5 text-[#22C55E]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#22C55E]">Live IPO</span>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]" />
                        </span>
                      </div>
                      <div className="font-black text-sm truncate">
                        {activeIPOs.map((p) => `${p.first} ${p.last}`).join(', ')}
                      </div>
                      <div className="text-xs text-white/50 truncate">
                        {activeIPOs[0].club} · {activeIPOs[0].ipo.progress}% verkauft
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono font-black text-[#FFD700] text-lg">{activeIPOs[0].ipo.price}</div>
                    <div className="text-[10px] text-white/40">BSD/DPC</div>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Live Trades */}
          {recentTrades.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ArrowRightLeft className="w-3.5 h-3.5 text-[#FFD700]/60" />
                <span className="text-[10px] font-black uppercase tracking-wider text-white/30">Letzte Trades</span>
              </div>
              <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
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
                      <div className="text-[9px] text-white/25 flex items-center gap-1">{t.quantity}x · {t.isP2P ? 'P2P' : 'IPO'} <MessageCircle className="w-2.5 h-2.5 text-white/15" /></div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Marktbewegungen */}
          <div>
            <SectionHeader title="Marktbewegungen" href="/market" />
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Neue Angebote */}
          {recentListings.length > 0 && (
            <div>
              <SectionHeader title="Neue Angebote" href="/market" />
              <div className="mt-3 space-y-2">
                {recentListings.slice(0, 4).map(({ order, player }) => (
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
                ))}
              </div>
            </div>
          )}
        </div>
      </TabPanel>

      {/* ━━━ TAB: ENTDECKEN ━━━ */}
      <TabPanel id="entdecken" activeTab={activeTab}>
        <div className="space-y-5">

          {/* Unter Wert / Bargains */}
          {bargains.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-3.5 h-3.5 text-[#22C55E]/60" />
                <span className="text-[10px] font-black uppercase tracking-wider text-white/30">Unter Wert</span>
                <span className="text-[9px] text-white/20 ml-auto">Hohe Leistung, günstiger Preis</span>
              </div>
              <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
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

          {/* Community Highlights */}
          {communityPosts.length > 0 && (
            <div>
              <SectionHeader title="Community" href="/community" />
              <div className="mt-3 space-y-2">
                {communityPosts.slice(0, 3).map(post => (
                  <Link key={post.id} href={`/profile/${post.author_handle}`} className="block">
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
                <Link href="/community" className="block mt-3 text-center">
                  <div className="py-2.5 px-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-[#FFD700]/20 transition-all text-xs font-bold text-[#FFD700]/70 hover:text-[#FFD700] flex items-center justify-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5" />
                    Alle Beiträge anzeigen
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Top Scouts */}
          {topScouts.length > 0 && (
            <div>
              <SectionHeader title="Top Scouts" href="/community" />
              <div className="mt-3 space-y-1.5">
                {topScouts.slice(0, 5).map((s, i) => {
                  const isMe = s.userId === user?.id;
                  return (
                    <Link key={s.userId} href={`/profile/${s.handle}`} className={cn(
                      'flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/[0.04] transition-colors',
                      isMe && 'bg-[#FFD700]/[0.06] border border-[#FFD700]/15'
                    )}>
                      <span className={cn(
                        'w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black',
                        i === 0 ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-white/5 text-white/50'
                      )}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold truncate">{s.displayName || s.handle}</span>
                          {(() => {
                            const best = [
                              { label: 'Trader', score: s.tradingScore, cls: 'text-sky-300 bg-sky-500/15 border-sky-500/20' },
                              { label: 'Manager', score: s.managerScore, cls: 'text-purple-300 bg-purple-500/15 border-purple-500/20' },
                              { label: 'Scout', score: s.scoutScore, cls: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/20' },
                            ].reduce((a, b) => a.score >= b.score ? a : b);
                            if (best.score < 100) return null;
                            return (
                              <span className={cn('px-1 py-0.5 rounded text-[8px] font-bold border', best.cls)}>
                                {best.label}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      <span className="text-xs font-mono text-[#FFD700]">{s.totalScore}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Trader */}
          {topTraders.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-[#22C55E]" />
                  <span className="text-base md:text-lg font-black uppercase tracking-wide">Top Trader</span>
                </div>
                <span className="text-[10px] text-white/20">7 Tage</span>
              </div>
              <div className="space-y-1.5">
                {topTraders.map((t, i) => {
                  const isMe = t.userId === user?.id;
                  return (
                    <Link key={t.userId} href={`/profile/${t.handle}`} className={cn(
                      'flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/[0.04] transition-colors',
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
            </div>
          )}

          {/* Airdrop Score */}
          {user && <AirdropScoreCard userId={user.id} compact />}

          {/* Referral */}
          {user && <ReferralCard userId={user.id} />}
        </div>
      </TabPanel>
    </div>
  );
}
