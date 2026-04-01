'use client';

import React, { useMemo } from 'react';
import { Sparkles, Building2, Gift, UserPlus, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { EventType, FantasyEvent } from '../types';

type CategoryConfig = {
  type: EventType;
  icon: typeof Sparkles;
  /** Main gradient */
  bg: string;
  /** Accent glow — top left */
  glow1: string;
  /** Secondary glow — bottom right */
  glow2: string;
  /** Icon + title accent */
  accent: string;
  /** Shimmer gradient color */
  shimmer: string;
  /** Optional background image path */
  image?: string;
  /** Optional badge/logo for top-right corner (e.g. league logo) */
  badge?: string;
  logoDark?: boolean;
};

const CATEGORIES: CategoryConfig[] = [
  {
    type: 'bescout',
    icon: Sparkles,
    bg: 'linear-gradient(145deg, #92400e 0%, #78350f 25%, #451a03 60%, #1c0a00 100%)',
    glow1: 'radial-gradient(ellipse at 20% 10%, rgba(251,191,36,0.35) 0%, transparent 55%)',
    glow2: 'radial-gradient(ellipse at 80% 90%, rgba(180,83,9,0.3) 0%, transparent 50%)',
    accent: 'text-amber-300',
    shimmer: 'rgba(251,191,36,0.08)',
    image: '/stadiums/bescout_event_card.png',
  },
  {
    type: 'club',
    icon: Building2,
    bg: 'linear-gradient(145deg, #065f46 0%, #064e3b 25%, #022c22 60%, #001a10 100%)',
    glow1: 'radial-gradient(ellipse at 20% 10%, rgba(52,211,153,0.3) 0%, transparent 55%)',
    glow2: 'radial-gradient(ellipse at 80% 90%, rgba(4,120,87,0.3) 0%, transparent 50%)',
    accent: 'text-emerald-300',
    shimmer: 'rgba(52,211,153,0.08)',
    image: '/stadiums/club_event_card.png',
    badge: '/stadiums/tff1.png',
  },
  {
    type: 'sponsor',
    icon: Gift,
    bg: 'linear-gradient(145deg, #0369a1 0%, #0c4a6e 25%, #082f49 60%, #001524 100%)',
    glow1: 'radial-gradient(ellipse at 20% 10%, rgba(56,189,248,0.3) 0%, transparent 55%)',
    glow2: 'radial-gradient(ellipse at 80% 90%, rgba(2,132,199,0.3) 0%, transparent 50%)',
    accent: 'text-sky-300',
    shimmer: 'rgba(56,189,248,0.08)',
  },
  {
    type: 'creator',
    icon: UserPlus,
    bg: 'linear-gradient(145deg, #c2410c 0%, #9a3412 25%, #431407 60%, #1a0800 100%)',
    glow1: 'radial-gradient(ellipse at 20% 10%, rgba(251,146,60,0.35) 0%, transparent 55%)',
    glow2: 'radial-gradient(ellipse at 80% 90%, rgba(194,65,12,0.3) 0%, transparent 50%)',
    accent: 'text-orange-300',
    shimmer: 'rgba(251,146,60,0.08)',
  },
  {
    type: 'special',
    icon: Star,
    bg: 'linear-gradient(145deg, #7c3aed 0%, #6d28d9 25%, #2e1065 60%, #120630 100%)',
    glow1: 'radial-gradient(ellipse at 20% 10%, rgba(167,139,250,0.35) 0%, transparent 55%)',
    glow2: 'radial-gradient(ellipse at 80% 90%, rgba(124,58,237,0.3) 0%, transparent 50%)',
    accent: 'text-violet-300',
    shimmer: 'rgba(167,139,250,0.08)',
  },
];

// Inline SVG noise texture as data URI (grain/film effect)
const NOISE_URI = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`;

type Props = {
  events: FantasyEvent[];
  selected: EventType | null;
  onSelect: (type: EventType | null) => void;
};

export function EventCategoryCards({ events, selected, onSelect }: Props) {
  const t = useTranslations('fantasy');

  const counts = useMemo(() => {
    const map: Record<EventType, { open: number; live: number }> = {
      bescout: { open: 0, live: 0 },
      club: { open: 0, live: 0 },
      sponsor: { open: 0, live: 0 },
      creator: { open: 0, live: 0 },
      special: { open: 0, live: 0 },
    };
    for (const e of events) {
      if (e.type in map) {
        if (e.status !== 'ended') map[e.type].open++;
        if (e.status === 'running' || e.status === 'late-reg') map[e.type].live++;
      }
    }
    return map;
  }, [events]);

  return (
    <section>
      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const { open, live } = counts[cat.type];
          const isActive = selected === cat.type;

          return (
            <button
              key={cat.type}
              onClick={() => onSelect(isActive ? null : cat.type)}
              className={cn(
                'group flex-shrink-0 relative w-[220px] sm:w-[260px] aspect-[16/10] snap-start rounded-2xl',
                'border overflow-hidden transition-colors duration-300',
                'flex flex-col justify-end p-4 text-left',
                'active:scale-[0.97]',
                isActive
                  ? 'ring-2 ring-gold border-gold/40 scale-[1.02]'
                  : 'border-white/[0.12] hover:border-white/25 hover:scale-[1.01]'
              )}
              style={{
                background: cat.image ? undefined : cat.bg,
                boxShadow: isActive
                  ? 'inset 0 1px 0 rgba(255,255,255,0.12), 0 0 24px rgba(255,215,0,0.2), 0 4px 16px rgba(0,0,0,0.4)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 16px rgba(0,0,0,0.3)',
              }}
            >
              {/* Background image (if provided) */}
              {cat.image && (
                <>
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `url(${cat.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  {/* Dark gradient overlay for text readability */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.15) 100%)',
                    }}
                  />
                </>
              )}

              {/* Glow layer 1 — top-left accent */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: cat.glow1 }}
              />

              {/* Glow layer 2 — bottom-right depth */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: cat.glow2 }}
              />

              {/* Noise/grain texture overlay */}
              <div
                className="absolute inset-0 pointer-events-none opacity-60"
                style={{ backgroundImage: NOISE_URI, backgroundSize: '128px 128px' }}
              />

              {/* Top shine edge */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

              {/* Shimmer sweep on hover */}
              <div
                className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: `linear-gradient(105deg, transparent 40%, ${cat.shimmer} 50%, transparent 60%)`,
                }}
              />

              {/* Badge: league logo top-center, BeScout logo top-center, or subtle watermark */}
              {cat.badge ? (
                <img
                  src={cat.badge}
                  alt=""
                  aria-hidden="true"
                  className="absolute top-2 left-1/2 -translate-x-1/2 h-14 sm:h-16 pointer-events-none select-none drop-shadow-lg"
                  style={{ mixBlendMode: 'lighten' }}
                />
              ) : cat.image ? (
                <img
                  src="/icons/bescout_logo_premium.svg"
                  alt=""
                  aria-hidden="true"
                  className="absolute top-3 left-1/2 -translate-x-1/2 h-6 opacity-[0.7] pointer-events-none select-none drop-shadow-lg"
                />
              ) : (
                <img
                  src={cat.logoDark ? '/icons/bescout_icon_premium_black.svg' : '/icons/bescout_icon_premium.svg'}
                  alt=""
                  aria-hidden="true"
                  className="absolute -bottom-3 -right-3 size-32 opacity-[0.05] -rotate-12 pointer-events-none select-none"
                />
              )}

              {/* Category name */}
              <div className="relative font-black text-base uppercase tracking-wider text-white drop-shadow-md">
                {t(`eventCategories.${cat.type}`)}
              </div>

              {/* Event count + live badge */}
              <div className="relative flex items-center gap-2 mt-1">
                <span className="text-xs text-white/60 font-medium">
                  {t('categoryCardCount', { count: open })}
                </span>
                {live > 0 && (
                  <span className="flex items-center gap-1 text-xs text-green-400 font-bold">
                    <span className="size-1.5 rounded-full bg-green-400 animate-pulse motion-reduce:animate-none" />
                    {live} LIVE
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
