'use client';

import React from 'react';
import {
  Trophy, Users, Clock, CheckCircle2,
  RefreshCw, History,
} from 'lucide-react';
import { Chip, EventTypeBadge } from '@/components/ui';
import { useTranslations, useLocale } from 'next-intl';
import type { FantasyEvent } from '@/components/fantasy/types';
import { getStatusStyle, getTypeStyle, formatCountdown } from '@/components/fantasy/helpers';

export interface EventDetailHeaderProps {
  event: FantasyEvent;
  isScored: boolean;
  resetting: boolean;
  onReset: () => void;
}

export function EventDetailHeader({ event, isScored, resetting, onReset }: EventDetailHeaderProps) {
  const t = useTranslations('fantasy');
  const locale = useLocale();
  const statusStyle = getStatusStyle(event.status);
  const typeStyle = getTypeStyle(event.type);

  return (
    <>
      {/* Status Badges + Meta */}
      <div className="flex items-center flex-wrap gap-2 mb-3">
        {isScored ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-500/20 text-purple-300">
            <Trophy aria-hidden="true" className="size-3.5" />
            <span className="text-xs font-bold">{t('statusScored')}</span>
          </div>
        ) : event.isJoined ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-green-500 text-white">
            <CheckCircle2 aria-hidden="true" className="size-3.5" />
            <span className="text-xs font-bold">{t('statusJoined')}</span>
          </div>
        ) : (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded ${statusStyle.bg} ${statusStyle.text}`}>
            {statusStyle.pulse && <div className="size-1.5 rounded-full bg-white animate-pulse motion-reduce:animate-none" />}
            <span className="text-xs font-bold">{t(statusStyle.labelKey)}</span>
          </div>
        )}
        <EventTypeBadge type={event.type} clubName={event.clubName} clubLogo={event.clubLogo} sponsorName={event.sponsorName} size="sm" />
        <Chip className={`${typeStyle.bg} ${typeStyle.color}`}>{event.mode === 'league' ? t('modeLiga') : t('modeTurnier')} • {event.format}</Chip>
        {event.status === 'running' && !isScored && <Chip className="bg-green-500 text-white">LIVE</Chip>}
        {isScored && (
          <button
            onClick={onReset}
            disabled={resetting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 ml-auto"
          >
            {resetting ? <RefreshCw aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" /> : <History aria-hidden="true" className="size-3.5" />}
            {resetting ? t('resettingBtn') : t('resetBtn')}
          </button>
        )}
      </div>
      <div className="flex items-center gap-4 text-sm text-white/50 mb-4">
        <span className="flex items-center gap-1"><Users aria-hidden="true" className="size-4" />{event.participants}{event.maxParticipants ? `/${event.maxParticipants}` : ''}</span>
        <span className="flex items-center gap-1"><Clock aria-hidden="true" className="size-4" />{event.status === 'ended' ? t('ended') : formatCountdown(event.lockTime, t('countdownStarted'))}</span>
        {(event.ticketCost ?? 0) > 0 && (
          <span className="flex items-center gap-1.5 text-[12px] text-amber-400/70 font-medium">
            <span aria-hidden="true">&#127915;</span>
            <span>{t('ticketCost', { cost: event.ticketCost })}</span>
          </span>
        )}
      </div>
    </>
  );
}
