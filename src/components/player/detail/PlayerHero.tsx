'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft, Star, Share2, Bell, TrendingUp, TrendingDown,
  Users, MoreVertical, ShoppingCart, Send, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { StatusBadge } from '@/components/player';
import { posTintColors } from '@/components/player/PlayerRow';
import { fmtBSD } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { getClub } from '@/lib/clubs';
import type { Player, DbIpo } from '@/types';
import PlayerImagePlaceholder from './PlayerImagePlaceholder';

// Position gradient backgrounds
const posGradients: Record<string, string> = {
  GK: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
  DEF: 'from-amber-500/20 via-amber-500/5 to-transparent',
  MID: 'from-sky-500/20 via-sky-500/5 to-transparent',
  ATT: 'from-rose-500/20 via-rose-500/5 to-transparent',
};

// Position glow shadows
const posGlows: Record<string, string> = {
  GK: '0 0 40px rgba(16,185,129,0.08)',
  DEF: '0 0 40px rgba(245,158,11,0.08)',
  MID: '0 0 40px rgba(14,165,233,0.08)',
  ATT: '0 0 40px rgba(244,63,94,0.08)',
};

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
}

export default function PlayerHero({
  player, isIPO, activeIpo, holderCount,
  isWatchlisted, priceAlert,
  onToggleWatchlist, onShare, onBuyClick, onSellClick,
  onSetPriceAlert, onRemovePriceAlert, holdingQty,
}: PlayerHeroProps) {
  const t = useTranslations('player');
  const [showOverflow, setShowOverflow] = useState(false);
  const [showAlertInput, setShowAlertInput] = useState(false);
  const [alertInput, setAlertInput] = useState(priceAlert?.target.toString() ?? '');

  const floor = player.prices.floor ?? 0;
  const change24h = player.prices.change24h ?? 0;
  const up = change24h >= 0;
  const clubData = player.club ? getClub(player.club) : null;
  const gradient = posGradients[player.pos] || posGradients.MID;
  const tint = posTintColors[player.pos];
  const glow = posGlows[player.pos] || posGlows.MID;

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: `${tint}33`, boxShadow: glow }}
    >
      <div className={`bg-gradient-to-br ${gradient} relative`}>
        {/* Top bar: Back + Actions */}
        <div className="flex items-center justify-between px-4 pt-4 md:px-6 md:pt-5">
          <Link href="/market">
            <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleWatchlist}
              className={`p-2 rounded-xl transition-colors ${isWatchlisted ? 'text-[#FFD700] bg-[#FFD700]/10' : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`}
              aria-label="Watchlist"
            >
              <Star className="w-4 h-4" fill={isWatchlisted ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={onShare}
              className="p-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
              aria-label={t('hero.share')}
            >
              <Share2 className="w-4 h-4" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowOverflow(v => !v)}
                className="p-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showOverflow && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowOverflow(false)} />
                  <div className="absolute right-0 top-full mt-1 z-40 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[180px]">
                    <button
                      onClick={() => { onToggleWatchlist(); setShowOverflow(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors"
                    >
                      <Star className="w-4 h-4" fill={isWatchlisted ? 'currentColor' : 'none'} />
                      {isWatchlisted ? t('hero.removeWatchlist') : t('hero.addWatchlist')}
                    </button>
                    <button
                      onClick={() => { onShare(); setShowOverflow(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors"
                    >
                      <Share2 className="w-4 h-4" /> {t('hero.share')}
                    </button>
                    <button
                      onClick={() => { setShowAlertInput(true); setShowOverflow(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors"
                    >
                      <Bell className="w-4 h-4" /> {t('hero.priceAlert')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Player Identity: Single responsive layout */}
        <div className="px-4 pb-5 pt-3 md:px-6 md:pb-6 md:pt-4">
          <div className="flex flex-col items-center text-center md:flex-row md:items-start md:text-left gap-4 md:gap-6">
            {/* Player Image — larger */}
            <div className="shrink-0">
              <PlayerImagePlaceholder
                pos={player.pos}
                shirtNumber={player.ticket}
                club={player.club}
                imageUrl={player.imageUrl}
                className="w-28 h-32 md:w-36 md:h-40"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start">
                <h1 className="text-xl md:text-3xl font-black truncate">{player.first} {player.last}</h1>
              </div>
              <div className="flex items-center gap-2 text-xs md:text-sm text-white/60 mt-1 flex-wrap justify-center md:justify-start">
                {clubData?.logo && (
                  <img src={clubData.logo} alt={clubData.name} className="w-4 h-4 rounded-full object-cover" />
                )}
                <span>{player.club}</span>
                <span className="text-white/20">&middot;</span>
                <span>{player.pos}</span>
                <span className="text-white/20">&middot;</span>
                <span>{player.age} {t('hero.years')}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 justify-center md:justify-start">
                <StatusBadge status={player.status} />
                {isIPO && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-[#22C55E]/20 border border-[#22C55E]/30 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                    <span className="text-xs font-bold text-[#22C55E]">IPO LIVE</span>
                  </div>
                )}
                {holderCount > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-sky-500/10 border border-sky-500/20 rounded-lg text-xs text-sky-300">
                    <Users className="w-3 h-3" />
                    {holderCount} Scouts
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Price Strip — full width */}
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 pt-4 border-t border-white/[0.06]">
            <div className="flex items-end gap-2">
              <span className="text-2xl md:text-4xl font-mono font-black text-[#FFD700]">
                {isIPO && activeIpo ? fmtBSD(centsToBsd(activeIpo.price)) : fmtBSD(floor)}
              </span>
              <span className="text-white/40 mb-0.5 md:mb-1">BSD</span>
              {!isIPO && (
                <span className={`flex items-center gap-0.5 mb-0.5 md:mb-1 font-mono font-bold text-sm ${up ? 'text-[#22C55E]' : 'text-red-300'}`}>
                  {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {up ? '+' : ''}{change24h.toFixed(1)}%
                </span>
              )}
            </div>
            {/* CTA Buttons */}
            {!player.isLiquidated && (
              <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
                <Button variant="gold" className="flex-1 sm:flex-initial text-sm font-bold sm:px-6" onClick={onBuyClick}>
                  <ShoppingCart className="w-4 h-4" /> {t('hero.buy')}
                </Button>
                {holdingQty > 0 && (
                  <Button variant="outline" className="flex-1 sm:flex-initial text-sm font-bold sm:px-6" onClick={onSellClick}>
                    <Send className="w-4 h-4" /> {t('hero.sell')}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Price Alert (inline, triggered from overflow menu) */}
          {!isIPO && (priceAlert || showAlertInput) && (
            <div className="mt-4">
              {priceAlert ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#FFD700]/5 border border-[#FFD700]/20 rounded-xl">
                  <Bell className="w-3.5 h-3.5 text-[#FFD700]" />
                  <span className="text-xs text-[#FFD700]/80">
                    Alert: {priceAlert.dir === 'below' ? '\u2264' : '\u2265'} {fmtBSD(priceAlert.target)} BSD
                  </span>
                  <button onClick={() => { onRemovePriceAlert(); setShowAlertInput(false); }} className="ml-auto text-white/30 hover:text-white/60">
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Bell className="w-3 h-3 text-white/30" />
                  <input
                    type="number" step="0.01" placeholder={t('hero.targetPrice')}
                    value={alertInput}
                    onChange={(e) => setAlertInput(e.target.value)}
                    className="w-20 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-[#FFD700]/30"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      const target = parseFloat(alertInput);
                      if (target > 0) { onSetPriceAlert(target); setShowAlertInput(false); }
                    }}
                    disabled={!alertInput}
                    className="px-2 py-1 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-lg text-[10px] font-bold text-[#FFD700] hover:bg-[#FFD700]/20 disabled:opacity-30 transition-all"
                  >
                    Alert
                  </button>
                  <button
                    onClick={() => setShowAlertInput(false)}
                    className="text-white/30 hover:text-white/60"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
