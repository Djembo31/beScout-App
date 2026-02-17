import { create } from 'zustand';
import type { Pos } from '@/types';

export type SortOption = 'floor_asc' | 'floor_desc' | 'l5' | 'change' | 'name';
export type MarketTab = 'portfolio' | 'kaufen' | 'angebote' | 'spieler';

interface MarketState {
  tab: MarketTab;
  portfolioView: 'kader' | 'portfolio';
  view: 'grid' | 'list';
  query: string;
  posFilter: Set<Pos>;
  clubFilter: Set<string>;
  sortBy: SortOption;
  priceMin: string;
  priceMax: string;
  onlyAvailable: boolean;
  onlyOwned: boolean;
  onlyWatched: boolean;
  showFilters: boolean;
  clubSearch: string;
  showClubDropdown: boolean;
  spielerQuery: string;
  spielerPosFilter: Set<Pos>;
  expandedClubs: Set<string>;
  spielerInitialized: boolean;
  showCompare: boolean;

  setTab: (t: MarketTab) => void;
  setPortfolioView: (v: 'kader' | 'portfolio') => void;
  setView: (v: 'grid' | 'list') => void;
  setQuery: (q: string) => void;
  togglePos: (pos: Pos) => void;
  toggleClub: (club: string) => void;
  setSortBy: (s: SortOption) => void;
  setPriceMin: (v: string) => void;
  setPriceMax: (v: string) => void;
  setOnlyAvailable: (v: boolean) => void;
  setOnlyOwned: (v: boolean) => void;
  setOnlyWatched: (v: boolean) => void;
  setShowFilters: (v: boolean) => void;
  setClubSearch: (v: string) => void;
  setShowClubDropdown: (v: boolean) => void;
  setSpielerQuery: (v: string) => void;
  toggleSpielerPos: (pos: Pos) => void;
  toggleClubExpand: (club: string) => void;
  initExpandedClubs: (firstClub: string) => void;
  setShowCompare: (v: boolean) => void;
  clearPosFilter: () => void;
  resetFilters: () => void;
}

export const useMarketStore = create<MarketState>()((set) => ({
  tab: 'portfolio',
  portfolioView: 'portfolio',
  view: 'grid',
  query: '',
  posFilter: new Set<Pos>(),
  clubFilter: new Set<string>(),
  sortBy: 'floor_asc',
  priceMin: '',
  priceMax: '',
  onlyAvailable: false,
  onlyOwned: false,
  onlyWatched: false,
  showFilters: false,
  clubSearch: '',
  showClubDropdown: false,
  spielerQuery: '',
  spielerPosFilter: new Set<Pos>(),
  expandedClubs: new Set<string>(),
  spielerInitialized: false,
  showCompare: false,

  setTab: (t) => set({ tab: t }),
  setPortfolioView: (v) => set({ portfolioView: v }),
  setView: (v) => set({ view: v }),
  setQuery: (q) => set({ query: q }),
  togglePos: (pos) => set((state) => {
    const next = new Set(state.posFilter);
    if (next.has(pos)) next.delete(pos); else next.add(pos);
    return { posFilter: next };
  }),
  toggleClub: (club) => set((state) => {
    const next = new Set(state.clubFilter);
    if (next.has(club)) next.delete(club); else next.add(club);
    return { clubFilter: next };
  }),
  setSortBy: (s) => set({ sortBy: s }),
  setPriceMin: (v) => set({ priceMin: v }),
  setPriceMax: (v) => set({ priceMax: v }),
  setOnlyAvailable: (v) => set({ onlyAvailable: v }),
  setOnlyOwned: (v) => set({ onlyOwned: v }),
  setOnlyWatched: (v) => set({ onlyWatched: v }),
  setShowFilters: (v) => set({ showFilters: v }),
  setClubSearch: (v) => set({ clubSearch: v }),
  setShowClubDropdown: (v) => set({ showClubDropdown: v }),
  setSpielerQuery: (v) => set({ spielerQuery: v }),
  toggleSpielerPos: (pos) => set((state) => {
    const next = new Set(state.spielerPosFilter);
    if (next.has(pos)) next.delete(pos); else next.add(pos);
    return { spielerPosFilter: next };
  }),
  toggleClubExpand: (club) => set((state) => {
    const next = new Set(state.expandedClubs);
    if (next.has(club)) next.delete(club); else next.add(club);
    return { expandedClubs: next };
  }),
  initExpandedClubs: (firstClub) => set((state) => {
    if (state.spielerInitialized) return state;
    return { expandedClubs: new Set([firstClub]), spielerInitialized: true };
  }),
  setShowCompare: (v) => set({ showCompare: v }),
  clearPosFilter: () => set({ posFilter: new Set<Pos>() }),
  resetFilters: () => set({
    posFilter: new Set<Pos>(),
    clubFilter: new Set<string>(),
    priceMin: '',
    priceMax: '',
    onlyAvailable: false,
    onlyOwned: false,
    onlyWatched: false,
    sortBy: 'floor_asc' as SortOption,
    query: '',
  }),
}));
