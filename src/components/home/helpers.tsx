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

// ── Login Streak (localStorage) ──

export const STREAK_KEY = 'bescout-login-streak';

export function getLoginStreak(): { current: number; lastDate: string } {
  if (typeof window === 'undefined') return { current: 0, lastDate: '' };
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { current: 0, lastDate: '' };
    return JSON.parse(raw);
  } catch { return { current: 0, lastDate: '' }; }
}

export function updateLoginStreak(): number {
  const today = new Date().toISOString().slice(0, 10);
  const { current, lastDate } = getLoginStreak();
  if (lastDate === today) return current;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newStreak = lastDate === yesterday ? current + 1 : 1;
  localStorage.setItem(STREAK_KEY, JSON.stringify({ current: newStreak, lastDate: today }));
  return newStreak;
}
