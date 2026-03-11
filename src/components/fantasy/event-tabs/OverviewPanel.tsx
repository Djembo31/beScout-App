'use client';

import React from 'react';
import {
  Trophy, Users, Clock, Star, Shield,
  CheckCircle2, Medal,
  Briefcase, Coins, Layers, Swords,
  Building2,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { fmtScout } from '@/lib/utils';
import type { FantasyEvent } from '../types';

export interface OverviewPanelProps {
  event: FantasyEvent;
  userId?: string;
  participants: { id: string; handle: string; display_name?: string; avatar_url?: string }[];
  participantCount: number;
}

export default function OverviewPanel({ event, userId, participants, participantCount }: OverviewPanelProps) {
  const t = useTranslations('fantasy');
  const locale = useLocale();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold mb-2">{t('descriptionLabel')}</h3>
        <p className="text-white/70">{event.description}</p>
      </div>

      {/* Arena Score Info */}
      {event.eventTier === 'arena' && (
        <div className="p-4 rounded-xl bg-amber-500/[0.06] border border-amber-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Swords aria-hidden="true" className="size-5 text-amber-400" />
            <h3 className="font-bold text-amber-400">{t('arenaScoring')}</h3>
          </div>
          <p className="text-xs text-white/60 mb-3">
            {t('arenaDesc')}
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: 'Top 1%', pts: '+50', color: 'text-gold' },
              { label: 'Top 5%', pts: '+40', color: 'text-gold' },
              { label: 'Top 10%', pts: '+30', color: 'text-green-500' },
              { label: 'Top 25%', pts: '+20', color: 'text-green-500' },
              { label: 'Top 50%', pts: '+10', color: 'text-sky-400' },
              { label: 'Top 75%', pts: '\u00b10', color: 'text-white/40' },
              { label: '75\u201390%', pts: '\u22125', color: 'text-red-300' },
              { label: 'Rest', pts: '\u221215', color: 'text-red-400' },
            ].map(r => (
              <div key={r.label} className="text-center p-1.5 bg-black/20 rounded-lg">
                <div className={`font-mono font-bold text-xs ${r.color}`}>{r.pts}</div>
                <div className="text-xs text-white/30">{r.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event Details */}
      <div>
        <h3 className="font-bold mb-2">{t('eventDetails')}</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-white/[0.03] rounded-lg">
            <div className="text-xs text-white/40">{t('entryLabel')}</div>
            <div className="font-mono font-bold text-gold">{event.buyIn === 0 ? t('entryFree') : `${event.buyIn} bCredits`}</div>
          </div>
          <div className="p-3 bg-white/[0.03] rounded-lg">
            <div className="text-xs text-white/40">{t('prizePoolLabel')}</div>
            <div className="font-mono font-bold text-gold">{event.prizePool} bCredits</div>
          </div>
          <div className="p-3 bg-white/[0.03] rounded-lg">
            <div className="text-xs text-white/40">{t('formatLabel')}</div>
            <div className="font-bold">{event.format} • {event.mode === 'league' ? t('modeLeague') : t('modeTournament')}</div>
          </div>
          <div className="p-3 bg-white/[0.03] rounded-lg">
            <div className="text-xs text-white/40">{t('dpcPerSlotLabel')}</div>
            <div className="font-bold">{event.requirements.dpcPerSlot ?? 1} DPC</div>
          </div>
          <div className="p-3 bg-white/[0.03] rounded-lg">
            <div className="text-xs text-white/40">{t('startLabel')}</div>
            <div className="text-sm">{new Date(event.startTime).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div className="p-3 bg-white/[0.03] rounded-lg">
            <div className="text-xs text-white/40">{t('participantsLabel')}</div>
            <div className="font-bold">{event.participants}{event.maxParticipants ? ` / ${event.maxParticipants}` : ` (${t('unlimited')})`}</div>
          </div>
        </div>
      </div>

      {/* Teilnahmebedingungen */}
      <div>
        <h3 className="font-bold mb-2">{t('requirementsTitle')}</h3>
        <div className="space-y-2">
          {/* Always show DPC per slot requirement */}
          <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
            <div className="flex items-center gap-2">
              <Layers aria-hidden="true" className="size-4 text-gold" />
              <span>{t('dpcPerSlotReq', { n: event.requirements.dpcPerSlot ?? 1 })}</span>
            </div>
            <CheckCircle2 aria-hidden="true" className="size-5 text-green-500" />
          </div>
          {event.requirements.minDpc && (
            <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
              <div className="flex items-center gap-2">
                <Briefcase aria-hidden="true" className="size-4 text-gold" />
                <span>{t('minDpcReq', { n: event.requirements.minDpc })}</span>
              </div>
              <CheckCircle2 aria-hidden="true" className="size-5 text-green-500" />
            </div>
          )}
          {event.requirements.minClubPlayers && (
            <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
              <div className="flex items-center gap-2">
                <Building2 aria-hidden="true" className="size-4 text-green-500" />
                <span>{t('minClubPlayersReq', { n: event.requirements.minClubPlayers, club: event.clubName || 'Club' })}</span>
              </div>
              <CheckCircle2 aria-hidden="true" className="size-5 text-green-500" />
            </div>
          )}
          {event.requirements.minScoutLevel && (
            <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
              <div className="flex items-center gap-2">
                <Star aria-hidden="true" className="size-4 text-purple-400" />
                <span>{t('minScoutLevelReq', { n: event.requirements.minScoutLevel })}</span>
              </div>
              <CheckCircle2 aria-hidden="true" className="size-5 text-green-500" />
            </div>
          )}
          {event.requirements.specificClub && (
            <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
              <div className="flex items-center gap-2">
                <Shield aria-hidden="true" className="size-4 text-sky-400" />
                <span>{t('specificClubReq', { club: event.requirements.specificClub })}</span>
              </div>
              <CheckCircle2 aria-hidden="true" className="size-5 text-green-500" />
            </div>
          )}
          {/* Entry fee condition */}
          {event.buyIn > 0 && (
            <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
              <div className="flex items-center gap-2">
                <Coins aria-hidden="true" className="size-4 text-gold" />
                <span>{t('entryFeeReq', { n: event.buyIn })}</span>
              </div>
              <CheckCircle2 aria-hidden="true" className="size-5 text-green-500" />
            </div>
          )}
        </div>
      </div>

      {/* Rewards */}
      <div>
        <h3 className="font-bold mb-2">{t('rewardsTitle')}</h3>
        <div className="space-y-2" aria-label={t('rewardsTitle')}>
          {(event.rewardStructure ?? [
            { rank: 1, pct: 50 }, { rank: 2, pct: 30 }, { rank: 3, pct: 20 }
          ]).map((tier: { rank: number; pct: number }, i: number) => {
            const amount = event.prizePool > 0
              ? Math.floor(event.prizePool * tier.pct / 100)
              : 0;
            return (
              <div key={tier.rank} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
                <div className="flex items-center gap-2">
                  <Medal aria-hidden="true" className={`size-4 ${i === 0 ? 'text-gold' : i === 1 ? 'text-white/70' : i === 2 ? 'text-orange-400' : 'text-white/20'}`} />
                  <span className="font-bold">Platz {tier.rank}</span>
                </div>
                <span className="text-white/70 font-mono tabular-nums">
                  {tier.pct}%{amount > 0 ? ` (${fmtScout(amount)})` : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Participants List */}
      <div className="pt-4 border-t border-white/10">
        <div className="font-bold mb-3 flex items-center justify-between">
          <span>{event.maxParticipants ? t('participantsCountMax', { count: participantCount, max: event.maxParticipants }) : t('participantsCount', { count: participantCount })}</span>
          {participantCount > 0 && <span className="text-xs text-white/50">{t('topPlusYou')}</span>}
        </div>
        <div className="space-y-2">
          {participants.length === 0 ? (
            <div className="text-white/40 text-xs">{t('noParticipantsYet')}</div>
          ) : (
            participants.slice(0, 5).map(p => (
              <div key={p.id} className={`flex items-center gap-3 p-2 rounded-lg ${p.id === userId ? 'bg-gold/10 border border-gold/30' : 'bg-white/5'}`}>
                <div className="size-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                  {p.avatar_url ? <img src={p.avatar_url} alt={p.handle} className="w-full h-full object-cover" /> : <div className="text-xs flex items-center justify-center w-full h-full">&#x1F464;</div>}
                </div>
                <div className="flex-1 text-xs">
                  <div className={`font-medium ${p.id === userId ? 'text-gold' : 'text-white'}`}>
                    {p.display_name || p.handle} {p.id === userId && t('youLabel')}
                  </div>
                </div>
              </div>
            ))
          )}
          {participantCount > participants.length && (
            <div className="text-center text-xs text-white/40 pt-1">
              {t('moreParticipants', { n: participantCount - participants.length })}
            </div>
          )}
        </div>
      </div>

      {/* User Status if joined */}
      {event.isJoined && event.userRank && (
        <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-green-500">{t('yourRankLabel')}</div>
              <div className="text-2xl font-mono font-black text-green-500">#{event.userRank}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/50">{t('pointsLabel')}</div>
              <div className="text-2xl font-mono font-bold">{event.userPoints}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
