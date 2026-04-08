'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useManagerStore } from '../../store/managerStore';
import { useOpenEvents, pickDefaultEvent } from '../../queries/eventQueries';
import { useLineupBuilder } from '@/features/fantasy/hooks/useLineupBuilder';
import { useLineupSave } from '@/features/fantasy/hooks/useLineupSave';
import { useFantasyHoldings } from '@/features/fantasy/hooks/useFantasyHoldings';
import { useFixtureDeadlines } from '@/features/fantasy/hooks/useFixtureDeadlines';
import { useEventActions } from '@/features/fantasy/hooks/useEventActions';
import { EventDetailFooter } from '@/features/fantasy/components/event-detail/EventDetailFooter';
import type { LineupPlayer } from '@/features/fantasy/types';
import EventSelector from './EventSelector';
import EquipmentShortcut from '../EquipmentShortcut';

// Lazy-loaded heavy panels (mirrors EventDetailModal)
const LineupPanel = dynamic(() => import('@/components/fantasy/event-tabs/LineupPanel'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse motion-reduce:animate-none bg-white/[0.02] rounded-2xl" />,
});
const EquipmentPicker = dynamic(() => import('@/components/gamification/EquipmentPicker'), {
  ssr: false,
});

export default function AufstellenTab() {
  const t = useTranslations('manager');
  const tFantasy = useTranslations('fantasy');
  const { user } = useUser();
  const userId = user?.id;

  // ==================== Event selection ====================
  const selectedEventId = useManagerStore((s) => s.selectedEventId);
  const { events, isLoading: eventsLoading } = useOpenEvents();

  // Effective selected event (with auto-pick fallback)
  const effectiveEvent = useMemo(() => {
    if (selectedEventId) {
      const found = events.find((e) => e.id === selectedEventId);
      if (found) return found;
    }
    return pickDefaultEvent(events);
  }, [selectedEventId, events]);

  // ==================== Holdings + fixture deadlines ====================
  const { holdings } = useFantasyHoldings();

  const currentGw = effectiveEvent?.gameweek ?? 0;
  const hasRunningEvent = effectiveEvent?.status === 'running';
  const { fixtureDeadlines } = useFixtureDeadlines(currentGw, hasRunningEvent);

  // ==================== Lineup state via shared hook (Wave 0) ====================
  const lb = useLineupBuilder({
    event: effectiveEvent,
    userId,
    isOpen: !!effectiveEvent,
    holdings,
    fixtureDeadlines,
  });

  // ==================== Trade actions (join + submit) ====================
  // useEventActions requires clubId for fee-config; fall back to '' for global events.
  const { joinEvent, submitLineup, leaveEvent } = useEventActions(effectiveEvent?.clubId ?? '');

  // ==================== Apply lineup template (cross-tab from Historie) ====================
  const applyTemplate = useManagerStore((s) => s.applyLineupTemplate);
  const setApplyTemplate = useManagerStore((s) => s.setApplyLineupTemplate);
  const { addToast } = useToast();

  useEffect(() => {
    if (!applyTemplate) return;
    if (!effectiveEvent) return; // wait until an event is resolved
    if (lb.formationSlots.length === 0) return; // wait until lb is computed

    // Detect target format from current formation slots count
    const targetFormat: '7er' | '11er' = lb.formationSlots.length === 7 ? '7er' : '11er';

    // Format mismatch — can't safely map
    if (applyTemplate.format !== targetFormat) {
      addToast(
        t('applyFormatMismatch', {
          src: applyTemplate.format,
          tgt: targetFormat,
        }),
        'error',
      );
      setApplyTemplate(null);
      return;
    }

    // Switch to source formation if it exists in target's available formations
    const matchedFormation = lb.availableFormations.find((f) => f.id === applyTemplate.formation);
    if (matchedFormation && lb.selectedFormation !== matchedFormation.id) {
      lb.handleFormationChange(matchedFormation.id);
      // Wait for formation slots to recompute on next render
      return;
    }

    // Build LineupPlayer[] from template, filtering by ownership + lock status
    const lineup: LineupPlayer[] = [];
    let missing = 0;
    lb.formationSlots.forEach((slot, idx) => {
      const playerId = applyTemplate.slotPlayerIds[idx];
      if (!playerId) return;
      const holding = lb.effectiveHoldings.find((h) => h.id === playerId);
      const locked = lb.isPlayerLocked(playerId);
      if (!holding || holding.dpcAvailable <= 0 || locked) {
        missing++;
        return;
      }
      lineup.push({
        playerId,
        position: slot.pos,
        slot: idx,
        isLocked: false,
      });
    });

    if (lineup.length > 0) {
      lb.handleApplyPreset(lb.selectedFormation, lineup);
      // handleApplyPreset clears captain (storeLoadFromDb passes null).
      // Restore captain from template if the captain slot still has a player.
      if (applyTemplate.captainSlot) {
        // Resolve captain slot key (e.g. 'mid2') → slot index (e.g. 4)
        const captainIdx = lb.slotDbKeys.findIndex((k) => k === applyTemplate.captainSlot);
        if (captainIdx >= 0 && lineup.some((p) => p.slot === captainIdx)) {
          lb.setCaptainSlot(applyTemplate.captainSlot);
        }
      }
    }

    if (missing > 0) {
      addToast(
        t('applyMissingPlayers', { count: missing }),
        'info',
      );
    } else {
      addToast(
        t('applySuccess'),
        'success',
      );
    }

    setApplyTemplate(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lb handler refs (handleApplyPreset, handleFormationChange, setCaptainSlot, isPlayerLocked) are useCallback'd in useLineupBuilder and only change when their underlying store setters change (never in practice). lb.slotDbKeys is derived from lb.formationSlots so adding it would be redundant. addToast/setApplyTemplate/t are stable. Effect re-runs when applyTemplate is set OR when the lineup state stabilises after a formation switch.
  }, [applyTemplate, effectiveEvent, lb.formationSlots, lb.selectedFormation, lb.availableFormations, lb.effectiveHoldings]);

  // ==================== Pre-pick player from Kader (Player Detail → "Im Lineup planen") ====================
  const pendingPlayerId = useManagerStore((s) => s.pendingLineupPlayerId);
  const setPendingPlayerId = useManagerStore((s) => s.setPendingLineupPlayerId);

  useEffect(() => {
    if (!pendingPlayerId) return;
    if (!effectiveEvent) return;
    if (lb.formationSlots.length === 0) return;

    // Player must be in the user's holdings + available + not locked
    const holding = lb.effectiveHoldings.find((h) => h.id === pendingPlayerId);
    if (!holding) {
      addToast(t('pendingPlayerMissing'), 'error');
      setPendingPlayerId(null);
      return;
    }
    if (holding.dpcAvailable <= 0 || lb.isPlayerLocked(pendingPlayerId)) {
      addToast(t('pendingPlayerLocked'), 'error');
      setPendingPlayerId(null);
      return;
    }

    // If player already in lineup → just toast + clear, don't move
    if (lb.selectedPlayers.some((p) => p.playerId === pendingPlayerId)) {
      addToast(t('pendingPlayerAlreadyInLineup'), 'info');
      setPendingPlayerId(null);
      return;
    }

    // Find first empty slot matching the player's position
    const playerPos = holding.pos.toUpperCase();
    const posMap: Record<string, string[]> = {
      GK: ['GK'],
      DEF: ['DEF', 'CB', 'LB', 'RB'],
      MID: ['MID', 'CM', 'CDM', 'CAM', 'LM', 'RM'],
      ATT: ['ATT', 'FW', 'ST', 'CF', 'LW', 'RW'],
    };
    const usedSlots = new Set(lb.selectedPlayers.map((p) => p.slot));
    const targetSlot = lb.formationSlots.find((s) => {
      if (usedSlots.has(s.slot)) return false;
      const validPositions = posMap[s.pos] || [s.pos];
      return validPositions.some((vp) => playerPos.includes(vp));
    });

    if (!targetSlot) {
      addToast(t('pendingPlayerNoSlot'), 'info');
      setPendingPlayerId(null);
      return;
    }

    lb.handleSelectPlayer(pendingPlayerId, targetSlot.pos, targetSlot.slot);
    addToast(
      t('pendingPlayerAdded', {
        name: `${holding.first} ${holding.last}`,
      }),
      'success',
    );
    setPendingPlayerId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lb handler refs (handleSelectPlayer, isPlayerLocked) and addToast/setPendingPlayerId/t are stable enough; effect re-runs when pendingPlayerId or effectiveEvent or formationSlots/effectiveHoldings/selectedPlayers change.
  }, [pendingPlayerId, effectiveEvent, lb.formationSlots, lb.effectiveHoldings, lb.selectedPlayers]);

  // ==================== Save flow (shared hook with EventDetailModal) ====================
  const [leaving, setLeaving] = useState(false);

  const { joining, handleSaveLineup } = useLineupSave({
    event: effectiveEvent,
    userId,
    isLineupComplete: lb.isLineupComplete,
    reqCheck: lb.reqCheck,
    selectedPlayers: lb.selectedPlayers,
    selectedFormation: lb.selectedFormation,
    captainSlot: lb.captainSlot,
    wildcardSlots: lb.wildcardSlots,
    equipmentMap: lb.equipmentMap,
    onJoin: joinEvent,
    onSubmitLineup: submitLineup,
  });

  const handleLeave = useCallback(async () => {
    if (!effectiveEvent || leaving) return;
    if (!confirm(tFantasy('confirmLeaveMsg', { name: effectiveEvent.name }))) return;
    setLeaving(true);
    try {
      await leaveEvent(effectiveEvent);
    } catch (e) {
      alert(tFantasy('leaveError', { msg: e instanceof Error ? e.message : 'Unknown' }));
    } finally {
      setLeaving(false);
    }
  }, [effectiveEvent, leaving, leaveEvent, tFantasy]);

  // Sandbox-style: opening from manager skips confirm dialog (already wired via EventSelector)
  const handleConfirmJoin = useCallback(() => {
    /* no-op — save action handles join+save together */
  }, []);

  // ==================== Loading + empty states ====================
  if (eventsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-gold" aria-hidden="true" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="space-y-4">
        <EventSelector />
        <div className="py-12 text-center text-sm text-white/40">
          {t('noOpenEvents')}
        </div>
      </div>
    );
  }

  if (!effectiveEvent) {
    return (
      <div className="space-y-4">
        <EventSelector />
        <div className="py-12 text-center text-sm text-white/40">
          {t('selectEventHint')}
        </div>
      </div>
    );
  }

  const isScored = !!effectiveEvent.scoredAt;
  const event = effectiveEvent;

  return (
    <div className="space-y-4">
      {/* Event Selector */}
      <EventSelector />

      {/* Equipment shortcut → /inventory?tab=equipment */}
      <EquipmentShortcut />

      {/* Lineup Panel */}
      <LineupPanel
        event={event}
        userId={userId}
        isScored={isScored}
        scoringJustFinished={false}
        selectedFormation={lb.selectedFormation}
        availableFormations={lb.availableFormations}
        formationSlots={lb.formationSlots}
        slotDbKeys={lb.slotDbKeys}
        selectedPlayers={lb.selectedPlayers}
        effectiveHoldings={lb.effectiveHoldings}
        slotScores={lb.slotScores}
        myTotalScore={lb.myTotalScore}
        myRank={lb.myRank}
        progressiveScores={lb.progressiveScores}
        captainSlot={lb.captainSlot}
        setCaptainSlot={lb.setCaptainSlot}
        synergyPreview={lb.synergyPreview}
        ownedPlayerIds={lb.ownedPlayerIds}
        isLineupComplete={lb.isLineupComplete}
        reqCheck={lb.reqCheck}
        isPartiallyLocked={lb.isPartiallyLocked}
        nextKickoff={lb.nextKickoff}
        isPlayerLocked={lb.isPlayerLocked}
        onFormationChange={lb.handleFormationChange}
        onApplyPreset={lb.handleApplyPreset}
        onSelectPlayer={lb.handleSelectPlayer}
        onRemovePlayer={lb.handleRemovePlayer}
        getSelectedPlayer={lb.getSelectedPlayer}
        getAvailablePlayersForPosition={lb.getAvailablePlayersForPosition}
        leaderboard={[]}
        onSwitchToLeaderboard={() => { /* no leaderboard tab in manager */ }}
        onClose={() => { /* no modal close in manager */ }}
        wildcardSlots={lb.wildcardSlots}
        onToggleWildcard={lb.onToggleWildcard}
        equipmentMap={lb.equipmentMap}
        onEquipmentTap={lb.handleEquipmentTap}
      />

      {/* Equipment Picker Modal */}
      {lb.equipPickerSlot && (
        <EquipmentPicker
          open={lb.equipPickerOpen}
          onClose={lb.closeEquipPicker}
          playerPosition={lb.equipPickerSlot.playerPosition}
          playerName={lb.equipPickerSlot.playerName}
          slotKey={lb.equipPickerSlot.slotKey}
          inventory={lb.userEquipment}
          definitions={lb.equipDefs}
          equippedId={lb.equipmentMap[lb.equipPickerSlot.slotKey]?.id ?? null}
          onEquip={lb.handleEquip}
          onUnequip={lb.handleUnequip}
          loading={false}
        />
      )}

      {/* Footer Actions */}
      <EventDetailFooter
        event={event}
        isScored={isScored}
        hasUnlockedFixtures={lb.hasUnlockedFixtures}
        isLineupComplete={lb.isLineupComplete}
        reqCheck={lb.reqCheck}
        overBudget={lb.overBudget}
        salaryCap={lb.salaryCap}
        totalSalary={lb.totalSalary}
        selectedPlayersCount={lb.selectedPlayers.length}
        formationSlotsCount={lb.formationSlots.length}
        joining={joining}
        leaving={leaving}
        onConfirmJoin={handleConfirmJoin}
        onSaveLineup={handleSaveLineup}
        onLeave={handleLeave}
        onViewResults={() => { /* no results modal in manager */ }}
      />
    </div>
  );
}
