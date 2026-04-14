'use client';

import React from 'react';
import { Plus, Edit3, Lock, Eye, Play, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, EventTypeBadge } from '@/components/ui';
import { LeagueBadge } from '@/components/ui/LeagueBadge';
import { cn } from '@/lib/utils';
import type { FantasyEvent } from '../types';
import { getTypeStyle, getTierStyle, formatEventCost } from '../helpers';
import { FillBar } from './FillBar';
import { UrgencyTimer } from './UrgencyTimer';
import { RequirementChips } from './RequirementChips';

type Props = {
  event: FantasyEvent;
  onClick: () => void;
};

export function EventCardView({ event, onClick }: Props) {
  const t = useTranslations('fantasy');
  const typeStyle = getTypeStyle(event.type);
  const TypeIcon = typeStyle.icon;
  const tierStyle = getTierStyle(event.eventTier);
  const isArena = event.eventTier === 'arena';

  // Use role="button" instead of a real <button> here because Row 7 renders
  // a native <Button> CTA for the primary action, and nested <button>
  // elements are invalid HTML (React throws a hydration warning). The inner
  // Button stays keyboard-reachable via Tab; the outer zone gives mouse
  // users a full-card click target with the same onClick handler.
  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKey}
      className={cn(
        'w-full text-left rounded-2xl p-4 border transition-colors active:scale-[0.98] cursor-pointer',
        'bg-surface-minimal shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
        event.isJoined
          ? 'border-green-500/20 bg-green-500/[0.02]'
          : isArena
            ? 'border-amber-500/20'
            : 'border-white/10 hover:border-white/20'
      )}
    >
      {/* Row 1: Type + Tier + Timer */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {event.type === 'club' && event.clubLogo ? (
            <img src={event.clubLogo} alt="" className="size-7 rounded-lg object-contain" />
          ) : event.type === 'bescout' ? (
            <img src="/icons/bescout_icon_premium.svg" alt="" className="size-7 rounded-lg object-contain" />
          ) : (
            <div className={cn('size-7 rounded-lg flex items-center justify-center', typeStyle.bg)}>
              <TypeIcon className={cn('size-3.5', typeStyle.color)} aria-hidden="true" />
            </div>
          )}
          {isArena && (
            <span className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-bold border',
              tierStyle.bg, tierStyle.border, tierStyle.color
            )}>
              <tierStyle.icon className="size-3" aria-hidden="true" />
              Arena
            </span>
          )}
          {event.isLigaEvent && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-gold/15 border border-gold/25 text-gold">
              Liga
            </span>
          )}
          {event.isJoined && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/15">
              <CheckCircle2 className="size-3 text-green-500" aria-hidden="true" />
              <span className="text-xs font-bold text-green-500">{t('eventJoined')}</span>
            </div>
          )}
        </div>
        <UrgencyTimer lockTime={event.lockTime} status={event.status} />
      </div>

      {/* Row 2: Name */}
      <h3 className="font-black text-sm line-clamp-2 mb-1">{event.name}</h3>

      {/* Row 3: Meta */}
      <div className="flex items-center gap-1.5 text-xs text-white/40 mb-2 flex-wrap">
        <EventTypeBadge type={event.type} clubName={event.clubName} clubLogo={event.clubLogo} sponsorName={event.sponsorName} size="sm" />
        {event.leagueShort && (
          <LeagueBadge
            logoUrl={event.leagueLogoUrl}
            name={event.leagueName ?? event.leagueShort}
            short={event.leagueShort}
            size="xs"
          />
        )}
        <span>{event.format}</span>
        <span className="text-white/15">·</span>
        <span>{event.mode === 'league' ? t('modeLeague') : t('modeTournament')}</span>
      </div>

      {/* Row 4: Requirement Chips + Ticket Cost */}
      <div className="flex items-center gap-2 mb-3">
        <RequirementChips event={event} variant="chips" max={3} />
        {(event.ticketCost ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-[10px] font-bold text-amber-400/80">
            <span aria-hidden="true">🎟</span> {t('ticketCost', { cost: event.ticketCost })}
          </span>
        )}
      </div>

      {/* Row 5: Stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 bg-surface-subtle rounded-lg">
          <div className={cn('font-mono font-bold text-sm tabular-nums', (event.ticketCost ?? 0) === 0 ? 'text-green-500' : 'text-gold')}>
            {formatEventCost(event, t('freeEntry'))}
          </div>
          <div className="text-xs text-white/40">{t('entryLabel')}</div>
        </div>
        <div className="text-center p-2 bg-surface-subtle rounded-lg">
          <div className="font-mono font-bold text-sm text-purple-400 tabular-nums">
            {event.prizePool >= 1000 ? `${(event.prizePool / 1000).toFixed(0)}K` : event.prizePool}
          </div>
          <div className="text-xs text-white/40">{t('prizeLabel')}</div>
        </div>
        <div className="text-center p-2 bg-surface-subtle rounded-lg">
          <div className="font-mono font-bold text-sm tabular-nums">{event.participants}</div>
          <div className="text-xs text-white/40">{t('playersCountLabel')}</div>
        </div>
      </div>

      {/* Row 6: Fill bar */}
      <div className="mb-3">
        <FillBar current={event.participants} max={event.maxParticipants} variant="card" />
      </div>

      {/* Row 7: CTA */}
      <div onClick={e => e.stopPropagation()}>
        <Button
          variant={event.isJoined ? 'outline' : 'gold'}
          fullWidth
          size="sm"
          onClick={onClick}
        >
          {event.isJoined && event.status === 'ended' ? (
            <><Eye className="size-4" aria-hidden="true" /> {t('resultsBtn')}</>
          ) : event.isJoined && event.status === 'running' ? (
            <><Lock className="size-4" aria-hidden="true" /> {t('eventJoined')}</>
          ) : event.isJoined ? (
            <><Edit3 className="size-4" aria-hidden="true" /> {t('lineupBtn')}</>
          ) : event.status === 'ended' ? (
            <><Eye className="size-4" aria-hidden="true" /> {t('resultsBtn')}</>
          ) : event.status === 'running' ? (
            <><Play className="size-4" aria-hidden="true" /> {t('runningBtn')}</>
          ) : (
            <><Plus className="size-4" aria-hidden="true" /> {formatEventCost(event, t('joinBtn'))}</>
          )}
        </Button>
      </div>
    </div>
  );
}
