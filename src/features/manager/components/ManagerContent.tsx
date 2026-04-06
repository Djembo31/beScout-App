'use client';

import { useMemo, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useUser } from '@/components/providers/AuthProvider';
import { Modal } from '@/components/ui';
import { useManagerData } from '../hooks/useManagerData';
import { useManagerStore } from '../store/managerStore';
import { FORMATIONS, DEFAULT_FORMATIONS } from '../lib/formations';
import SquadPitch from '@/features/market/components/portfolio/SquadPitch';
import type { Pos, Player } from '@/types';
import StatusBar from './StatusBar';
import IntelPanel from './IntelPanel';
import SquadStrip from './SquadStrip';

export default function ManagerContent() {
  const { user } = useUser();

  // ── Data ──
  const {
    players, mySquadPlayers, playerMap, holdings, playersLoading,
    scoresMap, nextFixturesMap, eventUsageMap,
    userEquipment, equipDefs,
    healthCounts, portfolioTrend, fitnessMap, eventLocks, validEquipmentIds,
    getScores, getNextFixture, getEventCount, getFloor,
  } = useManagerData(user?.id);

  // ── Store ──
  const store = useManagerStore();

  // ── Prune stale equipment on render ──
  // (equipment consumed/missing since last session)
  useMemo(() => {
    if (store.equipmentPlan.size > 0 && validEquipmentIds.size > 0) {
      store.pruneEquipmentPlan(validEquipmentIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validEquipmentIds]);

  // ── Formation ──
  const availableFormations = FORMATIONS[store.squadSize];
  const formation = useMemo(
    () => availableFormations.find(f => f.id === store.formationId) ?? availableFormations[0],
    [store.formationId, availableFormations],
  );

  // ── Assignments as Player map (for SquadPitch) ──
  const assignedPlayers = useMemo(() => {
    const map = new Map<number, Player>();
    Array.from(store.assignments.entries()).forEach(([idx, pid]) => {
      const p = playerMap.get(pid);
      if (p) map.set(idx, p);
    });
    return map;
  }, [store.assignments, playerMap]);

  const assignedIds = useMemo(
    () => new Set(store.assignments.values()),
    [store.assignments],
  );

  // ── Selected player ──
  const selectedPlayer = store.selectedPlayerId ? playerMap.get(store.selectedPlayerId) ?? null : null;

  // ── Equipment plan enriched (for SquadPitch badges) ──
  const enrichedEquipmentPlan = useMemo(() => {
    if (!userEquipment || store.equipmentPlan.size === 0) return undefined;
    const map = new Map<number, { key: string; rank: number }>();
    Array.from(store.equipmentPlan.entries()).forEach(([idx, eqId]) => {
      const eq = userEquipment.find(e => e.id === eqId);
      if (eq) map.set(idx, { key: eq.equipment_key, rank: eq.rank });
    });
    return map.size > 0 ? map : undefined;
  }, [store.equipmentPlan, userEquipment]);

  // ── Handlers ──
  const handleSlotClick = useCallback((slotIndex: number, pos: Pos) => {
    const existingPlayerId = store.assignments.get(slotIndex);
    if (existingPlayerId) {
      // Tap occupied slot → select player in Intel Panel
      store.selectPlayer(existingPlayerId);
    } else {
      // Tap empty slot → filter SquadStrip by position
      store.setStripFilterPos(pos);
      store.selectPlayer(null);
    }
  }, [store]);

  const handleStripSelect = useCallback((playerId: string) => {
    store.selectPlayer(playerId);
  }, [store]);

  const handleStripAssign = useCallback((playerId: string) => {
    // Find first empty slot matching player position
    const player = playerMap.get(playerId);
    if (!player) return;
    const slotIdx = formation.slots.findIndex((slot, idx) =>
      slot.pos === player.pos && !store.assignments.has(idx),
    );
    if (slotIdx >= 0) {
      store.assignPlayer(slotIdx, playerId);
    }
  }, [playerMap, formation, store]);

  const handleFormationChange = useCallback((id: string) => {
    store.setFormationId(id as typeof store.formationId);
  }, [store]);

  const handleSquadSizeChange = useCallback((size: '11' | '7') => {
    store.setSquadSize(size);
  }, [store]);

  // ── Loading ──
  if (playersLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 text-gold animate-spin motion-reduce:animate-none" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Zone 1: StatusBar ── */}
      <StatusBar
        fitCount={healthCounts.fit}
        doubtfulCount={healthCounts.doubtful}
        injuredCount={healthCounts.injured}
        nextEvent={null}
        portfolioTrendPct={portfolioTrend.pctChange}
        totalValue={portfolioTrend.totalValue}
        assignedCount={assignedPlayers.size}
        totalSlots={formation.slots.length}
      />

      {/* ── Zone 2 + 3: TacticalBoard + IntelPanel ── */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Tactical Board (Pitch + Controls) */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Formation Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Squad Size Toggle */}
            <div className="flex bg-white/[0.04] rounded-lg border border-white/10 overflow-hidden">
              {(['11', '7'] as const).map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleSquadSizeChange(size)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px] ${
                    store.squadSize === size
                      ? 'bg-gold/20 text-gold'
                      : 'text-white/50 hover:text-white/70'
                  }`}
                >
                  {size}er
                </button>
              ))}
            </div>

            {/* Formation Selector */}
            <div className="flex gap-1 flex-wrap">
              {availableFormations.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleFormationChange(f.id)}
                  className={`px-2.5 py-1.5 text-xs font-mono rounded-lg border transition-colors min-h-[36px] ${
                    store.formationId === f.id
                      ? 'bg-gold/20 text-gold border-gold/30'
                      : 'bg-white/[0.04] text-white/50 border-white/10 hover:text-white/70'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          {/* Pitch */}
          <SquadPitch
            formation={formation}
            assignments={assignedPlayers}
            onSlotClick={handleSlotClick}
            fitnessDots={fitnessMap}
            eventLocks={eventLocks}
            equipmentPlan={enrichedEquipmentPlan}
          />

          {/* Preset Controls */}
          <div className="flex items-center gap-2 text-xs">
            {store.presets.length > 0 && (
              <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                {store.presets.map(p => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => store.loadPreset(p)}
                    className="px-2 py-1 bg-white/[0.04] border border-white/10 rounded-lg text-white/60 hover:text-white transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                const name = `Preset ${store.presets.length + 1}`;
                store.savePreset(name);
              }}
              className="px-2 py-1 bg-white/[0.04] border border-white/10 rounded-lg text-white/40 hover:text-gold transition-colors whitespace-nowrap flex-shrink-0"
            >
              + Save
            </button>
            {store.assignments.size > 0 && (
              <button
                type="button"
                onClick={() => store.clearAssignments()}
                className="px-2 py-1 text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* IntelPanel — Desktop: sidebar, Mobile: hidden (bottom sheet instead) */}
        <div className="hidden lg:block w-[320px] flex-shrink-0 bg-white/[0.02] border border-white/10 rounded-2xl p-3"
          style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
        >
          <IntelPanel
            player={selectedPlayer}
            activeTab={store.intelTab}
            onTabChange={store.setIntelTab}
            scores={selectedPlayer ? getScores(selectedPlayer.id) : undefined}
            nextFixture={selectedPlayer?.clubId ? getNextFixture(selectedPlayer.clubId) : undefined}
            eventCount={selectedPlayer ? getEventCount(selectedPlayer.id) : 0}
            holdings={holdings}
            getFloor={getFloor}
          />
        </div>
      </div>

      {/* ── Zone 4: SquadStrip ── */}
      <SquadStrip
        players={mySquadPlayers}
        assignedIds={assignedIds}
        eventLocks={eventLocks}
        selectedPlayerId={store.selectedPlayerId}
        sort={store.stripSort}
        filterPos={store.stripFilterPos}
        onSort={store.setStripSort}
        onFilterPos={store.setStripFilterPos}
        onSelectPlayer={handleStripSelect}
        getFloor={getFloor}
        getScores={getScores}
      />

      {/* ── Mobile IntelPanel Bottom Sheet ── */}
      <Modal
        open={store.intelOpen && !!selectedPlayer}
        onClose={() => store.setIntelOpen(false)}
        className="lg:hidden"
      >
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <IntelPanel
            player={selectedPlayer}
            activeTab={store.intelTab}
            onTabChange={store.setIntelTab}
            scores={selectedPlayer ? getScores(selectedPlayer.id) : undefined}
            nextFixture={selectedPlayer?.clubId ? getNextFixture(selectedPlayer.clubId) : undefined}
            eventCount={selectedPlayer ? getEventCount(selectedPlayer.id) : 0}
            holdings={holdings}
            getFloor={getFloor}
          />
        </div>
      </Modal>
    </div>
  );
}
