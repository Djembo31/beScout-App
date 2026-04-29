import { create } from 'zustand';
import type { FantasyTab } from '@/components/fantasy/types';

interface FantasyState {
  // Navigation
  mainTab: FantasyTab;
  selectedGameweek: number | null;
  currentGw: number;

  // Event Detail Modal
  selectedEventId: string | null;
  showCreateModal: boolean;

  // Summary Modal
  summaryEventId: string | null;

  // Interested (local-only, not persisted)
  interestedIds: Set<string>;

  // Actions
  setMainTab: (tab: FantasyTab) => void;
  setSelectedGameweek: (gw: number | null) => void;
  setCurrentGw: (gw: number) => void;
  openEvent: (id: string) => void;
  closeEvent: () => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  setSummaryEventId: (id: string | null) => void;
  toggleInterested: (id: string) => void;
}

export const useFantasyStore = create<FantasyState>((set) => ({
  // Initial state
  mainTab: 'paarungen',
  selectedGameweek: null,
  currentGw: 1,
  selectedEventId: null,
  showCreateModal: false,
  summaryEventId: null,
  interestedIds: new Set(),

  // Actions
  setMainTab: (tab) => set({ mainTab: tab }),
  setSelectedGameweek: (gw) => set({ selectedGameweek: gw }),
  setCurrentGw: (gw) => set({ currentGw: gw }),
  openEvent: (id) => set({ selectedEventId: id }),
  closeEvent: () => set({ selectedEventId: null }),
  openCreateModal: () => set({ showCreateModal: true }),
  closeCreateModal: () => set({ showCreateModal: false }),
  setSummaryEventId: (id) => set({ summaryEventId: id }),
  toggleInterested: (id) =>
    set((state) => {
      const next = new Set(state.interestedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { interestedIds: next };
    }),
}));
