'use client';

import { useState } from 'react';
import {
  Trophy, Shield, Play, CheckCircle2, Heart, Gift, Coins, Activity,
} from 'lucide-react';
import { Card, Chip } from '@/components/ui';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { FantasyEvent, ScoredLineupData } from './types';
import { formatCountdown, getFormResult, getScoreColor, getPosAccentColor } from './helpers';
import { useSponsor } from '@/lib/queries';

export const DashboardTab = ({
  seasonPoints,
  bestRank,
  eventsPlayed,
  totalRewardBsd,
  pastParticipations,
  scoredLineups,
  activeEvents,
  registeredEvents,
  interestedEvents,
  onViewEvent,
}: {
  seasonPoints: number;
  bestRank: number | null;
  eventsPlayed: number;
  totalRewardBsd: number;
  pastParticipations: { eventId: string; eventName: string; gameweek: number; rank: number; totalParticipants: number; points: number; rewardCents: number }[];
  scoredLineups: ScoredLineupData[];
  activeEvents: FantasyEvent[];
  registeredEvents: FantasyEvent[];
  interestedEvents: FantasyEvent[];
  onViewEvent: (event: FantasyEvent) => void;
}) => {
  const lastEvent = pastParticipations[0];
  const [selectedIdx, setSelectedIdx] = useState(0);
  const currentLineup = scoredLineups[selectedIdx] ?? null;
  const { data: pitchSponsor } = useSponsor('fantasy_pitch');
  const sponsorName = pitchSponsor?.name ?? 'Sponsor';
  const leftBoard = ['beScout', sponsorName, 'TFF 1.Lig', sponsorName];
  const rightBoard = [sponsorName, 'beScout', sponsorName, 'Premium'];
  const totalScore = currentLineup ? currentLineup.players.reduce((sum, p) => sum + (p.score ?? 0), 0) : 0;

  // Form der letzten 5
  const formResults = pastParticipations.slice(0, 5).map(p => getFormResult(p.rank, p.totalParticipants));

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Card className="p-3 md:p-4 bg-gradient-to-br from-[#FFD700]/10 to-transparent border-[#FFD700]/20">
          <div className="text-xs text-white/50 mb-1 flex items-center gap-1">
            <Coins className="w-3 h-3" /> Gewonnene $SCOUT
          </div>
          <div className="text-xl md:text-3xl font-mono font-black text-[#FFD700]">{fmtScout(totalRewardBsd)}</div>
        </Card>
        <Card className="p-3 md:p-4">
          <div className="text-xs text-white/50 mb-1">Gesamt Punkte</div>
          <div className="text-xl md:text-3xl font-mono font-black">{seasonPoints}</div>
        </Card>
        <Card className="p-3 md:p-4">
          <div className="text-xs text-white/50 mb-1">Events gespielt</div>
          <div className="text-xl md:text-3xl font-mono font-black">{eventsPlayed}</div>
        </Card>
        <Card className="p-3 md:p-4">
          <div className="text-xs text-white/50 mb-1">Beste Platzierung</div>
          <div className="text-xl md:text-3xl font-mono font-black text-[#22C55E]">{bestRank ? `#${bestRank}` : '\u2014'}</div>
        </Card>
      </div>

      {/* Form + Last Event Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Form der letzten 5 */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              Form (letzte 5)
            </h3>
          </div>
          <div className="flex items-center gap-2 mb-4">
            {formResults.map((result, i) => (
              <div key={i} className={`w-8 h-8 rounded-full ${result.color} flex items-center justify-center text-xs font-bold`}>
                {result.label || (i + 1)}
              </div>
            ))}
          </div>
          <div className="space-y-2 text-sm">
            {pastParticipations.slice(0, 3).map((p, i) => (
              <div key={i} className="flex items-center justify-between text-white/60">
                <span className="truncate">{p.eventName}</span>
                <span className="font-mono text-white">#{p.rank}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Last Event Result */}
        {lastEvent && (
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#FFD700]" />
                Letztes Event: {lastEvent.eventName}
              </h3>
              <Chip className="bg-white/10">{lastEvent.points} Punkte</Chip>
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4">
              <div className="text-center p-3 bg-white/[0.03] rounded-lg">
                <div className="text-lg md:text-2xl font-mono font-black text-[#22C55E]">#{lastEvent.rank}</div>
                <div className="text-[10px] text-white/40">Platzierung</div>
              </div>
              <div className="text-center p-3 bg-white/[0.03] rounded-lg">
                <div className="text-lg md:text-2xl font-mono font-black">{lastEvent.points}</div>
                <div className="text-[10px] text-white/40">Punkte</div>
              </div>
              <div className="text-center p-3 bg-white/[0.03] rounded-lg">
                <div className="text-lg md:text-2xl font-mono font-black text-purple-400">{lastEvent.totalParticipants}</div>
                <div className="text-[10px] text-white/40">Teilnehmer</div>
              </div>
            </div>
            {lastEvent.rewardCents > 0 && (
              <div className="p-3 bg-[#FFD700]/10 rounded-lg border border-[#FFD700]/20 flex items-center gap-2">
                <Gift className="w-4 h-4 text-[#FFD700]" />
                <span className="text-sm">Reward: <strong>{fmtScout(centsToBsd(lastEvent.rewardCents))} $SCOUT</strong></span>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Aufstellung — Pitch-Visualisierung */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#22C55E]" />
            Aufstellung
          </h3>
          {currentLineup && <div className="text-sm text-white/50">GW{currentLineup.gameweek}</div>}
        </div>

        {/* Event Switcher (only if >1 scored lineup) */}
        {scoredLineups.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {scoredLineups.map((sl, idx) => (
              <button
                key={sl.eventId}
                onClick={() => setSelectedIdx(idx)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  idx === selectedIdx
                    ? 'bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/30'
                    : 'bg-white/[0.03] text-white/50 border-white/[0.06] hover:bg-white/[0.06]'
                }`}
              >
                {sl.eventName} <span className="font-mono ml-1">#{sl.rank}</span>
              </button>
            ))}
          </div>
        )}

        {currentLineup && currentLineup.players.length > 0 ? (
          <div className="space-y-4">
            {/* Pitch with Side Sponsor Boards */}
            <div className="rounded-xl overflow-hidden border border-[#22C55E]/20 flex">
              {/* Left LED Board */}
              <div className="hidden md:flex w-10 flex-shrink-0 bg-[#0c0c14] flex-col items-center justify-between py-3 gap-2 border-r border-white/[0.06]">
                {leftBoard.map((label, i) => (
                  <div key={i} className="flex-1 w-full flex items-center justify-center border-y border-white/[0.04] bg-gradient-to-b from-white/[0.02] to-transparent">
                    <span className="text-[9px] font-bold tracking-wider text-white/20 [writing-mode:vertical-lr] rotate-180">{label}</span>
                  </div>
                ))}
              </div>

              {/* Pitch */}
              <div className="relative flex-1 bg-gradient-to-b from-[#1a5c1a]/40 via-[#1e6b1e]/30 to-[#1a5c1a]/40 px-3 md:px-6 py-4 md:py-5">
                {/* Pitch Markings (SVG) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 400 500">
                  <rect x="20" y="15" width="360" height="470" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="1.5" />
                  <line x1="20" y1="250" x2="380" y2="250" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
                  <circle cx="200" cy="250" r="50" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
                  <circle cx="200" cy="250" r="3" fill="white" fillOpacity="0.1" />
                  <rect x="100" y="15" width="200" height="80" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
                  <rect x="140" y="15" width="120" height="35" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
                  <rect x="100" y="405" width="200" height="80" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
                  <rect x="140" y="450" width="120" height="35" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
                  {[0, 1, 2, 3, 4].map(i => (
                    <rect key={i} x="20" y={15 + i * 94} width="360" height="47" fill="white" fillOpacity="0.015" />
                  ))}
                </svg>

                {/* Formation Label */}
                <div className="text-xs text-white/40 text-center mb-3 relative z-10">
                  Formation: {currentLineup.formation}
                </div>

                {/* Player Circles grouped by position */}
                <div className="space-y-6 relative z-10">
                  {['ATT', 'MID', 'DEF', 'GK'].map(posGroup => {
                    const slotPlayers = currentLineup.players.filter(p => {
                      if (posGroup === 'GK') return p.slotKey === 'gk';
                      if (posGroup === 'DEF') return p.slotKey.startsWith('def');
                      if (posGroup === 'MID') return p.slotKey.startsWith('mid');
                      return p.slotKey === 'att';
                    });
                    if (slotPlayers.length === 0) return null;
                    return (
                      <div key={posGroup} className={`flex justify-center ${slotPlayers.length > 1 ? 'gap-6 md:gap-16' : ''}`}>
                        {slotPlayers.map(sp => (
                          <div key={sp.slotKey} className="flex flex-col items-center relative">
                            {/* Score badge */}
                            {sp.score != null && (
                              <div
                                className="absolute -top-2 -right-3 z-20 min-w-[2rem] px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black text-center shadow-lg"
                                style={{
                                  backgroundColor: sp.score >= 100 ? '#FFD700' : sp.score >= 70 ? 'rgba(255,255,255,0.9)' : '#ff6b6b',
                                  color: sp.score >= 100 ? '#000' : sp.score >= 70 ? '#000' : '#fff',
                                }}
                              >
                                {sp.score}
                              </div>
                            )}
                            {/* Player Circle */}
                            <div
                              className="w-11 h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center border-2 bg-black/40"
                              style={{
                                borderColor: sp.score != null ? getScoreColor(sp.score) : getPosAccentColor(sp.player.position),
                                boxShadow: sp.score != null ? `0 0 12px ${getScoreColor(sp.score)}40` : undefined,
                              }}
                            >
                              <span className="font-bold text-sm" style={{ color: sp.score != null ? '#fff' : getPosAccentColor(sp.player.position) }}>
                                {sp.player.firstName[0]}{sp.player.lastName[0]}
                              </span>
                            </div>
                            <div className="text-[10px] mt-1" style={{ color: sp.score != null ? '#ffffffcc' : getPosAccentColor(sp.player.position) + 'aa' }}>
                              {sp.player.lastName.slice(0, 8)}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right LED Board */}
              <div className="hidden md:flex w-10 flex-shrink-0 bg-[#0c0c14] flex-col items-center justify-between py-3 gap-2 border-l border-white/[0.06]">
                {rightBoard.map((label, i) => (
                  <div key={i} className="flex-1 w-full flex items-center justify-center border-y border-white/[0.04] bg-gradient-to-b from-white/[0.02] to-transparent">
                    <span className="text-[9px] font-bold tracking-wider text-white/20 [writing-mode:vertical-lr] rotate-180">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg bg-white/[0.04] border border-[#FFD700]/20 gap-2 sm:gap-0">
              <div className="flex items-center gap-4">
                <span className="font-bold text-sm">Gesamt</span>
                <span className="font-mono font-black text-lg text-[#FFD700]">{totalScore}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-white/50">Platz <span className="font-mono font-bold text-[#22C55E]">#{currentLineup.rank}</span> / {currentLineup.totalParticipants}</span>
                {currentLineup.rewardCents > 0 && (
                  <span className="text-[#FFD700] font-mono font-bold flex items-center gap-1">
                    <Gift className="w-3 h-3" /> {fmtScout(centsToBsd(currentLineup.rewardCents))} $SCOUT
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-white/40 text-sm">
            Noch keine ausgewertete Aufstellung
          </div>
        )}
      </Card>

      {/* Quick Event Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Aktive Events */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <Play className="w-4 h-4 text-[#22C55E]" />
              Aktiv
            </h3>
            <Chip className="bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/25">{activeEvents.length}</Chip>
          </div>
          {activeEvents.length > 0 ? (
            <div className="space-y-2">
              {activeEvents.map(event => (
                <button
                  key={event.id}
                  onClick={() => onViewEvent(event)}
                  className="w-full p-3 bg-white/[0.02] rounded-lg text-left hover:bg-white/[0.05] transition-all border border-white/5 hover:border-[#22C55E]/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{event.name}</span>
                    <span className="font-mono text-xs text-[#22C55E]">#{event.userRank}</span>
                  </div>
                  <div className="text-[10px] text-white/40 mt-1">{event.userPoints} Punkte</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-white/40 text-center py-4">Keine aktiven Events</div>
          )}
        </Card>

        {/* Registrierte Events */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-400" />
              Registriert
            </h3>
            <Chip className="bg-sky-500/15 text-sky-400 border-sky-500/25">{registeredEvents.length}</Chip>
          </div>
          {registeredEvents.length > 0 ? (
            <div className="space-y-2">
              {registeredEvents.map(event => (
                <button
                  key={event.id}
                  onClick={() => onViewEvent(event)}
                  className="w-full p-3 bg-white/[0.02] rounded-lg text-left hover:bg-white/[0.05] transition-all border border-white/5 hover:border-sky-500/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{event.name}</span>
                    <span className="text-[10px] text-white/40">{event.status === 'ended' ? 'Beendet' : formatCountdown(event.lockTime)}</span>
                  </div>
                  <div className="text-[10px] text-white/40 mt-1">{event.format} • {event.buyIn === 0 ? 'Free' : `${event.buyIn} $SCOUT`}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-white/40 text-center py-4">Keine registrierten Events</div>
          )}
        </Card>

        {/* Interessiert */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-400" />
              Interessiert
            </h3>
            <Chip className="bg-pink-500/15 text-pink-400 border-pink-500/25">{interestedEvents.length}</Chip>
          </div>
          {interestedEvents.length > 0 ? (
            <div className="space-y-2">
              {interestedEvents.map(event => (
                <button
                  key={event.id}
                  onClick={() => onViewEvent(event)}
                  className="w-full p-3 bg-white/[0.02] rounded-lg text-left hover:bg-white/[0.05] transition-all border border-white/5 hover:border-pink-500/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{event.name}</span>
                    <span className="text-[10px] text-white/40">{formatCountdown(event.startTime)}</span>
                  </div>
                  <div className="text-[10px] text-white/40 mt-1">{event.buyIn === 0 ? 'Free' : `${event.buyIn} $SCOUT`}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-white/40 text-center py-4">Keine markierten Events</div>
          )}
        </Card>
      </div>
    </div>
  );
};
