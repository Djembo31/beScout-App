# Systematic Test Audit — Design Doc

**Datum:** 2026-03-20
**Autor:** Jarvis (CTO) + Anil (Founder)
**Status:** Approved
**Trigger:** Anil unzufrieden mit bisherigem Test-Ansatz — zu viele Luecken, nicht systematisch genug

## Problem

542 Source Files, 391 Tests = 0.7 Tests/File. Massive Luecken:

| Bereich | Files | Tests | Abdeckung |
|---------|-------|-------|-----------|
| Components | 226 | 0 unit | 0% |
| Services | 75 | 8 files (~70) | ~10% |
| Query Hooks | 43 | 0 | 0% |
| Providers | 9 | 0 | 0% |
| Utilities | 39 | ~4 files | ~10% |

Die 124 neuen Integration-Tests (Phase 1-6) testen DB-Zustand/Invarianten, aber nicht die Applikationslogik.

## Ziel

Jeder Service, jede Utility, jeder Hook, jeder Provider, jede Component, jede Page — getestet. Tiefe skaliert nach Risiko (Tier-System). ~2000 Tests gesamt.

## Expert Review

Zwei unabhaengige Reviews (Senior QA Lead + Staff SDET) bewerteten den urspruenglichen Plan (4500 Tests, einheitliche Branch-Level-Tiefe) als "NEEDS WORK". Kern-Kritik:

1. **Gleichbehandlung aller Code-Teile ist Waste** — `CountryFlag.tsx` braucht nicht dieselbe Tiefe wie `liquidatePlayer()`
2. **Query Hooks isoliert testen = TanStack Query testen** — gehoert in Component-Tests
3. **Supabase Mock zu primitiv** — kann keine Multi-Call-Services testen
4. **Fehlende Dimensionen** — Contract Tests, Cache Invalidation, Compliance, Turkish Unicode
5. **4500 bulk-generierte Tests = Maintenance-Albtraum**

## Revidiertes Design

### Tier-System

| Tier | Was | Tiefe | Est. Tests |
|------|-----|-------|------------|
| CRITICAL | 6 Money-Services (trading, wallet, ipo, offers, liquidation, bounties) + scoring + lineups | Szenario-Matrix: alle Input-Kombinationen, jeder Branch, jeder Error-Path, jeder Fallback | ~500 |
| HIGH | ~20 State-Machine-Services + Top-25 Components (>400 LOC oder komplexe Logik) | Branch-Level: jedes if/else, jeder catch, jeder Null-Guard | ~500 |
| MEDIUM | ~50 restliche Services + ~70 Feature-Components (150-400 LOC) | Happy Path + Error + Empty State + Key Interactions | ~600 |
| LOW | ~140 Display-Components + Utils + Pages | Smoke: rendert ohne Crash, Props korrekt weitergereicht | ~300 |
| INFRA | Contract Tests, Compliance, Cache Invalidation, Turkish Unicode | Spezial-Tests pro Kategorie | ~100 |

**Total: ~2000 Tests**

### Critical-Tier Services (Szenario-Matrix)

Diese 8 Services bewegen Geld oder bestimmen Ergebnisse. Jede Funktion bekommt eine Matrix:

| Service | LOC | Funktionen | Matrix-Dimensionen |
|---------|-----|-----------|-------------------|
| trading.ts | 681 | buyFromMarket, placeSellOrder, placeBuyOrder, cancelOrder, cancelBuyOrder | valid/invalid user, liquidated player, club admin, insufficient balance, concurrent order, partial fill, expired order |
| wallet.ts | 167 | deductEntryFee, refundEntryFee, addBalance | sufficient/insufficient, negative, zero, locked balance |
| ipo.ts | 273 | buyFromIpo, createIpo, updateIpoStatus | sold out, early access, non-silver, cooldown, max tranches, oversell |
| offers.ts | 288 | createOffer, acceptOffer, rejectOffer, cancelOffer | escrow lock/unlock, expired, self-offer, liquidated player |
| liquidation.ts | 145 | liquidatePlayer | holder count, fee calc, pro-rata, zero holders, success fee |
| bounties.ts | 457 | createBounty, claimBounty, resolveBounty | escrow, expired, already claimed, insufficient balance |
| scoring.ts | 622 | scoreEvent, resetEvent, finalizeGameweek | empty event, partial fixtures, double-scoring, rank ties |
| lineups.ts | 440 | submitLineup, removeLineup | capacity, locked, duplicate player, wrong size, club scope, per-fixture lock |

### High-Tier Components (Branch-Level)

Top-25 Components by LOC + Logic Density:

| Component | LOC | Warum Branch-Level |
|-----------|-----|--------------------|
| LineupPanel.tsx | 951 | State Machine: Slot-Auswahl, Captain, Formation-Wechsel |
| AdminPlayersTab.tsx | 806 | CRUD + IPO-Erstellung + Liquidation-Trigger |
| EventDetailModal.tsx | 783 | Event-Lifecycle-States, Entry Fee, Rewards |
| AdminSettingsTab.tsx | 770 | Platform Config, Danger Zone |
| ManagerKaderTab.tsx | 732 | Portfolio-Management, Offer-Erstellung |
| FormationTab.tsx | 717 | Grid-Rendering, Position-Validation |
| FixtureDetailModal.tsx | 660 | Tab-Switching, Live-Updates |
| FantasyContent.tsx | 690 | Event-Loading, Lineup-Submit-Flow, Fee-Deduction |
| TradingCardFrame.tsx | 525 | Conditional Styling, Flip-Animation |
| OrderDepthView.tsx | 504 | Buy/Sell-Aggregation, Price-Display |
| CommunityFeedTab.tsx | 437 | Content-Filter, Pagination, Interaction-States |
| TradingTab.tsx | 437 | Order-Placement, Price-Validation |
| CreateResearchModal.tsx | 432 | Multi-Step Form, Draft, Validation |
| AdminEventsTab.tsx | 427 | Event CRUD, Status-Transitions |
| PredictionTab.tsx | 410 | Prediction-Creation, Settlement-Display |
| AdminBountiesTab.tsx | 400 | Bounty CRUD, Resolution |
| PlayerContent.tsx | 1880 | Mega-Component, 6 Tabs, Trading, Holdings |
| ProfileView.tsx | 700+ | 4 Tabs, Timeline, Achievements |
| MarketContent.tsx | 500+ | 2 Tabs, Filter, Sort |
| SpieltagTab.tsx | 400+ | Gameweek-Selector, Fixture-List |
| MitmachenTab.tsx | 350+ | Event-Join-Flow |
| LeaderboardPanel.tsx | 300+ | Rank-Display, Lineup-Inspection |
| AdminUsersTab.tsx | 350+ | User-Management, Ban |
| AdminRevenueTab.tsx | 300+ | Revenue-Dashboard |
| ClubContent.tsx | 400+ | 3 Tabs, Fixtures, Squad |

### Infra-Tests (Neue Dimensionen)

**API Contract Tests (~30):**
Fuer jede kritische Tabelle: `supabase.from('X').select('*').limit(1)` → validiere Shape gegen TypeScript-Type. Verhindert `first_name` vs `name` Bugs.

**Compliance Tests (~10):**
Grep ueber alle Locale-Files (`messages/*.json`): verbotene Woerter (`Investment`, `ROI`, `Profit`, `Rendite`, `Dividende`, `Gewinn`, `Ownership`, `guaranteed returns`) duerfen NICHT vorkommen.

**Cache Invalidation Tests (~20):**
Mit echtem QueryClient (nicht gemockt): Nach Write-Operation pruefen ob richtige Query Keys invalidiert werden. Testet `invalidation.ts` gegen `keys.ts`.

**Turkish Unicode Tests (~10):**
`I.toLowerCase()`, `İ/ı` Normalisierung in Search, Player-Display, Sort. Testet die dokumentierte Bug-Klasse aus `common-errors.md`.

## Phasen-Reihenfolge (Risk-First)

```
Phase 1: Foundation                           (~60 Tests, 1 Session)
  - Supabase Mock v2 (table-aware, call-sequence)
  - API Contract Tests (30 Tests)
  - Compliance Lint Tests (10 Tests)
  - Turkish Unicode Tests (10 Tests)

Phase 2: Money Safety Net                     (~500 Tests, 3-4 Sessions)
  - trading.ts Szenario-Matrix
  - wallet.ts Szenario-Matrix
  - ipo.ts Szenario-Matrix
  - offers.ts Szenario-Matrix
  - liquidation.ts Szenario-Matrix
  - bounties.ts Szenario-Matrix
  - scoring.ts Szenario-Matrix
  - lineups.ts Szenario-Matrix

Phase 3: State Machines + Core Services       (~300 Tests, 2 Sessions)
  - events.ts (lifecycle, ALLOWED_TRANSITIONS)
  - predictions.ts (settlement, outcomes)
  - clubSubscriptions.ts (tier checks)
  - gamification.ts (Elo, achievements)
  - missions.ts, fanRanking.ts, dailyChallenge.ts
  - research.ts (calls, outcomes)

Phase 4: Top-25 Components                    (~300 Tests, 2-3 Sessions)
  - Branch-Level fuer alle Components in der Liste oben
  - Rendering pro State (loading, empty, error, data)
  - User Interactions (click, submit, cancel)
  - Conditional Rendering (jedes if/else im JSX)
  - Error Boundaries

Phase 5: Remaining Services                   (~350 Tests, 2-3 Sessions)
  - social, notifications, club, clubCrm
  - players, fixtures, footballData, search
  - cosmetics, chips, tickets, mysteryBox, streaks
  - sponsors, referral, airdrop, founding, pbt, mastery
  - auth, profiles, activityLog, feedback, welcomeBonus
  - geofencing, pushSender, impressions

Phase 6: Feature Components + Providers       (~300 Tests, 2-3 Sessions)
  - ~70 Feature-Components (Happy + Error + Empty)
  - 9 Providers (Context Tests)
  - Cache Invalidation Tests (20 Tests)

Phase 7: Smoke Layer + Pages                  (~200 Tests, 1-2 Sessions)
  - ~140 Display-Components (Render Smoke)
  - 28 Pages (Route Params, Loading States)
  - E2E-Erweiterung fuer kritische Flows
```

## Voraussetzung: Supabase Mock v2

Der aktuelle Mock (`src/test/mocks/supabase.ts`) kann nur einen Response zurueckgeben. Services wie `buyFromMarket` machen 3+ Calls. Neuer Mock muss:

1. **Table-aware sein:** `.from('players')` gibt anderen Response als `.from('orders')`
2. **Call-Sequenz unterstuetzen:** Erster Call gibt X, zweiter gibt Y
3. **RPC-aware sein:** `.rpc('buy_player_dpc', params)` ist testbar
4. **Error-Injection:** Pro Call konfigurierbar ob Supabase Error oder Success

## Ausfuehrung

- Pro Session: 1 Sub-Phase
- Jede Session produziert 50-200 Tests je nach Tier
- Geschaetzte Sessions: 14-18
- Geschaetzte Total: ~2000 Tests
- Tests wachsen organisch weiter bei neuen Features

## NPM Scripts

```json
"test:critical": "vitest run src/lib/services/__tests__/{trading,wallet,ipo,offers,liquidation,scoring}*",
"test:integration": "vitest run src/lib/__tests__/",
"test:all": "vitest run",
"test:coverage": "vitest run --coverage"
```

## Entscheidungen

- **Risk-First, nicht Layer-First** — Geld-Services zuerst, Display-Components zuletzt
- **Tier-System** — 4 Tiefen statt einheitliche Branch-Level
- **~2000 statt ~4500** — Doppelter Schutz, halber Aufwand
- **Mock v2 zuerst** — Ohne besseren Mock sind 500 Service-Tests auf gebrochenem Fundament
- **Query Hooks nicht isoliert** — in Component-Tests integriert
- **Contract Tests als neue Dimension** — TypeScript vs DB Schema Validierung
