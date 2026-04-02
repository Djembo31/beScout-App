import { create } from 'zustand';
import type { Pos } from '@/types';
import { DEFAULT_FORMATION } from '../lib/formations';

export type IntelTab = 'stats' | 'form' | 'markt';
export type StripSort = 'l5' | 'value' | 'fitness' | 'alpha';

interface ManagerState {
  // Formation
  formation: string;
  assignments: Record<string, string>;
  setFormation: (formation: string) => void;
  assignPlayer: (slotKey: string, playerId: string) => void;
  removePlayer: (slotKey: string) => void;
  clearAssignments: () => void;
  loadPreset: (formation: string, assignments: Record<string, string>) => void;

  // Intel Panel
  selectedPlayerId: string | null;
  selectPlayer: (id: string | null) => void;
  intelTab: IntelTab;
  setIntelTab: (tab: IntelTab) => void;

  // Squad Strip
  stripSort: StripSort;
  setStripSort: (s: StripSort) => void;
  stripFilterPos: Pos | 'all';
  setStripFilterPos: (p: Pos | 'all') => void;

  // Event Prep Mode
  eventPrepMode: boolean;
  toggleEventPrepMode: () => void;
  eventPrepEventId: string | null;
  setEventPrepEventId: (id: string | null) => void;

  // Presets
  activePresetName: string | null;
  setActivePresetName: (name: string | null) => void;
}

export const useManagerStore = create<ManagerState>((set) => ({
  formation: DEFAULT_FORMATION,
  assignments: {},

  setFormation: (formation) => set({ formation, assignments: {} }),
  assignPlayer: (slotKey, playerId) =>
    set((state) => ({
      assignments: { ...state.assignments, [slotKey]: playerId },
    })),
  removePlayer: (slotKey) =>
    set((state) => {
      const next = { ...state.assignments };
      delete next[slotKey];
      return { assignments: next };
    }),
  clearAssignments: () => set({ assignments: {} }),
  loadPreset: (formation, assignments) => set({ formation, assignments }),

  selectedPlayerId: null,
  selectPlayer: (selectedPlayerId) => set({ selectedPlayerId }),
  intelTab: 'stats',
  setIntelTab: (intelTab) => set({ intelTab }),

  stripSort: 'l5',
  setStripSort: (stripSort) => set({ stripSort }),
  stripFilterPos: 'all',
  setStripFilterPos: (stripFilterPos) => set({ stripFilterPos }),

  eventPrepMode: false,
  toggleEventPrepMode: () => set((s) => ({ eventPrepMode: !s.eventPrepMode })),
  eventPrepEventId: null,
  setEventPrepEventId: (eventPrepEventId) => set({ eventPrepEventId }),

  activePresetName: null,
  setActivePresetName: (activePresetName) => set({ activePresetName }),
}));
