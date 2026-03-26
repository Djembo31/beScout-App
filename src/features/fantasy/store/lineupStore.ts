import { create } from 'zustand';
import type { LineupPlayer } from '@/components/fantasy/types';
import type { PickerSortKey } from '@/components/fantasy/PickerSortFilter';

interface LineupState {
  // Core lineup
  selectedPlayers: LineupPlayer[];
  selectedFormation: string;
  captainSlot: string | null;
  wildcardSlots: Set<string>;

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
  ) => void;
  openPicker: (position: string, slot: number) => void;
  closePicker: () => void;
  setPickerSearch: (q: string) => void;
  setPickerSort: (sort: PickerSortKey) => void;
  setClubFilter: (clubs: string[]) => void;
  setOnlyAvailable: (v: boolean) => void;
  setSynergyOnly: (v: boolean) => void;
}

export const useLineupStore = create<LineupState>((set) => ({
  // Initial state
  selectedPlayers: [],
  selectedFormation: '1-2-2-2',
  captainSlot: null,
  wildcardSlots: new Set(),
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

  // CRITICAL: setFormation MUST clear selectedPlayers (existing behavior)
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
      pickerOpen: null,
      pickerSearch: '',
      clubFilter: [],
    }),

  loadFromDb: (players, formation, captain) =>
    set({
      selectedPlayers: players,
      selectedFormation: formation,
      captainSlot: captain,
    }),

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
}));
