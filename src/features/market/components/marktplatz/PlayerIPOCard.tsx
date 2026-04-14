'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Loader2, Target, TrendingUp, TrendingDown, Minus,
  FileText, Activity, Lock,
} from 'lucide-react';
import {
  PlayerPhoto, PositionBadge, FormBars,
} from '@/components/player';
import { getContractInfo, posTintColors } from '@/components/player/PlayerRow';
import { LeagueBadge } from '@/components/ui/LeagueBadge';
import CountdownBadge from './CountdownBadge';
import { fmtScout, cn, countryToFlag } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { Player, DbIpo, Pos } from '@/types';

import { posCardFrame as posTint } from '@/components/player/positionColors';

const trendIcon: Record<string, React.ReactNode> = {
  UP: <TrendingUp className="size-3 text-emerald-400" aria-hidden="true" />,
  DOWN: <TrendingDown className="size-3 text-red-400" aria-hidden="true" />,
  FLAT: <Minus className="size-3 text-white/30" aria-hidden="true" />,
};


interface PlayerIPOCardProps {
  player: Player;
  ipo: DbIpo;
  onBuy?: (playerId: string) => void;
  buying: boolean;
  recentScores?: (number | null)[];
}

export default function PlayerIPOCard({ player, ipo, onBuy, buying, recentScores }: PlayerIPOCardProps) {
  const t = useTranslations('market');
  const tp = useTranslations('player');

  const priceBsd = useMemo(() => centsToBsd(ipo.price), [ipo.price]);
  const progress = ipo.total_offered > 0 ? (ipo.sold / ipo.total_offered) * 100 : 0;
  const remaining = ipo.total_offered - ipo.sold;
  const tint = posTint[player.pos];
  const flag = player.country ? countryToFlag(player.country) : '';
  const contract = getContractInfo(player.contractMonthsLeft);

  return (
    <Link
      href={`/player/${player.id}`}
      className={cn(
        'block relative rounded-2xl border overflow-hidden transition-colors group',
        'bg-gradient-to-br', tint.bg,
        tint.border,
        'hover:border-white/20 active:scale-[0.98] shadow-card-sm hover:shadow-card-md',
        'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main outline-none',
      )}
      style={{ boxShadow: tint.glow }}
    >
      {/* ── Header: Photo + Identity + L5 Strip ── */}
      <div className="p-3 pb-2">
        <div className="flex items-start gap-3">
          <PlayerPhoto
            imageUrl={player.imageUrl}
            first={player.first}
            last={player.last}
            pos={player.pos}
            size={48}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-black text-sm text-white truncate">
                {player.first} {player.last}
              </span>
              {flag && <span className="text-sm leading-none shrink-0">{flag}</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <PositionBadge pos={player.pos} size="sm" />
              {player.leagueShort && (
                <LeagueBadge
                  logoUrl={player.leagueLogoUrl}
                  name={player.league ?? player.leagueShort}
                  short={player.leagueShort}
                  size="xs"
                />
              )}
              {player.ticket > 0 && (
                <span className="font-mono text-[10px] text-white/30 font-bold">#{player.ticket}</span>
              )}
              {player.age > 0 && (
                <span className="text-[10px] text-white/40">{player.age} J.</span>
              )}
            </div>
          </div>
          {/* Form bars + L5 circle — matches Fantasy/Manager visual language */}
          <div className="shrink-0 flex items-center gap-2">
            <FormBars
              entries={(recentScores ?? []).map(s => ({
                score: s ?? 0,
                status: (s != null ? 'played' : 'not_in_squad') as 'played' | 'not_in_squad',
              }))}
            />
            <div
              className="size-8 rounded-full flex items-center justify-center border-[1.5px]"
              style={{ backgroundColor: `${posTintColors[player.pos]}33`, borderColor: `${posTintColors[player.pos]}99` }}
            >
              <span className="font-mono font-black text-sm tabular-nums text-white/90">
                {Math.round(player.perf.l5)}
              </span>
            </div>
            {trendIcon[player.perf.trend]}
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1 text-white/60">
            <span className="font-black text-white/80 tabular-nums font-mono">{player.stats.goals}</span>
            {tp('goals', { defaultMessage: 'Tore' })}
          </span>
          <span className="flex items-center gap-1 text-white/60">
            <span className="font-black text-white/80 tabular-nums font-mono">{player.stats.assists}</span>
            {tp('assists', { defaultMessage: 'Assists' })}
          </span>
          <span className="flex items-center gap-1 text-white/60">
            <Activity className="size-2.5 text-white/30" aria-hidden="true" />
            <span className="font-bold text-white/80 tabular-nums font-mono">{player.stats.matches}</span>
            {tp('matches', { defaultMessage: 'Spiele' })}
          </span>
        </div>

        {/* Contract + Status chips */}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold',
            contract.urgent
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : contract.monthsLeft <= 12
                ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                : 'bg-surface-subtle border-white/[0.08] text-white/50',
          )}>
            <FileText className="size-2.5" aria-hidden="true" />
            {contract.dateStr}
          </span>
          {player.status !== 'fit' && (
            <span className={cn(
              'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[10px] font-bold',
              player.status === 'injured' && 'bg-red-500/10 border-red-500/20 text-red-300',
              player.status === 'suspended' && 'bg-purple-500/10 border-purple-500/20 text-purple-300',
              player.status === 'doubtful' && 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
            )}>
              {player.status === 'injured' && tp('injured', { defaultMessage: 'Verletzt' })}
              {player.status === 'suspended' && tp('suspended', { defaultMessage: 'Gesperrt' })}
              {player.status === 'doubtful' && tp('doubtful', { defaultMessage: 'Fraglich' })}
            </span>
          )}
          {player.status === 'fit' && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[10px] font-bold bg-green-500/10 border-green-500/20 text-green-400">
              {tp('fit', { defaultMessage: 'Fit' })}
            </span>
          )}
        </div>
      </div>

      {/* Early Access badge */}
      {ipo.status === 'early_access' && (
        <div className="mx-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold">
          <Lock className="size-3" aria-hidden="true" />
          {t('ipoEarlyAccess', { defaultMessage: 'Vorkaufsrecht (Silber+)' })}
        </div>
      )}

      {/* ── Gold Divider ── */}
      <div className="mx-3 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

      {/* ── IPO Section: Price + Progress + Buy ── */}
      <div className="p-3 pt-2.5">
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider block">
              {t('ipoPrice', { defaultMessage: 'IPO-Preis' })}
            </span>
            <span className="font-mono font-black text-lg text-gold tabular-nums leading-tight">
              {fmtScout(priceBsd)}
            </span>
            <span className="text-[10px] text-white/25 ml-1">Credits</span>
          </div>
          {onBuy ? (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBuy(player.id); }}
              disabled={buying}
              aria-label={`${player.first} ${player.last} ${tp('recruitBtn')}`}
              className={cn(
                'py-2 px-4 min-h-[44px] min-w-[44px] rounded-xl text-xs font-black transition-colors',
                'bg-gradient-to-r from-[#FFE44D] to-[#E6B800] text-black',
                'hover:brightness-110 active:scale-[0.95]',
                'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main outline-none',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                'flex items-center gap-1.5 shrink-0',
              )}
            >
              {buying
                ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                : <Target className="size-3.5" aria-hidden="true" />
              }
              {buying ? tp('recruitingBtn') : tp('recruitBtn')}
            </button>
          ) : (
            <span className="text-[10px] text-white/30 font-bold shrink-0">
              {t('readOnly', { defaultMessage: 'Nur Ansicht' })}
            </span>
          )}
        </div>

        {/* Progress bar — prominenter */}
        <div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('ipoProgress', { defaultMessage: 'Verkaufsfortschritt' })}
            className="h-2 bg-white/[0.06] rounded-full overflow-hidden"
          >
            <div
              className={cn(
                'h-full rounded-full transition-colors',
                progress >= 80 ? 'bg-gradient-to-r from-vivid-green to-emerald-300' : 'bg-vivid-green',
              )}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-white/40 tabular-nums font-mono">
              {ipo.sold}/{ipo.total_offered} {t('sold', { defaultMessage: 'verkauft' })}
            </span>
            <span className="text-[10px] text-white/50 tabular-nums font-mono font-bold">
              {t('remainingCount', { count: remaining, defaultMessage: '{count} übrig' })}
            </span>
          </div>
        </div>

        {/* Owned + Countdown */}
        <div className="flex items-center justify-between mt-1.5">
          {player.dpc.owned > 0 ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold bg-gold/10 border-gold/20 text-gold tabular-nums font-mono">
              {player.dpc.owned} SC
            </span>
          ) : (
            <span />
          )}
          <CountdownBadge targetDate={ipo.ends_at} />
        </div>
      </div>
    </Link>
  );
}
