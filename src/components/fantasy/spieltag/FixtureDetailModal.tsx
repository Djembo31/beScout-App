'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Star } from 'lucide-react';
import { Modal } from '@/components/ui';
import { useTranslations } from 'next-intl';
import { getClub } from '@/lib/clubs';
import { getFixturePlayerStats, getFixtureSubstitutions } from '@/lib/services/fixtures';
import type { Fixture, FixturePlayerStat, FixtureSubstitution, Pos } from '@/types';
import { PlayerPhoto, GoalBadge } from '@/components/player';
import { ClubLogo } from './ClubLogo';
import { posColor, scoreBadgeColor, getPosAccent } from './helpers';

/** Split team stats into starters + bench using is_starter flag, with minutes fallback for old data.
 *  Handles dual-ID gaps: when lineup has < 11 starters due to API ID mismatches,
 *  supplements with highest-minutes non-starters to reach 11. */
function splitStartersBench(stats: FixturePlayerStat[]): {
  starters: FixturePlayerStat[];
  bench: FixturePlayerStat[];
  formation: string;
} {
  let starters: FixturePlayerStat[];
  let bench: FixturePlayerStat[];

  const hasStarterFlags = stats.some(s => s.is_starter);

  if (hasStarterFlags) {
    starters = stats.filter(s => s.is_starter);
    const rest = stats.filter(s => !s.is_starter);

    // Fill gaps: if < 11 starters due to dual-ID mismatches, supplement with top-minutes players
    if (starters.length < 11) {
      const sorted = [...rest].sort((a, b) => b.minutes_played - a.minutes_played);
      const needed = 11 - starters.length;
      const promoted = sorted.splice(0, needed);
      starters = [...starters, ...promoted];
      bench = sorted.filter(s => s.minutes_played > 0);
    } else {
      bench = rest.filter(s => s.minutes_played > 0);
    }
  } else {
    // Fallback for old data without is_starter
    const sorted = [...stats].sort((a, b) => b.minutes_played - a.minutes_played);
    starters = sorted.slice(0, 11);
    bench = sorted.slice(11).filter(s => s.minutes_played > 0);
  }

  const counts = { DEF: 0, MID: 0, ATT: 0 };
  for (const s of starters) {
    const pos = s.match_position || s.player_position || 'MID';
    if (pos in counts) counts[pos as keyof typeof counts]++;
  }
  const formation = `${counts.DEF}-${counts.MID}-${counts.ATT}`;

  return { starters, bench, formation };
}

function PlayerNode({ stat }: { stat: FixturePlayerStat }) {
  const rating = stat.rating ?? stat.fantasy_points / 10;
  const accent = getPosAccent(stat.player_position);
  const badge = scoreBadgeColor(rating);

  return (
    <div className="flex flex-col items-center relative w-[52px] md:w-[60px] lg:w-[72px]">
      <div className={`absolute -top-1 -right-0.5 md:-top-1.5 md:-right-2 z-20 min-w-[1.4rem] md:min-w-[1.6rem] px-1 py-0.5 rounded-full text-[9px] md:text-[9px] font-mono font-black text-center shadow-lg ${badge}`}>
        {rating.toFixed(1)}
      </div>
      <div className="relative">
        <PlayerPhoto
          imageUrl={stat.player_image_url}
          first={stat.player_first_name}
          last={stat.player_last_name}
          pos={stat.player_position as Pos}
          size={32}
          className="md:size-10 lg:size-12"
        />
        <GoalBadge goals={stat.goals} size={15} className="-bottom-0.5 -right-1" />
      </div>
      <div className="text-[9px] md:text-[9px] lg:text-[10px] mt-0.5 font-medium text-center truncate max-w-full text-white/70">
        {stat.player_last_name}
      </div>
      <div className="hidden md:flex items-center justify-center gap-0.5 text-[9px] text-white/30">
        <span>{stat.minutes_played}&apos;</span>
        {stat.goals > 0 && <span className="text-gold">{stat.goals}G</span>}
        {stat.assists > 0 && <span className="text-sky-400">{stat.assists}A</span>}
        {stat.yellow_card && <span className="w-1.5 h-2.5 bg-yellow-400 rounded-[1px] inline-block" />}
        {stat.red_card && <span className="w-1.5 h-2.5 bg-red-500 rounded-[1px] inline-block" />}
        {stat.clean_sheet && <span className="text-emerald-400">CS</span>}
        {stat.bonus > 0 && <span className="text-gold">{stat.bonus}</span>}
      </div>
    </div>
  );
}

function FormationHalf({ stats, teamName, color, isHome, formation, logo }: {
  stats: FixturePlayerStat[];
  teamName: string;
  color: string;
  isHome: boolean;
  formation: string;
  logo: ReturnType<typeof getClub>;
}) {
  const grouped = new Map<string, FixturePlayerStat[]>();
  for (const s of stats) {
    const pos = s.match_position || s.player_position || 'MID';
    const existing = grouped.get(pos) || [];
    existing.push(s);
    grouped.set(pos, existing);
  }

  const order = isHome
    ? (pos: string) => { switch (pos) { case 'GK': return 0; case 'DEF': return 1; case 'MID': return 2; case 'ATT': return 3; default: return 4; } }
    : (pos: string) => { switch (pos) { case 'ATT': return 0; case 'MID': return 1; case 'DEF': return 2; case 'GK': return 3; default: return 4; } };

  const rows = Array.from(grouped.entries())
    .sort((a, b) => order(a[0]) - order(b[0]))
    .map(([, players]) => players.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)));

  return (
    <div className="flex flex-col gap-3 py-2">
      <div className="flex items-center justify-center gap-2">
        <ClubLogo club={logo} size={20} />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
          {teamName}
        </span>
        <span className="text-[9px] text-white/30 font-mono">({formation})</span>
      </div>
      {rows.map((players, rowIdx) => (
        <div key={rowIdx} className="flex items-center justify-center gap-1 md:gap-2 lg:gap-4">
          {players.map(s => <PlayerNode key={s.id} stat={s} />)}
        </div>
      ))}
    </div>
  );
}

function TeamStatsList({ label, stats, color }: { label: string; stats: FixturePlayerStat[]; color: string }) {
  const sorted = [...stats].sort((a, b) => {
    if (a.minutes_played >= 60 && b.minutes_played < 60) return -1;
    if (a.minutes_played < 60 && b.minutes_played >= 60) return 1;
    return (b.rating ?? 0) - (a.rating ?? 0);
  });

  return (
    <div>
      <div className="text-xs font-black uppercase tracking-wider mb-2" style={{ color }}>{label}</div>
      <div className="space-y-1">
        {sorted.map(s => (
          <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 bg-white/[0.02] rounded-lg text-xs">
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${posColor(s.player_position)}`}>
              {s.player_position}
            </span>
            <span className="flex-1 font-semibold truncate min-w-0">
              {s.player_first_name.charAt(0)}. {s.player_last_name}
            </span>
            <span className="text-white/30 font-mono text-[10px]">{s.minutes_played}&apos;</span>
            {s.goals > 0 && <span className="text-gold font-bold">{s.goals}G</span>}
            {s.assists > 0 && <span className="text-sky-400 font-bold">{s.assists}A</span>}
            {s.clean_sheet && <span className="text-emerald-400 text-[10px]">CS</span>}
            {s.yellow_card && <span className="w-2.5 h-3 bg-yellow-400 rounded-[1px] inline-block" />}
            {s.red_card && <span className="w-2.5 h-3 bg-red-500 rounded-[1px] inline-block" />}
            {s.bonus > 0 && (
              <span className="flex items-center gap-0.5 text-gold">
                <Star aria-hidden="true" className="size-2.5" />{s.bonus}
              </span>
            )}
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black tabular-nums ${scoreBadgeColor(s.rating ?? s.fantasy_points / 10)}`}>
              {(s.rating ?? s.fantasy_points / 10).toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Fixture Detail Modal
// ============================================

type Props = {
  fixture: Fixture | null;
  isOpen: boolean;
  onClose: () => void;
  sponsorName?: string;
  sponsorLogo?: string;
};

export function FixtureDetailModal({ fixture, isOpen, onClose, sponsorName, sponsorLogo }: Props) {
  const ts = useTranslations('spieltag');
  const tsp = useTranslations('sponsor');
  const [stats, setStats] = useState<FixturePlayerStat[]>([]);
  const [substitutions, setSubstitutions] = useState<FixtureSubstitution[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'formation' | 'players'>('formation');

  useEffect(() => {
    if (!fixture || !isOpen) return;
    let cancelled = false;
    setLoading(true);
    setDetailTab('formation');
    Promise.all([
      getFixturePlayerStats(fixture.id),
      getFixtureSubstitutions(fixture.id),
    ]).then(([statsData, subsData]) => {
      if (!cancelled) {
        setStats(statsData);
        setSubstitutions(subsData);
        setLoading(false);
      }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fixture, isOpen]);

  if (!fixture) return null;

  const homeStats = stats.filter(s => s.club_id === fixture.home_club_id);
  const awayStats = stats.filter(s => s.club_id === fixture.away_club_id);
  const homeClub = getClub(fixture.home_club_short) || getClub(fixture.home_club_name);
  const awayClub = getClub(fixture.away_club_short) || getClub(fixture.away_club_name);
  const isSimulated = fixture.status === 'simulated' || fixture.status === 'finished';
  const homeColor = homeClub?.colors.primary ?? '#22C55E';
  const awayColor = awayClub?.colors.primary ?? '#3B82F6';

  return (
    <Modal open={isOpen} title="" onClose={onClose}>
      <div className="max-h-[80vh] overflow-y-auto">
        {/* Score Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0" style={{
            background: `linear-gradient(135deg, ${homeColor}15 0%, transparent 50%, ${awayColor}15 100%)`,
          }} />
          <div className="relative flex items-center justify-center gap-4 md:gap-8 py-6 px-4">
            <div className="flex flex-col items-center gap-1.5">
              <ClubLogo club={homeClub} size={52} short={fixture.home_club_short} />
              <span className="font-bold text-sm md:text-base">{fixture.home_club_name}</span>
            </div>
            <div className="text-center">
              <div className="font-mono font-black text-3xl md:text-4xl">
                {isSimulated ? `${fixture.home_score} - ${fixture.away_score}` : 'vs'}
              </div>
              {isSimulated && (
                <div className="text-[10px] text-white/30 mt-1">Spieltag {fixture.gameweek}</div>
              )}
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <ClubLogo club={awayClub} size={52} short={fixture.away_club_short} />
              <span className="font-bold text-sm md:text-base">{fixture.away_club_name}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        {stats.length > 0 && (
          <div className="flex items-center justify-center gap-6 border-b border-white/[0.06] px-4">
            {(['formation', 'players'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setDetailTab(tab)}
                className={`py-3 text-sm font-semibold border-b-2 transition-colors ${
                  detailTab === tab
                    ? 'text-white border-white'
                    : 'text-white/40 border-transparent hover:text-white/60'
                }`}
              >
                {tab === 'formation' ? ts('lineups') : ts('playersTab')}
              </button>
            ))}
          </div>
        )}

        <div className="p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 aria-hidden="true" className="size-6 animate-spin motion-reduce:animate-none text-gold" />
            </div>
          ) : stats.length === 0 ? (
            <div className="text-center text-white/30 py-12">
              {isSimulated ? ts('noPlayerData') : ts('notSimulated')}
            </div>
          ) : detailTab === 'formation' ? (
            <div className="rounded-xl overflow-hidden border border-green-500/20">
              {/* Sponsor Banner Top */}
              {(() => {
                const sponsor = sponsorName ? { sponsorName, sponsorLogo } : null;
                return (
                  <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#1a1a2e] px-4 py-2 flex items-center justify-center gap-3 border-b border-white/10">
                    {sponsor?.sponsorLogo ? (
                      <img src={sponsor.sponsorLogo} alt="" className="h-4 w-auto object-contain" />
                    ) : (
                      <Star aria-hidden="true" className="size-3 text-gold" />
                    )}
                    <span className="text-xs font-bold text-white/50 uppercase">{sponsor?.sponsorName || tsp('sponsorPlaceholder')}</span>
                    {sponsor?.sponsorLogo ? (
                      <img src={sponsor.sponsorLogo} alt="" className="h-4 w-auto object-contain" />
                    ) : (
                      <Star aria-hidden="true" className="size-3 text-gold" />
                    )}
                  </div>
                );
              })()}

              {/* Green Pitch */}
              <div className="relative bg-gradient-to-b from-[#1a5c1a]/40 via-[#1e6b1e]/30 to-[#1a5c1a]/40 px-3 md:px-6 py-4">
                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 400 600">
                  <rect x="20" y="10" width="360" height="580" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="1.5" />
                  <line x1="20" y1="300" x2="380" y2="300" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
                  <circle cx="200" cy="300" r="45" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
                  <circle cx="200" cy="300" r="3" fill="white" fillOpacity="0.1" />
                  <rect x="110" y="10" width="180" height="70" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
                  <rect x="145" y="10" width="110" height="30" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
                  <rect x="110" y="520" width="180" height="70" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
                  <rect x="145" y="560" width="110" height="30" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <rect key={i} x="20" y={10 + i * 96.67} width="360" height="48.33" fill="white" fillOpacity="0.015" />
                  ))}
                </svg>

                {/* Center circle sponsor */}
                {(() => {
                  const sponsor = sponsorName ? { sponsorName, sponsorLogo } : null;
                  return (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                      <div className="size-16 rounded-full border border-white/[0.06] flex items-center justify-center">
                        {sponsor?.sponsorLogo ? (
                          <img src={sponsor.sponsorLogo} alt="" className="size-10 object-contain opacity-30" />
                        ) : (
                          <span className="text-[9px] text-white/15 font-bold tracking-wider uppercase">Sponsor</span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const homeSplit = splitStartersBench(homeStats);
                  const awaySplit = splitStartersBench(awayStats);
                  const allBench = [...homeSplit.bench, ...awaySplit.bench];
                  // Use real formation from DB, fallback to derived
                  const homeFormation = fixture.home_formation || homeSplit.formation;
                  const awayFormation = fixture.away_formation || awaySplit.formation;
                  // Safeguard: if either team has < 11 starters, fall back to list view
                  const hasEnoughData = homeSplit.starters.length >= 11 && awaySplit.starters.length >= 11;

                  if (!hasEnoughData) {
                    return (
                      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 px-2 py-4">
                        <TeamStatsList label={`${fixture.home_club_name} ${homeFormation ? `(${homeFormation})` : ''}`} stats={homeStats} color={homeColor} />
                        <TeamStatsList label={`${fixture.away_club_name} ${awayFormation ? `(${awayFormation})` : ''}`} stats={awayStats} color={awayColor} />
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="relative z-10">
                        <FormationHalf stats={homeSplit.starters} teamName={fixture.home_club_name} color={homeColor} isHome={true} formation={homeFormation} logo={homeClub} />
                        <div className="h-4 md:h-6" />
                        <FormationHalf stats={awaySplit.starters} teamName={fixture.away_club_name} color={awayColor} isHome={false} formation={awayFormation} logo={awayClub} />
                      </div>
                      {/* Substitutions: livescore-style if data available, fallback to bench list */}
                      {substitutions.length > 0 ? (
                        <div className="relative z-10 mt-3 pt-3 border-t border-white/[0.06]">
                          <div className="text-[9px] font-bold text-white/25 uppercase tracking-wider text-center mb-2">{ts('substitutions')}</div>
                          <div className="space-y-1">
                            {substitutions.map(sub => {
                              const isHome = sub.club_id === fixture.home_club_id;
                              const accentColor = isHome ? homeColor : awayColor;
                              return (
                                <div key={sub.id} className="flex items-center gap-1.5 px-2 py-1.5 bg-black/20 rounded-lg text-[10px] border border-white/[0.06]">
                                  <div className="w-0.5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: accentColor }} />
                                  <span className="text-white/30 font-mono tabular-nums w-8 text-right flex-shrink-0">
                                    {sub.minute}&apos;{sub.extra_minute ? `+${sub.extra_minute}` : ''}
                                  </span>
                                  <span className="text-red-400 flex-shrink-0" aria-label="ausgewechselt">▼</span>
                                  <span className="text-white/50 truncate min-w-0">
                                    {sub.player_out_last_name}
                                  </span>
                                  <span className="text-white/20 flex-shrink-0">→</span>
                                  <span className="text-emerald-400 flex-shrink-0" aria-label="eingewechselt">▲</span>
                                  <span className="text-white/70 font-medium truncate min-w-0">
                                    {sub.player_in_last_name}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : allBench.length > 0 && (
                        <div className="relative z-10 mt-3 pt-3 border-t border-white/[0.06]">
                          <div className="text-[9px] font-bold text-white/25 uppercase tracking-wider text-center mb-2">{ts('substitutions')}</div>
                          <div className="flex gap-1.5 flex-wrap justify-center">
                            {allBench.map(s => (
                              <div key={s.id} className="flex items-center gap-1 px-2 py-1 bg-black/20 rounded-lg text-[9px] border border-white/[0.06]">
                                <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${posColor(s.player_position)}`}>
                                  {s.player_position}
                                </span>
                                <span className="text-white/50">{s.player_last_name}</span>
                                <span className="text-white/25 font-mono">{s.minutes_played}&apos;</span>
                                <span className={`px-1 py-0.5 rounded text-[9px] font-bold tabular-nums ${scoreBadgeColor(s.rating ?? s.fantasy_points / 10)}`}>
                                  {(s.rating ?? s.fantasy_points / 10).toFixed(1)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Sponsor Banner Bottom */}
              {(() => {
                const sponsor = sponsorName ? { sponsorName, sponsorLogo } : null;
                return (
                  <div className="bg-gradient-to-r from-[#1a1a2e] via-[#0f3460] to-[#1a1a2e] px-3 py-2 flex items-center justify-between border-t border-white/10">
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                      {sponsor?.sponsorLogo && <img src={sponsor.sponsorLogo} alt="" className="h-3.5 w-auto object-contain" />}
                      <span className="text-[9px] text-white/30 font-medium">{sponsor?.sponsorName || 'Sponsor Logo'}</span>
                    </div>
                    <span className="text-[9px] text-white/20 font-bold uppercase">{sponsor?.sponsorName ? `${sponsor.sponsorName} × BeScout` : 'Powered by BeScout'}</span>
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                      {sponsor?.sponsorLogo && <img src={sponsor.sponsorLogo} alt="" className="h-3.5 w-auto object-contain" />}
                      <span className="text-[9px] text-white/30 font-medium">{sponsor?.sponsorName || 'Sponsor Logo'}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TeamStatsList label={fixture.home_club_name} stats={homeStats} color={homeColor} />
              <TeamStatsList label={fixture.away_club_name} stats={awayStats} color={awayColor} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
