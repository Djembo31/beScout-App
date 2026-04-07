import { create } from 'zustand';
import type { Pos } from '@/types';

export type SortOption = 'floor_asc' | 'floor_desc' | 'l5' | 'l15' | 'change' | 'name'
  | 'goals' | 'assists' | 'matches' | 'age_asc' | 'age_desc' | 'contract';
export type MarketTab = 'portfolio' | 'marktplatz';
export type PortfolioSubTab = 'angebote' | 'watchlist';
export type KaufenSubTab = 'clubverkauf' | 'transferliste' | 'trending';
export type IpoViewState = 'laufend' | 'geplant' | 'beendet';

interface MarketState {
  // ── Navigation ──
  tab: MarketTab;
  portfolioSubTab: PortfolioSubTab;
  kaufenSubTab: KaufenSubTab;

  // ── Market filters (shared: Club Verkauf + Transferliste) ──
  filterPos: Set<Pos>;
  filterMinL5: number;
  filterMinGoals: number;
  filterMinAssists: number;
  filterMinMatches: number;
  filterContractMax: number;   // 0=all, 6, 12 months
  filterOnlyFit: boolean;
  // Transferliste-only
  filterPriceMin: number;
  filterPriceMax: number;
  filterMinSellers: number;
  filterBestDeals: boolean;
  marketSortBy: SortOption;

  // ── Club Verkauf specific ──
  clubVerkaufLeague: string;
  clubVerkaufExpandedClub: string | null;
  showAdvancedFilters: boolean;
  ipoViewState: IpoViewState;

  // ── Setters ──
  setTab: (t: MarketTab) => void;
  setPortfolioSubTab: (v: PortfolioSubTab) => void;
  setKaufenSubTab: (v: KaufenSubTab) => void;
  setFilterPos: (pos: Set<Pos>) => void;
  toggleFilterPos: (pos: Pos) => void;
  setFilterMinL5: (v: number) => void;
  setFilterMinGoals: (v: number) => void;
  setFilterMinAssists: (v: number) => void;
  setFilterMinMatches: (v: number) => void;
  setFilterContractMax: (v: number) => void;
  setFilterOnlyFit: (v: boolean) => void;
  setFilterPriceMin: (v: number) => void;
  setFilterPriceMax: (v: number) => void;
  setFilterMinSellers: (v: number) => void;
  setFilterBestDeals: (v: boolean) => void;
  setMarketSortBy: (s: SortOption) => void;
  resetMarketFilters: () => void;
  setClubVerkaufLeague: (v: string) => void;
  setClubVerkaufExpandedClub: (v: string | null) => void;
  setShowAdvancedFilters: (v: boolean) => void;
  setIpoViewState: (v: IpoViewState) => void;
}

export const useMarketStore = create<MarketState>()((set) => ({
  // ── Navigation ──
  tab: 'portfolio',
  portfolioSubTab: 'angebote',
  kaufenSubTab: 'clubverkauf',

  // ── Market filters ──
  filterPos: new Set<Pos>(),
  filterMinL5: 0,
  filterMinGoals: 0,
  filterMinAssists: 0,
  filterMinMatches: 0,
  filterContractMax: 0,
  filterOnlyFit: false,
  filterPriceMin: 0,
  filterPriceMax: 0,
  filterMinSellers: 0,
  filterBestDeals: false,
  marketSortBy: 'l5',
  clubVerkaufLeague: '',
  clubVerkaufExpandedClub: null,
  showAdvancedFilters: false,
  ipoViewState: 'laufend' as IpoViewState,

  // ── Setters ──
  setTab: (t) => set({ tab: t }),
  setPortfolioSubTab: (v) => set({ portfolioSubTab: v }),
  setKaufenSubTab: (v) => set({ kaufenSubTab: v }),
  setFilterPos: (pos) => set({ filterPos: pos }),
  toggleFilterPos: (pos) => set((state) => {
    const next = new Set(state.filterPos);
    if (next.has(pos)) next.delete(pos); else next.add(pos);
    return { filterPos: next };
  }),
  setFilterMinL5: (v) => set({ filterMinL5: v }),
  setFilterMinGoals: (v) => set({ filterMinGoals: v }),
  setFilterMinAssists: (v) => set({ filterMinAssists: v }),
  setFilterMinMatches: (v) => set({ filterMinMatches: v }),
  setFilterContractMax: (v) => set({ filterContractMax: v }),
  setFilterOnlyFit: (v) => set({ filterOnlyFit: v }),
  setFilterPriceMin: (v) => set({ filterPriceMin: v }),
  setFilterPriceMax: (v) => set({ filterPriceMax: v }),
  setFilterMinSellers: (v) => set({ filterMinSellers: v }),
  setFilterBestDeals: (v) => set({ filterBestDeals: v }),
  setMarketSortBy: (s) => set({ marketSortBy: s }),
  setClubVerkaufLeague: (v) => set({ clubVerkaufLeague: v }),
  setShowAdvancedFilters: (v) => set({ showAdvancedFilters: v }),
  setIpoViewState: (v) => set({ ipoViewState: v }),
  setClubVerkaufExpandedClub: (v) => set((state) => ({
    clubVerkaufExpandedClub: state.clubVerkaufExpandedClub === v ? null : v,
  })),
  resetMarketFilters: () => set({
    filterPos: new Set<Pos>(),
    filterMinL5: 0,
    filterMinGoals: 0,
    filterMinAssists: 0,
    filterMinMatches: 0,
    filterContractMax: 0,
    filterOnlyFit: false,
    filterPriceMin: 0,
    filterPriceMax: 0,
    filterMinSellers: 0,
    filterBestDeals: false,
    marketSortBy: 'l5' as SortOption,
  }),
}));
