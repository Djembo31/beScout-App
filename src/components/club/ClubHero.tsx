'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import {
  Trophy, BadgeCheck, Bell, CheckCircle2,
  Loader2, Briefcase, TrendingUp, Users,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { fmtScout, cn } from '@/lib/utils';
import { useCountUp } from '@/hooks/useCountUp';
import { useParallax } from '@/hooks/useParallax';
import { PRESTIGE_CONFIG } from '@/components/club/ClubStatsBar';
import type { ClubWithAdmin } from '@/types';
import type { PrestigeTier } from '@/lib/services/club';

type ClubHeroProps = {
  club: ClubWithAdmin;
  followerCount: number;
  isFollowing: boolean;
  followLoading: boolean;
  onFollow: () => void;
  totalVolume24h: number;
  playerCount: number;
  buyablePlayers?: number;
  isPublic?: boolean;
  loginUrl?: string;
  // For desktop merged stats:
  totalDpcFloat: number;
  avgPerf: number;
  formResults: ('W' | 'D' | 'L')[];
  prestigeTier?: PrestigeTier;
};

export function ClubHero({
  club,
  followerCount,
  isFollowing,
  followLoading,
  onFollow,
  totalVolume24h,
  playerCount,
  buyablePlayers = 0,
  isPublic = false,
  loginUrl = '/login',
  totalDpcFloat,
  avgPerf,
  formResults,
  prestigeTier,
}: ClubHeroProps) {
  const t = useTranslations('club');
  const clubColor = club.primary_color || '#006633';
  const secondaryColor = club.secondary_color || '#333';
  const [stadiumSrc, setStadiumSrc] = useState(`/stadiums/${club.slug}.jpg`);

  const scoutsCount = useCountUp(followerCount, 600);
  const volumeCount = useCountUp(totalVolume24h, 800, 0);
  const playerCountUp = useCountUp(playerCount, 500);
  const { containerRef: parallaxRef, offset: parallaxOffset } = useParallax(0.35);

  return (
    <div
      ref={parallaxRef}
      className="relative min-h-[50vh] md:min-h-[45vh] -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-6 overflow-hidden"
      style={{
        '--club-primary': clubColor,
        '--club-secondary': secondaryColor,
        '--club-glow': `${clubColor}4D`,
      } as React.CSSProperties}
    >
      {/* Stadium Background — parallax image layer (moves slower on scroll) */}
      <div
        className="absolute will-change-transform"
        style={{
          transform: parallaxOffset ? `translateY(${parallaxOffset}px)` : undefined,
          // Extend image beyond container so parallax doesn't reveal gap
          top: '-15%',
          bottom: '-15%',
          left: 0,
          right: 0,
        }}
      >
        <Image
          src={stadiumSrc}
          alt={club.stadium || club.name}
          fill
          className="object-cover"
          priority
          onError={() => setStadiumSrc('/stadiums/default.jpg')}
        />
        {/* Layer 1: Club gradient tint (moves with image) */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${clubColor}59 0%, transparent 50%, ${secondaryColor}40 100%)`,
          }}
        />
      </div>

      {/* Overlay layers — fixed to hero container, NOT parallaxed */}
      {/* Layer 2: Bottom fade for text readability — strengthened gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/70 via-40% to-transparent" />
      {/* Layer 3: Subtle vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)',
        }}
      />

      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-center pb-16 lg:pb-20">
        <div className="text-center space-y-3 md:space-y-5 px-4">
          {/* Club Logo + Name row on mobile, stacked on desktop */}
          <div className="flex items-center justify-center gap-4 md:flex-col md:gap-4">
            <div
              className="relative size-24 md:size-36 bg-white/10 backdrop-blur-sm rounded-full p-2 md:p-3 border-2 border-white/20 flex-shrink-0 motion-safe:animate-[scaleIn_0.3s_ease-out] wappen-glow"
              style={{
                '--club-glow': `${clubColor}4D`,
              } as React.CSSProperties}
            >
              <div className="relative w-full h-full">
                {club.logo_url ? (
                  <Image src={club.logo_url} alt={club.name} fill className="object-contain p-1 md:p-2" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl md:text-4xl font-black text-white/50">
                    {club.short}
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center">
                <h1 className="text-3xl md:text-5xl font-black text-balance text-white drop-shadow-lg">
                  {club.name.toUpperCase()}
                </h1>
                {club.is_verified && <BadgeCheck className="size-6 md:size-10 text-gold" />}
              </div>
              <div className="flex items-center gap-2 text-xs md:text-sm text-white/70 justify-center mt-1">
                <Trophy className="size-3.5 md:size-4" />
                <span>{club.league}</span>
                {club.city && (
                  <>
                    <span className="text-white/30">|</span>
                    <span>{club.city}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats + Follow */}
          <div className="flex items-center justify-center gap-4 md:gap-6">
            <div className="text-center">
              <div className="text-lg md:text-2xl font-black tabular-nums text-white">
                <span ref={scoutsCount.ref}>{scoutsCount.value.toLocaleString()}</span>
              </div>
              <div className="text-[10px] md:text-xs text-white/50">{t('scouts')}</div>
            </div>
            <div className="w-px h-6 md:h-10 bg-white/20" />
            <div className="text-center">
              <div className="text-lg md:text-2xl font-black tabular-nums text-gold">
                <span ref={volumeCount.ref}>{fmtScout(volumeCount.value)}</span>
              </div>
              <div className="text-[10px] md:text-xs text-white/50">{t('volume24h')}</div>
            </div>
            <div className="w-px h-6 md:h-10 bg-white/20" />
            <div className="text-center">
              <div className="text-lg md:text-2xl font-black tabular-nums text-green-500">
                <span ref={playerCountUp.ref}>{playerCountUp.value}</span>
              </div>
              <div className="text-[10px] md:text-xs text-white/50">{t('players')}</div>
            </div>
            {buyablePlayers > 0 && (
              <>
                <div className="w-px h-6 md:h-10 bg-white/20" />
                <div className="text-center">
                  <div className="text-lg md:text-2xl font-black tabular-nums text-gold">{buyablePlayers}</div>
                  <div className="text-[10px] md:text-xs text-white/50">{t('buyable')}</div>
                </div>
              </>
            )}
            <div className="w-px h-6 md:h-10 bg-white/20 hidden md:block" />
            {isPublic ? (
              <Link href={loginUrl} className="hidden md:block">
                <Button size="sm" style={{ backgroundColor: clubColor, color: 'white' }}>{t('publicRegister')}</Button>
              </Link>
            ) : (
              <Button
                size="sm"
                onClick={onFollow}
                disabled={followLoading}
                className={cn('hidden md:flex', isFollowing && 'border border-white/20 bg-transparent hover:bg-white/5')}
                style={isFollowing ? undefined : { backgroundColor: clubColor, color: 'white' }}
                variant={isFollowing ? 'outline' : undefined}
              >
                {followLoading ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                ) : isFollowing ? (
                  <><CheckCircle2 className="size-4" /> {t('subscribed')}</>
                ) : (
                  <><Bell className="size-4" /> {t('follow')}</>
                )}
              </Button>
            )}
          </div>

          {/* Mobile-only follow/register button */}
          <div className="md:hidden flex items-center justify-center gap-2">
            {isPublic ? (
              <Link href={loginUrl}>
                <Button size="sm" style={{ backgroundColor: clubColor, color: 'white' }}>{t('publicRegister')}</Button>
              </Link>
            ) : (
              <Button
                size="sm"
                onClick={onFollow}
                disabled={followLoading}
                className={cn(isFollowing && 'border border-white/20 bg-transparent hover:bg-white/5')}
                style={isFollowing ? undefined : { backgroundColor: clubColor, color: 'white' }}
                variant={isFollowing ? 'outline' : undefined}
              >
                {followLoading ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                ) : isFollowing ? (
                  t('subscribed')
                ) : (
                  t('follow')
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Merged Stats Bar — bottom of hero */}
      <div className="hidden lg:block absolute bottom-0 left-0 right-0">
        <div className="bg-black/40 backdrop-blur-md border-t border-white/10 px-6 py-3">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-6">
            {/* DPC Float */}
            <div className="flex items-center gap-2">
              <Briefcase className="size-4 text-white/40" />
              <div>
                <div className="font-mono font-bold tabular-nums text-sm text-white/80">{totalDpcFloat.toLocaleString()}</div>
                <div className="text-[10px] text-white/40">{t('dpcFloat')}</div>
              </div>
            </div>

            <div className="w-px h-8 bg-white/10" />

            {/* Avg Perf L5 */}
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-white/40" />
              <div>
                <div className="font-mono font-bold tabular-nums text-sm text-white/80">{avgPerf.toFixed(1)}</div>
                <div className="text-[10px] text-white/40">{t('avgPerfL5')}</div>
              </div>
            </div>

            <div className="w-px h-8 bg-white/10" />

            {/* Spieler Count */}
            <div className="flex items-center gap-2">
              <Users className="size-4 text-white/40" />
              <div>
                <div className="font-mono font-bold tabular-nums text-sm text-white/80">{playerCount}</div>
                <div className="text-[10px] text-white/40">{t('players')}</div>
              </div>
            </div>

            <div className="w-px h-8 bg-white/10" />

            {/* Form Streak */}
            {formResults.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {formResults.map((r, i) => (
                      <div
                        key={i}
                        className={cn(
                          'size-6 rounded-full flex items-center justify-center text-[9px] font-black ring-1 ring-white/10',
                          r === 'W' && 'bg-green-500 text-black',
                          r === 'D' && 'bg-yellow-500 text-black',
                          r === 'L' && 'bg-red-500 text-white',
                        )}
                      >
                        {r === 'W' ? 'S' : r === 'D' ? 'U' : 'N'}
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-white/40">Form</div>
                </div>
                <div className="w-px h-8 bg-white/10" />
              </>
            )}

            {/* Prestige */}
            {prestigeTier && (() => {
              const cfg = PRESTIGE_CONFIG[prestigeTier];
              const Icon = cfg.icon;
              return (
                <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg', cfg.bg)}>
                  <Icon className={cn('size-4', cfg.color)} />
                  <div className={cn('text-sm font-bold', cfg.color)}>{t(cfg.labelKey)}</div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
