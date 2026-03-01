'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Trophy, Users, Clock, Star, Shield, Award, Crown,
  ChevronRight, Search, Lock,
  CheckCircle2, AlertCircle, Play, Medal,
  Briefcase, Coins, Layers, Zap,
  Plus, Save, Eye, Sparkles, Building2,
  MessageCircle, X, RefreshCw, Heart,
  ChevronLeft, BarChart3, History, Swords, ShoppingCart, Loader2,
} from 'lucide-react';
import { getScoreTier, SCORE_TIER_CONFIG, calculateSynergyPreview } from '@/types';
import type { SynergyDetail } from '@/types';
import { Modal, Card, Button, Chip } from '@/components/ui';
import { PositionBadge, PlayerIdentity, getL5Color } from '@/components/player';
import { useUser } from '@/components/providers/AuthProvider';
import { centsToBsd } from '@/lib/services/players';
import { getLineup, getEventParticipants, getEventParticipantCount, getLineupWithPlayers } from '@/lib/services/lineups';
import type { LineupWithPlayers } from '@/lib/services/lineups';
import { resetEvent, getEventLeaderboard, getProgressiveScores } from '@/lib/services/scoring';
import type { LeaderboardEntry } from '@/lib/services/scoring';
import { cn, fmtScout } from '@/lib/utils';
import type { Pos } from '@/types';
import type { FantasyEvent, EventDetailTab, LineupPlayer, UserDpcHolding, LineupPreset } from './types';
import { getFormationsForFormat, getDefaultFormation, buildSlotDbKeys, PRESET_KEY } from './constants';
import {
  getStatusStyle, getTypeStyle, getPosBorderColor,
  getScoreColor, getPosAccentColor, formatCountdown,
} from './helpers';
import EventCommunityTab from './EventCommunityTab';
import SponsorBanner from '@/components/player/detail/SponsorBanner';
import type { FixtureDeadline } from '@/lib/services/fixtures';

export const EventDetailModal = ({
  event,
  isOpen,
  onClose,
  onJoin,
  onLeave,
  onReset,
  userHoldings,
  fixtureDeadlines,
}: {
  event: FantasyEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onJoin: (event: FantasyEvent, lineup: LineupPlayer[], formation: string, captainSlot: string | null) => void | Promise<void>;
  onLeave: (event: FantasyEvent) => void | Promise<void>;
  onReset: (event: FantasyEvent) => void;
  userHoldings: UserDpcHolding[];
  fixtureDeadlines?: Map<string, FixtureDeadline>;
}) => {
  const { user } = useUser();
  const [tab, setTab] = useState<EventDetailTab>('overview');
  const [selectedPlayers, setSelectedPlayers] = useState<LineupPlayer[]>([]);
  const [showPlayerPicker, setShowPlayerPicker] = useState<{ position: string; slot: number } | null>(null);
  const [selectedFormation, setSelectedFormation] = useState(() => getDefaultFormation(event?.format ?? '6er'));
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
  const [progressiveScores, setProgressiveScores] = useState<Map<string, number>>(new Map());
  const [viewingUserLineup, setViewingUserLineup] = useState<{ entry: LeaderboardEntry; data: LineupWithPlayers } | null>(null);
  const [viewingUserLoading, setViewingUserLoading] = useState(false);
  const [captainSlot, setCaptainSlot] = useState<string | null>(null);
  const [showJoinConfirm, setShowJoinConfirm] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [presets, setPresets] = useState<LineupPreset[]>([]);

  // Set default tab based on join status when modal opens — reset transient state
  useEffect(() => {
    if (isOpen && event) {
      // If event is scored + user joined → show their lineup with scores. Otherwise leaderboard for non-participants
      setTab(event.scoredAt ? (event.isJoined ? 'lineup' : 'leaderboard') : event.isJoined ? 'lineup' : 'overview');
      setViewingUserLineup(null);
      setScoringJustFinished(false);
      setShowJoinConfirm(false);
      // Reset formation to match event format (6er vs 11er)
      setSelectedFormation(getDefaultFormation(event.format));
      setSelectedPlayers([]);
      try { setPresets(JSON.parse(localStorage.getItem(PRESET_KEY) || '[]')); } catch { setPresets([]); }
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

  // Poll progressive scores when event is running and user has a lineup
  useEffect(() => {
    if (!isOpen || !event || event.status !== 'running' || !event.isJoined || !event.gameweek) return;
    if (selectedPlayers.length === 0) return;

    const loadScores = () => {
      const playerIds = selectedPlayers.map(p => p.playerId).filter(Boolean);
      if (playerIds.length === 0) return;
      getProgressiveScores(event.gameweek!, playerIds).then(setProgressiveScores).catch(console.error);
    };

    loadScores();
    const interval = setInterval(loadScores, 60_000);
    return () => clearInterval(interval);
  }, [isOpen, event?.id, event?.status, event?.gameweek, selectedPlayers.length]);

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
            const savedFormation = dbLineup.formation || getDefaultFormation(event.format);
            setSelectedFormation(savedFormation);

            // Store scoring data for pitch display
            setSlotScores(dbLineup.slot_scores ?? null);
            setMyTotalScore(dbLineup.total_score);
            setMyRank(dbLineup.rank);
            setCaptainSlot(dbLineup.captain_slot ?? null);

            const fmtFormations = getFormationsForFormat(event.format);
            const formation = fmtFormations.find(f => f.id === savedFormation) || fmtFormations[0];
            const fSlots: { pos: string; slot: number }[] = [];
            let si = 0;
            for (const s of formation.slots) { for (let i = 0; i < s.count; i++) fSlots.push({ pos: s.pos, slot: si++ }); }

            // Map DB slot columns to formation slots using buildSlotDbKeys
            const dbKeys = buildSlotDbKeys(formation);
            const finalLineup: LineupPlayer[] = [];
            fSlots.forEach((slot, i) => {
              const colKey = `slot_${dbKeys[i]}` as keyof typeof dbLineup;
              const playerId = dbLineup[colKey] as string | null;
              if (playerId) {
                finalLineup.push({ playerId, position: slot.pos, slot: slot.slot, isLocked: isPlayerLocked(playerId) });
              }
            });

            setSelectedPlayers(finalLineup);
          } else {
            setSelectedPlayers([]);
            setSelectedFormation(getDefaultFormation(event.format));
            setSlotScores(null);
          }
        }).catch(() => {
          setSelectedPlayers([]);
          setSelectedFormation(getDefaultFormation(event.format));
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
    if (!user || !event || leaving) return;
    if (confirm(`Möchtest du dich wirklich vom Event "${event.name}" abmelden?`)) {
      setLeaving(true);
      try {
        // Parent (handleLeaveEvent) handles: removeLineup + refund + cache invalidation
        await onLeave(event);
        onClose();
      } catch (e: unknown) {
        alert(`Fehler beim Abmelden: ${e instanceof Error ? e.message : 'Unbekannter Fehler'}`);
      } finally {
        setLeaving(false);
      }
    }
  };

  // ── Memoized derived state (before early return — React hook rules) ──

  // Free up 1 DPC for players already committed to THIS event (user is editing their own lineup)
  const effectiveHoldings = useMemo(() => {
    if (!event) return userHoldings;
    return userHoldings.map(h => {
      if (h.activeEventIds.includes(event.id)) {
        const newEventsUsing = h.eventsUsing - 1;
        const newAvailable = Math.max(0, h.dpcOwned - newEventsUsing);
        return { ...h, eventsUsing: newEventsUsing, dpcAvailable: newAvailable, isLocked: newAvailable <= 0 };
      }
      return h;
    });
  }, [userHoldings, event?.id]);

  // Formation data — only recalculates when format or selection changes
  const availableFormations = useMemo(
    () => getFormationsForFormat(event?.format ?? '6er'),
    [event?.format]
  );

  const currentFormation = useMemo(
    () => availableFormations.find(f => f.id === selectedFormation) || availableFormations[0],
    [availableFormations, selectedFormation]
  );

  const formationSlots = useMemo(() => {
    const slots: { pos: string; slot: number }[] = [];
    let idx = 0;
    for (const s of currentFormation.slots) {
      for (let i = 0; i < s.count; i++) slots.push({ pos: s.pos, slot: idx++ });
    }
    return slots;
  }, [currentFormation]);

  const slotDbKeys = useMemo(() => buildSlotDbKeys(currentFormation), [currentFormation]);

  // Per-fixture lock check: is a specific player's fixture already started?
  const isPlayerLocked = useCallback((playerId: string): boolean => {
    if (!fixtureDeadlines?.size || event?.status !== 'running') return false;
    const holding = effectiveHoldings.find(h => h.id === playerId);
    if (!holding?.clubId) return false;
    return fixtureDeadlines.get(holding.clubId)?.isLocked ?? false;
  }, [fixtureDeadlines, effectiveHoldings, event?.status]);

  // Is the event partially locked (some fixtures started, some not)?
  const isPartiallyLocked = useMemo(() => {
    if (event?.status !== 'running' || !fixtureDeadlines?.size) return false;
    const deadlineValues = Array.from(fixtureDeadlines.values());
    const lockedCount = deadlineValues.filter(d => d.isLocked).length;
    return lockedCount > 0 && lockedCount < deadlineValues.length;
  }, [event?.status, fixtureDeadlines]);

  // Next fixture kickoff (for countdown display)
  const nextKickoff = useMemo(() => {
    if (!fixtureDeadlines?.size) return null;
    const now = Date.now();
    let earliest: number | null = null;
    fixtureDeadlines.forEach(d => {
      if (d.playedAt && !d.isLocked) {
        const t = new Date(d.playedAt).getTime();
        if (t > now && (earliest === null || t < earliest)) earliest = t;
      }
    });
    return earliest;
  }, [fixtureDeadlines]);

  // O(1) slot→player lookup (replaces O(n) find() called 44 times per render)
  const selectedPlayerMap = useMemo(() => {
    const map = new Map<number, string>();
    selectedPlayers.forEach(p => map.set(p.slot, p.playerId));
    return map;
  }, [selectedPlayers]);

  const getSelectedPlayer = useCallback((slot: number) => {
    const playerId = selectedPlayerMap.get(slot);
    if (!playerId) return null;
    return effectiveHoldings.find(h => h.id === playerId) ?? null;
  }, [selectedPlayerMap, effectiveHoldings]);

  // Synergy preview — only recalculates when lineup changes
  const synergyPreview = useMemo(() => {
    const clubs = selectedPlayers
      .map(sp => effectiveHoldings.find(h => h.id === sp.playerId)?.club)
      .filter(Boolean) as string[];
    return calculateSynergyPreview(clubs);
  }, [selectedPlayers, effectiveHoldings]);

  // Player picker — expensive filter+sort, memoized per search/sort/selection change
  const getAvailablePlayersForPosition = useCallback((position: string) => {
    const posMap: Record<string, string[]> = {
      'GK': ['GK'], 'DEF': ['DEF', 'CB', 'LB', 'RB'],
      'MID': ['MID', 'CM', 'CDM', 'CAM', 'LM', 'RM'],
      'ATT': ['ATT', 'FW', 'ST', 'CF', 'LW', 'RW'],
    };
    const validPos = posMap[position] || [position];
    const usedIds = new Set(selectedPlayers.map(p => p.playerId));
    let players = effectiveHoldings.filter(h =>
      validPos.some(vp => h.pos.toUpperCase().includes(vp)) && !usedIds.has(h.id) && !h.isLocked && !isPlayerLocked(h.id)
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
  }, [selectedPlayers, effectiveHoldings, pickerSearch, pickerSort, isPlayerLocked]);

  // Stable handler refs — prevent child re-renders
  const handleSelectPlayer = useCallback((playerId: string, position: string, slot: number) => {
    setSelectedPlayers(prev => [...prev.filter(p => p.slot !== slot), { playerId, position, slot, isLocked: false }]);
    setShowPlayerPicker(null);
    setPickerSearch('');
  }, []);

  const handleRemovePlayer = useCallback((slot: number) => {
    setSelectedPlayers(prev => prev.filter(p => p.slot !== slot));
  }, []);

  const handleFormationChange = useCallback((fId: string) => {
    setSelectedFormation(fId);
    setSelectedPlayers([]);
  }, []);

  const isLineupComplete = selectedPlayers.length === formationSlots.length;

  // Salary Cap check — perfL5 as proxy "salary" (0-100 per player)
  const totalSalary = useMemo(() =>
    selectedPlayers.reduce((sum, sp) => {
      const player = effectiveHoldings.find(h => h.id === sp.playerId);
      return sum + (player?.perfL5 ?? 50);
    }, 0),
    [selectedPlayers, effectiveHoldings]
  );

  const reqCheck = useMemo(() => {
    if (!event) return { ok: true, message: '' };
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
  }, [selectedPlayers, effectiveHoldings, event]);

  if (!isOpen || !event) return null;

  const statusStyle = getStatusStyle(event.status);
  const typeStyle = getTypeStyle(event.type);
  const TypeIcon = typeStyle.icon;

  const getPlayerStatusStyle = (s: UserDpcHolding['status']) => {
    switch (s) {
      case 'fit': return { icon: '🟢', label: 'Fit', color: 'text-green-500' };
      case 'injured': return { icon: '🔴', label: 'Verletzt', color: 'text-red-400' };
      case 'suspended': return { icon: '⛔', label: 'Gesperrt', color: 'text-orange-400' };
      case 'doubtful': return { icon: '🟡', label: 'Fraglich', color: 'text-yellow-400' };
      default: return { icon: '🟢', label: 'Fit', color: 'text-white/50' };
    }
  };

  const salaryCap = event.salaryCap ?? null;
  const overBudget = salaryCap != null && totalSalary > salaryCap;

  const handleConfirmJoin = () => {
    if (!isLineupComplete) { alert('Bitte stelle deine komplette Aufstellung auf!'); return; }
    if (!reqCheck.ok) { alert(reqCheck.message); return; }
    setShowJoinConfirm(true);
  };

  const handleFinalJoin = async () => {
    if (joining) return;
    setJoining(true);
    try {
      setShowJoinConfirm(false);
      await onJoin(event, selectedPlayers, selectedFormation, captainSlot);
    } finally {
      setJoining(false);
    }
  };

  // Presets — use state instead of parsing localStorage on every render
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
    setSelectedFormation(preset.formation);
    const formation = availableFormations.find(f => f.id === preset.formation) || availableFormations[0];
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
    const updated = [...presets]; updated.splice(index, 1);
    localStorage.setItem(PRESET_KEY, JSON.stringify(updated));
    setPresets(updated);
    setShowPresets(false);
  };

  const isScored = !!event.scoredAt;

  return (
    <Modal open={isOpen} onClose={onClose} title={event.name} size="lg">
        {/* Status Badges + Meta */}
        <div className="flex items-center flex-wrap gap-2 mb-3">
          {isScored ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-500/20 text-purple-300">
              <Trophy aria-hidden="true" className="size-3.5" />
              <span className="text-xs font-bold">Ausgewertet</span>
            </div>
          ) : event.isJoined ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-green-500 text-white">
              <CheckCircle2 aria-hidden="true" className="size-3.5" />
              <span className="text-xs font-bold">Nimmt teil</span>
            </div>
          ) : (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded ${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.pulse && <div className="size-1.5 rounded-full bg-white animate-pulse motion-reduce:animate-none" />}
              <span className="text-xs font-bold">{statusStyle.label}</span>
            </div>
          )}
          <Chip className={`${typeStyle.bg} ${typeStyle.color}`}>{event.mode === 'league' ? 'Liga' : 'Turnier'} • {event.format}</Chip>
          {event.status === 'running' && !isScored && <Chip className="bg-green-500 text-white">LIVE</Chip>}
          {isScored && (
            <button
              onClick={handleResetEvent}
              disabled={resetting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 ml-auto"
            >
              {resetting ? <RefreshCw aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" /> : <History aria-hidden="true" className="size-3.5" />}
              {resetting ? 'Wird zurückgesetzt...' : 'Zurücksetzen'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-white/50 mb-4">
          <span className="flex items-center gap-1"><Users aria-hidden="true" className="size-4" />{event.participants}{event.maxParticipants ? `/${event.maxParticipants}` : ''}</span>
          <span className="flex items-center gap-1"><Clock aria-hidden="true" className="size-4" />{event.status === 'ended' ? 'Beendet' : formatCountdown(event.lockTime)}</span>
        </div>

        {/* Tabs */}
        <div className="flex -mx-4 md:-mx-5 border-b border-white/10 mb-4">
          {(['overview', 'lineup', 'leaderboard', 'community'] as EventDetailTab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setViewingUserLineup(null); }}
              className={`flex-1 px-4 py-3 min-h-[44px] font-medium text-sm transition-colors relative ${tab === t ? 'text-gold' : 'text-white/50 hover:text-white'
                }`}
            >
              {t === 'overview' ? 'Übersicht' : t === 'lineup' ? 'Aufstellung' : t === 'leaderboard' ? 'Rangliste' : 'Community'}
              {tab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>

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
                    <Swords aria-hidden="true" className="size-5 text-amber-400" />
                    <h3 className="font-bold text-amber-400">Arena-Wertung</h3>
                  </div>
                  <p className="text-xs text-white/60 mb-3">
                    Deine Platzierung beeinflusst deinen BeScout Score. Top-Platzierungen geben Punkte, schlechte Platzierungen kosten Punkte!
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: 'Top 1%', pts: '+50', color: 'text-gold' },
                      { label: 'Top 5%', pts: '+40', color: 'text-gold' },
                      { label: 'Top 10%', pts: '+30', color: 'text-green-500' },
                      { label: 'Top 25%', pts: '+20', color: 'text-green-500' },
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
                    <div className="font-mono font-bold text-gold">{event.buyIn === 0 ? 'Kostenlos' : `${event.buyIn} $SCOUT`}</div>
                  </div>
                  <div className="p-3 bg-white/[0.03] rounded-lg">
                    <div className="text-xs text-white/40">Preispool</div>
                    <div className="font-mono font-bold text-gold">{event.prizePool} $SCOUT</div>
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
                      <Layers aria-hidden="true" className="size-4 text-gold" />
                      <span>{event.requirements.dpcPerSlot ?? 1} DPC pro Aufstellungsplatz</span>
                    </div>
                    <CheckCircle2 aria-hidden="true" className="size-5 text-green-500" />
                  </div>
                  {event.requirements.minDpc && (
                    <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
                      <div className="flex items-center gap-2">
                        <Briefcase aria-hidden="true" className="size-4 text-gold" />
                        <span>Min. {event.requirements.minDpc} DPC gesamt</span>
                      </div>
                      <CheckCircle2 aria-hidden="true" className="size-5 text-green-500" />
                    </div>
                  )}
                  {event.requirements.minClubPlayers && (
                    <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
                      <div className="flex items-center gap-2">
                        <Building2 aria-hidden="true" className="size-4 text-green-500" />
                        <span>Min. {event.requirements.minClubPlayers} {event.clubName || 'Club'}-Spieler</span>
                      </div>
                      <CheckCircle2 aria-hidden="true" className="size-5 text-green-500" />
                    </div>
                  )}
                  {event.requirements.minScoutLevel && (
                    <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
                      <div className="flex items-center gap-2">
                        <Star aria-hidden="true" className="size-4 text-purple-400" />
                        <span>Scout Level {event.requirements.minScoutLevel}+</span>
                      </div>
                      <CheckCircle2 aria-hidden="true" className="size-5 text-green-500" />
                    </div>
                  )}
                  {event.requirements.specificClub && (
                    <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield aria-hidden="true" className="size-4 text-sky-400" />
                        <span>Nur {event.requirements.specificClub}-Spieler</span>
                      </div>
                      <CheckCircle2 aria-hidden="true" className="size-5 text-green-500" />
                    </div>
                  )}
                  {/* Entry fee condition */}
                  {event.buyIn > 0 && (
                    <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
                      <div className="flex items-center gap-2">
                        <Coins aria-hidden="true" className="size-4 text-gold" />
                        <span>Eintrittsgebühr: {event.buyIn} $SCOUT</span>
                      </div>
                      <CheckCircle2 aria-hidden="true" className="size-5 text-green-500" />
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
                        <Medal aria-hidden="true" className={`size-4 ${i === 0 ? 'text-gold' : i === 1 ? 'text-white/70' : 'text-orange-400'}`} />
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
                      <div key={p.id} className={`flex items-center gap-3 p-2 rounded-lg ${p.id === user?.id ? 'bg-gold/10 border border-gold/30' : 'bg-white/5'}`}>
                        <div className="size-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                          {p.avatar_url ? <img src={p.avatar_url} alt={p.handle} className="w-full h-full object-cover" /> : <div className="text-xs flex items-center justify-center w-full h-full">👤</div>}
                        </div>
                        <div className="flex-1 text-xs">
                          <div className={`font-medium ${p.id === user?.id ? 'text-gold' : 'text-white'}`}>
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
                <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-green-500">Dein Rang</div>
                      <div className="text-2xl font-mono font-black text-green-500">#{event.userRank}</div>
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
            const isFullyLocked = event.status === 'ended';
            const isReadOnly = isFullyLocked;
            return (
            <div className="space-y-4">
              {/* Status banner — fully locked */}
              {isFullyLocked && !isScored && (
                <div className="flex items-center gap-2 p-3 bg-white/[0.03] border border-white/10 rounded-lg">
                  <Lock aria-hidden="true" className="size-4 text-white/40" />
                  <span className="text-sm text-white/50">Event beendet</span>
                </div>
              )}
              {/* Status banner — partially locked (per-fixture) */}
              {isPartiallyLocked && !isScored && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <Lock aria-hidden="true" className="size-4 text-amber-400" />
                  <span className="text-sm text-amber-300">Teilweise gesperrt — Spieler mit laufendem Spiel sind fixiert</span>
                  {nextKickoff && (
                    <span className="text-xs text-amber-400/60 ml-auto font-mono tabular-nums">
                      Nächster Anstoß: {new Date(nextKickoff).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              )}
              {/* Status banner — all fixtures running */}
              {event.status === 'running' && !isPartiallyLocked && !isScored && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <Play aria-hidden="true" className="size-4 text-green-400" />
                  <span className="text-sm text-green-300">Alle Spiele laufen — Aufstellung gesperrt</span>
                </div>
              )}
              {/* Progressive Score Banner */}
              {event.status === 'running' && event.isJoined && progressiveScores.size > 0 && !isScored && (
                <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 aria-hidden="true" className="size-4 text-green-400" />
                    <span className="text-xs font-semibold text-green-300">Live-Punkte</span>
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
                      return `${total} Pkt (${playersScored}/${formationSlots.length} Spieler)`;
                    })()}
                  </div>
                </div>
              )}
              {isScored && (
                <div className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <Award aria-hidden="true" className="size-4 text-purple-400" />
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
                      <Briefcase aria-hidden="true" className="size-3.5" /> Vorlagen
                    </button>
                  </>
                )}
              </div>

              {/* Presets Dropdown */}
              {showPresets && (
                <div className="p-3 bg-white/[0.03] rounded-lg border border-white/10 space-y-2">
                  <div className="text-xs font-bold text-white/60 mb-2">Aufstellungs-Vorlagen (max 5)</div>
                  {presets.map((preset, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-surface-base rounded-lg">
                      <button onClick={() => applyPreset(preset)} className="text-sm font-medium hover:text-gold transition-colors flex-1 text-left">
                        {preset.name} <span className="text-white/30 text-xs">({preset.formation})</span>
                      </button>
                      <button onClick={() => deletePreset(i)} aria-label="Vorlage löschen" className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-red-500/20 rounded text-red-400">
                        <X aria-hidden="true" className="size-3" />
                      </button>
                    </div>
                  ))}
                  {presets.length === 0 && <div className="text-xs text-white/30 text-center py-2">Keine Vorlagen gespeichert</div>}
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
                      className="px-3 py-1.5 bg-gold/20 text-gold rounded-lg text-xs font-bold disabled:opacity-30"
                    >
                      Speichern
                    </button>
                  </div>
                </div>
              )}

              {/* Formation Display — Pitch with Markings & Sponsor Zones */}
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
                  <span className="text-xs font-bold text-white/50 uppercase">{event.sponsorName || 'Sponsor-Fläche'}</span>
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
                        <span className="text-[9px] text-white/15 font-bold uppercase">Sponsor</span>
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
                            const slotLocked = player ? isPlayerLocked(player.id) : false;
                            const slotReadOnly = isReadOnly || slotLocked;
                            return (
                              <div key={slot.slot} className="flex flex-col items-center relative">
                                {/* LIVE badge for locked players (only if no score yet) */}
                                {player && slotLocked && !hasScore && (
                                  <div className="absolute -top-2 -right-2 z-30 px-1.5 py-0.5 rounded bg-green-500 text-[8px] font-black text-white shadow-lg animate-pulse">LIVE</div>
                                )}
                                {/* Captain Crown (top-left) */}
                                {player && isCaptain && (
                                  <div className="absolute -top-2 -left-2 z-30 size-5 rounded-full bg-gold flex items-center justify-center shadow-lg">
                                    <Crown aria-hidden="true" className="size-3 text-black" />
                                  </div>
                                )}
                                {/* Captain ×1.5 badge (scored view) */}
                                {player && hasScore && isCaptain && (
                                  <div className="absolute -top-2 left-4 z-30 px-1 py-0.5 rounded bg-gold/90 text-[9px] font-black text-black shadow-lg">×1.5</div>
                                )}
                                {/* Score badge (top-right, overlapping circle) — final or live */}
                                {player && hasScore && (
                                  <div
                                    className={cn(
                                      "absolute -top-2 -right-3 z-20 min-w-[2rem] px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black text-center shadow-lg",
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
                                  onClick={() => !slotReadOnly && (player ? handleRemovePlayer(slot.slot) : setShowPlayerPicker({ position: slot.pos, slot: slot.slot }))}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    if (!slotReadOnly && player) {
                                      setCaptainSlot(isCaptain ? null : slotDbKeys[slot.slot]);
                                    }
                                  }}
                                  onDoubleClick={() => {
                                    if (!slotReadOnly && player) {
                                      setCaptainSlot(isCaptain ? null : slotDbKeys[slot.slot]);
                                    }
                                  }}
                                  className={`flex flex-col items-center ${slotReadOnly ? 'cursor-default' : ''}`}
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
                                    <Plus aria-hidden="true" className="size-5 text-white/30" />
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
                      <div className="size-4 rounded bg-gold/20 flex items-center justify-center">
                        <Building2 aria-hidden="true" className="size-2.5 text-gold/60" />
                      </div>
                    )}
                    <span className="text-[9px] text-white/30 font-medium">{event.sponsorName || 'Sponsor Logo'}</span>
                  </div>
                  <span className="text-[9px] text-white/20 font-bold uppercase">{event.sponsorName ? `${event.sponsorName} × BeScout` : 'Powered by BeScout'}</span>
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                    {event.sponsorLogo ? (
                      <img src={event.sponsorLogo} alt="" className="h-4 w-auto object-contain" />
                    ) : (
                      <div className="size-4 rounded bg-gold/20 flex items-center justify-center">
                        <Building2 aria-hidden="true" className="size-2.5 text-gold/60" />
                      </div>
                    )}
                    <span className="text-[9px] text-white/30 font-medium">{event.sponsorName || 'Sponsor Logo'}</span>
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
                        <div className="text-xs text-white/50 uppercase font-bold">Dein Teamscore</div>
                        <div className="text-3xl font-mono font-black text-gold">{myTotalScore} <span className="text-lg">Pkt</span></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      {myRank && (
                        <div className="text-right">
                          <div className="text-xs text-white/50 uppercase font-bold">Platzierung</div>
                          <div className={`text-3xl font-mono font-black ${myRank === 1 ? 'text-gold' : myRank <= 3 ? 'text-green-500' : 'text-white'}`}>
                            #{myRank}
                          </div>
                        </div>
                      )}
                      {(() => {
                        const myEntry = leaderboard.find(e => e.userId === user?.id);
                        if (myEntry && myEntry.rewardAmount > 0) {
                          return (
                            <div className="text-right">
                              <div className="text-xs text-white/50 uppercase font-bold">Prämie</div>
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
                      <div className="text-sm font-bold text-white">Portfolio stärken?</div>
                      <div className="text-[11px] text-white/40">Bessere Spieler = höhere Scores. Zum Marktplatz →</div>
                    </div>
                    <ChevronRight aria-hidden="true" className="size-4 text-white/30 flex-shrink-0" />
                  </div>
                </Link>
              )}

              {/* Scored OR Progressive Player Breakdown List */}
              {((isScored && slotScores) || (event?.status === 'running' && progressiveScores.size > 0)) && (
                <div className="space-y-1.5">
                  <div className="text-xs text-white/40 font-bold uppercase px-1">
                    {isScored ? 'Einzelbewertungen' : 'Live-Bewertungen'}
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
                              {isCpt && <span className="text-[9px] font-bold text-gold bg-gold/10 px-1 rounded">C ×1.5</span>}
                            </div>
                            <div className="text-[10px] text-white/40 flex items-center gap-1.5">
                              {player.club}
                              {tierCfg && (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${tierCfg.bg} ${tierCfg.color}`}>
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
                  className="w-full flex items-center justify-center gap-2 p-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-colors text-sm font-bold text-white/70 hover:text-white"
                >
                  <BarChart3 aria-hidden="true" className="size-4" />
                  Rangliste anzeigen
                  <ChevronRight aria-hidden="true" className="size-4" />
                </button>
              )}

              {/* Captain Selection Hint */}
              {!isScored && !isReadOnly && selectedPlayers.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-gold/5 border border-gold/20 rounded-lg">
                  <Crown aria-hidden="true" className="size-4 text-gold" />
                  <span className="text-xs text-gold/80">
                    {captainSlot ? `Kapitän: ${(() => { const idx = slotDbKeys.indexOf(captainSlot); const p = idx >= 0 ? getSelectedPlayer(idx) : null; return p ? `${p.first} ${p.last} (×1.5)` : captainSlot; })()}` : 'Doppelklick auf einen Spieler = Kapitän (×1.5 Score)'}
                  </span>
                  {captainSlot && (
                    <button onClick={() => setCaptainSlot(null)} className="ml-auto text-[10px] text-white/40 hover:text-white/60">Entfernen</button>
                  )}
                </div>
              )}

              {/* Synergy Banner (during lineup building) */}
              {!isScored && !isReadOnly && synergyPreview.totalPct > 0 && (
                <div className="flex items-center gap-2 p-3 bg-sky-500/5 border border-sky-500/20 rounded-lg">
                  <Building2 aria-hidden="true" className="size-4 text-sky-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-sky-300 font-bold">Synergy +{synergyPreview.totalPct}%</span>
                    <span className="text-xs text-white/40 ml-2">
                      {synergyPreview.details.map(d => `${d.source} ×${Math.ceil(d.bonus_pct / 5) + 1}`).join(', ')}
                    </span>
                  </div>
                </div>
              )}

              {/* Lineup Status (only when not scored — no need to show "3/6 selected" after scoring) */}
              {!isScored && !isReadOnly && (
                isLineupComplete ? (
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <CheckCircle2 aria-hidden="true" className="size-5 text-green-500 shrink-0" />
                    <span className="text-sm font-bold text-green-500">Aufstellung vollständig — unten Teilnahme bestätigen!</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
                    <span className="text-sm text-white/60">{selectedPlayers.length}/{formationSlots.length} Spieler ausgewählt</span>
                    {!reqCheck.ok && (
                      <span className="text-xs text-orange-400 flex items-center gap-1">
                        <AlertCircle aria-hidden="true" className="size-3" />
                        {reqCheck.message}
                      </span>
                    )}
                  </div>
                )
              )}

              {/* Player List with Stats & Status — hidden when fully locked or scored */}
              {!isReadOnly && !isScored && <div className="space-y-2">
                <div className="text-sm font-bold text-white/70">Deine Spieler</div>
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
                        <div className="text-[10px] text-white/40">
                          <span className={fixtureLocked ? 'text-green-400' : player.isLocked ? 'text-orange-400' : player.dpcAvailable < player.dpcOwned ? 'text-yellow-400' : 'text-white/40'}>{player.dpcAvailable}/{player.dpcOwned} DPC</span>
                          {player.eventsUsing > 0 && <span className="text-white/30"> ({player.eventsUsing} Event{player.eventsUsing > 1 ? 's' : ''})</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-white/50">L5: <span className={`font-mono font-bold ${getL5Color(player.perfL5)}`}>{player.perfL5}</span></div>
                          <div className="text-[10px] text-white/30">{player.goals}T {player.assists}A {player.matches}S</div>
                        </div>
                        {fixtureLocked ? (
                          <span className="text-xs text-green-400 flex items-center gap-1">
                            <Play aria-hidden="true" className="size-3" /> LIVE
                          </span>
                        ) : player.isLocked ? (
                          <span className="text-xs text-orange-400 flex items-center gap-1" title={`In ${player.eventsUsing} Events`}>
                            <Lock aria-hidden="true" className="size-3" /> Alle eingesetzt
                          </span>
                        ) : isSelected ? (
                          <CheckCircle2 aria-hidden="true" className="size-4 text-green-500" />
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
                    <ChevronLeft aria-hidden="true" className="size-4" />
                    Zurück zur Rangliste
                  </button>

                  {/* User header */}
                  <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-lg flex items-center justify-center font-bold ${viewingUserLineup.entry.rank === 1 ? 'bg-gold/20 text-gold' :
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
                      <div className="text-2xl font-mono font-black text-gold">{viewingUserLineup.entry.totalScore} Pkt</div>
                      {viewingUserLineup.entry.rewardAmount > 0 && (
                        <div className="text-xs font-mono text-green-500">+{fmtScout(viewingUserLineup.entry.rewardAmount / 100)} $SCOUT</div>
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
                    <div className="text-xs text-white/40 font-bold uppercase px-1">Einzelbewertungen</div>
                    {viewingUserLineup.data.players.map(sp => (
                      <div key={sp.slotKey} className="flex items-center justify-between p-3 rounded-lg bg-surface-base border border-white/[0.06]">
                        <div className="flex items-center gap-3">
                          <PlayerIdentity
                            player={{ first: sp.player.firstName, last: sp.player.lastName, pos: sp.player.position as Pos, status: 'fit', club: sp.player.club, ticket: 0, age: 0, imageUrl: sp.player.imageUrl }}
                            size="sm"
                            showMeta={false}
                            showStatus={false}
                          />
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
                      <RefreshCw aria-hidden="true" className="size-6 mx-auto mb-2 text-white/30 animate-spin motion-reduce:animate-none" />
                      <div className="text-sm text-white/40">Rangliste wird geladen...</div>
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div className="text-center py-8">
                      <Trophy aria-hidden="true" className="size-10 mx-auto mb-3 text-white/20" />
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
                            className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all hover:brightness-110 cursor-pointer ${isCurrentUser ? 'bg-gold/10 border-gold/30' : 'bg-surface-base border-white/10 hover:border-white/20'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`size-8 rounded-lg flex items-center justify-center font-bold text-sm ${entry.rank === 1 ? 'bg-gold/20 text-gold' :
                                entry.rank === 2 ? 'bg-white/10 text-white/70' :
                                  entry.rank === 3 ? 'bg-orange-500/20 text-orange-400' :
                                    'bg-white/5 text-white/50'
                                }`}>
                                {entry.rank}
                              </div>
                              <div className="flex items-center gap-2">
                                {entry.avatarUrl ? (
                                  <img src={entry.avatarUrl} alt="" className="size-6 rounded-full object-cover" />
                                ) : (
                                  <div className="size-6 rounded-full bg-white/10 flex items-center justify-center text-[10px]">👤</div>
                                )}
                                <span className={`text-left ${isCurrentUser ? 'font-bold text-gold' : ''}`}>
                                  {entry.displayName || entry.handle} {isCurrentUser && '(Du)'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {entry.rewardAmount > 0 && (
                                <span className="text-xs font-mono text-green-500">+{fmtScout(entry.rewardAmount / 100)} $SCOUT</span>
                              )}
                              <span className="font-mono font-bold">{entry.totalScore}</span>
                              <ChevronRight aria-hidden="true" className="size-4 text-white/30" />
                            </div>
                          </button>
                        );
                      })}
                      {viewingUserLoading && (
                        <div className="text-center py-3">
                          <RefreshCw aria-hidden="true" className="size-4 mx-auto text-white/30 animate-spin motion-reduce:animate-none" />
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
                <div className="size-10 rounded-xl bg-gold/10 flex items-center justify-center">
                  <Trophy aria-hidden="true" className="size-5 text-gold" />
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
                    <span className="font-bold text-gold">{fmtScout(event.buyIn)} $SCOUT</span>
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
                    <span className="text-gold">
                      <Crown aria-hidden="true" className="size-3.5 inline mr-1" />
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
                <Button variant="gold" size="lg" fullWidth onClick={handleFinalJoin} disabled={joining}>
                  {joining ? <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : <CheckCircle2 aria-hidden="true" className="size-4" />}
                  {joining ? 'Wird angemeldet...' : 'Bestätigen'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {/* Join — only when not joined AND event not running/ended */}
        {!event.isJoined && event.status !== 'ended' && event.status !== 'running' && (() => {
          const isFull = !!(event.maxParticipants && event.participants >= event.maxParticipants);
          const filledSlots = selectedPlayers.length;
          const totalSlots = formationSlots.length;
          const canJoin = isLineupComplete && reqCheck.ok && !isFull && !overBudget;
          return (
            <div className="flex-shrink-0 border-t border-white/10 bg-bg-main">
              {/* Lineup progress indicator */}
              {!isLineupComplete && (
                <div className="px-3 pt-3 md:px-5 md:pt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-white/50">Aufstellung</span>
                    <span className="text-xs font-mono font-bold text-gold">{filledSlots}/{totalSlots} Spieler</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold rounded-full transition-colors"
                      style={{ width: `${(filledSlots / totalSlots) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              {/* Salary Cap budget bar */}
              {salaryCap != null && selectedPlayers.length > 0 && (
                <div className="px-3 pt-2 md:px-5 md:pt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/50">Budget</span>
                    <span className={`text-xs font-mono font-bold ${overBudget ? 'text-red-400' : 'text-green-500'}`}>
                      {totalSalary} / {salaryCap}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        overBudget ? 'bg-red-500' : totalSalary / salaryCap > 0.85 ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, (totalSalary / salaryCap) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="p-3 md:p-5">
                <Button
                  variant="gold"
                  fullWidth
                  size="lg"
                  onClick={handleConfirmJoin}
                  disabled={!canJoin}
                  className={!canJoin ? 'opacity-60' : 'animate-pulse motion-reduce:animate-none-subtle'}
                >
                  <CheckCircle2 aria-hidden="true" className="size-5" />
                  {isFull
                    ? 'Event voll'
                    : !isLineupComplete
                    ? `Noch ${totalSlots - filledSlots} Spieler aufstellen`
                    : !reqCheck.ok
                    ? reqCheck.message
                    : event.buyIn === 0
                    ? 'Anmeldung bestätigen'
                    : `Anmelden & ${fmtScout(event.buyIn)} $SCOUT zahlen`}
                </Button>
              </div>
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
              disabled={leaving}
            >
              {leaving ? <><Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> Abmelden...</> : 'Abmelden'}
            </Button>
            <Button
              variant="gold"
              fullWidth
              size="lg"
              onClick={handleConfirmJoin}
              className={!isLineupComplete || !reqCheck.ok ? 'opacity-50' : ''}
            >
              <Save aria-hidden="true" className="size-5" />
              Aufstellung ändern
            </Button>
          </div>
        )}

        {/* Running event — joined user sees locked status */}
        {event.isJoined && event.status === 'running' && (
          <div className="flex-shrink-0 p-3 md:p-5 border-t border-white/10">
            <div className="flex items-center justify-center gap-2 py-3 px-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <Lock aria-hidden="true" className="size-4 text-green-500" />
              <span className="text-sm font-bold text-green-500">Nimmt teil — Aufstellung gesperrt</span>
            </div>
          </div>
        )}

        {/* Running event — not joined */}
        {!event.isJoined && event.status === 'running' && (
          <div className="flex-shrink-0 p-3 md:p-5 border-t border-white/10">
            <div className="flex items-center justify-center gap-2 py-3 px-4 bg-white/[0.03] border border-white/10 rounded-xl">
              <Play aria-hidden="true" className="size-4 text-white/50" />
              <span className="text-sm text-white/50">Event läuft — Anmeldung geschlossen</span>
            </div>
          </div>
        )}

        {/* Ended event — joined + scored */}
        {event.isJoined && event.status === 'ended' && event.scoredAt && (
          <div className="flex-shrink-0 p-3 md:p-5 border-t border-white/10">
            <button
              onClick={() => setTab('leaderboard')}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-purple-500/10 border border-purple-500/30 rounded-xl hover:bg-purple-500/20 transition-colors"
            >
              <Trophy aria-hidden="true" className="size-4 text-purple-400" />
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
              <Clock aria-hidden="true" className="size-4 text-white/40" />
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
              <Eye aria-hidden="true" className="size-5" />
              Ergebnisse ansehen
            </Button>
          </div>
        )}

      {/* Player Picker Modal — Enhanced with Search, Sort, Stats, Status */}
      {showPlayerPicker && (() => {
        const POS_LABEL: Record<string, string> = { GK: 'Torwart', DEF: 'Verteidiger', MID: 'Mittelfeldspieler', ATT: 'Angreifer' };
        const posColor = getPosAccentColor(showPlayerPicker.position);
        const availablePlayers = getAvailablePlayersForPosition(showPlayerPicker.position);
        return (
          <>
            {/* Desktop: backdrop + centered modal */}
            <div className="hidden md:block fixed inset-0 bg-black/60 z-[60]" onClick={() => { setShowPlayerPicker(null); setPickerSearch(''); }} />
            {/* Mobile: full-screen | Desktop: centered modal */}
            <div className="fixed inset-0 z-[60] bg-bg-main flex flex-col md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[calc(100%-2rem)] md:max-w-md md:max-h-[70vh] md:rounded-xl md:border md:border-white/10 md:shadow-2xl md:overflow-hidden">
              {/* ── Sticky Header ── */}
              <div className="shrink-0 bg-bg-main border-b border-white/10">
                {/* Top bar: Back + Title + Count + Sort */}
                <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                  <button
                    onClick={() => { setShowPlayerPicker(null); setPickerSearch(''); }}
                    aria-label="Spielerauswahl schließen"
                    className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <X aria-hidden="true" className="size-5 text-white/60" />
                  </button>
                  <div className="flex-1">
                    <h3 className="font-black text-base">
                      <span style={{ color: posColor }}>{POS_LABEL[showPlayerPicker.position] || showPlayerPicker.position}</span> wählen
                    </h3>
                    <div className="text-[10px] text-white/40">{availablePlayers.length} verfügbar</div>
                  </div>
                  {/* Sort pills */}
                  <div className="flex items-center gap-0.5">
                    {(['l5', 'name'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setPickerSort(s === 'l5' ? 'l5' : 'name')}
                        className={cn('px-2 py-1 rounded text-[10px] font-bold min-h-[44px]',
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
                      placeholder="Spieler suchen..."
                      value={pickerSearch}
                      onChange={e => setPickerSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/30"
                    />
                  </div>
                </div>
              </div>

              {/* ── Scrollable Player List ── */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {availablePlayers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <PositionBadge pos={showPlayerPicker.position as Pos} size="lg" />
                    <div className="text-sm text-white/30 mt-3 text-center">
                      Keine {POS_LABEL[showPlayerPicker.position] || 'Spieler'} verfügbar
                    </div>
                    <Link
                      href="/market?tab=kaufen"
                      onClick={() => { setShowPlayerPicker(null); setPickerSearch(''); }}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-gold/15 text-gold text-xs font-bold rounded-xl hover:bg-gold/25 transition-colors"
                    >
                      <ShoppingCart aria-hidden="true" className="size-3.5" />
                      Spieler kaufen
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {availablePlayers.map(player => {
                      const scoreColor = player.perfL5 >= 70 ? 'text-green-500' : player.perfL5 >= 50 ? 'text-white' : 'text-red-300';
                      return (
                        <button
                          key={player.id}
                          onClick={() => handleSelectPlayer(player.id, showPlayerPicker.position, showPlayerPicker.slot)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-white/[0.06] transition-colors text-left"
                        >
                          {/* Identity */}
                          <PlayerIdentity
                            player={{ first: player.first, last: player.last, pos: player.pos as Pos, status: player.status, club: player.club, ticket: 0, age: 0, imageUrl: player.imageUrl }}
                            size="md"
                            className="flex-1 min-w-0"
                          />
                          {/* Stats + Score */}
                          <div className="shrink-0 flex items-center gap-2.5">
                            {/* Compact stats */}
                            <div className="flex flex-col items-end gap-0.5">
                              <div className="flex gap-1">
                                {player.goals > 0 && <span className="text-[9px] font-mono bg-white/5 px-1 py-0.5 rounded text-white/50">{player.goals}T</span>}
                                {player.assists > 0 && <span className="text-[9px] font-mono bg-white/5 px-1 py-0.5 rounded text-white/50">{player.assists}A</span>}
                              </div>
                              <span className="text-[9px] text-white/25 font-mono">{player.dpcAvailable}/{player.dpcOwned} DPC</span>
                            </div>
                            {/* L5 Score — prominent */}
                            <div className="w-10 text-right">
                              <div className={cn('text-lg font-black font-mono leading-none', scoreColor)}>
                                {player.perfL5}
                              </div>
                              <div className="text-[9px] text-white/25 font-mono">L5</div>
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
    </Modal>
  );
};

// ============================================
// EVENT CARD (für Card View)