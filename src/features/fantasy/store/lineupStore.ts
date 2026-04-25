import { create } from 'zustand';
import type { LineupPlayer } from '@/components/fantasy/types';
import type { PickerSortKey } from '@/components/fantasy/PickerSortFilter';

/**
 * Slice 195d — Bench-Slot-Kind.
 * `bench-gk` = GK-Bench (nur GK-Holdings). `bench-outfield-N` = N-ter Outfield-Slot (1-3).
 */
export type BenchSlotKey = 'bench_gk' | 'bench_o1' | 'bench_o2' | 'bench_o3';

interface LineupState {
  // Core lineup
  selectedPlayers: LineupPlayer[];
  selectedFormation: string;
  captainSlot: string | null;
  wildcardSlots: Set<string>;

  // Bench + Sub-Order (Slice 195d)
  benchGk: string | null;
  benchO1: string | null;
  benchO2: string | null;
  benchO3: string | null;
  /**
   * 1-basierte Permutation [1,2,3] — `benchOrder[i]` = slot-index der i-ten Sub-Wahl.
   * Beispiel: `benchOrder=[2,1,3]` heisst: 1. Sub-Versuch = bench_o2, 2. Sub = bench_o1, 3. Sub = bench_o3.
   * Default `[1,2,3]` = O1,O2,O3.
   */
  benchOrder: number[];

  // Player Picker
  pickerOpen: { position: string; slot: number } | null;
  pickerSearch: string;
  pickerSort: PickerSortKey;
  clubFilter: string[];
  onlyAvailable: boolean;
  synergyOnly: boolean;

  // Actions
  selectPlayer: (playerId: string, position: string, slot: number) => void;
  removePlayer: (slot: number) => void;
  setFormation: (formationId: string) => void;
  setCaptain: (slot: string | null) => void;
  toggleWildcard: (slotKey: string) => void;
  resetLineup: (defaultFormation: string) => void;
  loadFromDb: (
    players: LineupPlayer[],
    formation: string,
    captain: string | null,
    bench?: {
      benchGk: string | null;
      benchO1: string | null;
      benchO2: string | null;
      benchO3: string | null;
      benchOrder: number[];
    },
  ) => void;
  openPicker: (position: string, slot: number) => void;
  closePicker: () => void;
  setPickerSearch: (q: string) => void;
  setPickerSort: (sort: PickerSortKey) => void;
  setClubFilter: (clubs: string[]) => void;
  setOnlyAvailable: (v: boolean) => void;
  setSynergyOnly: (v: boolean) => void;

  // Bench actions (Slice 195d)
  setBenchSlot: (kind: BenchSlotKey, playerId: string | null) => void;
  /** Verschiebe einen Outfield-Slot in der Sub-Order (`fromIdx`/`toIdx` 0-basiert in `benchOrder`-Array). */
  moveBenchOrder: (fromIdx: number, toIdx: number) => void;
}

export const useLineupStore = create<LineupState>((set) => ({
  // Initial state
  selectedPlayers: [],
  selectedFormation: '1-2-2-2',
  captainSlot: null,
  wildcardSlots: new Set(),
  // Bench (Slice 195d)
  benchGk: null,
  benchO1: null,
  benchO2: null,
  benchO3: null,
  benchOrder: [1, 2, 3],
  pickerOpen: null,
  pickerSearch: '',
  pickerSort: 'l5',
  clubFilter: [],
  onlyAvailable: true,
  synergyOnly: false,

  // Actions
  selectPlayer: (playerId, position, slot) =>
    set((state) => ({
      selectedPlayers: [
        ...state.selectedPlayers.filter((p) => p.slot !== slot),
        { playerId, position, slot, isLocked: false },
      ],
    })),

  removePlayer: (slot) =>
    set((state) => ({
      selectedPlayers: state.selectedPlayers.filter((p) => p.slot !== slot),
    })),

  // CRITICAL: setFormation MUST clear selectedPlayers (existing behavior).
  // Bench bleibt erhalten — Bench ist formation-unabhaengig (1 GK + 3 Outfield, immer).
  setFormation: (formationId) =>
    set({
      selectedFormation: formationId,
      selectedPlayers: [],
    }),

  setCaptain: (slot) => set({ captainSlot: slot }),

  toggleWildcard: (slotKey) =>
    set((state) => {
      const next = new Set(state.wildcardSlots);
      if (next.has(slotKey)) next.delete(slotKey);
      else next.add(slotKey);
      return { wildcardSlots: next };
    }),

  resetLineup: (defaultFormation) =>
    set({
      selectedPlayers: [],
      selectedFormation: defaultFormation,
      captainSlot: null,
      wildcardSlots: new Set(),
      benchGk: null,
      benchO1: null,
      benchO2: null,
      benchO3: null,
      benchOrder: [1, 2, 3],
      pickerOpen: null,
      pickerSearch: '',
      clubFilter: [],
    }),

  loadFromDb: (players, formation, captain, bench) =>
    set((state) => ({
      selectedPlayers: players,
      selectedFormation: formation,
      captainSlot: captain,
      benchGk: bench ? bench.benchGk : state.benchGk,
      benchO1: bench ? bench.benchO1 : state.benchO1,
      benchO2: bench ? bench.benchO2 : state.benchO2,
      benchO3: bench ? bench.benchO3 : state.benchO3,
      benchOrder: bench ? bench.benchOrder : state.benchOrder,
    })),

  openPicker: (position, slot) =>
    set({
      pickerOpen: { position, slot },
      pickerSearch: '',
      clubFilter: [],
    }),

  closePicker: () =>
    set({
      pickerOpen: null,
      pickerSearch: '',
      clubFilter: [],
    }),

  setPickerSearch: (q) => set({ pickerSearch: q }),
  setPickerSort: (sort) => set({ pickerSort: sort }),
  setClubFilter: (clubs) => set({ clubFilter: clubs }),
  setOnlyAvailable: (v) => set({ onlyAvailable: v }),
  setSynergyOnly: (v) => set({ synergyOnly: v }),

  // ── Bench (Slice 195d) ────────────────────────────────────
  setBenchSlot: (kind, playerId) =>
    set((state) => {
      // Wenn playerId bereits in anderem Bench-Slot → dort entfernen (kein duplicate)
      const next = {
        benchGk: state.benchGk,
        benchO1: state.benchO1,
        benchO2: state.benchO2,
        benchO3: state.benchO3,
      };
      if (playerId) {
        if (next.benchGk === playerId) next.benchGk = null;
        if (next.benchO1 === playerId) next.benchO1 = null;
        if (next.benchO2 === playerId) next.benchO2 = null;
        if (next.benchO3 === playerId) next.benchO3 = null;
      }
      const map: Record<BenchSlotKey, keyof typeof next> = {
        bench_gk: 'benchGk',
        bench_o1: 'benchO1',
        bench_o2: 'benchO2',
        bench_o3: 'benchO3',
      };
      next[map[kind]] = playerId;
      return next;
    }),

  moveBenchOrder: (fromIdx, toIdx) =>
    set((state) => {
      if (fromIdx === toIdx) return {};
      if (fromIdx < 0 || fromIdx >= state.benchOrder.length) return {};
      if (toIdx < 0 || toIdx >= state.benchOrder.length) return {};
      const next = state.benchOrder.slice();
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return { benchOrder: next };
    }),
}));
