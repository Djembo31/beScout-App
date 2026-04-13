import { create } from 'zustand';

// ── Types ──

export type ManagerTab = 'aufstellen' | 'kader' | 'historie';
export type KaderLens = 'performance' | 'markt' | 'handel' | 'vertrag';
export type HistoryTimeFilter = 'all' | '30d' | '90d' | 'season';
export type HistoryFormatFilter = 'all' | '11er' | '7er';
export type HistoryStatusFilter = 'all' | 'top3' | 'top10' | 'other';
export type HistorySort = 'date' | 'score' | 'rank' | 'reward';

/** One-shot template to apply a historical lineup to the current Aufstellen event.
 *  Set by HistoryEventCard, consumed + cleared by AufstellenTab. */
export type ApplyLineupTemplate = {
  format: '7er' | '11er';
  formation: string;
  /** Slot index (0..6 for 7er, 0..10 for 11er) → playerId */
  slotPlayerIds: Record<number, string>;
  /** Captain slot key (e.g. 'gk', 'def1', 'mid2') if the source lineup had a captain */
  captainSlot: string | null;
  sourceEventId: string;
};

// ── Cleanup: clear stale localStorage keys from old sandbox-store ──
// Old keys are no longer used; left here for one release cycle of safe cleanup.
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('bescout-manager-presets');
    localStorage.removeItem('bescout-manager-squad-size');
  } catch { /* ignore */ }
}

// ── Store ──

interface ManagerState {
  // Tab routing
  activeTab: ManagerTab;
  setActiveTab: (tab: ManagerTab) => void;

  // Tab 1: Aufstellen
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;

  // Tab 2: Kader
  kaderLens: KaderLens;
  kaderGroupByClub: boolean;
  kaderSellPlayerId: string | null;
  expandedClubs: Set<string>;
  kaderDetailPlayerId: string | null;
  kaderCountry: string;
  kaderLeague: string;
  setKaderLens: (lens: KaderLens) => void;
  setKaderGroupByClub: (v: boolean) => void;
  setKaderSellPlayerId: (id: string | null) => void;
  toggleClubExpand: (club: string) => void;
  setKaderDetailPlayerId: (id: string | null) => void;
  setKaderCountry: (v: string) => void;
  setKaderLeague: (v: string) => void;

  // Tab 3: Historie
  historyTimeFilter: HistoryTimeFilter;
  historyFormatFilter: HistoryFormatFilter;
  historyStatusFilter: HistoryStatusFilter;
  historySort: HistorySort;
  expandedHistoryEventId: string | null;
  setHistoryTimeFilter: (v: HistoryTimeFilter) => void;
  setHistoryFormatFilter: (v: HistoryFormatFilter) => void;
  setHistoryStatusFilter: (v: HistoryStatusFilter) => void;
  setHistorySort: (v: HistorySort) => void;
  setExpandedHistoryEventId: (id: string | null) => void;

  // Cross-tab apply (Historie → Aufstellen)
  applyLineupTemplate: ApplyLineupTemplate | null;
  setApplyLineupTemplate: (template: ApplyLineupTemplate | null) => void;

  // Cross-tab pre-pick (Kader PlayerDetail → Aufstellen): one-shot
  pendingLineupPlayerId: string | null;
  setPendingLineupPlayerId: (id: string | null) => void;
}

export const useManagerStore = create<ManagerState>((set) => ({
  // ── Tab routing ──
  activeTab: 'aufstellen',
  setActiveTab: (activeTab) => set({ activeTab }),

  // ── Tab 1: Aufstellen ──
  selectedEventId: null,
  setSelectedEventId: (selectedEventId) => set({ selectedEventId }),

  // ── Tab 2: Kader ──
  kaderLens: 'performance',
  kaderGroupByClub: false,
  kaderSellPlayerId: null,
  expandedClubs: new Set<string>(),
  kaderDetailPlayerId: null,
  kaderCountry: '',
  kaderLeague: '',
  setKaderLens: (kaderLens) => set({ kaderLens }),
  setKaderGroupByClub: (kaderGroupByClub) => set({ kaderGroupByClub }),
  setKaderSellPlayerId: (kaderSellPlayerId) => set({ kaderSellPlayerId }),
  toggleClubExpand: (club) => set((state) => {
    const next = new Set(state.expandedClubs);
    if (next.has(club)) next.delete(club);
    else next.add(club);
    return { expandedClubs: next };
  }),
  setKaderDetailPlayerId: (kaderDetailPlayerId) => set({ kaderDetailPlayerId }),
  setKaderCountry: (kaderCountry) => set({ kaderCountry, kaderLeague: '' }),
  setKaderLeague: (kaderLeague) => set({ kaderLeague }),

  // ── Tab 3: Historie ──
  historyTimeFilter: 'all',
  historyFormatFilter: 'all',
  historyStatusFilter: 'all',
  historySort: 'date',
  expandedHistoryEventId: null,
  setHistoryTimeFilter: (historyTimeFilter) => set({ historyTimeFilter }),
  setHistoryFormatFilter: (historyFormatFilter) => set({ historyFormatFilter }),
  setHistoryStatusFilter: (historyStatusFilter) => set({ historyStatusFilter }),
  setHistorySort: (historySort) => set({ historySort }),
  setExpandedHistoryEventId: (expandedHistoryEventId) => set({ expandedHistoryEventId }),

  // ── Cross-tab apply ──
  applyLineupTemplate: null,
  setApplyLineupTemplate: (applyLineupTemplate) => set({ applyLineupTemplate }),

  // ── Cross-tab pre-pick (one-shot, consumed by AufstellenTab apply effect) ──
  pendingLineupPlayerId: null,
  setPendingLineupPlayerId: (pendingLineupPlayerId) => set({ pendingLineupPlayerId }),
}));
