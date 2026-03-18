import { create } from 'zustand';
import type { Pos } from '@/types';
import type { BestandLens } from '@/components/manager/bestand/bestandHelpers';

export type SortOption = 'floor_asc' | 'floor_desc' | 'l5' | 'l15' | 'change' | 'name'
  | 'goals' | 'assists' | 'matches' | 'age_asc' | 'age_desc' | 'contract';
export type MarketTab = 'portfolio' | 'marktplatz';
export type PortfolioSubTab = 'team' | 'bestand' | 'angebote' | 'watchlist';
export type KaufenSubTab = 'clubverkauf' | 'transferliste' | 'trending';
export type KaufenMode = 'discovery' | 'search';
export type IpoViewState = 'laufend' | 'geplant' | 'beendet';

interface MarketState {
  tab: MarketTab;
  portfolioSubTab: PortfolioSubTab;
  kaufenSubTab: KaufenSubTab;
  portfolioView: 'kader' | 'portfolio';
  kaufenMode: KaufenMode;
  view: 'grid' | 'list';
  query: string;
  posFilter: Set<Pos>;
  clubFilter: Set<string>;
  leagueFilter: string;
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
  discoveryPos: Pos | null;
  expandedDiscoveryClubs: Set<string>;
  bestandLens: BestandLens;
  bestandGroupByClub: boolean;
  bestandSellPlayerId: string | null;
  discoverySortBy: SortOption;
  discoveryMinL5: number;
  discoveryOnlyFit: boolean;

  // Market filters (shared: Club Verkauf + Transferliste)
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
  // Club Verkauf specific
  clubVerkaufLeague: string;
  clubVerkaufExpandedClub: string | null;
  showAdvancedFilters: boolean;
  ipoViewState: IpoViewState;

  setTab: (t: MarketTab) => void;
  setPortfolioSubTab: (v: PortfolioSubTab) => void;
  setKaufenSubTab: (v: KaufenSubTab) => void;
  setPortfolioView: (v: 'kader' | 'portfolio') => void;
  setKaufenMode: (v: KaufenMode) => void;
  setView: (v: 'grid' | 'list') => void;
  setQuery: (q: string) => void;
  togglePos: (pos: Pos) => void;
  toggleClub: (club: string) => void;
  setLeagueFilter: (v: string) => void;
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
  setDiscoveryPos: (pos: Pos | null) => void;
  toggleDiscoveryClub: (club: string) => void;
  setBestandLens: (lens: BestandLens) => void;
  setBestandGroupByClub: (v: boolean) => void;
  setBestandSellPlayerId: (id: string | null) => void;
  setDiscoverySortBy: (s: SortOption) => void;
  setDiscoveryMinL5: (v: number) => void;
  setDiscoveryOnlyFit: (v: boolean) => void;
  // New market filter setters
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
  resetFilters: () => void;
  resetMarketFilters: () => void;
  setClubVerkaufLeague: (v: string) => void;
  setClubVerkaufExpandedClub: (v: string | null) => void;
  setShowAdvancedFilters: (v: boolean) => void;
  setIpoViewState: (v: IpoViewState) => void;
}

export const useMarketStore = create<MarketState>()((set) => ({
  tab: 'portfolio',
  portfolioSubTab: 'team',
  kaufenSubTab: 'clubverkauf',
  portfolioView: 'portfolio',
  kaufenMode: 'discovery',
  view: 'grid',
  query: '',
  posFilter: new Set<Pos>(),
  clubFilter: new Set<string>(),
  leagueFilter: '',
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
  discoveryPos: null,
  expandedDiscoveryClubs: new Set<string>(),
  bestandLens: 'performance',
  bestandGroupByClub: false,
  bestandSellPlayerId: null,
  discoverySortBy: 'l5',
  discoveryMinL5: 0,
  discoveryOnlyFit: false,

  // Market filters
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

  setTab: (t) => set({ tab: t }),
  setPortfolioSubTab: (v) => set({ portfolioSubTab: v }),
  setKaufenSubTab: (v) => set({ kaufenSubTab: v }),
  setPortfolioView: (v) => set({ portfolioView: v }),
  setKaufenMode: (v) => set({ kaufenMode: v }),
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
  setLeagueFilter: (v) => set({ leagueFilter: v }),
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
  setDiscoveryPos: (pos) => set({ discoveryPos: pos }),
  toggleDiscoveryClub: (club) => set((state) => {
    const next = new Set(state.expandedDiscoveryClubs);
    if (next.has(club)) next.delete(club); else next.add(club);
    return { expandedDiscoveryClubs: next };
  }),
  setBestandLens: (lens) => set({ bestandLens: lens }),
  setBestandGroupByClub: (v) => set({ bestandGroupByClub: v }),
  setBestandSellPlayerId: (id) => set({ bestandSellPlayerId: id }),
  setDiscoverySortBy: (s) => set({ discoverySortBy: s }),
  setDiscoveryMinL5: (v) => set({ discoveryMinL5: v }),
  setDiscoveryOnlyFit: (v) => set({ discoveryOnlyFit: v }),
  // Market filter setters
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
  resetFilters: () => set({
    posFilter: new Set<Pos>(),
    clubFilter: new Set<string>(),
    leagueFilter: '',
    priceMin: '',
    priceMax: '',
    onlyAvailable: false,
    onlyOwned: false,
    onlyWatched: false,
    sortBy: 'floor_asc' as SortOption,
    query: '',
    kaufenMode: 'discovery' as KaufenMode,
    discoverySortBy: 'l5' as SortOption,
    discoveryMinL5: 0,
    discoveryOnlyFit: false,
    discoveryPos: null,
  }),
}));
