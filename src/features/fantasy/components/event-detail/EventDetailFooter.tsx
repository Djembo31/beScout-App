'use client';

import React from 'react';
import {
  CheckCircle2, Play, Lock, Save, Eye,
  Clock, Trophy, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn, fmtScout } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { FantasyEvent } from '@/components/fantasy/types';

export interface EventDetailFooterProps {
  event: FantasyEvent;
  isScored: boolean;
  hasUnlockedFixtures: boolean;
  isLineupComplete: boolean;
  reqCheck: { ok: boolean; message: string };
  overBudget: boolean;
  salaryCap: number | null;
  totalSalary: number;
  selectedPlayersCount: number;
  formationSlotsCount: number;
  joining: boolean;
  leaving: boolean;
  onConfirmJoin: () => void;
  onSaveLineup: () => void;
  onLeave: () => void;
  onViewResults: () => void;
}

export function EventDetailFooter({
  event,
  isScored,
  hasUnlockedFixtures,
  isLineupComplete,
  reqCheck,
  overBudget,
  salaryCap,
  totalSalary,
  selectedPlayersCount,
  formationSlotsCount,
  joining,
  leaving,
  onConfirmJoin,
  onSaveLineup,
  onLeave,
  onViewResults,
}: EventDetailFooterProps) {
  const t = useTranslations('fantasy');

  return (
    <div className="sticky bottom-0 z-10">
      {/* Join -- only when not joined AND event not running/ended */}
      {!event.isJoined && event.status !== 'ended' && event.status !== 'running' && (() => {
        const isFull = !!(event.maxParticipants && event.participants >= event.maxParticipants);
        const ticketCost = event.ticketCost ?? 0;
        const hasCost = ticketCost > 0;
        const costLabel = event.currency === 'tickets' && ticketCost > 0
          ? t('ticketCost', { cost: ticketCost })
          : event.currency === 'scout' && ticketCost > 0
          ? `${fmtScout(ticketCost / 100)} $SCOUT`
          : t('freeLabel');
        return (
          <div className="flex-shrink-0 border-t border-white/10 bg-bg-main">
            <div className="p-3 md:p-5">
              <Button
                variant="gold"
                fullWidth
                size="lg"
                onClick={onConfirmJoin}
                disabled={isFull || joining}
                className={cn(isFull ? 'opacity-60' : '')}
              >
                {joining
                  ? <Loader2 aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
                  : <CheckCircle2 aria-hidden="true" className="size-5" />
                }
                {isFull
                  ? t('eventFull')
                  : hasCost
                  ? t('joinAndPay', { amount: costLabel })
                  : t('confirmRegistration')
                }
              </Button>
            </div>
          </div>
        );
      })()}

      {/* Update / Leave -- registering/late-reg OR running with unlocked fixtures */}
      {event.isJoined && event.status !== 'ended' && (event.status !== 'running' || hasUnlockedFixtures) && (
        <div className="flex-shrink-0 border-t border-white/10 bg-bg-main">
          {/* Lineup progress indicator */}
          {!isLineupComplete && (
            <div className="px-3 pt-3 md:px-5 md:pt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-white/50">{t('lineupLabel')}</span>
                <span className="text-xs font-mono font-bold text-gold">{t('playersProgress', { filled: selectedPlayersCount, total: formationSlotsCount })}</span>
              </div>
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full transition-colors"
                  style={{ width: `${(selectedPlayersCount / formationSlotsCount) * 100}%` }}
                />
              </div>
            </div>
          )}
          {/* Salary Cap budget bar */}
          {salaryCap != null && selectedPlayersCount > 0 && (
            <div className="px-3 pt-2 md:px-5 md:pt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/50">Budget</span>
                <span className={cn('text-xs font-mono font-bold', overBudget ? 'text-red-400' : 'text-green-500')}>
                  {totalSalary} / {salaryCap}
                </span>
              </div>
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all',
                    overBudget ? 'bg-red-500' : totalSalary / salaryCap > 0.85 ? 'bg-amber-500' : 'bg-green-500'
                  )}
                  style={{ width: `${Math.min(100, (totalSalary / salaryCap) * 100)}%` }}
                />
              </div>
            </div>
          )}
          <div className="p-3 md:p-5 flex gap-3">
            <Button
              variant="outline"
              fullWidth
              size="lg"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={onLeave}
              disabled={leaving}
            >
              {leaving ? <><Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> {t('leavingBtn')}</> : t('leaveBtn')}
            </Button>
            <Button
              variant="gold"
              fullWidth
              size="lg"
              onClick={onSaveLineup}
              disabled={!isLineupComplete || !reqCheck.ok || overBudget || joining}
              className={cn(!isLineupComplete || !reqCheck.ok || overBudget ? 'opacity-50' : '')}
            >
              {joining
                ? <Loader2 aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
                : <Save aria-hidden="true" className="size-5" />
              }
              {t('editLineup')}
            </Button>
          </div>
        </div>
      )}

      {/* Running event -- fully locked (all fixtures started) */}
      {event.isJoined && event.status === 'running' && !hasUnlockedFixtures && (
        <div className="flex-shrink-0 p-3 md:p-5 border-t border-white/10 bg-bg-main">
          <div className="flex items-center justify-center gap-2 py-3 px-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <Lock aria-hidden="true" className="size-4 text-green-500" />
            <span className="text-sm font-bold text-green-500">{t('joinedLocked')}</span>
          </div>
        </div>
      )}

      {/* Running event -- not joined */}
      {!event.isJoined && event.status === 'running' && (
        <div className="flex-shrink-0 p-3 md:p-5 border-t border-white/10 bg-bg-main">
          <div className="flex items-center justify-center gap-2 py-3 px-4 bg-surface-subtle border border-white/10 rounded-xl">
            <Play aria-hidden="true" className="size-4 text-white/50" />
            <span className="text-sm text-white/50">{t('eventRunningClosed')}</span>
          </div>
        </div>
      )}

      {/* Ended event -- joined + scored */}
      {event.isJoined && event.status === 'ended' && event.scoredAt && (
        <div className="flex-shrink-0 p-3 md:p-5 border-t border-white/10 bg-bg-main">
          <button
            onClick={onViewResults}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-purple-500/10 border border-purple-500/30 rounded-xl hover:bg-purple-500/20 transition-colors"
          >
            <Trophy aria-hidden="true" className="size-4 text-purple-400" />
            <span className="text-sm font-bold text-purple-400">
              {event.userRank ? t('rankResult', { rank: event.userRank }) : t('scored')} — {t('viewResults')}
            </span>
          </button>
        </div>
      )}

      {/* Ended event -- joined but not yet scored */}
      {event.isJoined && event.status === 'ended' && !event.scoredAt && (
        <div className="flex-shrink-0 p-3 md:p-5 border-t border-white/10 bg-bg-main">
          <div className="flex items-center justify-center gap-2 py-3 px-4 bg-surface-subtle border border-white/10 rounded-xl">
            <Clock aria-hidden="true" className="size-4 text-white/40" />
            <span className="text-sm text-white/40">{t('eventEndedPending')}</span>
          </div>
        </div>
      )}

      {/* Ended event -- not joined */}
      {!event.isJoined && event.status === 'ended' && (
        <div className="flex-shrink-0 p-3 md:p-5 border-t border-white/10 bg-bg-main">
          <Button
            variant="outline"
            fullWidth
            size="lg"
            onClick={onViewResults}
          >
            <Eye aria-hidden="true" className="size-5" />
            {t('viewResults')}
          </Button>
        </div>
      )}
    </div>
  );
}
