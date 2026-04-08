'use client';

import { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { useUser } from '@/components/providers/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queries/keys';
import { equipToSlot } from '@/lib/services/equipment';
import { useManagerStore } from '../../store/managerStore';
import { useOpenEvents, pickDefaultEvent } from '../../queries/eventQueries';
import { useLineupBuilder } from '@/features/fantasy/hooks/useLineupBuilder';
import { useFantasyHoldings } from '@/features/fantasy/hooks/useFantasyHoldings';
import { useFixtureDeadlines } from '@/features/fantasy/hooks/useFixtureDeadlines';
import { useEventActions } from '@/features/fantasy/hooks/useEventActions';
import { EventDetailFooter } from '@/features/fantasy/components/event-detail/EventDetailFooter';
import EventSelector from './EventSelector';

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
  const queryClient = useQueryClient();

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

  // ==================== Save flow (mirrors EventDetailModal handleSaveLineup) ====================
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const handleSaveLineup = useCallback(async () => {
    if (!effectiveEvent) return;
    if (!lb.isLineupComplete) {
      alert(tFantasy('incompleteLineupAlert'));
      return;
    }
    if (!lb.reqCheck.ok) {
      alert(lb.reqCheck.message);
      return;
    }
    setJoining(true);
    try {
      if (!effectiveEvent.isJoined) {
        await joinEvent(effectiveEvent);
      }
      await submitLineup(
        effectiveEvent,
        lb.selectedPlayers,
        lb.selectedFormation,
        lb.captainSlot,
        Array.from(lb.wildcardSlots),
      );

      // Persist equipment after lineup save
      const eqEntries = Object.entries(lb.equipmentMap);
      if (eqEntries.length > 0 && userId) {
        const results = await Promise.allSettled(
          eqEntries.map(([slotKey, eq]) => equipToSlot(effectiveEvent.id, eq.id, slotKey)),
        );
        const failed = results.filter(
          (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok),
        );
        if (failed.length > 0) {
          console.error('[AufstellenTab] Some equip calls failed:', failed);
        }
        queryClient.invalidateQueries({ queryKey: qk.equipment.inventory(userId) });
      }
    } catch (err) {
      console.error('[AufstellenTab] handleSaveLineup failed:', err);
      alert(tFantasy('errorShort', { msg: err instanceof Error ? err.message : 'Lineup save failed' }));
    } finally {
      setJoining(false);
    }
  }, [effectiveEvent, lb, joinEvent, submitLineup, userId, queryClient, tFantasy]);

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
          {t('noOpenEvents', { defaultValue: 'Keine offenen Events' })}
        </div>
      </div>
    );
  }

  if (!effectiveEvent) {
    return (
      <div className="space-y-4">
        <EventSelector />
        <div className="py-12 text-center text-sm text-white/40">
          {t('selectEventHint', { defaultValue: 'Wähle ein Event oben' })}
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
