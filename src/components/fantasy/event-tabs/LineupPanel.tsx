'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Trophy, Crown,
  CheckCircle2, AlertCircle, Play, Lock,
  Briefcase, Zap,
  Plus, Sparkles, Building2,
  X, Search, BarChart3,
  ChevronRight, ShoppingCart,
  Award,
} from 'lucide-react';
import { getScoreTier, SCORE_TIER_CONFIG } from '@/types';
import type { SynergyDetail } from '@/types';
import { PositionBadge, PlayerIdentity, PlayerPhoto, getL5Color } from '@/components/player';
import type { Pos } from '@/types';
import { cn, fmtScout } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';
import type { FantasyEvent, LineupPlayer, UserDpcHolding, LineupPreset } from '../types';
import type { FormationDef } from '../constants';
import { PRESET_KEY } from '../constants';
import {
  getPosBorderColor, getScoreColor, getPosAccentColor,
} from '../helpers';

export interface LineupPanelProps {
  event: FantasyEvent;
  userId?: string;
  isScored: boolean;
  scoringJustFinished: boolean;
  // Formation + slots
  selectedFormation: string;
  availableFormations: FormationDef[];
  formationSlots: { pos: string; slot: number }[];
  slotDbKeys: string[];
  // Players
  selectedPlayers: LineupPlayer[];
  effectiveHoldings: UserDpcHolding[];
  // Scores
  slotScores: Record<string, number> | null;
  myTotalScore: number | null;
  myRank: number | null;
  progressiveScores: Map<string, number>;
  // Captain
  captainSlot: string | null;
  setCaptainSlot: (slot: string | null) => void;
  // Synergy
  synergyPreview: { totalPct: number; details: SynergyDetail[] };
  // DPC Ownership bonus — all player IDs the user owns DPCs for
  ownedPlayerIds?: Set<string>;
  // Lineup state
  isLineupComplete: boolean;
  reqCheck: { ok: boolean; message: string };
  // Locks
  isPartiallyLocked: boolean;
  nextKickoff: number | null;
  isPlayerLocked: (playerId: string) => boolean;
  // Handlers
  onFormationChange: (fId: string) => void;
  onApplyPreset: (formation: string, lineup: LineupPlayer[]) => void;
  onSelectPlayer: (playerId: string, position: string, slot: number) => void;
  onRemovePlayer: (slot: number) => void;
  getSelectedPlayer: (slot: number) => UserDpcHolding | null;
  getAvailablePlayersForPosition: (position: string) => UserDpcHolding[];
  // Leaderboard
  leaderboard: { userId: string; rewardAmount: number }[];
  // Tab switch
  onSwitchToLeaderboard: () => void;
  // Close modal
  onClose: () => void;
}

export default function LineupPanel({
  event,
  userId,
  isScored,
  scoringJustFinished,
  selectedFormation,
  availableFormations,
  formationSlots,
  slotDbKeys,
  selectedPlayers,
  effectiveHoldings,
  slotScores,
  myTotalScore,
  myRank,
  progressiveScores,
  captainSlot,
  setCaptainSlot,
  synergyPreview,
  ownedPlayerIds,
  isLineupComplete,
  reqCheck,
  isPartiallyLocked,
  nextKickoff,
  isPlayerLocked,
  onFormationChange,
  onApplyPreset,
  onSelectPlayer,
  onRemovePlayer,
  getSelectedPlayer,
  getAvailablePlayersForPosition,
  leaderboard,
  onSwitchToLeaderboard,
  onClose,
}: LineupPanelProps) {
  const t = useTranslations('fantasy');
  const tsp = useTranslations('sponsor');
  const locale = useLocale();

  // DPC Ownership bonus — capped at 3 players per lineup
  const ownershipBonusIds = useMemo(() => {
    if (!ownedPlayerIds || ownedPlayerIds.size === 0) return new Set<string>();
    const active: string[] = [];
    for (const sp of selectedPlayers) {
      if (ownedPlayerIds.has(sp.playerId)) {
        active.push(sp.playerId);
        if (active.length >= 3) break;
      }
    }
    return new Set(active);
  }, [selectedPlayers, ownedPlayerIds]);

  // Local state for picker + presets
  const [showPlayerPicker, setShowPlayerPicker] = useState<{ position: string; slot: number } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerSort, setPickerSort] = useState<'l5' | 'dpc' | 'name'>('l5');
  const [presetName, setPresetName] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [presets, setPresets] = useState<LineupPreset[]>([]);

  // Hydrate presets from localStorage in useEffect to avoid SSR hydration mismatch
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PRESET_KEY);
      if (saved) setPresets(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const isFullyLocked = event.status === 'ended';
  const isReadOnly = isFullyLocked;

  const getPlayerStatusStyle = (s: UserDpcHolding['status']) => {
    switch (s) {
      case 'fit': return { icon: '\u{1F7E2}', label: t('statusFit'), color: 'text-green-500' };
      case 'injured': return { icon: '\u{1F534}', label: t('statusInjured'), color: 'text-red-400' };
      case 'suspended': return { icon: '\u26D4', label: t('statusSuspended'), color: 'text-orange-400' };
      case 'doubtful': return { icon: '\u{1F7E1}', label: t('statusDoubtful'), color: 'text-yellow-400' };
      default: return { icon: '\u{1F7E2}', label: t('statusFit'), color: 'text-white/50' };
    }
  };

  // Presets
  const savePreset = () => {
    if (!presetName.trim()) return;
    const ids = formationSlots.map(s => { const sp = selectedPlayers.find(p => p.slot === s.slot); return sp?.playerId || ''; });
    const updated = [...presets, { name: presetName, formation: selectedFormation, playerIds: ids }];
    if (updated.length > 5) updated.shift();
    localStorage.setItem(PRESET_KEY, JSON.stringify(updated));
    setPresets(updated);
    setPresetName(''); setShowPresets(false);
  };
  const applyPreset = (preset: LineupPreset) => {
    const fmts = availableFormations;
    const formation = fmts.find(f => f.id === preset.formation) || fmts[0];
    const slots: { pos: string; slot: number }[] = [];
    let idx = 0;
    for (const s of formation.slots) { for (let i = 0; i < s.count; i++) slots.push({ pos: s.pos, slot: idx++ }); }
    const lineup: LineupPlayer[] = [];
    slots.forEach((s, i) => {
      if (preset.playerIds[i] && effectiveHoldings.some(h => h.id === preset.playerIds[i] && !h.isLocked))
        lineup.push({ playerId: preset.playerIds[i], position: s.pos, slot: s.slot, isLocked: false });
    });
    onApplyPreset(preset.formation, lineup);
    setShowPresets(false);
  };
  const deletePreset = (index: number) => {
    const updated = [...presets]; updated.splice(index, 1);
    localStorage.setItem(PRESET_KEY, JSON.stringify(updated));
    setPresets(updated);
    setShowPresets(false);
  };

  return (
    <div className="space-y-4">
      {/* Status banner -- fully locked */}
      {isFullyLocked && !isScored && (
        <div className="flex items-center gap-2 p-3 bg-surface-subtle border border-white/10 rounded-lg">
          <Lock aria-hidden="true" className="size-4 text-white/40" />
          <span className="text-sm text-white/50">{t('eventEndedBanner')}</span>
        </div>
      )}
      {/* Status banner -- partially locked (per-fixture) */}
      {isPartiallyLocked && !isScored && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <Lock aria-hidden="true" className="size-4 text-amber-400" />
          <span className="text-sm text-amber-300">{t('partiallyLockedBanner')}</span>
          {nextKickoff && (
            <span className="text-xs text-amber-400/60 ml-auto font-mono tabular-nums">
              {t('nextKickoffLabel', { time: new Date(nextKickoff).toLocaleTimeString(locale === 'tr' ? 'tr-TR' : 'de-DE', { hour: '2-digit', minute: '2-digit' }) })}
            </span>
          )}
        </div>
      )}
      {/* Status banner -- all fixtures running */}
      {event.status === 'running' && !isPartiallyLocked && !isScored && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <Play aria-hidden="true" className="size-4 text-green-400" />
          <span className="text-sm text-green-300">{t('allRunningBanner')}</span>
        </div>
      )}
      {/* Progressive Score Banner */}
      {event.status === 'running' && event.isJoined && progressiveScores.size > 0 && !isScored && (
        <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 aria-hidden="true" className="size-4 text-green-400" />
            <span className="text-xs font-semibold text-green-300">{t('livePointsLabel')}</span>
          </div>
          <div className="text-sm font-mono font-bold text-green-400 tabular-nums">
            {(() => {
              let total = 0;
              let playersScored = 0;
              formationSlots.forEach(slot => {
                const player = getSelectedPlayer(slot.slot);
                if (!player) return;
                const score = progressiveScores.get(player.id);
                if (score == null) return;
                const isCpt = captainSlot === slotDbKeys[slot.slot];
                total += isCpt ? Math.min(225, Math.round(score * 1.5)) : score;
                playersScored++;
              });
              return t('livePtsCount', { total, scored: playersScored, max: formationSlots.length });
            })()}
          </div>
        </div>
      )}
      {isScored && (
        <div className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <Award aria-hidden="true" className="size-4 text-purple-400" />
          <span className="text-sm text-purple-300 font-bold">
            {scoringJustFinished ? t('gwScoredResults') : t('statusScored')}
            {event.scoredAt && !scoringJustFinished && (
              <span className="font-normal text-purple-300/60"> {t('scoredAt', { date: new Date(event.scoredAt).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) })}</span>
            )}
          </span>
        </div>
      )}
      {/* Formation Selector + Presets Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={selectedFormation}
          onChange={(e) => onFormationChange(e.target.value)}
          disabled={isReadOnly}
          className={`px-3 py-2 min-h-[44px] bg-white/5 border border-white/10 rounded-lg text-sm font-bold ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {availableFormations.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        {!isReadOnly && (
          <>
            <div className="flex-1" />
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="px-3 py-2 min-h-[44px] bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors flex items-center gap-1"
            >
              <Briefcase aria-hidden="true" className="size-3.5" /> {t('presetsLabel')}
            </button>
          </>
        )}
      </div>

      {/* Presets Dropdown */}
      {showPresets && (
        <div className="p-3 bg-surface-subtle rounded-lg border border-white/10 space-y-2">
          <div className="text-xs font-bold text-white/60 mb-2">{t('presetsTitle')}</div>
          {presets.map((preset, i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-surface-base rounded-lg">
              <button onClick={() => applyPreset(preset)} className="text-sm font-medium hover:text-gold transition-colors flex-1 text-left">
                {preset.name} <span className="text-white/30 text-xs">({preset.formation})</span>
              </button>
              <button onClick={() => deletePreset(i)} aria-label={t('deletePresetLabel')} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-red-500/20 rounded text-red-400">
                <X aria-hidden="true" className="size-3" />
              </button>
            </div>
          ))}
          {presets.length === 0 && <div className="text-xs text-white/30 text-center py-2">{t('noPresets')}</div>}
          <div className="flex gap-2 mt-2">
            <input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder={t('presetNamePlaceholder')}
              className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs"
            />
            <button
              onClick={savePreset}
              disabled={!presetName.trim() || selectedPlayers.length === 0}
              className="px-3 py-1.5 bg-gold/20 text-gold rounded-lg text-xs font-bold disabled:opacity-30"
            >
              {t('saveBtn')}
            </button>
          </div>
        </div>
      )}

      {/* Formation Display -- Pitch with Markings & Sponsor Zones */}
      <div className="rounded-xl overflow-hidden border border-green-500/20">
        {/* Sponsor Banner Top (Bandenwerbung) */}
        <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#1a1a2e] px-4 py-2.5 flex items-center justify-center gap-3 border-b border-white/10">
          {event.sponsorLogo ? (
            <img src={event.sponsorLogo} alt={event.sponsorName || 'Sponsor'} className="h-5 w-auto object-contain" />
          ) : (
            <div className="size-5 rounded bg-gold/20 flex items-center justify-center">
              <Sparkles aria-hidden="true" className="size-3 text-gold" />
            </div>
          )}
          <span className="text-xs font-bold text-white/50 uppercase">{event.sponsorName || tsp('sponsorPlaceholder')}</span>
          {event.sponsorLogo ? (
            <img src={event.sponsorLogo} alt="" className="h-5 w-auto object-contain" />
          ) : (
            <div className="size-5 rounded bg-gold/20 flex items-center justify-center">
              <Sparkles aria-hidden="true" className="size-3 text-gold" />
            </div>
          )}
        </div>

        {/* Pitch */}
        <div className="relative bg-gradient-to-b from-[#1a5c1a]/40 via-[#1e6b1e]/30 to-[#1a5c1a]/40 px-3 md:px-6 py-4 md:py-5">
          {/* Pitch Markings (SVG overlay) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 400 500">
            {/* Outer border */}
            <rect x="20" y="15" width="360" height="470" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="1.5" />
            {/* Center line */}
            <line x1="20" y1="250" x2="380" y2="250" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
            {/* Center circle */}
            <circle cx="200" cy="250" r="50" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
            <circle cx="200" cy="250" r="3" fill="white" fillOpacity="0.1" />
            {/* Top penalty area */}
            <rect x="100" y="15" width="200" height="80" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
            <rect x="140" y="15" width="120" height="35" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
            {/* Bottom penalty area */}
            <rect x="100" y="405" width="200" height="80" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
            <rect x="140" y="450" width="120" height="35" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
            {/* Grass stripes */}
            {[0, 1, 2, 3, 4].map(i => (
              <rect key={i} x="20" y={15 + i * 94} width="360" height="47" fill="white" fillOpacity="0.015" />
            ))}
          </svg>

          {/* Midfield Sponsor (Center Circle) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="size-20 rounded-full border border-white/[0.06] flex items-center justify-center">
              {event.sponsorLogo ? (
                <img src={event.sponsorLogo} alt="" className="size-12 object-contain opacity-30" />
              ) : (
                <span className="text-xs text-white/15 font-bold uppercase">Sponsor</span>
              )}
            </div>
          </div>

          <div className="text-xs text-white/40 text-center mb-3 relative z-10">Formation: {selectedFormation}</div>

          <div className="space-y-6 relative z-10">
            {/* Render each position group dynamically */}
            {['ATT', 'MID', 'DEF', 'GK'].map(posGroup => {
              const posSlots = formationSlots.filter(s => s.pos === posGroup);
              if (posSlots.length === 0) return null;
              return (
                <div key={posGroup} className={`flex justify-center ${posSlots.length > 1 ? 'gap-6 md:gap-16' : ''}`}>
                  {posSlots.map(slot => {
                    const player = getSelectedPlayer(slot.slot);
                    const pStatus = player ? getPlayerStatusStyle(player.status) : null;
                    const finalScore = (isScored && slotScores) ? slotScores[slotDbKeys[slot.slot]] : undefined;
                    const liveScore = (!isScored && event?.status === 'running' && player)
                      ? progressiveScores.get(player.id) ?? undefined
                      : undefined;
                    const slotScore = finalScore ?? liveScore;
                    const hasScore = slotScore != null;
                    const isLiveScore = !isScored && liveScore != null;
                    const isCaptain = captainSlot === slotDbKeys[slot.slot];
                    const isOwnedPlayer = player ? (ownedPlayerIds?.has(player.id) ?? false) : false;
                    const hasActiveBonus = player ? ownershipBonusIds.has(player.id) : false;
                    const slotLocked = player ? isPlayerLocked(player.id) : false;
                    const slotReadOnly = isReadOnly || slotLocked;
                    return (
                      <div key={slot.slot} className="flex flex-col items-center relative">
                        {/* DPC Ownership Bonus badge (bottom-left) */}
                        {player && isOwnedPlayer && !hasScore && (
                          <div className={cn(
                            'absolute -bottom-1 -left-2 z-30 px-1 py-0.5 rounded text-[9px] font-black shadow-lg',
                            hasActiveBonus
                              ? 'bg-gold/90 text-black'
                              : 'bg-white/10 text-white/30'
                          )}>DPC +5%</div>
                        )}
                        {/* LIVE badge for locked players (only if no score yet) */}
                        {player && slotLocked && !hasScore && (
                          <div className="absolute -top-2 -right-2 z-30 px-1.5 py-0.5 rounded bg-green-500 text-xs font-black text-white shadow-lg animate-pulse">LIVE</div>
                        )}
                        {/* Captain Crown (top-left) */}
                        {player && isCaptain && (
                          <div className="absolute -top-2 -left-2 z-30 size-5 rounded-full bg-gold flex items-center justify-center shadow-lg">
                            <Crown aria-hidden="true" className="size-3 text-black" />
                          </div>
                        )}
                        {/* Captain x1.5 badge (scored view) */}
                        {player && hasScore && isCaptain && (
                          <div className="absolute -top-2 left-4 z-30 px-1 py-0.5 rounded bg-gold/90 text-xs font-black text-black shadow-lg">&times;1.5</div>
                        )}
                        {/* Score badge (top-right, overlapping circle) -- final or live */}
                        {player && hasScore && (
                          <div
                            className={cn(
                              "absolute -top-2 -right-3 z-20 min-w-[2rem] px-1.5 py-0.5 rounded-full text-xs font-mono font-black text-center shadow-lg",
                              isLiveScore && "ring-1 ring-green-400/50"
                            )}
                            style={{
                              backgroundColor: slotScore >= 100 ? '#FFD700' : slotScore >= 70 ? 'rgba(255,255,255,0.9)' : '#ff6b6b',
                              color: slotScore >= 100 ? '#000' : slotScore >= 70 ? '#000' : '#fff',
                            }}
                          >
                            {slotScore}
                          </div>
                        )}
                        <button
                          onClick={() => !slotReadOnly && (player ? onRemovePlayer(slot.slot) : setShowPlayerPicker({ position: slot.pos, slot: slot.slot }))}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            if (!isReadOnly && player) {
                              // Captain can only be set/changed on unlocked slots
                              if (slotLocked && !isCaptain) return;
                              setCaptainSlot(isCaptain ? null : slotDbKeys[slot.slot]);
                            }
                          }}
                          onDoubleClick={() => {
                            if (!isReadOnly && player) {
                              if (slotLocked && !isCaptain) return;
                              setCaptainSlot(isCaptain ? null : slotDbKeys[slot.slot]);
                            }
                          }}
                          className={`flex flex-col items-center ${slotReadOnly ? 'cursor-default' : ''}`}
                        >
                        <div
                          className={`size-11 md:size-14 rounded-full flex items-center justify-center border-2 transition-colors overflow-hidden ${player
                            ? hasScore
                              ? 'bg-black/40'
                              : player.status === 'injured' ? 'bg-red-500/20 border-red-400' :
                                player.status === 'suspended' ? 'bg-orange-500/20 border-orange-400' :
                                  'bg-black/30'
                            : 'bg-white/5 border-dashed hover:brightness-125'
                          }`}
                          style={{
                            borderColor: player && isCaptain && !hasScore ? '#FFD700'
                              : player && !hasScore && player.status !== 'injured' && player.status !== 'suspended'
                                ? getPosAccentColor(player.pos)
                                : player && hasScore
                                  ? getScoreColor(slotScore!)
                                  : !player ? getPosAccentColor(slot.pos) + '60' : undefined,
                            boxShadow: player && isCaptain && !hasScore ? '0 0 12px rgba(255,215,0,0.3)'
                              : player && hasScore ? `0 0 12px ${getScoreColor(slotScore!)}40` : undefined,
                          }}
                        >
                          {player ? (
                            <PlayerPhoto imageUrl={player.imageUrl} first={player.first} last={player.last} pos={player.pos as Pos} size={44} className="md:size-14" />
                          ) : (
                            <Plus aria-hidden="true" className="size-5 text-white/30" />
                          )}
                        </div>
                        {pStatus && !hasScore && pStatus.icon !== '\u{1F7E2}' && !isCaptain && (
                          <span className="absolute -top-1 -right-1 text-xs">{pStatus.icon}</span>
                        )}
                        <div className="text-xs mt-1" style={{ color: player ? (hasScore ? '#ffffffcc' : isCaptain ? '#FFD700' : getPosAccentColor(player.pos) + 'aa') : getPosAccentColor(slot.pos) + '80' }}>
                          {player ? player.last.slice(0, 8) : slot.pos}
                        </div>
                        {player && !hasScore && (
                          <div className="text-xs text-white/30">L5: {player.perfL5} &bull; {player.dpcAvailable}/{player.dpcOwned}</div>
                        )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sponsor Banner Bottom (Bandenwerbung unten) */}
        <div className="bg-gradient-to-r from-[#1a1a2e] via-[#0f3460] to-[#1a1a2e] px-3 py-2 flex items-center justify-between border-t border-white/10">
          <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.04] rounded-lg border border-white/[0.06]">
            {event.sponsorLogo ? (
              <img src={event.sponsorLogo} alt="" className="h-4 w-auto object-contain" />
            ) : (
              <div className="size-4 rounded bg-gold/20 flex items-center justify-center">
                <Building2 aria-hidden="true" className="size-2.5 text-gold/60" />
              </div>
            )}
            <span className="text-xs text-white/30 font-medium">{event.sponsorName || 'Sponsor Logo'}</span>
          </div>
          <span className="text-xs text-white/20 font-bold uppercase">{event.sponsorName ? `${event.sponsorName} \u00d7 BeScout` : 'Powered by BeScout'}</span>
          <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.04] rounded-lg border border-white/[0.06]">
            {event.sponsorLogo ? (
              <img src={event.sponsorLogo} alt="" className="h-4 w-auto object-contain" />
            ) : (
              <div className="size-4 rounded bg-gold/20 flex items-center justify-center">
                <Building2 aria-hidden="true" className="size-2.5 text-gold/60" />
              </div>
            )}
            <span className="text-xs text-white/30 font-medium">{event.sponsorName || 'Sponsor Logo'}</span>
          </div>
        </div>
      </div>

      {/* Team Score Banner (only when scored) */}
      {isScored && myTotalScore != null && (
        <div className={`relative overflow-hidden rounded-xl border ${scoringJustFinished ? 'border-gold/40' : 'border-gold/20'}`}>
          <div className="absolute inset-0 bg-gold/[0.08]" />
          {scoringJustFinished && <div className="absolute inset-0 bg-gold/5 animate-pulse motion-reduce:animate-none" />}
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 md:p-5 gap-3 sm:gap-0">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl bg-gold/20 flex items-center justify-center">
                <Trophy aria-hidden="true" className="size-6 text-gold" />
              </div>
              <div>
                <div className="text-xs text-white/50 uppercase font-bold">{t('yourTeamScore')}</div>
                <div className="text-3xl font-mono font-black text-gold">{myTotalScore} <span className="text-lg">{t('ptsShort')}</span></div>
              </div>
            </div>
            <div className="flex items-center gap-5">
              {myRank && (
                <div className="text-right">
                  <div className="text-xs text-white/50 uppercase font-bold">{t('placementLabel')}</div>
                  <div className={`text-3xl font-mono font-black ${myRank === 1 ? 'text-gold' : myRank <= 3 ? 'text-green-500' : 'text-white'}`}>
                    #{myRank}
                  </div>
                </div>
              )}
              {(() => {
                const myEntry = leaderboard.find(e => e.userId === userId);
                if (myEntry && myEntry.rewardAmount > 0) {
                  return (
                    <div className="text-right">
                      <div className="text-xs text-white/50 uppercase font-bold">{t('rewardLabel')}</div>
                      <div className="text-xl font-mono font-black text-green-500">+{fmtScout(myEntry.rewardAmount / 100)} $SCOUT</div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Post-Game Nudge: Trading */}
      {isScored && myRank && myRank > 3 && (
        <Link href="/market?tab=kaufen" onClick={onClose}>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gold/[0.06] border border-gold/15 hover:border-gold/30 transition-colors">
            <div className="size-8 rounded-lg bg-gold/15 flex items-center justify-center flex-shrink-0">
              <Zap aria-hidden="true" className="size-4 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white">{t('strengthenPortfolio')}</div>
              <div className="text-xs text-white/40">{t('portfolioHint')}</div>
            </div>
            <ChevronRight aria-hidden="true" className="size-4 text-white/30 flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* Scored OR Progressive Player Breakdown List */}
      {((isScored && slotScores) || (event?.status === 'running' && progressiveScores.size > 0)) && (
        <div className="space-y-1.5">
          <div className="text-xs text-white/40 font-bold uppercase px-1">
            {isScored ? t('scoreBreakdownLabel') : t('liveBreakdownLabel')}
          </div>
          {formationSlots.map(slot => {
            const player = getSelectedPlayer(slot.slot);
            const scoreKey = slotDbKeys[slot.slot];
            const score = isScored
              ? slotScores?.[scoreKey]
              : progressiveScores.get(player?.id ?? '');
            if (!player || score == null) return null;
            const isCpt = captainSlot === scoreKey;
            const displayScore = isCpt ? Math.min(225, Math.round(score * 1.5)) : score;
            const tier = getScoreTier(isScored ? score : displayScore);
            const tierCfg = tier !== 'none' ? SCORE_TIER_CONFIG[tier] : null;
            return (
              <div key={slot.slot} className={`flex items-center justify-between p-3 rounded-lg bg-surface-base border ${isCpt ? 'border-gold/30' : 'border-white/[0.06]'}`}>
                <div className="flex items-center gap-3">
                  {isCpt ? (
                    <div className="size-6 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                      <Crown aria-hidden="true" className="size-3.5 text-gold" />
                    </div>
                  ) : (
                    <PositionBadge pos={player.pos as Pos} size="sm" />
                  )}
                  <div>
                    <div className="font-medium text-sm flex items-center gap-1.5">
                      {player.first} {player.last}
                      {isCpt && <span className="text-xs font-bold text-gold bg-gold/10 px-1 rounded">C &times;1.5</span>}
                      {ownershipBonusIds.has(player.id) && <span className="text-[10px] font-bold text-gold bg-gold/[0.08] border border-gold/20 px-1 py-0.5 rounded">DPC +5%</span>}
                    </div>
                    <div className="text-xs text-white/40 flex items-center gap-1.5">
                      {player.club}
                      {tierCfg && (
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${tierCfg.bg} ${tierCfg.color}`}>
                          {tierCfg.labelDe} +{tierCfg.bonusCents / 100} $SCOUT
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (score / 150) * 100)}%`,
                        backgroundColor: getScoreColor(score),
                      }}
                    />
                  </div>
                  <span className="font-mono font-bold text-sm min-w-[3rem] text-right" style={{ color: getScoreColor(score) }}>
                    {score}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Synergy Bonus (scored view) */}
      {isScored && synergyPreview.totalPct > 0 && (
        <div className="flex items-center gap-3 p-3 bg-sky-500/5 border border-sky-500/20 rounded-lg">
          <Building2 aria-hidden="true" className="size-5 text-sky-400 flex-shrink-0" />
          <div>
            <div className="text-sm font-bold text-sky-300">{t('synergyBonus', { pct: synergyPreview.totalPct })}</div>
            <div className="text-xs text-white/40">
              {synergyPreview.details.map(d => `${d.source} (${d.bonus_pct}%)`).join(' + ')}
            </div>
          </div>
        </div>
      )}

      {/* Ownership Bonus (scored view) */}
      {isScored && ownershipBonusIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-gold/5 border border-gold/20 rounded-lg">
          <Briefcase aria-hidden="true" className="size-5 text-gold flex-shrink-0" />
          <div>
            <div className="text-sm font-bold text-gold">{t('ownershipBonus')}: +5%</div>
            <div className="text-xs text-white/40">
              {t('ownershipBonusActive', { count: ownershipBonusIds.size })}
            </div>
          </div>
        </div>
      )}

      {/* CTA to Leaderboard */}
      {isScored && (
        <button
          onClick={onSwitchToLeaderboard}
          className="w-full flex items-center justify-center gap-2 p-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-colors text-sm font-bold text-white/70 hover:text-white"
        >
          <BarChart3 aria-hidden="true" className="size-4" />
          {t('showRanking')}
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      )}

      {/* Captain Selection Hint */}
      {!isScored && !isReadOnly && selectedPlayers.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-gold/5 border border-gold/20 rounded-lg">
          <Crown aria-hidden="true" className="size-4 text-gold" />
          <span className="text-xs text-gold/80">
            {captainSlot ? t('captainSet', { name: (() => { const idx = slotDbKeys.indexOf(captainSlot); const p = idx >= 0 ? getSelectedPlayer(idx) : null; return p ? `${p.first} ${p.last}` : captainSlot; })() }) : t('captainHint')}
          </span>
          {captainSlot && (() => {
            const captainIdx = slotDbKeys.indexOf(captainSlot);
            const captainPlayer = captainIdx >= 0 ? getSelectedPlayer(captainIdx) : null;
            const captainLocked = captainPlayer ? isPlayerLocked(captainPlayer.id) : false;
            return !captainLocked ? (
              <button onClick={() => setCaptainSlot(null)} className="ml-auto text-xs text-white/40 hover:text-white/60">{t('captainRemove')}</button>
            ) : (
              <span className="ml-auto text-xs text-white/20">{t('captainLocked')}</span>
            );
          })()}
        </div>
      )}

      {/* Synergy Banner (during lineup building) */}
      {!isScored && !isReadOnly && synergyPreview.totalPct > 0 && (
        <div className="flex items-center gap-2 p-3 bg-sky-500/5 border border-sky-500/20 rounded-lg">
          <Building2 aria-hidden="true" className="size-4 text-sky-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-sky-300 font-bold">Synergy +{synergyPreview.totalPct}%</span>
            <span className="text-xs text-white/40 ml-2">
              {synergyPreview.details.map(d => `${d.source} \u00d7${Math.ceil(d.bonus_pct / 5) + 1}`).join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* DPC Ownership Bonus Banner (during lineup building) */}
      {!isScored && ownedPlayerIds && ownedPlayerIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-gold/[0.06] border border-gold/20 rounded-lg">
          <Briefcase aria-hidden="true" className="size-4 text-gold flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-gold font-bold">{t('ownershipBonus')}</span>
            <span className="text-xs text-white/40 ml-2">{t('ownershipBonusDesc')}</span>
          </div>
          <span className={cn(
            'text-xs font-mono font-bold px-2 py-0.5 rounded',
            ownershipBonusIds.size > 0
              ? 'bg-gold/15 text-gold'
              : 'bg-white/5 text-white/30'
          )}>
            {ownershipBonusIds.size > 0
              ? t('ownershipBonusActive', { count: ownershipBonusIds.size })
              : t('ownershipBonusInactive')}
          </span>
        </div>
      )}

      {/* Lineup Status (only when not scored -- no need to show "3/6 selected" after scoring) */}
      {!isScored && !isReadOnly && (
        isLineupComplete ? (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
            <CheckCircle2 aria-hidden="true" className="size-5 text-green-500 shrink-0" />
            <span className="text-sm font-bold text-green-500">{t('lineupComplete')}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-surface-subtle rounded-lg">
            <span className="text-sm text-white/60">{t('playersSelected', { n: selectedPlayers.length, m: formationSlots.length })}</span>
            {!reqCheck.ok && (
              <span className="text-xs text-orange-400 flex items-center gap-1">
                <AlertCircle aria-hidden="true" className="size-3" />
                {reqCheck.message}
              </span>
            )}
          </div>
        )
      )}

      {/* Player List with Stats & Status -- hidden when fully locked or scored */}
      {!isReadOnly && !isScored && <div className="space-y-2">
        <div className="text-sm font-bold text-white/70">{t('yourPlayers')}</div>
        {effectiveHoldings.map(player => {
          const isSelected = selectedPlayers.some(sp => sp.playerId === player.id);
          const fixtureLocked = isPlayerLocked(player.id);
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isSelected ? 'bg-green-500/10 border-green-500/30' :
                fixtureLocked ? 'bg-green-500/5 border-green-500/10 opacity-60' :
                player.isLocked ? 'bg-surface-base border-white/5 opacity-50' :
                  player.status === 'injured' ? 'bg-red-500/5 border-red-500/20' :
                    player.status === 'suspended' ? 'bg-orange-500/5 border-orange-500/20' :
                      `bg-surface-base ${getPosBorderColor(player.pos)} hover:border-opacity-60`
                }`}
            >
              <div className="flex items-center gap-3">
                <PlayerIdentity
                  player={{ first: player.first, last: player.last, pos: player.pos as Pos, status: player.status, club: player.club, ticket: 0, age: 0, imageUrl: player.imageUrl }}
                  size="sm"
                  showMeta={false}
                />
                <div className="text-xs text-white/40 flex items-center flex-wrap gap-1">
                  <span className={fixtureLocked ? 'text-green-400' : player.isLocked ? 'text-orange-400' : player.dpcAvailable < player.dpcOwned ? 'text-yellow-400' : 'text-white/40'}>{player.dpcAvailable}/{player.dpcOwned} DPC</span>
                  {player.eventsUsing > 0 && <span className="text-white/30">({player.eventsUsing} Event{player.eventsUsing > 1 ? 's' : ''})</span>}
                  {isSelected && ownedPlayerIds?.has(player.id) && (
                    <span className={cn(
                      'px-1 py-0.5 rounded text-[10px] font-bold border',
                      ownershipBonusIds.has(player.id)
                        ? 'bg-gold/[0.08] border-gold/20 text-gold'
                        : 'bg-surface-subtle border-white/10 text-white/30'
                    )}>+5%</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-white/50">L5: <span className={`font-mono font-bold ${getL5Color(player.perfL5)}`}>{player.perfL5}</span></div>
                  <div className="text-xs text-white/30">{player.goals}T {player.assists}A {player.matches}S</div>
                </div>
                {fixtureLocked ? (
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <Play aria-hidden="true" className="size-3" /> LIVE
                  </span>
                ) : player.isLocked ? (
                  <span className="text-xs text-orange-400 flex items-center gap-1" title={`In ${player.eventsUsing} Events`}>
                    <Lock aria-hidden="true" className="size-3" /> {t('allDeployed')}
                  </span>
                ) : isSelected ? (
                  <CheckCircle2 aria-hidden="true" className="size-4 text-green-500" />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>}

      {/* Player Picker Modal -- Enhanced with Search, Sort, Stats, Status */}
      {showPlayerPicker && (() => {
        const POS_LABEL: Record<string, string> = { GK: t('posGK'), DEF: t('posDEF'), MID: t('posMID'), ATT: t('posATT') };
        let availablePlayers = getAvailablePlayersForPosition(showPlayerPicker.position);
        // Apply local search filter
        if (pickerSearch) {
          const q = pickerSearch.toLowerCase();
          availablePlayers = availablePlayers.filter(h => `${h.first} ${h.last} ${h.club}`.toLowerCase().includes(q));
        }
        // Apply local sort
        availablePlayers = [...availablePlayers].sort((a, b) => {
          if (pickerSort === 'l5') return b.perfL5 - a.perfL5;
          if (pickerSort === 'dpc') return b.dpcAvailable - a.dpcAvailable;
          return a.last.localeCompare(b.last);
        });
        return (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/60 z-[60] animate-in fade-in duration-200" onClick={() => { setShowPlayerPicker(null); setPickerSearch(''); }} />
            {/* Mobile: bottom sheet | Desktop: centered modal */}
            <div className="fixed inset-x-0 bottom-0 z-[60] bg-bg-main flex flex-col max-h-[85dvh] rounded-t-3xl border-t border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-300 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[calc(100%-2rem)] md:max-w-md md:max-h-[70vh] md:rounded-xl md:border md:border-white/10 md:bottom-auto">
              {/* Swipe handle (mobile) */}
              <div className="flex justify-center pt-2 pb-1 md:hidden">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              {/* Sticky Header */}
              <div className="shrink-0 bg-bg-main border-b border-white/10">
                {/* Top bar: Back + Title + Count + Sort */}
                <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                  <button
                    onClick={() => { setShowPlayerPicker(null); setPickerSearch(''); }}
                    aria-label={t('closePickerLabel')}
                    className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <X aria-hidden="true" className="size-5 text-white/60" />
                  </button>
                  <div className="flex-1">
                    <h3 className="font-black text-base">
                      {t('selectPos', { pos: POS_LABEL[showPlayerPicker.position] || showPlayerPicker.position })}
                    </h3>
                    <div className="text-xs text-white/40">{t('availableCount', { count: availablePlayers.length })}</div>
                  </div>
                  {/* Sort pills */}
                  <div className="flex items-center gap-0.5">
                    {(['l5', 'name'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setPickerSort(s === 'l5' ? 'l5' : 'name')}
                        className={cn('px-2 py-1 rounded text-xs font-bold min-h-[44px]',
                          pickerSort === s ? 'bg-gold/15 text-gold' : 'text-white/30'
                        )}
                      >{s === 'l5' ? 'L5' : 'A-Z'}</button>
                    ))}
                  </div>
                </div>
                {/* Search */}
                <div className="px-4 pb-2.5">
                  <div className="relative">
                    <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-white/30" />
                    <input
                      type="text"
                      placeholder={t('searchPlayerPlaceholder')}
                      value={pickerSearch}
                      onChange={e => setPickerSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/30"
                    />
                  </div>
                </div>
              </div>

              {/* Scrollable Player List */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {availablePlayers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <PositionBadge pos={showPlayerPicker.position as Pos} size="lg" />
                    <div className="text-sm text-white/30 mt-3 text-center">
                      {t('noPosAvailable', { pos: POS_LABEL[showPlayerPicker.position] || t('playersLabel') })}
                    </div>
                    <Link
                      href="/market?tab=kaufen"
                      onClick={() => { setShowPlayerPicker(null); setPickerSearch(''); }}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-gold/15 text-gold text-xs font-bold rounded-xl hover:bg-gold/25 transition-colors"
                    >
                      <ShoppingCart aria-hidden="true" className="size-3.5" />
                      {t('buyPlayer')}
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {availablePlayers.map(player => {
                      const scoreColor = player.perfL5 >= 70 ? 'text-green-500' : player.perfL5 >= 50 ? 'text-white' : 'text-red-300';
                      return (
                        <button
                          key={player.id}
                          onClick={() => {
                            onSelectPlayer(player.id, showPlayerPicker.position, showPlayerPicker.slot);
                            setShowPlayerPicker(null);
                            setPickerSearch('');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-white/[0.06] transition-colors text-left"
                        >
                          {/* Identity */}
                          <PlayerIdentity
                            player={{ first: player.first, last: player.last, pos: player.pos as Pos, status: player.status, club: player.club, ticket: 0, age: 0, imageUrl: player.imageUrl }}
                            size="md"
                            className="flex-1 min-w-0"
                          />
                          {/* DPC Ownership bonus indicator */}
                          {ownedPlayerIds?.has(player.id) && (
                            <span className={cn(
                              'shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold border',
                              ownershipBonusIds.size < 3
                                ? 'bg-gold/[0.08] border-gold/20 text-gold'
                                : 'bg-surface-subtle border-white/10 text-white/30'
                            )}>DPC +5%</span>
                          )}
                          {/* Stats + Score */}
                          <div className="shrink-0 flex items-center gap-2.5">
                            {/* Compact stats */}
                            <div className="flex flex-col items-end gap-0.5">
                              <div className="flex gap-1">
                                {player.goals > 0 && <span className="text-xs font-mono bg-white/5 px-1 py-0.5 rounded text-white/50">{player.goals}T</span>}
                                {player.assists > 0 && <span className="text-xs font-mono bg-white/5 px-1 py-0.5 rounded text-white/50">{player.assists}A</span>}
                              </div>
                              <span className="text-xs text-white/25 font-mono">{player.dpcAvailable}/{player.dpcOwned} DPC</span>
                            </div>
                            {/* L5 Score -- prominent */}
                            <div className="w-10 text-right">
                              <div className={cn('text-lg font-black font-mono leading-none', scoreColor)}>
                                {player.perfL5}
                              </div>
                              <div className="text-xs text-white/25 font-mono">L5</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
