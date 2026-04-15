import React from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  CircleDollarSign,
  Trophy,
  Award,
  Users,
  Zap,
  FileText,
  Vote,
  Activity,
  Target,
  Flame,
  Banknote,
  MessageCircle,
  Send,
  ArrowRightLeft,
  UserPlus,
} from 'lucide-react';
import { getActivityIcon as actIconName, getActivityColor as actColor } from '@/lib/activityHelpers';

// ── Greeting ──

export function getGreetingKey(): string {
  const h = new Date().getHours();
  if (h < 6) return 'greetingNight';
  if (h < 12) return 'greetingMorning';
  if (h < 18) return 'greetingAfternoon';
  return 'greetingEvening';
}

// ── Section Header ──

export function SectionHeader({ title, href, badge }: { title: string; href?: string; badge?: React.ReactNode }) {
  const content = (
    <div className="flex items-center justify-between">
      <div className="section-accent flex items-center gap-2.5">
        <h2 className="text-xs md:text-sm font-bold uppercase tracking-[0.15em] text-white/50">{title}</h2>
        {badge}
      </div>
      {href && <ChevronRight className="w-4 h-4 text-white/20" />}
    </div>
  );
  if (href) {
    return <Link href={href} className="block hover:opacity-80 transition-opacity">{content}</Link>;
  }
  return content;
}

// ── Formatting ──

export function formatPrize(bsd: number): string {
  return bsd >= 1000 ? `${(bsd / 1000).toFixed(0)}K` : String(bsd);
}

export function getTimeUntil(dateStr: string | null): string {
  if (!dateStr) return '—';
  const ms = Math.max(0, new Date(dateStr).getTime() - Date.now());
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  return `${hours}h ${mins}m`;
}

// ── Activity Icons ──

const ICON_MAP: Record<string, React.ElementType> = { CircleDollarSign, Trophy, Award, Users, Zap, FileText, Vote, Activity, Target, Flame, Banknote };

export function renderActivityIcon(type: string) {
  const Icon = ICON_MAP[actIconName(type)] ?? Activity;
  return <Icon className="w-4 h-4" />;
}

export function getActivityColorLocal(type: string): string { return actColor(type); }

// ── Feed Icons ──

export const FEED_ICON_MAP: Record<string, { Icon: React.ElementType; color: string }> = {
  trade_buy: { Icon: CircleDollarSign, color: 'text-gold bg-gold/10' },
  trade_sell: { Icon: CircleDollarSign, color: 'text-green-500 bg-green-500/10' },
  research_create: { Icon: FileText, color: 'text-purple-400 bg-purple-400/10' },
  post_create: { Icon: MessageCircle, color: 'text-sky-400 bg-sky-400/10' },
  lineup_submit: { Icon: Trophy, color: 'text-purple-400 bg-purple-400/10' },
  follow: { Icon: UserPlus, color: 'text-green-500 bg-green-500/10' },
  bounty_submit: { Icon: Target, color: 'text-amber-400 bg-amber-400/10' },
  bounty_create: { Icon: Target, color: 'text-amber-400 bg-amber-400/10' },
  offer_create: { Icon: Send, color: 'text-amber-400 bg-amber-400/10' },
  offer_accept: { Icon: ArrowRightLeft, color: 'text-green-500 bg-green-500/10' },
  poll_create: { Icon: Vote, color: 'text-amber-400 bg-amber-400/10' },
  vote_create: { Icon: Vote, color: 'text-amber-400 bg-amber-400/10' },
};

// ── Story Message (contextual greeting subtext) ──

export type StoryMessage = { key: string; params: Record<string, string> };

export function getStoryMessage(
  holdings: { player: string; change24h: number }[],
  pnl: number,
  pnlPct: number,
  activeIPOs: { first: string; last: string; ipo: { progress?: number } }[],
  nextEvent: { starts_at: string; status: string } | null,
): StoryMessage | null {
  // Priority 1: Live IPO
  if (activeIPOs.length > 0) {
    const ipo = activeIPOs[0];
    return {
      key: 'storyLiveIpo',
      params: { player: `${ipo.first} ${ipo.last}`, progress: String(ipo.ipo.progress ?? 0) },
    };
  }

  // Priority 2: Event starting soon (within 6h)
  if (nextEvent && (nextEvent.status === 'registering' || nextEvent.status === 'late-reg')) {
    const ms = new Date(nextEvent.starts_at).getTime() - Date.now();
    if (ms > 0 && ms < 6 * 3600000) {
      const hours = Math.floor(ms / 3600000);
      const mins = Math.floor((ms % 3600000) / 60000);
      return { key: 'storyEventSoon', params: { time: `${hours}h ${mins}m` } };
    }
  }

  // Priority 3: Portfolio change
  if (holdings.length > 0 && Math.abs(pnlPct) >= 0.1) {
    const best = [...holdings].sort((a, b) => b.change24h - a.change24h)[0];
    if (pnlPct > 0) {
      const base: StoryMessage = { key: 'storyPnlUp', params: { pct: Math.abs(pnlPct).toFixed(1) } };
      if (best && best.change24h > 0) {
        return { key: 'storyPnlUp', params: { ...base.params, player: best.player, change: best.change24h.toFixed(1) } };
      }
      return base;
    }
    return { key: 'storyPnlDown', params: { pct: Math.abs(pnlPct).toFixed(1) } };
  }

  // Priority 4: No holdings
  if (holdings.length === 0) {
    return { key: 'storyNoHoldings', params: {} };
  }

  return null;
}

// ── Login Streak (localStorage Mirror — NICHT Source-of-truth!) ──
//
// HYBRID-PATTERN (J7F-01 Reviewer-Rework):
// `STREAK_KEY` ist nur ein localStorage-Cache-Mirror fuer sync-Leser
// (z.B. Server-Render Hydration, frueher Story-Bar Render).
// Source-of-truth ist `useLoginStreak` (src/lib/queries/streaks.ts) ueber RPC
// `record_login_streak` — Server-Authority, idempotent pro UTC-Tag.
// `useHomeData` updated den Mirror nach erfolgreichem RPC-Call.
//
// Die Funktionen `getLoginStreak()` und `updateLoginStreak()` wurden ENTFERNT,
// weil sie `streak=0` ausgaben fuer Deep-Link-User die /missions oder /profile
// VOR /home aufgerufen haben. Wer den Streak braucht: `useLoginStreak` Hook nutzen.

export const STREAK_KEY = 'bescout-login-streak';
