'use client';

import React, { useState, useEffect, useMemo, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft, Star, Share2, Bell, TrendingUp, TrendingDown,
  Users, MoreVertical, ShoppingCart, Send, XCircle, ArrowLeftRight,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { StatusBadge } from '@/components/player';
import { posTintColors } from '@/components/player/PlayerRow';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { getClub } from '@/lib/clubs';
import type { Player, DbIpo } from '@/types';
import type { MatchTimelineEntry } from '@/lib/services/scoring';
import TradingCardFrame from './TradingCardFrame';
import CountryFlag from '@/components/ui/CountryFlag';
import type { CardBackData } from './TradingCardFrame';


interface PlayerHeroProps {
  player: Player;
  isIPO: boolean;
  activeIpo: DbIpo | null;
  holderCount: number;
  isWatchlisted: boolean;
  priceAlert: { target: number; dir: 'above' | 'below' } | null;
  onToggleWatchlist: () => void;
  onShare: () => void;
  onBuyClick: () => void;
  onSellClick: () => void;
  onSetPriceAlert: (target: number) => void;
  onRemovePriceAlert: () => void;
  holdingQty: number;
  masteryLevel?: number;
  matchTimeline?: MatchTimelineEntry[];
}

function PlayerHeroInner({
  player, isIPO, activeIpo, holderCount,
  isWatchlisted, priceAlert,
  onToggleWatchlist, onShare, onBuyClick, onSellClick,
  onSetPriceAlert, onRemovePriceAlert, holdingQty, masteryLevel,
  matchTimeline,
}: PlayerHeroProps) {
  const t = useTranslations('player');
  const [showOverflow, setShowOverflow] = useState(false);
  const [showAlertInput, setShowAlertInput] = useState(false);
  const [alertInput, setAlertInput] = useState(priceAlert?.target.toString() ?? '');

  // Escape key closes overflow menu
  useEffect(() => {
    if (!showOverflow) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowOverflow(false); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showOverflow]);

  const floor = player.prices.floor ?? player.prices.referencePrice ?? 0;
  const change24h = player.prices.change24h ?? 0;
  const up = change24h >= 0;
  const clubData = player.club ? getClub(player.club) : null;
  const tint = posTintColors[player.pos];

  // Edition badge text
  const owned = player.dpc.circulation;
  const supply = player.dpc.supply;
  const edition = supply > 0 ? `${owned}/${supply} SC` : undefined;

  // Assemble card back data
  const backData = useMemo((): CardBackData | undefined => {
    return {
      marketValueEur: player.marketValue,
      floorPrice: player.prices.floor,
      priceChange24h: player.prices.change24h,
      successFeeCap: player.successFeeCap,
      holdingQty,
      supplyTotal: supply,
      contractMonths: player.contractMonthsLeft,
      l15: player.perf.l15,
      stats: {
        goals: player.stats.goals,
        assists: player.stats.assists,
        matches: player.stats.matches,
      },
      matchTimeline,
    };
  }, [player, holdingQty, supply, matchTimeline]);

  return (
    <div
      className="rounded-2xl border overflow-hidden bg-[#0d0d0d]"
      style={{ borderColor: `${tint}33` }}
    >
      {/* Top bar: Back + Actions */}
      <div className="flex items-center justify-between px-4 pt-4 md:px-6 md:pt-5">
        <Link href="/market">
          <Button variant="outline" size="sm"><ArrowLeft className="size-4" /></Button>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleWatchlist}
            className={cn('p-2 rounded-xl transition-colors active:scale-[0.97] min-h-[44px] min-w-[44px] flex items-center justify-center',
              isWatchlisted ? 'text-gold bg-gold/10' : 'text-white/30 hover:text-white/60 hover:bg-white/5'
            )}
            aria-label={t('hero.watchlist')}
          >
            <Star className="size-4" fill={isWatchlisted ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={onShare}
            className="p-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors active:scale-[0.97] min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={t('hero.share')}
          >
            <Share2 className="size-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowOverflow(v => !v)}
              className="p-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors active:scale-[0.97] min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={t('hero.moreOptions')}
            >
              <MoreVertical className="size-4" />
            </button>
            {showOverflow && (
              <>
                <div className="fixed inset-0 z-30" role="button" tabIndex={-1} aria-label="Close menu" onClick={() => setShowOverflow(false)} onKeyDown={(e) => { if (e.key === 'Escape') setShowOverflow(false); }} />
                <div className="absolute right-0 top-full mt-1 z-40 bg-surface-popover/90 backdrop-blur-sm border border-white/[0.12] rounded-xl shadow-card-md overflow-hidden min-w-[180px]">
                  <button
                    onClick={() => { onToggleWatchlist(); setShowOverflow(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors min-h-[44px]"
                  >
                    <Star className="size-4" fill={isWatchlisted ? 'currentColor' : 'none'} />
                    {isWatchlisted ? t('hero.removeWatchlist') : t('hero.addWatchlist')}
                  </button>
                  <button
                    onClick={() => { onShare(); setShowOverflow(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors min-h-[44px]"
                  >
                    <Share2 className="size-4" /> {t('hero.share')}
                  </button>
                  <button
                    onClick={() => { setShowAlertInput(true); setShowOverflow(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors min-h-[44px]"
                  >
                    <Bell className="size-4" /> {t('hero.priceAlert')}
                  </button>
                  <Link
                    href={`/compare?p1=${player.id}`}
                    onClick={() => setShowOverflow(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors min-h-[44px]"
                    role="menuitem"
                    aria-label={`${t('hero.compare')} ${player.first} ${player.last}`}
                  >
                    <ArrowLeftRight className="size-4" /> {t('hero.compare')}
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Card + Info */}
      <div className="px-4 pb-5 pt-4 md:px-6 md:pb-6 md:pt-5">
        <div className="flex flex-col items-center md:flex-row md:items-start gap-5 md:gap-8">
          {/* Trading Card Frame */}
          <div className="shrink-0">
            <TradingCardFrame
              first={player.first}
              last={player.last}
              pos={player.pos}
              club={player.club}
              shirtNumber={player.ticket}
              imageUrl={player.imageUrl}
              l5={player.perf.l5}
              l5Apps={player.perf.l5Apps}
              l15Apps={player.perf.l15Apps}
              edition={edition}
              age={player.age}
              country={player.country}
              backData={backData}
              masteryLevel={masteryLevel}
            />
          </div>

          {/* Info Column (desktop: beside card, mobile: below card) */}
          <div className="flex-1 min-w-0 flex flex-col items-center md:items-start text-center md:text-left">
            {/* Name */}
            <h1 className="text-xl md:text-3xl font-black truncate max-w-full">
              {player.first} {player.last}
            </h1>

            {/* Club · Flag · Position · Age */}
            <div className="flex items-center gap-2 text-xs md:text-sm text-white/60 mt-1 flex-wrap justify-center md:justify-start">
              {clubData?.logo && (
                <Image src={clubData.logo} alt={clubData.name} width={16} height={16} className="size-4 rounded-full object-cover" />
              )}
              <span>{player.club}</span>
              {player.country && <CountryFlag code={player.country} size={12} />}
              <span className="text-white/20">&middot;</span>
              <span>{player.pos}</span>
              {player.age != null && player.age > 0 && (
                <>
                  <span className="text-white/20">&middot;</span>
                  <span>{player.age} {t('hero.years')}</span>
                </>
              )}
            </div>

            {/* Status Badges Row */}
            <div className="flex items-center gap-1.5 mt-2 justify-center md:justify-start flex-wrap">
              <StatusBadge status={player.status} />
              {isIPO && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <div className="size-2 rounded-full bg-green-500 live-ring" />
                  <span className="text-xs font-bold text-green-500">{t('hero.ipo')}</span>
                </div>
              )}
              {holderCount > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 bg-sky-500/10 border border-sky-500/20 rounded-lg text-xs text-sky-300">
                  <Users className="size-3" aria-hidden="true" />
                  {t('hero.scoutsCount', { count: holderCount })}
                </span>
              )}
              {holdingQty > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-lg text-xs font-bold text-green-500">
                  {t('hero.yourDpc', { count: holdingQty })}
                </span>
              )}
            </div>

            {/* Price Strip */}
            <div className="mt-4 pt-4 border-t border-white/[0.06] w-full">
              <div className="flex items-end gap-2 justify-center md:justify-start">
                <span className="text-xl md:text-3xl font-mono font-black tabular-nums text-gold">
                  {isIPO && activeIpo ? fmtScout(centsToBsd(activeIpo.price)) : fmtScout(floor)}
                </span>
                <span className="text-white/40 mb-0.5">Credits</span>
                {!isIPO && change24h !== 0 && (
                  <span className={cn('flex items-center gap-0.5 mb-0.5 font-mono font-bold tabular-nums text-sm px-1.5 py-0.5 rounded-md',
                    up ? 'text-green-500 bg-green-500/10' : 'text-red-300 bg-red-500/10'
                  )}>
                    {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                    {up ? '+' : ''}{change24h.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="text-[10px] text-white/30 font-medium mt-0.5 text-center md:text-left">
                {isIPO ? t('hero.clubSaleFixed') : t('hero.floorCheapest')}
              </div>
            </div>

            {/* CTA Buttons (desktop only — mobile has sticky bar) */}
            {!player.isLiquidated && (
              <div className="hidden md:flex gap-2 mt-4 w-full">
                <Button variant="gold" className="text-sm font-bold px-6" onClick={onBuyClick}>
                  <ShoppingCart className="size-4" /> {t('hero.buy')}
                </Button>
                {holdingQty > 0 && (
                  <Button variant="outline" className="text-sm font-bold px-6" onClick={onSellClick}>
                    <Send className="size-4" /> {t('hero.sell')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Price Alert (inline, triggered from overflow menu) */}
        {!isIPO && (priceAlert || showAlertInput) && (
          <div className="mt-4">
            {priceAlert ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-gold/5 border border-gold/20 rounded-xl">
                <Bell className="size-3.5 text-gold" />
                <span className="text-xs text-gold/70">
                  Alert: {priceAlert.dir === 'below' ? '\u2264' : '\u2265'} {fmtScout(priceAlert.target)} CR
                </span>
                <button onClick={() => { onRemovePriceAlert(); setShowAlertInput(false); }} className="ml-auto text-white/30 hover:text-white/60" aria-label={t('hero.removeAlert')}>
                  <XCircle className="size-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Bell className="size-3 text-white/30" />
                <input
                  type="number" inputMode="numeric" step="0.01" placeholder={t('hero.targetPrice')}
                  value={alertInput}
                  onChange={(e) => setAlertInput(e.target.value)}
                  className="w-24 px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-base font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-gold/30"
                  autoFocus
                />
                <button
                  onClick={() => {
                    const target = parseFloat(alertInput);
                    if (target > 0) { onSetPriceAlert(target); setShowAlertInput(false); }
                  }}
                  disabled={!alertInput}
                  className="px-2 py-1 bg-gold/10 border border-gold/20 rounded-lg text-[10px] font-bold text-gold hover:bg-gold/20 disabled:opacity-30 transition-colors min-h-[44px]"
                >
                  {t('hero.alertBtn')}
                </button>
                <button
                  onClick={() => setShowAlertInput(false)}
                  className="text-white/30 hover:text-white/60 min-h-[44px] flex items-center"
                  aria-label={t('hero.close')}
                >
                  <XCircle className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(PlayerHeroInner);
