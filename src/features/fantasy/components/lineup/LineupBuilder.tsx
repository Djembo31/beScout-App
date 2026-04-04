'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { Pos, SynergyDetail } from '@/types';
import type { FantasyEvent, LineupPlayer, UserDpcHolding } from '@/components/fantasy/types';
import type { FormationDef } from '@/components/fantasy/constants';
import { useBatchFormScores, useNextFixtures } from '@/lib/queries/fantasyPicker';
import { getClubAvgL5 } from '@/components/fantasy/FDRBadge';
import { getClub } from '@/lib/clubs';
import { usePlayers } from '@/lib/queries/players';
import { centsToBsd } from '@/lib/services/players';
import FantasyPlayerRow from '@/components/fantasy/FantasyPlayerRow';

import { PitchView } from './PitchView';
import { FormationSelector } from './FormationSelector';
import { ScoreBreakdown } from './ScoreBreakdown';
import { SynergyPreview } from './SynergyPreview';
import { PlayerPicker } from './PlayerPicker';

export interface LineupBuilderProps {
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
  // DPC Ownership bonus
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
  getAvailablePlayersForPosition: (position: string, isWildcardSlot?: boolean) => UserDpcHolding[];
  // Leaderboard
  leaderboard: { userId: string; rewardAmount: number }[];
  // Tab switch
  onSwitchToLeaderboard: () => void;
  // Close modal
  onClose: () => void;
  // Wild Cards
  wildcardSlots?: Set<string>;
  onToggleWildcard?: (slotKey: string) => void;
}

export function LineupBuilder({
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
  wildcardSlots,
  onToggleWildcard,
}: LineupBuilderProps) {
  const t = useTranslations('fantasy');

  const isFullyLocked = event.status === 'ended';
  const isReadOnly = isFullyLocked;

  // Player picker state
  const [showPlayerPicker, setShowPlayerPicker] = useState<{ position: string; slot: number } | null>(null);

  // DPC Ownership bonus -- capped at 3 players per lineup
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

  // Derive synergy clubs from currently selected lineup
  const synergyClubs = useMemo(() => {
    const clubs = selectedPlayers.map(sp => {
      const h = effectiveHoldings.find(eh => eh.id === sp.playerId);
      return h?.club;
    }).filter(Boolean) as string[];
    return Array.from(new Set(clubs));
  }, [selectedPlayers, effectiveHoldings]);

  // Data for Intelligence Strip rows (player list below pitch)
  const playerIds = useMemo(() => effectiveHoldings.map(h => h.id), [effectiveHoldings]);
  const { data: formScoresMap } = useBatchFormScores(playerIds, !!showPlayerPicker || !isReadOnly);
  const { data: nextFixturesMap } = useNextFixtures(!isReadOnly);
  const { data: allPlayers = [] } = usePlayers(!isReadOnly);

  // Available clubs for filter (from holdings)
  const availableClubsList = useMemo(() => {
    const clubShorts = Array.from(new Set(effectiveHoldings.map(h => h.club)));
    return clubShorts.map(short => {
      const c = getClub(short);
      return { short, logo: c?.logo ?? null };
    });
  }, [effectiveHoldings]);

  // Helper: map a UserDpcHolding to FantasyPlayerRow props
  function getRowProps(player: UserDpcHolding) {
    const isSelected = selectedPlayers.some(sp => sp.playerId === player.id);
    const fixtureLocked = isPlayerLocked(player.id);
    const formEntries = formScoresMap?.get(player.id) ?? [];
    const clubId = player.clubId ?? allPlayers.find(p => p.id === player.id)?.clubId;
    const nextFix = clubId ? nextFixturesMap?.get(clubId) : undefined;
    const oppAvgL5 = nextFix ? getClubAvgL5(nextFix.opponentShort, allPlayers) : 0;
    const hasSynergy = synergyClubs.includes(player.club) && !isSelected;
    const synergyPct = hasSynergy ? synergyClubs.filter(c => c === player.club).length * 4 : null;

    let rowState: 'default' | 'selected' | 'locked' | 'deployed' | 'injured' | 'suspended' = 'default';
    if (fixtureLocked) rowState = 'locked';
    else if (isSelected) rowState = 'selected';
    else if (player.isLocked) rowState = 'deployed';
    else if (player.status === 'injured') rowState = 'injured';
    else if (player.status === 'suspended') rowState = 'suspended';

    return {
      player: {
        id: player.id,
        first: player.first,
        last: player.last,
        pos: player.pos as Pos,
        club: player.club,
        imageUrl: player.imageUrl,
        ticket: player.ticket ?? 0,
        status: player.status,
        perfL5: player.perfL5,
        perfL15: player.perfL15 ?? 0,
        matches: player.matches,
        goals: player.goals,
        assists: player.assists,
        floorPrice: centsToBsd(player.floorPrice ?? 0),
        dpcOwned: player.dpcOwned,
        dpcAvailable: player.dpcAvailable,
        eventsUsing: player.eventsUsing,
      },
      formEntries,
      nextFixture: nextFix ? { opponentShort: nextFix.opponentShort, opponentName: nextFix.opponentName, isHome: nextFix.isHome } : null,
      opponentAvgL5: oppAvgL5,
      synergyPct,
      rowState,
    };
  }

  return (
    <div className="space-y-4">
      {/* Status banners + synergy/ownership/captain/lineup-status banners */}
      <SynergyPreview
        event={event}
        synergyPreview={synergyPreview}
        ownedPlayerIds={ownedPlayerIds}
        ownershipBonusIds={ownershipBonusIds}
        captainSlot={captainSlot}
        slotDbKeys={slotDbKeys}
        getSelectedPlayer={getSelectedPlayer}
        isPlayerLocked={isPlayerLocked}
        isScored={isScored}
        isReadOnly={isReadOnly}
        isLineupComplete={isLineupComplete}
        selectedPlayersCount={selectedPlayers.length}
        formationSlotsCount={formationSlots.length}
        formationSlots={formationSlots}
        reqCheck={reqCheck}
        wildcardSlots={wildcardSlots}
        isPartiallyLocked={isPartiallyLocked}
        nextKickoff={nextKickoff}
        scoringJustFinished={scoringJustFinished}
        progressiveScores={progressiveScores}
        setCaptainSlot={setCaptainSlot}
        selectedPlayers={selectedPlayers}
      />

      {/* Formation Selector + Presets */}
      <FormationSelector
        selectedFormation={selectedFormation}
        availableFormations={availableFormations}
        isReadOnly={isReadOnly}
        selectedPlayers={selectedPlayers}
        effectiveHoldings={effectiveHoldings}
        formationSlots={formationSlots}
        onFormationChange={onFormationChange}
        onApplyPreset={onApplyPreset}
      />

      {/* Pitch View */}
      <PitchView
        event={event}
        formationSlots={formationSlots}
        slotDbKeys={slotDbKeys}
        selectedFormation={selectedFormation}
        getSelectedPlayer={getSelectedPlayer}
        isPlayerLocked={isPlayerLocked}
        captainSlot={captainSlot}
        slotScores={slotScores}
        progressiveScores={progressiveScores}
        wildcardSlots={wildcardSlots}
        ownedPlayerIds={ownedPlayerIds}
        ownershipBonusIds={ownershipBonusIds}
        isScored={isScored}
        isReadOnly={isReadOnly}
        onSlotClick={(slot) => setShowPlayerPicker({ position: slot.pos, slot: slot.slot })}
        onRemovePlayer={onRemovePlayer}
        onCaptainToggle={(slotDbKey, isCaptain) => setCaptainSlot(isCaptain ? null : slotDbKey)}
        onWildcardToggle={onToggleWildcard}
      />

      {/* Score Breakdown (scored/progressive) */}
      <ScoreBreakdown
        event={event}
        formationSlots={formationSlots}
        slotDbKeys={slotDbKeys}
        getSelectedPlayer={getSelectedPlayer}
        slotScores={slotScores}
        progressiveScores={progressiveScores}
        captainSlot={captainSlot}
        ownedPlayerIds={ownedPlayerIds}
        ownershipBonusIds={ownershipBonusIds}
        leaderboard={leaderboard}
        userId={userId}
        isScored={isScored}
        scoringJustFinished={scoringJustFinished}
        myTotalScore={myTotalScore}
        myRank={myRank}
        synergyPreview={synergyPreview}
        onSwitchToLeaderboard={onSwitchToLeaderboard}
        onClose={onClose}
      />

      {/* Player List with Intelligence Strip -- hidden when fully locked or scored */}
      {!isReadOnly && !isScored && <div className="space-y-0.5">
        <div className="text-sm font-bold text-white/70 px-3 mb-2">{t('yourPlayers')}</div>
        {effectiveHoldings.map(player => {
          const props = getRowProps(player);
          return (
            <FantasyPlayerRow
              key={player.id}
              {...props}
              onClick={() => window.open(`/player/${player.id}`, '_blank')}
            />
          );
        })}
      </div>}

      {/* Player Picker Modal */}
      {showPlayerPicker && (
        <PlayerPicker
          event={event}
          position={showPlayerPicker.position}
          slot={showPlayerPicker.slot}
          slotDbKeys={slotDbKeys}
          wildcardSlots={wildcardSlots}
          effectiveHoldings={effectiveHoldings}
          selectedPlayers={selectedPlayers}
          isPlayerLocked={isPlayerLocked}
          getAvailablePlayersForPosition={getAvailablePlayersForPosition}
          onSelectPlayer={onSelectPlayer}
          onClose={() => setShowPlayerPicker(null)}
        />
      )}
    </div>
  );
}
