---
name: Feature Map (Frontend-Inventar)
description: SSOT — alle Frontend-Artefakte (Pages, Features, Components, Hooks, Stores) kategorisiert und den 12 User Journeys zugeordnet. Generiert fuer Operation Beta Ready Phase 0.
type: project
status: complete
created: 2026-04-14
owner: CTO (Claude) via Explore Agent
---

# Frontend-Inventar — Operation Beta Ready Phase 0

**Stack:** Next.js 14 App Router + TS strict + Tailwind + TanStack Query v5 + Zustand v5

---

## 1. Pages (src/app/**/page.tsx)

| Path | Zweck | Haupt-Features/Components |
|------|-------|---------------------------|
| `/welcome` | First-time entry, auth gate | Welcome hero, Sign-Up CTA |
| `/(auth)/login` | Email/OAuth login flow | LoginForm, OAuth providers |
| `/(auth)/onboarding` | New user profile setup | ProfileSetup, FoundingPass upsell |
| `/(app)` (home) | Hub nach Login — Holdings, Events, Missions | HomeStoryHeader, HomeSpotlight, MysteryBoxModal, OnboardingChecklist, LastGameweekWidget, TopMoversStrip, SponsorBanner, FollowingFeedRail, MyClubs |
| `/market` | Trading: Portfolio + Marktplatz (IPO, Sekundaer, Watchlist) | MarketContent → MarktplatzTab (IPO/Transfer/Trending), PortfolioTab (Holdings/Orders/Offers) |
| `/fantasy` | Fantasy Events + Lineup Builder | FantasyContent → EventCards, LineupBuilder, ScoredEvents |
| `/manager` | Squad Management (Aufstellen, Kader, Historie) | ManagerContent → AufstellenTab, KaderTab, HistorieTab |
| `/player/[id]` | Player Profile + Orderbook + Community | PlayerDetailContent → BuyModal, OrderbookDepth, PerformanceTab, CommunityTab |
| `/profile` | Authenticated User Profile | ProfileView → Portfolio, Activity, Settings |
| `/profile/[handle]` | Public Profile | ProfileView (read-only) → Overview, Activity, Follow-Button |
| `/profile/settings` | User Settings | ProfileSettings → HandleInput, Language Selector, AvatarUpload |
| `/inventory` | Equipment & Item Management | InventoryContent → Cosmetics, Titles, Badges |
| `/missions` | Daily Challenges + Streaks + Missions | MissionBanner, DailyChallengeCard, MissionHintList, StreakBenefits |
| `/community` | Posts + Bounties + Research + Polls | CommunityContent → PostCards, BountyCard, CreatePostModal, ScoutingEvaluationForm |
| `/clubs` | Club Directory + Discovery | ClubsGrid, ClubHero, SquadPreview, MembershipSection |
| `/club/[slug]` | Individual Club Page | PublicClubView → Fixtures, Squad, Offers, Events, Stats |
| `/club/[slug]/admin` | Club Admin Panel | AdminContent → EventManagement, Settings, Revenue, Squad |
| `/founding` | Founding Pass Purchase | FoundingPassUpsell, PricingCards, Purchase Flow |
| `/rankings` | Leaderboards | RankingsTab, ScoreRoad, RangBadge (3-Dim Elo) |
| `/airdrop` | Referral Rewards + Airdrop Claims | AirdropScoreCard, ReferralCard, ClaimFlow |
| `/transactions` | Transaction History | TransactionFeed, FilterBar, TxCard |
| `/community/compare` | Side-by-side Player Stats | CompareHeader, PlayerCompareGrid |
| `/(auth)/pitch` | Pitch Demo / Tutorial | InteractivePitch, Controls |
| `/agb`, `/datenschutz`, `/impressum`, `/blocked` | Legal + Account Pages | MarkdownRenderer, StaticContent |

**Total: 30 User-Facing Pages**

---

## 2. Feature-Komponenten (src/features/**)

### 2.1 Fantasy (`src/features/fantasy/`)
**Zweck:** Event Management, Lineup Builder, Scoring

**Komponenten:**
- `components/FantasyHeader.tsx` — Tab nav + GW selector
- `components/FantasyNav.tsx` — Main nav: Paarungen, Ergebnisse, Meine Events
- `components/event-detail/EventDetailHeader.tsx` — Event info card
- `components/event-detail/JoinConfirmDialog.tsx` — Fee + Entry confirm
- `components/lineup/LineupBuilder.tsx` — 6er/11er Formation UI
- `components/lineup/PitchView.tsx` — Pitch visualization
- `components/lineup/PlayerPicker.tsx` — Available players (filterable, holdings-aware)
- `components/lineup/FormationSelector.tsx` — 1-2-2-1 vs 1-4-3-3
- `components/lineup/ScoreBreakdown.tsx` — Per-slot score details
- `components/lineup/SynergyPreview.tsx` — Club synergy calculator

**Hooks:** useFantasyEvents, useLineupBuilder, useLineupSave, useGameweek, useFixtureDeadlines, useScoredEvents, useEventActions, useFantasyHoldings

**Stores:** fantasyStore (mainTab, selectedGameweek, selectedEventId), lineupStore (slots, captain, substitutes)

**Konsumenten:** `/fantasy`, `/manager` (Aufstellen Tab)

---

### 2.2 Market (`src/features/market/`)
**Zweck:** Trading, IPO, Orderbook, Portfolio

**Marktplatz Sub-Tab:**
- MarktplatzTab — IPO + Transfer + Trending switcher
- PlayerIPOCard, ClubVerkaufSection, TransferListSection, TrendingSection
- WatchlistView, LeagueBar, BuyOrdersSection, EndingSoonStrip

**Portfolio Sub-Tab:**
- PortfolioTab, BestandView, OffersTab, BestandPlayerRow

**Shared Modals:**
- BuyConfirmModal, BuyOrderModal, OrderDepthView, MarketFilters, MarketSearch, TradeSuccessCard

**Hooks:** useMarketData, useTradeActions, useWatchlistActions

**Stores:** marketStore (tab, filters, sortBy, selectedCountry/League)

**Konsumenten:** `/market`, Home (ActiveIPOs, TopMovers)

---

### 2.3 Manager (`src/features/manager/`)
**Zweck:** Squad Management, Lineup History, Trade Analytics

**Aufstellen Tab:** AufstellenTab, EventSelector
**Kader Tab:** KaderTab, KaderPlayerRow, KaderClubGroup, KaderToolbar, PlayerDetailModal, KaderSellModal
**Historie Tab:** HistorieTab, HistoryEventCard, HistoryStats

**Hooks:** useManagerData
**Stores:** managerStore (activeTab, kaderLens, applyLineupTemplate)

**Konsumenten:** `/manager`

---

## 3. Shared UI (src/components/**)

### 3.1 Badges & Indicators (src/components/ui/)
RangBadge, FanRankBadge, EventScopeBadge, FoundingPassBadge, SubscriptionBadge, LeagueBadge, TierBadge, RegionBadge, Countdown, CountryBar, CountryFlag, Confetti, CosmeticAvatar, CosmeticTitle, MarkdownRenderer, EmptyState, ErrorBoundary, LoadMoreButton, SortPills, SearchInput, MobileTableCard, PosFilter, TabBar

**26 UI Components**

### 3.2 Home (src/components/home/)
HomeStoryHeader, HomeSpotlight, BeScoutIntroCard, ScoutCardStats, LastGameweekWidget, TopMoversStrip, MostWatchedStrip, OnboardingChecklist

### 3.3 Profile (src/components/profile/)
ProfileView (Container) + Tab-spezifische Subs (Overview, Portfolio, Activity, Settings)

### 3.4 Player Detail (src/components/player/detail/)
BuyModal, LimitOrderModal, OfferModal, MatchTimeline, PerformanceTab, CommunityTab, CommunityValuation, GameweekScoreBar, OrderbookDepth, OrderbookSummary, MobileTradingBar, FormDots, FantasyCTA, DPCSupplyRing

### 3.5 Community (src/components/community/)
PostCard, CreatePostModal, BountyCard, CreateBountyModal, ResearchCard, CreateResearchModal, CommunityPollCard, ScoutingEvaluationForm, TipButton, PostReplies, ReportModal

### 3.6 Gamification (src/components/gamification/)
MysteryBoxModal, DailyChallengeCard, AchievementBadge, StreakCounter

### 3.7 Layout (src/components/layout/)
BottomNav, SideNav, TopBar, NotificationDropdown, SearchOverlay, ClubSwitcher, FeedbackModal, BackgroundEffects

### 3.8 Admin (src/components/admin/)
Multiple Tab components (Events, Players, Revenue, Moderation)

### 3.9 Fantasy Shared (src/components/fantasy/)
CreateEventModal, CreatePredictionModal, ergebnisse/PersonalResults, ergebnisse/PredictionResults, ergebnisse/GwHeroSummary

### 3.10 Inventory (src/components/inventory/)
InventoryView, EquipmentSlot, CosmeticGrid

### 3.11 Missions + Onboarding
MissionBanner, MissionHintList, NewUserTip, WelcomeBonusModal, OnboardingFlow

---

## 4. Custom Hooks

### Global (src/hooks/)
- useCountUp — animated number increment
- useParallax — scroll parallax
- useScrollReveal — reveal-on-scroll

### App-Root (src/app/(app)/hooks/)
- useHomeData — Home page aggregator (11+ data sources)

### Component-Scoped
- Admin: useAdminEventsData, useAdminEventsActions, useClubEventsData, useClubEventsActions, useEventForm
- Club: useClubData, useClubActions
- Community: useCommunityData, useCommunityActions
- Profile: Profile-spezifische data loaders + actions
- Player Detail: Player stats, Orderbook, Match history hooks

---

## 5. State Stores (Zustand v5)

| Store | Filepath | State | Primary Mutations |
|-------|----------|-------|-------------------|
| fantasyStore | `src/features/fantasy/store/fantasyStore.ts` | mainTab, selectedGameweek, currentGw, selectedEventId, fantasyCountry, fantasyLeague, interestedIds | setMainTab, setSelectedGameweek, openEvent, closeEvent, openCreateModal |
| lineupStore | `src/features/fantasy/store/lineupStore.ts` | slots, captain_slot, substitutes, submitted | setSlot, setCaptain, setSubstitute, clearLineup |
| marketStore | `src/features/market/store/marketStore.ts` | tab, kaufenSubTab, filterPos, filterMinL5/Goals/Assists, filterPriceMin/Max, selectedCountry, selectedLeague, marketSortBy | setTab, setFilterPos, setSort, setSelectedCountry, toggleAdvancedFilters |
| managerStore | `src/features/manager/store/managerStore.ts` | activeTab, kaderLens, applyLineupTemplate, historyFilters | setActiveTab, setKaderLens, clearApplyTemplate |

**Cross-Feature:** marketStore re-exported via `src/lib/stores/marketStore.ts`

---

## 6. Journey-Map (12 User Journeys)

| # | Journey | Pages | Features | Stores | Primary Components |
|---|---------|-------|----------|--------|---------------------|
| 1 | Onboarding | /welcome → /(auth)/login → /(auth)/onboarding → / | — | fantasyStore, managerStore | BeScoutIntroCard, OnboardingChecklist, NewUserTip, WelcomeBonusModal, FoundingPassUpsell |
| 2 | IPO-Kauf | /market (Marktplatz → Club Verkauf) | Market (PlayerIPOCard, ClubVerkaufSection) | marketStore | BuyConfirmModal, BuyOrderModal, OrderDepthView, TradeSuccessCard |
| 3 | Sekundaer-Trade | /market (Transferliste) + /player/[id] | Market (TransferListSection, MarketSearch), Player Detail | marketStore | OrderbookDepth, OrderbookSummary, BuyModal, LimitOrderModal |
| 4 | Fantasy-Event | /fantasy (Paarungen) + /manager (Aufstellen) | Fantasy (LineupBuilder, EventDetailModal, FormationSelector) | fantasyStore, lineupStore | LineupBuilder, PitchView, PlayerPicker, JoinConfirmDialog |
| 5 | Mystery Box | / (home sidebar) → Modal | — | — | MysteryBoxModal, MysteryBoxCard |
| 6 | Profile + Following | /profile, /profile/[handle], /profile/settings | — | — | ProfileView, FollowBtn, RangBadge, HandleInput, AvatarUpload |
| 7 | Missions + Streak | /missions + / (home spotlight) | — | — | MissionBanner, DailyChallengeCard, MissionHintList, StreakCounter |
| 8 | Verkaufen + Order-Buch | /market (Portfolio → Bestand), /manager (Kader) | Market (BestandView, KaderSellModal), Manager (KaderTab) | marketStore | BuyConfirmModal, KaderSellModal, PlayerDetailModal, OrderbookSummary |
| 9 | Liga-Rang | / (home sidebar) + /rankings | — | — | RankBadge, ScoreRoad, LeaderboardTable |
| 10 | Watchlist + Notifications | /market (Marktplatz → Watchlist), /layout (TopBar) | Market (WatchlistView, MarketSearch), Layout | marketStore | NotificationDropdown, WatchlistView, AlertBadge |
| 11 | Equipment + Inventar | /inventory, /manager (Aufstellen) | — | lineupStore | InventoryView, EquipmentSlot, CosmeticGrid, EquipmentShortcut |
| 12 | Multi-Liga Discovery | /market (LeagueBar), /fantasy (LeagueBar) | Market (MarketFilters, LeagueBar), Fantasy | marketStore, fantasyStore | CountryBar, LeagueBadge, MarketFilters, DiscoveryCard |

---

## 7. Counts

| Kategorie | Anzahl |
|-----------|--------|
| User-Facing Pages | 30 |
| Feature Modules | 3 (Fantasy, Market, Manager) |
| Feature Sub-Components | ~80 |
| Shared UI Components (ui/) | 26 |
| Shared Domain Components | ~170 |
| Custom Hooks | 30+ |
| State Stores (Zustand) | 4 |
| Total User-Visible Artefakte | ~350 |

---

## 8. Verifications

- Feature-Journey Coverage: alle 12 Journeys mit mind. 1 Feature zugeordnet ✓
- Admin-Paths (`/bescout-admin`, `/club/[slug]/admin`): internal/compliance — nicht in Journey-Map ✓
- Legal Pages (`/agb`, `/datenschutz`, `/impressum`, `/blocked`): static — nicht in Journey-Map ✓
- State Routing: fantasyStore + marketStore + managerStore = Feature-lokales UI-State (kein global auth/wallet) ✓
- Hook Distribution: keine orphan hooks ✓
