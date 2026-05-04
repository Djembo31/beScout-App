'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Sparkles, TrendingUp, Trophy } from 'lucide-react';
import { Card } from '@/components/ui';
import { PlayerPhoto, PositionBadge, MiniSparkline } from '@/components/player';
import { posTintColors } from '@/components/player/PlayerRow';
import { fmtScout, cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { Player, DpcHolding } from '@/types';
import type { TrendingPlayer } from '@/lib/services/trading';

// ============================================================
// Slice 266 (D63 Phase 3) — Multi-Slot Spotlight.
//
// Single-prio if-else cascade → Slot-Render-Engine. Max 2 Slots stacked.
// Slot-Priority (höchste prio first):
//   1. liveScore   (isEventLive)              — Time-sensitive, GW-Pulse
//   2. mysteryBox  (hasFreeBoxToday)          — Daily-Driver-Discovery
//   3. ipo         (activeIPOs.length > 0)    — limited-time
//   4. topMover    (best holdings change24h)  — portfolio-Signal
//   5. trending    (trendingPlayers.length)   — Discovery
//
// Mobile-393px-Above-Fold-Constraint: max 2 visible (Pre-Review F-09).
// ============================================================

export type SpotlightSlotType = 'liveScore' | 'mysteryBox' | 'ipo' | 'topMover' | 'trending';

interface HomeSpotlightProps {
  slots: { primary: SpotlightSlotType | null; secondary: SpotlightSlotType | null };
  activeIPOs: Player[];
  holdings: DpcHolding[];
  trendingPlayers: TrendingPlayer[];
  players: Player[];
  /** Slot-spezifische Sub-Payload (Pre-Review F-07 reduzierte Prop-Surface). */
  liveScoreData?: { gameweek: number };
  /** Slot-spezifische Sub-Payload — onOpen ist callback um Modal-Mount in page.tsx zu triggern. */
  mysteryBoxData?: { onOpen: () => void };
}

function HomeSpotlightInner({
  slots,
  activeIPOs,
  holdings,
  trendingPlayers,
  players,
  liveScoreData,
  mysteryBoxData,
}: HomeSpotlightProps) {
  const t = useTranslations('home');

  if (!slots.primary) return null;

  const primaryCard = renderSlot(slots.primary);
  const secondaryCard = slots.secondary ? renderSlot(slots.secondary) : null;

  if (!secondaryCard) {
    return primaryCard;
  }

  return (
    <div className="space-y-3">
      {primaryCard}
      {secondaryCard}
    </div>
  );

  function renderSlot(type: SpotlightSlotType) {
    switch (type) {
      case 'liveScore':
        return renderLiveScoreSlot();
      case 'mysteryBox':
        return renderMysteryBoxSlot();
      case 'ipo':
        return renderIpoSlot();
      case 'topMover':
        return renderTopMoverSlot();
      case 'trending':
        return renderTrendingSlot();
    }
  }

  function renderLiveScoreSlot() {
    const gw = liveScoreData?.gameweek ?? 1;
    return (
      <Link href="/fantasy/spieltag" className="block" key="slot-liveScore">
        <Card surface="hero" className="p-4 relative overflow-hidden shadow-glow-live card-entrance">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(135deg, rgba(34,197,94,0.4), transparent 60%)' }} />
          <div className="absolute -top-12 -right-12 size-32 rounded-full blur-3xl opacity-30" style={{ background: 'rgb(34,197,94)' }} />
          <div className="relative flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="size-12 rounded-full bg-green-500/15 flex items-center justify-center border border-green-500/40">
                <Trophy className="size-6 text-green-400" aria-hidden="true" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex size-3 live-ring">
                <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex rounded-full size-3 bg-green-500" style={{ boxShadow: '0 0 8px rgba(34,197,94,0.6)' }} />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-black uppercase tracking-wider text-green-400 mb-0.5">LIVE</div>
              <div className="font-black text-sm">{t('spotlightLiveScore', { gw })}</div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] font-black text-green-400 underline-offset-2 hover:underline">
                {t('spotlightLiveScoreCta')}
              </span>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  function renderMysteryBoxSlot() {
    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      mysteryBoxData?.onOpen();
    };
    return (
      <button
        type="button"
        onClick={handleClick}
        className="block w-full text-left"
        key="slot-mysteryBox"
        aria-label={t('spotlightMysteryBoxCta')}
      >
        <Card surface="hero" className="p-4 relative overflow-hidden shadow-card-elevated card-entrance">
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'linear-gradient(135deg, rgba(255,215,0,0.4), transparent 60%)' }} />
          <div className="absolute -top-12 -right-12 size-32 rounded-full blur-3xl opacity-30 bg-gold" />
          <div className="relative flex items-center gap-3">
            <div className="size-12 rounded-full bg-gold/15 flex items-center justify-center border border-gold/40 shrink-0">
              <Sparkles className="size-6 text-gold" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-black uppercase tracking-wider text-gold mb-0.5">DAILY</div>
              <div className="font-black text-sm">{t('spotlightMysteryBox')}</div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] font-black text-gold underline-offset-2 hover:underline">
                {t('spotlightMysteryBoxCta')}
              </span>
            </div>
          </div>
        </Card>
      </button>
    );
  }

  function renderIpoSlot() {
    if (activeIPOs.length === 0) return null;
    const ipo = activeIPOs[0];
    const posColor = posTintColors[ipo.pos];
    return (
      <Link href={`/player/${ipo.id}`} className="block" key="slot-ipo">
        <Card surface="hero" className="p-4 relative overflow-hidden shadow-glow-live card-entrance">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `linear-gradient(135deg, ${posColor}40, transparent 60%)` }} />
          <div className="absolute -top-12 -right-12 size-32 rounded-full blur-3xl opacity-30" style={{ background: posColor }} />
          <div className="relative flex items-center gap-3">
            <div className="relative">
              <PlayerPhoto imageUrl={ipo.imageUrl} first={ipo.first} last={ipo.last} pos={ipo.pos} size={48} />
              <span className="absolute -bottom-1 -right-1 flex size-3 live-ring">
                <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex rounded-full size-3 bg-green-500" style={{ boxShadow: '0 0 8px rgba(34,197,94,0.6)' }} />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase text-green-500">{t('spotlightIpo')}</span>
                <PositionBadge pos={ipo.pos} size="sm" />
              </div>
              <div className="font-black text-sm truncate">{ipo.first} {ipo.last}</div>
              <div className="text-[10px] text-white/40">{ipo.club}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono font-black text-lg gold-glow">
                {ipo.ipo.price}
              </div>
              <div className="text-[10px] text-white/40">CR/SC</div>
            </div>
          </div>
          {ipo.ipo.progress !== undefined && (
            <div className="relative mt-3">
              <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden border border-divider">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-500 to-gold transition-colors duration-500"
                  style={{ width: `${Math.min(ipo.ipo.progress, 100)}%`, boxShadow: '0 0 8px rgba(34,197,94,0.3)' }}
                />
              </div>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {ipo.ipo.progress.toFixed(0)}% {t('sold')}
              </span>
            </div>
          )}
        </Card>
      </Link>
    );
  }

  function renderTopMoverSlot() {
    if (holdings.length === 0) return null;
    const best = [...holdings].sort((a, b) => b.change24h - a.change24h)[0];
    if (!best || best.change24h === 0) return null;
    const posColor = posTintColors[best.pos];
    const matchedPlayer = players.find(p => p.id === best.playerId);
    const history = matchedPlayer?.prices.history7d;
    return (
      <Link href={`/player/${best.playerId}`} className="block" key="slot-topMover">
        <Card surface="hero" className="p-4 relative overflow-hidden shadow-card-elevated card-entrance" style={{ borderLeftColor: posColor, borderLeftWidth: 2 }}>
          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: `linear-gradient(135deg, ${posColor}40, transparent 60%)` }} />
          <div className="relative flex items-center gap-3">
            <PlayerPhoto imageUrl={best.imageUrl} first={best.player.split(' ')[0]} last={best.player.split(' ').slice(1).join(' ')} pos={best.pos} size={44} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <TrendingUp className="size-3 text-gold" />
                <span className="text-[10px] font-black uppercase text-gold">{t('spotlightTopMover')}</span>
              </div>
              <div className="font-black text-sm truncate">{best.player}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <PositionBadge pos={best.pos} size="sm" />
                <span className="text-[10px] text-white/40">{best.qty} SC</span>
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

  function renderTrendingSlot() {
    if (trendingPlayers.length === 0) return null;
    const tp = trendingPlayers[0];
    const posColor = posTintColors[tp.position];
    const matchedPlayer = players.find(p => p.id === tp.playerId);
    return (
      <Link href={matchedPlayer ? `/player/${matchedPlayer.id}` : '/market'} className="block" key="slot-trending">
        <Card surface="hero" className="p-4 relative overflow-hidden shadow-card-elevated card-entrance" style={{ borderLeftColor: posColor, borderLeftWidth: 2 }}>
          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: `linear-gradient(135deg, ${posColor}40, transparent 60%)` }} />
          <div className="relative flex items-center gap-3">
            {matchedPlayer && (
              <PlayerPhoto imageUrl={matchedPlayer.imageUrl} first={matchedPlayer.first} last={matchedPlayer.last} pos={matchedPlayer.pos} size={44} />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase text-white/60">{t('spotlightTrending')}</span>
                <PositionBadge pos={tp.position} size="sm" />
              </div>
              <div className="font-black text-sm truncate">{tp.firstName} {tp.lastName}</div>
              <div className="text-[10px] text-white/40">{tp.club} · {tp.tradeCount}x Trades</div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono font-black text-gold" style={{ textShadow: '0 0 10px rgba(255,215,0,0.4)' }}>
                {fmtScout(tp.floorPrice)}
              </div>
              <span className={cn('text-[10px] font-mono font-bold', tp.change24h >= 0 ? 'text-vivid-green' : 'text-vivid-red')}>
                {tp.change24h >= 0 ? '+' : ''}{tp.change24h.toFixed(1)}%
              </span>
            </div>
          </div>
        </Card>
      </Link>
    );
  }
}

export default memo(HomeSpotlightInner);
