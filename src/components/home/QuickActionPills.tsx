'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ShoppingCart,
  Swords,
  Target,
  Package,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Slice 213 (Brand 1 P3): Extracted aus src/app/(app)/page.tsx Inline-Map-Block.
 * Self-Contained: useTranslations('home') intern, keine Props nötig.
 * Visual-Behavior 1:1 zu pre-Refactor Inline-Definition.
 *
 * Items, Reihenfolge, Colors, Glows sind intentional und sollen NICHT geändert werden
 * ohne explizites Anil-Go (Brand-Coherence — User kennt diese Pills von Home-Page).
 */
type QuickAction = {
  href: string;
  icon: LucideIcon;
  labelKey: 'qaBuy' | 'qaFantasy' | 'qaMissions' | 'qaInventory' | 'qaCommunity';
  color: string;
  bg: string;
  glow: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    href: '/market?tab=kaufen',
    icon: ShoppingCart,
    labelKey: 'qaBuy',
    color: 'text-gold',
    bg: 'bg-gold/10 border-gold/20',
    glow: 'rgba(255,215,0,0.25)',
  },
  {
    href: '/fantasy',
    icon: Swords,
    labelKey: 'qaFantasy',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-400/20',
    glow: 'rgba(168,85,247,0.25)',
  },
  {
    href: '/missions',
    icon: Target,
    labelKey: 'qaMissions',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-400/20',
    glow: 'rgba(245,158,11,0.25)',
  },
  {
    href: '/inventory',
    icon: Package,
    labelKey: 'qaInventory',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-400/20',
    glow: 'rgba(52,211,153,0.25)',
  },
  {
    href: '/community',
    icon: MessageSquare,
    labelKey: 'qaCommunity',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10 border-sky-400/20',
    glow: 'rgba(14,165,233,0.25)',
  },
];

export default function QuickActionPills() {
  const t = useTranslations('home');

  return (
    <nav
      aria-label={t('quickActions')}
      className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mt-3"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {QUICK_ACTIONS.map(({ href, icon: Icon, labelKey, color, bg, glow }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl border shrink-0 shadow-card-sm',
            'hover:scale-[1.03] active:scale-[0.97] transition-all',
            bg,
          )}
        >
          <Icon className={cn('size-5', color)} style={{ filter: `drop-shadow(0 0 6px ${glow})` }} />
          <span className="text-[10px] font-bold text-white/60">{t(labelKey)}</span>
        </Link>
      ))}
    </nav>
  );
}
