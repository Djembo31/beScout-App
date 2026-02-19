'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Trophy, Users, Clock, Star, Shield, Award, Crown,
  ChevronRight, Search, Lock,
  CheckCircle2, AlertCircle, Play, Medal,
  Briefcase, Coins, Layers, Zap,
  Plus, Save, Eye, Sparkles, Building2,
  MessageCircle, X, RefreshCw, Heart,
  ChevronLeft, BarChart3, History, Swords,
} from 'lucide-react';
import { getScoreTier, SCORE_TIER_CONFIG, calculateSynergyPreview } from '@/types';
import type { SynergyDetail } from '@/types';
import { Card, Button, Chip } from '@/components/ui';
import { PositionBadge } from '@/components/player';
import { useUser } from '@/components/providers/AuthProvider';
import { centsToBsd } from '@/lib/services/players';
import { getLineup, removeLineup, getEventParticipants, getEventParticipantCount, getLineupWithPlayers } from '@/lib/services/lineups';
import type { LineupWithPlayers } from '@/lib/services/lineups';
import { resetEvent, getEventLeaderboard } from '@/lib/services/scoring';
import type { LeaderboardEntry } from '@/lib/services/scoring';
import { fmtBSD } from '@/lib/utils';
import type { Pos } from '@/types';
import type { FantasyEvent, EventDetailTab, LineupPlayer, UserDpcHolding, LineupPreset } from './types';
import { FORMATIONS_6ER, PRESET_KEY } from './constants';
import {
  getStatusStyle, getTypeStyle, getPosBorderColor,
  SLOT_SCORE_KEYS, getScoreColor, getPosAccentColor, formatCountdown,
} from './helpers';
import EventCommunityTab from './EventCommunityTab';
import SponsorBanner from '@/components/player/detail/SponsorBanner';

export const EventDetailModal = ({
  event,
  isOpen,
  onClose,
  onJoin,
  onLeave,
  onReset,
  userHoldings,
}: {
  event: FantasyEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onJoin: (event: FantasyEvent, lineup: LineupPlayer[], formation: string, captainSlot: string | null) => void;
  onLeave: (event: FantasyEvent) => void;
  onReset: (event: FantasyEvent) => void;
  userHoldings: UserDpcHolding[];
}) => {
  const { user } = useUser();
  const [tab, setTab] = useState<EventDetailTab>('overview');
  const [selectedPlayers, setSelectedPlayers] = useState<LineupPlayer[]>([]);
  const [showPlayerPicker, setShowPlayerPicker] = useState<{ position: string; slot: number } | null>(null);
  const [selectedFormation, setSelectedFormation] = useState('1-2-2-1');
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerSort, setPickerSort] = useState<'l5' | 'dpc' | 'name'>('l5');
  const [presetName, setPresetName] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [participants, setParticipants] = useState<{ id: string; handle: string; display_name?: string; avatar_url?: string }[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [slotScores, setSlotScores] = useState<Record<string, number> | null>(null);
  const [myTotalScore, setMyTotalScore] = useState<number | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [scoringJustFinished, setScoringJustFinished] = useState(false);
  const [viewingUserLineup, setViewingUserLineup] = useState<{ entry: LeaderboardEntry; data: LineupWithPlayers } | null>(null);
  const [viewingUserLoading, setViewingUserLoading] = useState(false);
  const [captainSlot, setCaptainSlot] = useState<string | null>(null);
  const [showJoinConfirm, setShowJoinConfirm] = useState(false);

  // Set default tab based on join status when modal opens — reset transient state
  useEffect(() => {
    if (isOpen && event) {
      // If event is scored + user joined → show their lineup with scores. Otherwise leaderboard for non-participants
      setTab(event.scoredAt ? (event.isJoined ? 'lineup' : 'leaderboard') : event.isJoined ? 'lineup' : 'overview');
      setViewingUserLineup(null);
      setScoringJustFinished(false);
      setShowJoinConfirm(false);
    }
  }, [isOpen, event?.id]);

  // Load leaderboard when switching to tab or when event is scored
  useEffect(() => {
    if (isOpen && event && (tab === 'leaderboard' || event.scoredAt)) {
      setLeaderboardLoading(true);
      getEventLeaderboard(event.id)
        .then(setLeaderboard)
        .finally(() => setLeaderboardLoading(false));
    }
  }, [isOpen, event?.id, tab, event?.scoredAt]);


  // Handle reset event (testing tool)
  const handleResetEvent = async () => {
    if (!event || resetting) return;
    if (!confirm('Event wirklich zurücksetzen? Scores, Ranks und Rewards werden gelöscht.')) return;
    setResetting(true);
    try {
      const result = await resetEvent(event.id);
      if (result.success) {
        // Clear local scoring state
        setSlotScores(null);
        setMyTotalScore(null);
        setMyRank(null);
        setLeaderboard([]);
        setScoringJustFinished(false);
        setTab('overview');
        onReset(event);
        alert('Event wurde zurückgesetzt!');
      } else {
        alert(`Reset fehlgeschlagen: ${result.error}`);
      }
    } catch (e: unknown) {
      alert(`Fehler: ${e instanceof Error ? e.message : 'Unbekannt'}`);
    } finally {
      setResetting(false);
    }
  };

  // Load lineup & participants on open
  useEffect(() => {
    if (isOpen && event) {
      // Load participants (optimized: only top 10 + count)
      getEventParticipants(event.id, 10).then(setParticipants);
      getEventParticipantCount(event.id).then(count => setParticipantCount(Math.max(count, event.participants || 0)));

      if (event.isJoined && user) {
        getLineup(event.id, user.id).then(dbLineup => {
          if (dbLineup) {
            // Use persisted formation, fallback to default
            const savedFormation = dbLineup.formation || '1-2-2-1';
            setSelectedFormation(savedFormation);

            // Store scoring data for pitch display
            setSlotScores(dbLineup.slot_scores ?? null);
            setMyTotalScore(dbLineup.total_score);
            setMyRank(dbLineup.rank);
            setCaptainSlot(dbLineup.captain_slot ?? null);

            const formation = FORMATIONS_6ER.find(f => f.id === savedFormation) || FORMATIONS_6ER[0];
            const fSlots: { pos: string; slot: number }[] = [];
            let si = 0;
            for (const s of formation.slots) { for (let i = 0; i < s.count; i++) fSlots.push({ pos: s.pos, slot: si++ }); }

            // Map DB slot columns to formation slots in order
            const dbSlotValues = [
              dbLineup.slot_gk,
              dbLineup.slot_def1,
              dbLineup.slot_def2,
              dbLineup.slot_mid1,
              dbLineup.slot_mid2,
              dbLineup.slot_att,
            ];

            const finalLineup: LineupPlayer[] = [];
            fSlots.forEach((slot, i) => {
              const playerId = dbSlotValues[i];
              if (playerId) {
                finalLineup.push({ playerId, position: slot.pos, slot: slot.slot, isLocked: false });
              }
            });

            setSelectedPlayers(finalLineup);
          } else {
            // Lineup row exists (user is joined) but getLineup returned null
            // Could be a DB read error — reset cleanly
            setSelectedPlayers([]);
            setSelectedFormation('1-2-2-1');
            setSlotScores(null);
          }
        }).catch(() => {
          // Silent fail — reset lineup state
          setSelectedPlayers([]);
          setSelectedFormation('1-2-2-1');
          setSlotScores(null);
        });
      } else {
        // Reset if not joined
        setSelectedPlayers([]);
        setSelectedFormation('1-2-2-1');
      }
    }
  }, [isOpen, event?.id, event?.isJoined, user]);

  const handleLeave = async () => {
    if (!user || !event) return;
    if (confirm(`Möchtest du dich wirklich vom Event "${event.name}" abmelden?`)) {
      try {
        await removeLineup(event.id, user.id);
        onLeave(event);
        onClose();
      } catch (e: unknown) {
        alert(`Fehler beim Abmelden: ${e instanceof Error ? e.message : 'Unbekannter Fehler'}`);
      }
    }
  };

  if (!isOpen || !event) return null;

  const statusStyle = getStatusStyle(event.status);
  const typeStyle = getTypeStyle(event.type);
  const TypeIcon = typeStyle.icon;

  // Dynamic formation slots
  const currentFormation = FORMATIONS_6ER.find(f => f.id === selectedFormation) || FORMATIONS_6ER[0];
  const formationSlots: { pos: string; slot: number }[] = [];
  let slotIdx = 0;
  for (const s of currentFormation.slots) {
    for (let i = 0; i < s.count; i++) formationSlots.push({ pos: s.pos, slot: slotIdx++ });
  }

  // Free up 1 DPC for players already committed to THIS event (user is editing their own lineup)
  const effectiveHoldings = userHoldings.map(h => {
    if (h.activeEventIds.includes(event.id)) {
      const newEventsUsing = h.eventsUsing - 1;
      const newAvailable = Math.max(0, h.dpcOwned - newEventsUsing);
      return { ...h, eventsUsing: newEventsUsing, dpcAvailable: newAvailable, isLocked: newAvailable <= 0 };
    }
    return h;
  });

  const getPlayerStatusStyle = (s: UserDpcHolding['status']) => {
    switch (s) {
      case 'fit': return { icon: '🟢', label: 'Fit', color: 'text-[#22C55E]' };
      case 'injured': return { icon: '🔴', label: 'Verletzt', color: 'text-red-400' };
      case 'suspended': return { icon: '⛔', label: 'Gesperrt', color: 'text-orange-400' };
      case 'doubtful': return { icon: '🟡', label: 'Fraglich', color: 'text-yellow-400' };
      default: return { icon: '🟢', label: 'Fit', color: 'text-white/50' };
    }
  };

  const getSelectedPlayer = (slot: number) => {
    const selected = selectedPlayers.find(p => p.slot === slot);
    if (!selected) return null;
    return effectiveHoldings.find(h => h.id === selected.playerId);
  };

  // Synergy preview — detect club duos in selected lineup
  const synergyPreview = (() => {
    const clubs = selectedPlayers
      .map(sp => effectiveHoldings.find(h => h.id === sp.playerId)?.club)
      .filter(Boolean) as string[];
    return calculateSynergyPreview(clubs);
  })();

  const getAvailablePlayersForPosition = (position: string) => {
    const posMap: Record<string, string[]> = {
      'GK': ['GK'], 'DEF': ['DEF', 'CB', 'LB', 'RB'],
      'MID': ['MID', 'CM', 'CDM', 'CAM', 'LM', 'RM'],
      'ATT': ['ATT', 'FW', 'ST', 'CF', 'LW', 'RW'],
    };
    const validPos = posMap[position] || [position];
    const usedIds = selectedPlayers.map(p => p.playerId);
    let players = effectiveHoldings.filter(h =>
      validPos.some(vp => h.pos.toUpperCase().includes(vp)) && !usedIds.includes(h.id) && !h.isLocked
    );
    if (pickerSearch) {
      const q = pickerSearch.toLowerCase();
      players = players.filter(h => `${h.first} ${h.last} ${h.club}`.toLowerCase().includes(q));
    }
    return [...players].sort((a, b) => {
      if (pickerSort === 'l5') return b.perfL5 - a.perfL5;
      if (pickerSort === 'dpc') return b.dpcAvailable - a.dpcAvailable;
      return a.last.localeCompare(b.last);
    });
  };

  const handleSelectPlayer = (playerId: string, position: string, slot: number) => {
    setSelectedPlayers(prev => [...prev.filter(p => p.slot !== slot), { playerId, position, slot, isLocked: false }]);
    setShowPlayerPicker(null);
    setPickerSearch('');
  };

  const handleRemovePlayer = (slot: number) => setSelectedPlayers(prev => prev.filter(p => p.slot !== slot));
  const handleFormationChange = (fId: string) => { setSelectedFormation(fId); setSelectedPlayers([]); };

  const isLineupComplete = selectedPlayers.length === formationSlots.length;

  const checkRequirements = () => {
    if (event.requirements.minClubPlayers && event.requirements.specificClub) {
      const clubPlayers = selectedPlayers.filter(sp => {
        const player = effectiveHoldings.find(h => h.id === sp.playerId);
        return player?.club.toLowerCase().includes(event.requirements.specificClub!.toLowerCase());
      });
      if (clubPlayers.length < event.requirements.minClubPlayers) {
        return { ok: false, message: `Min. ${event.requirements.minClubPlayers} ${event.clubName}-Spieler erforderlich` };
      }
    }
    return { ok: true, message: '' };
  };

  const reqCheck = checkRequirements();

  const handleConfirmJoin = () => {
    if (!isLineupComplete) { alert('Bitte stelle deine komplette Aufstellung auf!'); return; }
    if (!reqCheck.ok) { alert(reqCheck.message); return; }
    setShowJoinConfirm(true);
  };

  const handleFinalJoin = () => {
    setShowJoinConfirm(false);
    onJoin(event, selectedPlayers, selectedFormation, captainSlot);
  };

  // Presets (localStorage)
  type LineupPreset = { name: string; formation: string; playerIds: string[] };
  const PRESET_KEY = 'bescout-lineup-presets';
  const loadPresets = (): LineupPreset[] => { try { return JSON.parse(localStorage.getItem(PRESET_KEY) || '[]'); } catch { return []; } };
  const savePreset = () => {
    if (!presetName.trim()) return;
    const presets = loadPresets();
    const ids = formationSlots.map(s => { const sp = selectedPlayers.find(p => p.slot === s.slot); return sp?.playerId || ''; });
    presets.push({ name: presetName, formation: selectedFormation, playerIds: ids });
    if (presets.length > 5) presets.shift();
    localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
    setPresetName(''); setShowPresets(false);
  };
  const applyPreset = (preset: LineupPreset) => {
    setSelectedFormation(preset.formation);
    const formation = FORMATIONS_6ER.find(f => f.id === preset.formation) || FORMATIONS_6ER[0];
    const slots: { pos: string; slot: number }[] = [];
    let idx = 0;
    for (const s of formation.slots) { for (let i = 0; i < s.count; i++) slots.push({ pos: s.pos, slot: idx++ }); }
    const lineup: LineupPlayer[] = [];
    slots.forEach((s, i) => {
      if (preset.playerIds[i] && effectiveHoldings.some(h => h.id === preset.playerIds[i] && !h.isLocked))
        lineup.push({ playerId: preset.playerIds[i], position: s.pos, slot: s.slot, isLocked: false });
    });
    setSelectedPlayers(lineup); setShowPresets(false);
  };
  const deletePreset = (index: number) => {
    const presets = loadPresets(); presets.splice(index, 1);
    localStorage.setItem(PRESET_KEY, JSON.stringify(presets)); setShowPresets(false);
  };

  const isScored = !!event.scoredAt;

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-50" onClick={onClose} />
      <div className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[calc(100%-2rem)] md:max-w-3xl bg-[#0a0a0a] md:border border-white/10 md:rounded-2xl shadow-2xl z-50 md:max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex-shrink-0 p-3 md:p-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isScored ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-500/20 text-purple-300">
                  <Trophy className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">Ausgewertet</span>
                </div>
              ) : event.isJoined ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#22C55E] text-white">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">Nimmt teil</span>
                </div>
              ) : (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded ${statusStyle.bg} ${statusStyle.text}`}>
                  {statusStyle.pulse && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  <span className="text-xs font-bold">{statusStyle.label}</span>
                </div>
              )}
              <Chip className={`${typeStyle.bg} ${typeStyle.color}`}>{event.mode === 'league' ? 'Liga' : 'Turnier'} • {event.format}</Chip>
              {event.status === 'running' && !isScored && <Chip className="bg-[#22C55E] text-white">LIVE</Chip>}
            </div>
            <div className="flex items-center gap-2">
              {isScored && (
                <button
                  onClick={handleResetEvent}
                  disabled={resetting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  {resetting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <History className="w-3.5 h-3.5" />}
                  {resetting ? 'Wird zurückgesetzt...' : 'Zurücksetzen'}
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <h2 className="text-lg md:text-2xl font-black mt-3">{event.name}</h2>
          <div className="flex items-center gap-4 text-sm text-white/50 mt-1">
            <span className="flex items-center gap-1"><Users className="w-4 h-4" />{event.participants}{event.maxParticipants ? `/${event.maxParticipants}` : ''}</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{event.status === 'ended' ? 'Beendet' : formatCountdown(event.lockTime)}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 flex border-b border-white/10">
          {(['overview', 'lineup', 'leaderboard', 'community'] as EventDetailTab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setViewingUserLineup(null); }}
              className={`flex-1 px-4 py-3 font-medium text-sm transition-all relative ${tab === t ? 'text-[#FFD700]' : 'text-white/50 hover:text-white'
                }`}
            >
              {t === 'overview' ? 'Übersicht' : t === 'lineup' ? 'Aufstellung' : t === 'leaderboard' ? 'Rangliste' : 'Community'}
              {tab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFD700]" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 md:p-5">

          {/* OVERVIEW TAB */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold mb-2">Beschreibung</h3>
                <p className="text-white/70">{event.description}</p>
              </div>

              {/* Arena Score Info */}
              {event.eventTier === 'arena' && (
                <div className="p-4 rounded-xl bg-amber-500/[0.06] border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Swords className="w-5 h-5 text-amber-400" />
                    <h3 className="font-bold text-amber-400">Arena-Wertung</h3>
                  </div>
                  <p className="text-xs text-white/60 mb-3">
                    Deine Platzierung beeinflusst deinen BeScout Score. Top-Platzierungen geben Punkte, schlechte Platzierungen kosten Punkte!
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: 'Top 1%', pts: '+50', color: 'text-[#FFD700]' },
                      { label: 'Top 5%', pts: '+40', color: 'text-[#FFD700]' },
                      { label: 'Top 10%', pts: '+30', color: 'text-[#22C55E]' },
                      { label: 'Top 25%', pts: '+20', color: 'text-[#22C55E]' },
                      { label: 'Top 50%', pts: '+10', color: 'text-sky-400' },
                      { label: 'Top 75%', pts: '±0', color: 'text-white/40' },
                      { label: '75–90%', pts: '−5', color: 'text-red-300' },
                      { label: 'Rest', pts: '−15', color: 'text-red-400' },
                    ].map(r => (
                      <div key={r.label} className="text-center p-1.5 bg-black/20 rounded-lg">
                        <div className={`font-mono font-bold text-xs ${r.color}`}>{r.pts}</div>
                        <div className="text-[9px] text-white/30">{r.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Event Details */}
              <div>
                <h3 className="font-bold mb-2">Event-Details</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-white/[0.03] rounded-lg">
                    <div className="text-xs text-white/40">Eintritt</div>
                    <div className="font-mono font-bold text-[#FFD700]">{event.buyIn === 0 ? 'Kostenlos' : `${event.buyIn} BSD`}</div>
                  </div>
                  <div className="p-3 bg-white/[0.03] rounded-lg">
                    <div className="text-xs text-white/40">Preispool</div>
                    <div className="font-mono font-bold text-[#FFD700]">{event.prizePool} BSD</div>
                  </div>
                  <div className="p-3 bg-white/[0.03] rounded-lg">
                    <div className="text-xs text-white/40">Format</div>
                    <div className="font-bold">{event.format} • {event.mode === 'league' ? 'Liga' : 'Turnier'}</div>
                  </div>
                  <div className="p-3 bg-white/[0.03] rounded-lg">
                    <div className="text-xs text-white/40">DPC pro Slot</div>
                    <div className="font-bold">{event.requirements.dpcPerSlot ?? 1} DPC</div>
                  </div>
                  <div className="p-3 bg-white/[0.03] rounded-lg">
                    <div className="text-xs text-white/40">Start</div>
                    <div className="text-sm">{new Date(event.startTime).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div className="p-3 bg-white/[0.03] rounded-lg">
                    <div className="text-xs text-white/40">Teilnehmer</div>
                    <div className="font-bold">{event.participants}{event.maxParticipants ? ` / ${event.maxParticipants}` : ' (unbegrenzt)'}</div>
                  </div>
                </div>
              </div>

              {/* Teilnahmebedingungen */}
              <div>
                <h3 className="font-bold mb-2">Teilnahmebedingungen</h3>
                <div className="space-y-2">
                  {/* Always show DPC per slot requirement */}
                  <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#FFD700]" />
                      <span>{event.requirements.dpcPerSlot ?? 1} DPC pro Aufstellungsplatz</span>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
                  </div>
                  {event.requirements.minDpc && (
                    <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-[#FFD700]" />
                        <span>Min. {event.requirements.minDpc} DPC gesamt</span>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
                    </div>
                  )}
                  {event.requirements.minClubPlayers && (
                    <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#22C55E]" />
                        <span>Min. {event.requirements.minClubPlayers} {event.clubName || 'Club'}-Spieler</span>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
                    </div>
                  )}
                  {event.requirements.minScoutLevel && (
                    <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-purple-400" />
                        <span>Scout Level {event.requirements.minScoutLevel}+</span>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
                    </div>
                  )}
                  {event.requirements.specificClub && (
                    <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-sky-400" />
                        <span>Nur {event.requirements.specificClub}-Spieler</span>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
                    </div>
                  )}
                  {/* Entry fee condition */}
                  {event.buyIn > 0 && (
                    <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-[#FFD700]" />
                        <span>Eintrittsgebühr: {event.buyIn} BSD</span>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
                    </div>
                  )}
                </div>
              </div>

              {/* Rewards */}
              <div>
                <h3 className="font-bold mb-2">Rewards</h3>
                <div className="space-y-2">
                  {event.rewards.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
                      <div className="flex items-center gap-2">
                        <Medal className={`w-4 h-4 ${i === 0 ? 'text-[#FFD700]' : i === 1 ? 'text-white/70' : 'text-orange-400'}`} />
                        <span className="font-bold">{r.rank}</span>
                      </div>
                      <span className="text-white/70">{r.reward}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Participants List */}
              <div className="pt-4 border-t border-white/10">
                <div className="font-bold mb-3 flex items-center justify-between">
                  <span>Teilnehmer ({participantCount}{event.maxParticipants ? ` / ${event.maxParticipants}` : ''})</span>
                  {participantCount > 0 && <span className="text-xs text-white/50">Top 10 + Du</span>}
                </div>
                <div className="space-y-2">
                  {participants.length === 0 ? (
                    <div className="text-white/40 text-xs">Noch keine Teilnehmer. Sei der Erste!</div>
                  ) : (
                    participants.slice(0, 5).map(p => (
                      <div key={p.id} className={`flex items-center gap-3 p-2 rounded-lg ${p.id === user?.id ? 'bg-[#FFD700]/10 border border-[#FFD700]/30' : 'bg-white/5'}`}>
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                          {p.avatar_url ? <img src={p.avatar_url} alt={p.handle} className="w-full h-full object-cover" /> : <div className="text-xs flex items-center justify-center w-full h-full">👤</div>}
                        </div>
                        <div className="flex-1 text-xs">
                          <div className={`font-medium ${p.id === user?.id ? 'text-[#FFD700]' : 'text-white'}`}>
                            {p.display_name || p.handle} {p.id === user?.id && '(Du)'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {participantCount > participants.length && (
                    <div className="text-center text-xs text-white/40 pt-1">
                      + {participantCount - participants.length} weitere
                    </div>
                  )}
                </div>
              </div>

              {/* User Status if joined */}
              {event.isJoined && event.userRank && (
                <div className="p-4 bg-[#22C55E]/10 rounded-xl border border-[#22C55E]/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-[#22C55E]">Dein Rang</div>
                      <div className="text-2xl font-mono font-black text-[#22C55E]">#{event.userRank}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-white/50">Punkte</div>
                      <div className="text-2xl font-mono font-bold">{event.userPoints}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LINEUP TAB */}
          {tab === 'lineup' && (() => {
            const isReadOnly = event.status === 'running' || event.status === 'ended';
            return (
            <div className="space-y-4">
              {/* Status banner */}
              {isReadOnly && !isScored && (
                <div className="flex items-center gap-2 p-3 bg-white/[0.03] border border-white/10 rounded-lg">
                  <Lock className="w-4 h-4 text-white/40" />
                  <span className="text-sm text-white/50">{event.status === 'running' ? 'Event läuft — Aufstellung gesperrt' : 'Event beendet'}</span>
                </div>
              )}
              {isScored && (
                <div className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <Award className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-purple-300 font-bold">
                    {scoringJustFinished ? 'Gameweek ausgewertet — Deine Ergebnisse:' : 'Ausgewertet'}
                    {event.scoredAt && !scoringJustFinished && (
                      <span className="font-normal text-purple-300/60"> am {new Date(event.scoredAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                    )}
                  </span>
                </div>
              )}
              {/* Formation Selector + Presets Bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedFormation}
                  onChange={(e) => handleFormationChange(e.target.value)}
                  disabled={isReadOnly}
                  className={`px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-bold ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {FORMATIONS_6ER.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                {!isReadOnly && (
                  <>
                    <div className="flex-1" />
                    <button
                      onClick={() => setShowPresets(!showPresets)}
                      className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-1"
                    >
                      <Briefcase className="w-3.5 h-3.5" /> Vorlagen
                    </button>
                  </>
                )}
              </div>

              {/* Presets Dropdown */}
              {showPresets && (
                <div className="p-3 bg-white/[0.03] rounded-lg border border-white/10 space-y-2">
                  <div className="text-xs font-bold text-white/60 mb-2">Aufstellungs-Vorlagen (max 5)</div>
                  {loadPresets().map((preset, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-white/[0.02] rounded-lg">
                      <button onClick={() => applyPreset(preset)} className="text-sm font-medium hover:text-[#FFD700] transition-all flex-1 text-left">
                        {preset.name} <span className="text-white/30 text-xs">({preset.formation})</span>
                      </button>
                      <button onClick={() => deletePreset(i)} className="p-1 hover:bg-red-500/20 rounded text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {loadPresets().length === 0 && <div className="text-xs text-white/30 text-center py-2">Keine Vorlagen gespeichert</div>}
                  <div className="flex gap-2 mt-2">
                    <input
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder="Vorlagenname..."
                      className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs"
                    />
                    <button
                      onClick={savePreset}
                      disabled={!presetName.trim() || selectedPlayers.length === 0}
                      className="px-3 py-1.5 bg-[#FFD700]/20 text-[#FFD700] rounded-lg text-xs font-bold disabled:opacity-30"
                    >
                      Speichern
                    </button>
                  </div>
                </div>
              )}

              {/* Formation Display — Pitch with Markings & Sponsor Zones */}
              <div className="rounded-xl overflow-hidden border border-[#22C55E]/20">
                {/* Sponsor Banner Top (Bandenwerbung) */}
                <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#1a1a2e] px-4 py-2.5 flex items-center justify-center gap-3 border-b border-white/10">
                  {event.sponsorLogo ? (
                    <img src={event.sponsorLogo} alt={event.sponsorName || 'Sponsor'} className="h-5 w-auto object-contain" />
                  ) : (
                    <div className="w-5 h-5 rounded bg-[#FFD700]/20 flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-[#FFD700]" />
                    </div>
                  )}
                  <span className="text-xs font-bold tracking-widest text-white/50 uppercase">{event.sponsorName || 'Sponsor-Fläche'}</span>
                  {event.sponsorLogo ? (
                    <img src={event.sponsorLogo} alt="" className="h-5 w-auto object-contain" />
                  ) : (
                    <div className="w-5 h-5 rounded bg-[#FFD700]/20 flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-[#FFD700]" />
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
                    <div className="w-20 h-20 rounded-full border border-white/[0.06] flex items-center justify-center">
                      {event.sponsorLogo ? (
                        <img src={event.sponsorLogo} alt="" className="w-12 h-12 object-contain opacity-30" />
                      ) : (
                        <span className="text-[8px] text-white/15 font-bold tracking-wider uppercase">Sponsor</span>
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
                            const slotScore = (isScored && slotScores) ? slotScores[SLOT_SCORE_KEYS[slot.slot]] : undefined;
                            const hasScore = slotScore != null;
                            const isCaptain = captainSlot === SLOT_SCORE_KEYS[slot.slot];
                            return (
                              <div key={slot.slot} className="flex flex-col items-center relative">
                                {/* Captain Crown (top-left) */}
                                {player && isCaptain && (
                                  <div className="absolute -top-2 -left-2 z-30 w-5 h-5 rounded-full bg-[#FFD700] flex items-center justify-center shadow-lg">
                                    <Crown className="w-3 h-3 text-black" />
                                  </div>
                                )}
                                {/* Captain ×1.5 badge (scored view) */}
                                {player && hasScore && isCaptain && (
                                  <div className="absolute -top-2 left-4 z-30 px-1 py-0.5 rounded bg-[#FFD700]/90 text-[8px] font-black text-black shadow-lg">×1.5</div>
                                )}
                                {/* Score badge (top-right, overlapping circle) */}
                                {player && hasScore && (
                                  <div
                                    className="absolute -top-2 -right-3 z-20 min-w-[2rem] px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black text-center shadow-lg"
                                    style={{
                                      backgroundColor: slotScore >= 100 ? '#FFD700' : slotScore >= 70 ? 'rgba(255,255,255,0.9)' : '#ff6b6b',
                                      color: slotScore >= 100 ? '#000' : slotScore >= 70 ? '#000' : '#fff',
                                    }}
                                  >
                                    {slotScore}
                                  </div>
                                )}
                                <button
                                  onClick={() => !isReadOnly && (player ? handleRemovePlayer(slot.slot) : setShowPlayerPicker({ position: slot.pos, slot: slot.slot }))}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    if (!isReadOnly && player) {
                                      setCaptainSlot(isCaptain ? null : SLOT_SCORE_KEYS[slot.slot]);
                                    }
                                  }}
                                  onDoubleClick={() => {
                                    if (!isReadOnly && player) {
                                      setCaptainSlot(isCaptain ? null : SLOT_SCORE_KEYS[slot.slot]);
                                    }
                                  }}
                                  className={`flex flex-col items-center ${isReadOnly ? 'cursor-default' : ''}`}
                                >
                                <div
                                  className={`w-11 h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center border-2 transition-all ${player
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
                                    <span className="font-bold text-sm" style={{ color: hasScore ? '#fff' : isCaptain ? '#FFD700' : getPosAccentColor(player.pos) }}>{player.first[0]}{player.last[0]}</span>
                                  ) : (
                                    <Plus className="w-5 h-5 text-white/30" />
                                  )}
                                </div>
                                {pStatus && !hasScore && pStatus.icon !== '🟢' && !isCaptain && (
                                  <span className="absolute -top-1 -right-1 text-xs">{pStatus.icon}</span>
                                )}
                                <div className="text-[10px] mt-1" style={{ color: player ? (hasScore ? '#ffffffcc' : isCaptain ? '#FFD700' : getPosAccentColor(player.pos) + 'aa') : getPosAccentColor(slot.pos) + '80' }}>
                                  {player ? player.last.slice(0, 8) : slot.pos}
                                </div>
                                {player && !hasScore && (
                                  <div className="text-[9px] text-white/30">L5: {player.perfL5} • {player.dpcAvailable}/{player.dpcOwned}</div>
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
                      <div className="w-4 h-4 rounded bg-[#FFD700]/20 flex items-center justify-center">
                        <Building2 className="w-2.5 h-2.5 text-[#FFD700]/60" />
                      </div>
                    )}
                    <span className="text-[9px] text-white/30 font-medium">{event.sponsorName || 'Sponsor Logo'}</span>
                  </div>
                  <span className="text-[8px] text-white/20 font-bold tracking-widest uppercase">{event.sponsorName ? `${event.sponsorName} × BeScout` : 'Powered by BeScout'}</span>
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                    {event.sponsorLogo ? (
                      <img src={event.sponsorLogo} alt="" className="h-4 w-auto object-contain" />
                    ) : (
                      <div className="w-4 h-4 rounded bg-[#FFD700]/20 flex items-center justify-center">
                        <Building2 className="w-2.5 h-2.5 text-[#FFD700]/60" />
                      </div>
                    )}
                    <span className="text-[9px] text-white/30 font-medium">{event.sponsorName || 'Sponsor Logo'}</span>
                  </div>
                </div>
              </div>

              {/* Team Score Banner (only when scored) */}
              {isScored && myTotalScore != null && (
                <div className={`relative overflow-hidden rounded-xl border ${scoringJustFinished ? 'border-[#FFD700]/40' : 'border-[#FFD700]/20'}`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700]/15 via-[#FFD700]/5 to-[#FFD700]/15" />
                  {scoringJustFinished && <div className="absolute inset-0 bg-[#FFD700]/5 animate-pulse" />}
                  <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 md:p-5 gap-3 sm:gap-0">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#FFD700]/20 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-[#FFD700]" />
                      </div>
                      <div>
                        <div className="text-xs text-white/50 uppercase tracking-wider font-bold">Dein Teamscore</div>
                        <div className="text-3xl font-mono font-black text-[#FFD700]">{myTotalScore} <span className="text-lg">Pkt</span></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      {myRank && (
                        <div className="text-right">
                          <div className="text-xs text-white/50 uppercase tracking-wider font-bold">Platzierung</div>
                          <div className={`text-3xl font-mono font-black ${myRank === 1 ? 'text-[#FFD700]' : myRank <= 3 ? 'text-[#22C55E]' : 'text-white'}`}>
                            #{myRank}
                          </div>
                        </div>
                      )}
                      {(() => {
                        const myEntry = leaderboard.find(e => e.userId === user?.id);
                        if (myEntry && myEntry.rewardAmount > 0) {
                          return (
                            <div className="text-right">
                              <div className="text-xs text-white/50 uppercase tracking-wider font-bold">Prämie</div>
                              <div className="text-xl font-mono font-black text-[#22C55E]">+{fmtBSD(myEntry.rewardAmount / 100)} BSD</div>
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
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-[#FFD700]/[0.06] to-purple-500/[0.06] border border-[#FFD700]/15 hover:border-[#FFD700]/30 transition-all">
                    <div className="w-8 h-8 rounded-lg bg-[#FFD700]/15 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-4 h-4 text-[#FFD700]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white">Portfolio stärken?</div>
                      <div className="text-[11px] text-white/40">Bessere Spieler = höhere Scores. Zum Marktplatz →</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
                  </div>
                </Link>
              )}

              {/* Scored Player Breakdown List */}
              {isScored && slotScores && (
                <div className="space-y-1.5">
                  <div className="text-xs text-white/40 font-bold uppercase tracking-wider px-1">Einzelbewertungen</div>
                  {formationSlots.map(slot => {
                    const player = getSelectedPlayer(slot.slot);
                    const scoreKey = SLOT_SCORE_KEYS[slot.slot];
                    const score = slotScores[scoreKey];
                    if (!player || score == null) return null;
                    const isCpt = captainSlot === scoreKey;
                    const tier = getScoreTier(score);
                    const tierCfg = tier !== 'none' ? SCORE_TIER_CONFIG[tier] : null;
                    return (
                      <div key={slot.slot} className={`flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border ${isCpt ? 'border-[#FFD700]/30' : 'border-white/[0.06]'}`}>
                        <div className="flex items-center gap-3">
                          {isCpt ? (
                            <div className="w-6 h-6 rounded-full bg-[#FFD700]/20 flex items-center justify-center flex-shrink-0">
                              <Crown className="w-3.5 h-3.5 text-[#FFD700]" />
                            </div>
                          ) : (
                            <PositionBadge pos={player.pos as Pos} size="sm" />
                          )}
                          <div>
                            <div className="font-medium text-sm flex items-center gap-1.5">
                              {player.first} {player.last}
                              {isCpt && <span className="text-[9px] font-bold text-[#FFD700] bg-[#FFD700]/10 px-1 rounded">C ×1.5</span>}
                            </div>
                            <div className="text-[10px] text-white/40 flex items-center gap-1.5">
                              {player.club}
                              {tierCfg && (
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${tierCfg.bg} ${tierCfg.color}`}>
                                  {tierCfg.labelDe} +{tierCfg.bonusCents / 100} BSD
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
                  <Building2 className="w-5 h-5 text-sky-400 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-sky-300">Synergy Bonus +{synergyPreview.totalPct}%</div>
                    <div className="text-[10px] text-white/40">
                      {synergyPreview.details.map(d => `${d.source} (${d.bonus_pct}%)`).join(' + ')}
                    </div>
                  </div>
                </div>
              )}

              {/* CTA to Leaderboard */}
              {isScored && (
                <button
                  onClick={() => setTab('leaderboard')}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all text-sm font-bold text-white/70 hover:text-white"
                >
                  <BarChart3 className="w-4 h-4" />
                  Rangliste anzeigen
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Captain Selection Hint */}
              {!isScored && !isReadOnly && selectedPlayers.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-[#FFD700]/5 border border-[#FFD700]/20 rounded-lg">
                  <Crown className="w-4 h-4 text-[#FFD700]" />
                  <span className="text-xs text-[#FFD700]/80">
                    {captainSlot ? `Kapitän: ${(() => { const idx = SLOT_SCORE_KEYS.indexOf(captainSlot); const p = idx >= 0 ? getSelectedPlayer(idx) : null; return p ? `${p.first} ${p.last} (×1.5)` : captainSlot; })()}` : 'Doppelklick auf einen Spieler = Kapitän (×1.5 Score)'}
                  </span>
                  {captainSlot && (
                    <button onClick={() => setCaptainSlot(null)} className="ml-auto text-[10px] text-white/40 hover:text-white/60">Entfernen</button>
                  )}
                </div>
              )}

              {/* Synergy Banner (during lineup building) */}
              {!isScored && !isReadOnly && synergyPreview.totalPct > 0 && (
                <div className="flex items-center gap-2 p-3 bg-sky-500/5 border border-sky-500/20 rounded-lg">
                  <Building2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-sky-300 font-bold">Synergy +{synergyPreview.totalPct}%</span>
                    <span className="text-xs text-white/40 ml-2">
                      {synergyPreview.details.map(d => `${d.source} ×${Math.ceil(d.bonus_pct / 5) + 1}`).join(', ')}
                    </span>
                  </div>
                </div>
              )}

              {/* Lineup Status (only when not scored — no need to show "3/6 selected" after scoring) */}
              {!isScored && (
                <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
                  <span className="text-sm text-white/60">{selectedPlayers.length}/{formationSlots.length} Spieler ausgewählt</span>
                  {!reqCheck.ok && (
                    <span className="text-xs text-orange-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {reqCheck.message}
                    </span>
                  )}
                </div>
              )}

              {/* Player List with Stats & Status — hidden when locked or scored */}
              {!isReadOnly && !isScored && <div className="space-y-2">
                <div className="text-sm font-bold text-white/70">Deine Spieler</div>
                {effectiveHoldings.map(player => {
                  const isSelected = selectedPlayers.some(sp => sp.playerId === player.id);
                  const pStatus = getPlayerStatusStyle(player.status);
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isSelected ? 'bg-[#22C55E]/10 border-[#22C55E]/30' :
                        player.isLocked ? 'bg-white/[0.02] border-white/5 opacity-50' :
                          player.status === 'injured' ? 'bg-red-500/5 border-red-500/20' :
                            player.status === 'suspended' ? 'bg-orange-500/5 border-orange-500/20' :
                              `bg-white/[0.02] ${getPosBorderColor(player.pos)} hover:border-opacity-60`
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <PositionBadge pos={player.pos as Pos} size="sm" />
                        <div>
                          <div className="font-medium text-sm flex items-center gap-1.5">
                            {player.first} {player.last}
                            <span className="text-xs" title={pStatus.label}>{pStatus.icon}</span>
                          </div>
                          <div className="text-[10px] text-white/40">
                            {player.club} • <span className={player.isLocked ? 'text-orange-400' : player.dpcAvailable < player.dpcOwned ? 'text-yellow-400' : 'text-white/40'}>{player.dpcAvailable}/{player.dpcOwned} DPC</span>
                            {player.eventsUsing > 0 && <span className="text-white/30"> ({player.eventsUsing} Event{player.eventsUsing > 1 ? 's' : ''})</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-white/50">L5: <span className="font-mono font-bold">{player.perfL5}</span></div>
                          <div className="text-[10px] text-white/30">{player.goals}⚽ {player.assists}🎯 {player.matches}📋</div>
                        </div>
                        {player.isLocked ? (
                          <span className="text-xs text-orange-400 flex items-center gap-1" title={`In ${player.eventsUsing} Events`}>
                            <Lock className="w-3 h-3" /> Alle eingesetzt
                          </span>
                        ) : isSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>}
            </div>
          ); })()}



          {/* LEADERBOARD TAB */}
          {tab === 'leaderboard' && (
            <div className="space-y-2">
              <SponsorBanner placement="fantasy_leaderboard" className="mb-2" />
              {/* User Lineup Viewer (sub-view) */}
              {viewingUserLineup ? (
                <div className="space-y-4">
                  {/* Back button */}
                  <button
                    onClick={() => setViewingUserLineup(null)}
                    className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Zurück zur Rangliste
                  </button>

                  {/* User header */}
                  <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${viewingUserLineup.entry.rank === 1 ? 'bg-[#FFD700]/20 text-[#FFD700]' :
                        viewingUserLineup.entry.rank === 2 ? 'bg-white/10 text-white/70' :
                          viewingUserLineup.entry.rank === 3 ? 'bg-orange-500/20 text-orange-400' :
                            'bg-white/5 text-white/50'
                        }`}>
                        #{viewingUserLineup.entry.rank}
                      </div>
                      <div>
                        <div className="font-bold">{viewingUserLineup.entry.displayName || viewingUserLineup.entry.handle}</div>
                        <div className="text-xs text-white/40">@{viewingUserLineup.entry.handle}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-mono font-black text-[#FFD700]">{viewingUserLineup.entry.totalScore} Pkt</div>
                      {viewingUserLineup.entry.rewardAmount > 0 && (
                        <div className="text-xs font-mono text-[#22C55E]">+{fmtBSD(viewingUserLineup.entry.rewardAmount / 100)} BSD</div>
                      )}
                    </div>
                  </div>

                  {/* Viewed user's pitch */}
                  <div className="rounded-xl overflow-hidden border border-white/10">
                    <div className="relative bg-gradient-to-b from-[#1a5c1a]/40 via-[#1e6b1e]/30 to-[#1a5c1a]/40 px-3 md:px-6 py-4 md:py-5">
                      {/* Pitch Markings (SVG) */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 400 500">
                        <rect x="20" y="15" width="360" height="470" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="1.5" />
                        <line x1="20" y1="250" x2="380" y2="250" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
                        <circle cx="200" cy="250" r="50" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
                        <circle cx="200" cy="250" r="3" fill="white" fillOpacity="0.1" />
                      </svg>

                      <div className="text-xs text-white/40 text-center mb-3 relative z-10">
                        Formation: {viewingUserLineup.data.lineup.formation || '1-2-2-1'}
                      </div>

                      <div className="space-y-6 relative z-10">
                        {['ATT', 'MID', 'DEF', 'GK'].map(posGroup => {
                          // Group by slot key (reliable — slot determines pitch row)
                          const slotPlayers = viewingUserLineup!.data.players.filter(p => {
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
                                  {sp.score == null && (
                                    <div className="text-[9px] text-white/30">L5: {sp.player.perfL5}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Player breakdown list */}
                  <div className="space-y-1.5">
                    <div className="text-xs text-white/40 font-bold uppercase tracking-wider px-1">Einzelbewertungen</div>
                    {viewingUserLineup.data.players.map(sp => (
                      <div key={sp.slotKey} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                        <div className="flex items-center gap-3">
                          <PositionBadge pos={sp.player.position as Pos} size="sm" />
                          <div>
                            <div className="font-medium text-sm">{sp.player.firstName} {sp.player.lastName}</div>
                            <div className="text-[10px] text-white/40">{sp.player.club}</div>
                          </div>
                        </div>
                        {sp.score != null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, (sp.score / 150) * 100)}%`,
                                  backgroundColor: getScoreColor(sp.score),
                                }}
                              />
                            </div>
                            <span className="font-mono font-bold text-sm min-w-[3rem] text-right" style={{ color: getScoreColor(sp.score) }}>
                              {sp.score}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-white/30 font-mono">—</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Leaderboard list */
                <>
                  {leaderboardLoading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="w-6 h-6 mx-auto mb-2 text-white/30 animate-spin" />
                      <div className="text-sm text-white/40">Rangliste wird geladen...</div>
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div className="text-center py-8">
                      <Trophy className="w-10 h-10 mx-auto mb-3 text-white/20" />
                      <div className="text-white/50 text-sm">Noch keine Ergebnisse</div>
                      <div className="text-white/30 text-xs mt-1">
                        Die Auswertung steht noch aus.
                      </div>
                    </div>
                  ) : (
                    <>
                      {isScored && (
                        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl mb-3 text-center">
                          <div className="text-xs text-purple-300">Ausgewertet am {new Date(event.scoredAt!).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      )}
                      {leaderboard.map((entry) => {
                        const isCurrentUser = entry.userId === user?.id;
                        return (
                          <button
                            key={entry.userId}
                            onClick={async () => {
                              if (viewingUserLoading) return;
                              setViewingUserLoading(true);
                              try {
                                const data = await getLineupWithPlayers(event.id, entry.userId);
                                if (data) setViewingUserLineup({ entry, data });
                              } finally {
                                setViewingUserLoading(false);
                              }
                            }}
                            className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all hover:brightness-110 cursor-pointer ${isCurrentUser ? 'bg-[#FFD700]/10 border-[#FFD700]/30' : 'bg-white/[0.02] border-white/10 hover:border-white/20'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${entry.rank === 1 ? 'bg-[#FFD700]/20 text-[#FFD700]' :
                                entry.rank === 2 ? 'bg-white/10 text-white/70' :
                                  entry.rank === 3 ? 'bg-orange-500/20 text-orange-400' :
                                    'bg-white/5 text-white/50'
                                }`}>
                                {entry.rank}
                              </div>
                              <div className="flex items-center gap-2">
                                {entry.avatarUrl ? (
                                  <img src={entry.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px]">👤</div>
                                )}
                                <span className={`text-left ${isCurrentUser ? 'font-bold text-[#FFD700]' : ''}`}>
                                  {entry.displayName || entry.handle} {isCurrentUser && '(Du)'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {entry.rewardAmount > 0 && (
                                <span className="text-xs font-mono text-[#22C55E]">+{fmtBSD(entry.rewardAmount / 100)} BSD</span>
                              )}
                              <span className="font-mono font-bold">{entry.totalScore}</span>
                              <ChevronRight className="w-4 h-4 text-white/30" />
                            </div>
                          </button>
                        );
                      })}
                      {viewingUserLoading && (
                        <div className="text-center py-3">
                          <RefreshCw className="w-4 h-4 mx-auto text-white/30 animate-spin" />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* COMMUNITY TAB */}
          {tab === 'community' && event && (
            <EventCommunityTab
              eventId={event.id}
              eventStatus={event.status}
              eventName={event.name}
              gameweek={event.gameweek}
            />
          )}
        </div>

        {/* Join Confirmation Dialog */}
        {showJoinConfirm && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 max-w-sm w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-[#FFD700]" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Teilnahme bestätigen</h3>
                  <p className="text-xs text-white/50">{event.name}</p>
                </div>
              </div>
              <div className="space-y-2 mb-5 text-sm">
                {event.buyIn > 0 && (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                    <span className="text-white/60">Teilnahmegebühr</span>
                    <span className="font-bold text-[#FFD700]">{fmtBSD(event.buyIn)} BSD</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                  <span className="text-white/60">Formation</span>
                  <span className="font-mono text-white">{selectedFormation}</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                  <span className="text-white/60">Spieler</span>
                  <span className="text-white">{selectedPlayers.length} aufgestellt</span>
                </div>
                {captainSlot && (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                    <span className="text-white/60">Kapitän</span>
                    <span className="text-[#FFD700]">
                      <Crown className="w-3.5 h-3.5 inline mr-1" />
                      Gewählt (2x Punkte)
                    </span>
                  </div>
                )}
              </div>
              {event.buyIn > 0 && (
                <p className="text-[11px] text-white/40 mb-4">
                  Die Teilnahmegebühr wird sofort von deinem Wallet abgezogen. Bei Abmeldung vor Event-Start wird sie erstattet.
                </p>
              )}
              <div className="flex gap-3">
                <Button variant="outline" size="lg" fullWidth onClick={() => setShowJoinConfirm(false)}>
                  Abbrechen
                </Button>
                <Button variant="gold" size="lg" fullWidth onClick={handleFinalJoin}>
                  <CheckCircle2 className="w-4 h-4" />
                  Bestätigen
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {/* Join — only when not joined AND event not running/ended */}
        {!event.isJoined && event.status !== 'ended' && event.status !== 'running' && (() => {
          const isFull = !!(event.maxParticipants && event.participants >= event.maxParticipants);
          return (
            <div className="flex-shrink-0 p-3 md:p-5 border-t border-white/10">
              <Button
                variant="gold"
                fullWidth
                size="lg"
                onClick={handleConfirmJoin}
                disabled={!isLineupComplete || !reqCheck.ok || isFull}
                className={!isLineupComplete || !reqCheck.ok || isFull ? 'opacity-50' : ''}
              >
                <CheckCircle2 className="w-5 h-5" />
                {isFull ? 'Event voll' : event.buyIn === 0 ? 'Anmeldung bestätigen' : `Anmelden & ${event.buyIn} BSD zahlen`}
              </Button>
            </div>
          );
        })()}

        {/* Update / Leave — only before event starts */}
        {event.isJoined && event.status !== 'ended' && event.status !== 'running' && (
          <div className="flex-shrink-0 p-3 md:p-5 border-t border-white/10 flex gap-3">
            <Button
              variant="outline"
              fullWidth
              size="lg"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={handleLeave}
            >
              Abmelden
            </Button>
            <Button
              variant="gold"
              fullWidth
              size="lg"
              onClick={handleConfirmJoin}
              className={!isLineupComplete || !reqCheck.ok ? 'opacity-50' : ''}
            >
              <Save className="w-5 h-5" />
              Aufstellung ändern
            </Button>
          </div>
        )}

        {/* Running event — joined user sees locked status */}
        {event.isJoined && event.status === 'running' && (
          <div className="flex-shrink-0 p-3 md:p-5 border-t border-white/10">
            <div className="flex items-center justify-center gap-2 py-3 px-4 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-xl">
              <Lock className="w-4 h-4 text-[#22C55E]" />
              <span className="text-sm font-bold text-[#22C55E]">Nimmt teil — Aufstellung gesperrt</span>
            </div>
          </div>
        )}

        {/* Running event — not joined */}
        {!event.isJoined && event.status === 'running' && (
          <div className="flex-shrink-0 p-3 md:p-5 border-t border-white/10">
            <div className="flex items-center justify-center gap-2 py-3 px-4 bg-white/[0.03] border border-white/10 rounded-xl">
              <Play className="w-4 h-4 text-white/50" />
              <span className="text-sm text-white/50">Event läuft — Anmeldung geschlossen</span>
            </div>
          </div>
        )}

        {/* Ended event — joined + scored */}
        {event.isJoined && event.status === 'ended' && event.scoredAt && (
          <div className="flex-shrink-0 p-3 md:p-5 border-t border-white/10">
            <button
              onClick={() => setTab('leaderboard')}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-purple-500/10 border border-purple-500/30 rounded-xl hover:bg-purple-500/20 transition-all"
            >
              <Trophy className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-bold text-purple-400">
                {event.userRank ? `Platz ${event.userRank}` : 'Ausgewertet'} — Ergebnisse ansehen
              </span>
            </button>
          </div>
        )}

        {/* Ended event — joined but not yet scored */}
        {event.isJoined && event.status === 'ended' && !event.scoredAt && (
          <div className="flex-shrink-0 p-3 md:p-5 border-t border-white/10">
            <div className="flex items-center justify-center gap-2 py-3 px-4 bg-white/[0.03] border border-white/10 rounded-xl">
              <Clock className="w-4 h-4 text-white/40" />
              <span className="text-sm text-white/40">Event beendet — Auswertung ausstehend</span>
            </div>
          </div>
        )}

        {/* Ended event — not joined */}
        {!event.isJoined && event.status === 'ended' && (
          <div className="flex-shrink-0 p-3 md:p-5 border-t border-white/10">
            <Button
              variant="outline"
              fullWidth
              size="lg"
              onClick={() => setTab('leaderboard')}
            >
              <Eye className="w-5 h-5" />
              Ergebnisse ansehen
            </Button>
          </div>
        )}
      </div>

      {/* Player Picker Modal — Enhanced with Search, Sort, Stats, Status */}
      {showPlayerPicker && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setShowPlayerPicker(null)} />
          <div className="fixed inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[calc(100%-2rem)] md:max-w-md bg-[#0a0a0a] border-t md:border border-white/10 rounded-t-2xl md:rounded-xl shadow-2xl z-[60] max-h-[80vh] md:max-h-[70vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-bold">Spieler wählen</div>
                  <div className="text-xs text-white/50">Position: {showPlayerPicker.position}</div>
                </div>
                <button onClick={() => { setShowPlayerPicker(null); setPickerSearch(''); }} className="p-1 hover:bg-white/10 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Search + Sort */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Name oder Club..."
                    className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-[#FFD700]/40"
                    autoFocus
                  />
                </div>
                <select
                  value={pickerSort}
                  onChange={(e) => setPickerSort(e.target.value as 'l5' | 'dpc' | 'name')}
                  className="px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-xs"
                >
                  <option value="l5">L5 Score</option>
                  <option value="dpc">DPC Anzahl</option>
                  <option value="name">Name A-Z</option>
                </select>
              </div>
            </div>
            {/* Player List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {getAvailablePlayersForPosition(showPlayerPicker.position).map(player => {
                const pStatus = getPlayerStatusStyle(player.status);
                return (
                  <button
                    key={player.id}
                    onClick={() => handleSelectPlayer(player.id, showPlayerPicker.position, showPlayerPicker.slot)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${player.status === 'injured' ? 'bg-red-500/5 border-red-500/20 hover:border-red-400/40' :
                      player.status === 'suspended' ? 'bg-orange-500/5 border-orange-500/20 hover:border-orange-400/40' :
                        `bg-white/[0.02] ${getPosBorderColor(player.pos)} hover:border-opacity-60`
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <PositionBadge pos={player.pos as Pos} size="sm" />
                      <div className="text-left">
                        <div className="font-medium text-sm flex items-center gap-1">
                          {player.first} {player.last}
                          <span className="text-xs" title={pStatus.label}>{pStatus.icon}</span>
                        </div>
                        <div className="text-[10px] text-white/40">
                          {player.club} • <span className={player.dpcAvailable < player.dpcOwned ? 'text-yellow-400' : 'text-white/40'}>{player.dpcAvailable}/{player.dpcOwned} DPC</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-white/70">L5: {player.perfL5}</div>
                      <div className="text-[9px] text-white/30">{player.goals}⚽ {player.assists}🎯 {player.matches}📋</div>
                    </div>
                  </button>
                );
              })}
              {getAvailablePlayersForPosition(showPlayerPicker.position).length === 0 && (
                <div className="text-center py-6 text-white/40">
                  Keine verfügbaren Spieler
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

// ============================================
// EVENT CARD (für Card View)