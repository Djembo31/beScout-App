'use client';

import Link from 'next/link';
import { Rocket, Trophy, TrendingUp, Zap, Clock, Users } from 'lucide-react';
import { Card } from '@/components/ui';
import { PlayerPhoto, PositionBadge, MiniSparkline } from '@/components/player';
import { posTintColors } from '@/components/player/PlayerRow';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { useTranslations } from 'next-intl';
import { getTimeUntil, formatPrize } from './helpers';
import type { Player, DbEvent, Pos, DpcHolding } from '@/types';
import type { TrendingPlayer } from '@/lib/services/trading';

interface HomeSpotlightProps {
  activeIPOs: Player[];
  nextEvent: DbEvent | null;
  holdings: DpcHolding[];
  trendingPlayers: TrendingPlayer[];
  players: Player[];
}

export default function HomeSpotlight({ activeIPOs, nextEvent, holdings, trendingPlayers, players }: HomeSpotlightProps) {
  const t = useTranslations('home');

  // Priority 1: Live IPO
  if (activeIPOs.length > 0) {
    const ipo = activeIPOs[0];
    const posColor = posTintColors[ipo.pos];
    return (
      <Link href={`/player/${ipo.id}`} className="block">
        <Card surface="hero" className="p-4 relative overflow-hidden shadow-glow-live">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `linear-gradient(135deg, ${posColor}40, transparent 60%)` }} />
          <div className="absolute -top-12 -right-12 size-32 rounded-full blur-3xl opacity-30" style={{ background: posColor }} />
          <div className="relative flex items-center gap-3">
            <div className="relative">
              <PlayerPhoto imageUrl={ipo.imageUrl} first={ipo.first} last={ipo.last} pos={ipo.pos} size={48} />
              <span className="absolute -bottom-1 -right-1 flex size-3 live-ring">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex rounded-full size-3 bg-green-500" style={{ boxShadow: '0 0 8px rgba(34,197,94,0.6)' }} />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-black uppercase text-green-500">{t('spotlightIpo')}</span>
                <PositionBadge pos={ipo.pos} size="sm" />
              </div>
              <div className="font-black text-sm truncate">{ipo.first} {ipo.last}</div>
              <div className="text-[11px] text-white/40">{ipo.club}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono font-black text-lg gold-glow">
                {ipo.ipo.price}
              </div>
              <div className="text-[11px] text-white/40">CR/SC</div>
            </div>
          </div>
          {ipo.ipo.progress !== undefined && (
            <div className="relative mt-3">
              <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden border border-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-500 to-gold transition-all duration-500"
                  style={{ width: `${Math.min(ipo.ipo.progress, 100)}%`, boxShadow: '0 0 8px rgba(34,197,94,0.3)' }}
                />
              </div>
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-mono font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {ipo.ipo.progress.toFixed(0)}% {t('sold')}
              </span>
            </div>
          )}
        </Card>
      </Link>
    );
  }

  // Priority 2: Active Fantasy Event
  if (nextEvent) {
    return (
      <Link href="/fantasy" className="block">
        <Card surface="hero" className="p-4 relative overflow-hidden shadow-[0_0_24px_rgba(168,85,247,0.15)]">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-purple-500/8 to-transparent" />
          <div className="absolute -top-12 -right-12 size-32 rounded-full bg-purple-500 blur-3xl opacity-20" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="size-4 text-purple-400" />
                  <span className="text-[11px] font-black uppercase text-purple-400">{t('spotlightEvent')}</span>
                </div>
                <h3 className="text-base font-black truncate">{nextEvent.name}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" />
                    {nextEvent.current_entries}/{nextEvent.max_entries ?? '\u221E'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {nextEvent.status === 'running' ? getTimeUntil(nextEvent.ends_at) : getTimeUntil(nextEvent.starts_at)}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[11px] text-white/40 mb-0.5">{t('prizeMoney')}</div>
                <div className="text-xl font-black font-mono tabular-nums text-gold gold-glow">
                  {formatPrize(centsToBsd(nextEvent.prize_pool))}
                </div>
                <div className="text-[11px] text-white/40">Credits</div>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  // Priority 3: Top Mover from portfolio
  if (holdings.length > 0) {
    const best = [...holdings].sort((a, b) => b.change24h - a.change24h)[0];
    if (best && best.change24h !== 0) {
      const posColor = posTintColors[best.pos];
      const matchedPlayer = players.find(p => p.id === best.playerId);
      const history = matchedPlayer?.prices.history7d;
      return (
        <Link href={`/player/${best.playerId}`} className="block">
          <Card surface="hero" className="p-4 relative overflow-hidden" style={{ borderLeftColor: posColor, borderLeftWidth: 2 }}>
            <div className="absolute inset-0 opacity-15" style={{ backgroundImage: `linear-gradient(135deg, ${posColor}40, transparent 60%)` }} />
            <div className="relative flex items-center gap-3">
              <PlayerPhoto imageUrl={best.imageUrl} first={best.player.split(' ')[0]} last={best.player.split(' ').slice(1).join(' ')} pos={best.pos} size={44} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <TrendingUp className="size-3 text-gold" />
                  <span className="text-[11px] font-black uppercase text-gold">{t('spotlightTopMover')}</span>
                </div>
                <div className="font-black text-sm truncate">{best.player}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <PositionBadge pos={best.pos} size="sm" />
                  <span className="text-[11px] text-white/40">{best.qty} SC</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={cn('font-mono font-black text-lg', best.change24h >= 0 ? 'text-vivid-green' : 'text-vivid-red')}>
                  {best.change24h >= 0 ? '+' : ''}{best.change24h.toFixed(1)}%
                </div>
                {history && history.length >= 2 && (
                  <MiniSparkline values={history} width={60} height={20} />
                )}
              </div>
            </div>
          </Card>
        </Link>
      );
    }
  }

  // Priority 4: Trending Player
  if (trendingPlayers.length > 0) {
    const tp = trendingPlayers[0];
    const posColor = posTintColors[tp.position];
    const matchedPlayer = players.find(p => p.id === tp.playerId);
    return (
      <Link href={matchedPlayer ? `/player/${matchedPlayer.id}` : '/market'} className="block">
        <Card surface="hero" className="p-4 relative overflow-hidden" style={{ borderLeftColor: posColor, borderLeftWidth: 2 }}>
          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: `linear-gradient(135deg, ${posColor}40, transparent 60%)` }} />
          <div className="relative flex items-center gap-3">
            {matchedPlayer && (
              <PlayerPhoto imageUrl={matchedPlayer.imageUrl} first={matchedPlayer.first} last={matchedPlayer.last} pos={matchedPlayer.pos} size={44} />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-black uppercase text-white/60">{t('spotlightTrending')}</span>
                <PositionBadge pos={tp.position} size="sm" />
              </div>
              <div className="font-black text-sm truncate">{tp.firstName} {tp.lastName}</div>
              <div className="text-[11px] text-white/40">{tp.club} · {tp.tradeCount}x Trades</div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono font-black text-gold" style={{ textShadow: '0 0 10px rgba(255,215,0,0.4)' }}>
                {fmtScout(tp.floorPrice)}
              </div>
              <span className={cn('text-[11px] font-mono font-bold', tp.change24h >= 0 ? 'text-vivid-green' : 'text-vivid-red')}>
                {tp.change24h >= 0 ? '+' : ''}{tp.change24h.toFixed(1)}%
              </span>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  // Priority 5: Fallback CTA for new users
  return (
    <Link href="/market?tab=kaufen" className="block">
      <Card surface="hero" className="p-4 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-gold/[0.12] via-gold/[0.04] to-transparent" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="size-4 text-gold" />
              <span className="text-[11px] font-black uppercase text-gold">{t('spotlightCta')}</span>
            </div>
            <div className="font-black text-sm">{t('emptyPortfolioDesc')}</div>
          </div>
          <Rocket className="size-8 text-gold/30 group-hover:text-gold/60 transition-colors" />
        </div>
      </Card>
    </Link>
  );
}
