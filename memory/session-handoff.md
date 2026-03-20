# Session Handoff
## Letzte Session: 2026-03-20 (Session 245)
## Was wurde gemacht

### Systematic Test Audit — Phase 3 + Phase 5 (552 neue Tests)
- **Phase 3 — State Machine Services (222 tests):** events (ALLOWED_TRANSITIONS, EDITABLE_FIELDS, bulk update), predictions (create, resolve, stats/streak), research (Promise.allSettled enrichment, track record), clubSubscriptions (silber constraint, tier ranking), gamification (score road, history), missions (idempotent assign, orphan filter), dailyChallenge (array/object RPC), fanRanking (batch recalc)
- **Phase 5a — Small/Medium Services (156 tests):** tickets, referral, cosmetics, sponsors, chips, airdropScore, foundingPasses, pbt, mastery, impressions, mysteryBox, feedback, streaks, welcomeBonus
- **Phase 5b — Big Services Part 1 (56 tests):** social (follow/unfollow, leaderboard, feed), clubCrm (fan segments, retention), search (spotlight)
- **Phase 5c — Big Services Part 2 (118 tests):** club (34 functions, prestige, admin, gameweek), fixtures (mapping, stats, substitutions), footballData (mapping status), notifications (preferences, batch filtering)

### Gesamt: 1299/1299 Tests PASS (62 Test Files)

## Design Doc
- `docs/plans/2026-03-20-systematic-test-audit-design.md` — 7 Phasen

---

## Naechste Session: Phase 4 — Top-25 Component Tests (~300 Tests)

### Infrastruktur (bereits vorhanden)
- `@testing-library/react@16.3.2` + `@testing-library/jest-dom@6.9.1` installiert
- `vitest.config.ts`: environment=jsdom, globals=true, css=disabled
- `src/test/setup.ts`: importiert `@testing-library/jest-dom/vitest`
- **0 Component-Tests existieren** — Blank Slate

### Approach
Branch-Level Testing fuer die 25 groessten Components (>150 LOC):
- Rendering pro State (loading, empty, error, data)
- User Interactions (click, submit, cancel)
- Conditional Rendering (jedes if/else im JSX)

### Mock-Strategie fuer Components
1. **Supabase**: Bestehender Mock (`src/test/mocks/supabase.ts`) reicht fuer Service-Layer
2. **React Query**: Mocke Hooks mit `vi.mock('@/lib/hooks/useXyz')` oder nutze `QueryClientProvider` mit echtem Client
3. **Providers**: Wrapper-Utility bauen die alle Provider mockt (Auth, Club, Wallet, Toast)
4. **next/navigation**: `vi.mock('next/navigation')` fuer useRouter, usePathname
5. **next-intl**: `vi.mock('next-intl')` fuer useTranslations
6. **Zustand**: Stores direkt mit `setState()` vorbefuellen

### Top-25 nach Prioritaet (LOC)
| Component | Pfad | LOC | Key-Tests |
|-----------|------|-----|-----------|
| ClubContent | app/club/[slug]/ | 935 | 3 Tabs, Fixtures, Squad |
| LineupPanel | fantasy/event-tabs/ | 951 | Slot-Auswahl, Captain, Formation |
| AdminPlayersTab | admin/ | 806 | CRUD, IPO, Liquidation |
| FantasyContent | app/fantasy/ | 792 | Event-Loading, Lineup, Fee |
| EventDetailModal | fantasy/ | 783 | Lifecycle States, Entry Fee |
| AdminSettingsTab | admin/ | 770 | Config, Danger Zone |
| ManagerKaderTab | manager/ | 732 | Portfolio, Offers |
| FormationTab | fantasy/spieltag/ | 717 | Grid, Position-Validation |
| FixtureDetailModal | fantasy/spieltag/ | 660 | Tab-Switch, Live Updates |
| AdminEventsTab | admin/ | 606 | Event CRUD, Status-Transitions |
| TradingCardFrame | player/detail/ | 525 | Conditional Styling, Flip |
| OrderDepthView | market/ | 504 | Buy/Sell-Aggregation |
| AdminBountiesTab | admin/ | 476 | Bounty CRUD, Resolution |
| CommunityFeedTab | community/ | 437 | Filter, Pagination |
| TradingTab | player/detail/ | 437 | Order, Price-Validation |
| CreateResearchModal | community/ | 432 | Multi-Step Form, Validation |
| PlayerContent | app/player/[id]/ | 421 | 6 Tabs, Trading, Holdings |
| ProfileView | profile/ | 413 | 4 Tabs, Timeline, Achievements |
| SpieltagTab | fantasy/ | 381 | GW-Selector, Fixture-List |
| LeaderboardPanel | fantasy/event-tabs/ | 291 | Rank Display, Inspection |
| AdminUsersTab | bescout-admin/ | 185 | User-Management, Ban |
| MitmachenTab | fantasy/ | 153 | Event-Join-Flow |
| AdminRevenueTab | admin/ | 148 | Revenue-Dashboard |
| PredictionsTab | fantasy/ | 131 | Create, Settlement |

### Vorarbeit fuer naechste Session
1. Test-Utility erstellen: `src/test/renderWithProviders.tsx`
   - Wrapped QueryClient + mocked Auth + Club + Wallet + Toast + next-intl
2. Ein Pilot-Component testen (z.B. PredictionsTab, 131 LOC — kleinster)
3. Pattern validieren, dann auf die grossen Components skalieren

---

## Phase 6 — Feature Components + Providers (~300 Tests)
- ~70 Feature-Components (Happy + Error + Empty State)
- 9 Providers einzeln testen (QueryProvider, AuthProvider, ClubProvider, WalletProvider, etc.)
- Cache Invalidation Tests (20 Tests mit echtem QueryClient)

### 9 Providers in `src/components/providers/`
1. QueryProvider.tsx — React Query v5 Setup
2. AuthProvider.tsx — Supabase Auth + User State
3. AnalyticsProvider.tsx — PostHog
4. ClubProvider.tsx — Selected Club Context
5. WalletProvider.tsx — User Wallet Balance
6. ToastProvider.tsx — Toast Notifications
7. AuthGuard.tsx — Auth-Gate Wrapper
8. AchievementListener.tsx — Gamification Listener
9. Providers.tsx — Main Orchestrator (Provider Chain)

---

## Phase 7 — Smoke Layer + Pages (~200 Tests)
- ~140 Display-Components: Render Smoke (rendert ohne Crash, Props korrekt)
- 28 Pages: Route Params, Loading States, Error States
- E2E-Erweiterung fuer kritische Flows

---

## Andere offene Arbeit
- Admin i18n Rest (~80 Strings)
- Stripe (wartet auf Anils Account)
- DB CHECK constraint (Supabase Dashboard)

## Blocker
- Keine
