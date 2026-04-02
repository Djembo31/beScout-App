import { create } from 'zustand';
import type { Pos } from '@/types';

export type Formation = '4-3-3' | '4-4-2' | '3-5-2' | '3-4-3' | '4-2-3-1';
export type IntelTab = 'stats' | 'form' | 'markt';
export type StripSort = 'l5' | 'value' | 'fitness' | 'alpha';

interface ManagerState {
  // Formation
  formation: Formation;
  setFormation: (f: Formation) => void;

  // Slot assignments: slot key -> playerId
  assignments: Map<string, string>;
  assignPlayer: (slot: string, playerId: string) => void;
  removePlayer: (slot: string) => void;
  clearAssignments: () => void;

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
  formation: '4-3-3',
  setFormation: (formation) => set({ formation }),

  assignments: new Map(),
  assignPlayer: (slot, playerId) => set((s) => {
    const next = new Map(s.assignments);
    next.set(slot, playerId);
    return { assignments: next };
  }),
  removePlayer: (slot) => set((s) => {
    const next = new Map(s.assignments);
    next.delete(slot);
    return { assignments: next };
  }),
  clearAssignments: () => set({ assignments: new Map() }),

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
