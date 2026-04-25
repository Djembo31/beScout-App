# UX-Coherence Audit — 2026-04-25

Phase A des Beta-Launch-Audits. Scope: 18 Pages unter `src/app/(app)/` (ohne admin).

## Executive Summary

- **Total Findings: 27** (P0: 0, P1: 11, P2: 13, P3: 3)
- **Per-Page-Health-Avg: 7.4 / 10**
- **Top-3-Systemic-Issues:**
  1. `err.message` direkt in User-UI gerendert (Settings + multiple Admin-Tabs) — i18n-Key-Leak-Risiko bei Service-Throws (siehe `errors-frontend.md` Pattern)
  2. **TODO-bekannte preventClose-Lücken** in CreateEventModal + EventSummaryModal + LimitOrderModal (mit Code-Kommentar dokumentiert, aber nicht gefixt)
  3. Generische Loader2-Spinner statt Skeletons auf 6+ Pages (Manager, Transactions, Inventory, Founding, Missions Auth-Loading, Aufstellen-Tab events-loading) — verstößt gegen `ui-components.md` Regel "Loading: Skeleton Screens (nicht Spinner). Ausnahme: Loader2 fuer Actions"

Money-/Trading-Modals (Buy/Sell/Offer/Kader-Sell/IPO) sind **P0-frei** — preventClose ist überall korrekt verdrahtet (BuyConfirmModal, SellModalCore, OfferModal, KaderSellModal). Das ist erfreulich.

---

## Per-Page-State-Coverage

### / (Home)
**Health: 9/10**

| Section | Loading | Empty | Error | Optimistic |
|---------|---------|-------|-------|------------|
| HomeStoryHeader | ✅ (`loading` prop) | n/a | n/a | n/a |
| HomeSpotlight (players) | ✅ Skeleton | implicit (returns null) | ✅ Top-level ErrorState | n/a |
| TopMovers (own) | n/a | ✅ EmptyState (`topMoversWeekEmpty`) | n/a | n/a |
| MostWatchedStrip | ✅ dynamic loading-skeleton | ?(internal) | ?(internal) | n/a |
| OnboardingChecklist | ✅ dynamic loading-skeleton | n/a | n/a | n/a |

| Modal | preventClose | ESC | Loading-Indicator |
|-------|--------------|-----|-------------------|
| MysteryBoxModal | ✅ (isAnimating ‖ isOpening) | ✅ | ✅ |
| WelcomeBonusModal | ❌ (no mutation in modal) | ✅ | n/a |

**Findings:**
| # | Sev | File:Line | Issue |
|---|-----|-----------|-------|
| 1 | P3 | `src/app/(app)/page.tsx:97` | ErrorState `onRetry` ruft nur `refetchQueries` für players — andere parallel ausstehende Queries (holdings, IPOs) werden nicht retried. Nicht broken, aber inkonsistent. |

---

### /market
**Health: 8/10**

| Section | Loading | Empty | Error | Optimistic |
|---------|---------|-------|-------|------------|
| Players (full page) | ✅ MarketSkeleton | n/a | ✅ ErrorState | n/a |
| PortfolioTab | ✅ Skeleton dynamic | siehe Sub-Tabs | n/a | ✅ TradeSuccessCard |
| MarktplatzTab | n/a | ✅ NewUserTip (holdings===0) | n/a | n/a |
| WatchlistView | n/a | ✅ EmptyState | n/a | n/a |
| BuyError | n/a | n/a | ✅ Toast role=alert | n/a |

| Modal | preventClose | ESC | Loading-Indicator |
|-------|--------------|-----|-------------------|
| BuyConfirmModal | ✅ `isPending` | ✅ | ✅ Loader2 + label |
| TradeSuccessCard | n/a (info) | ✅ | n/a |

**Findings:**
| # | Sev | File:Line | Issue |
|---|-----|-----------|-------|
| 2 | P2 | `src/features/market/components/MarketContent.tsx:151` | Buy-Error-Banner ist `position: fixed` Toast-style — auto-dismiss fehlt. User muss manuell wegklicken; bei mehrfachen Errors stapelt nichts (single-instance). Akzeptabel aber: nach 8s auto-fade wäre standard. |
| 3 | P3 | `src/features/market/components/MarketContent.tsx:118` | `if (data.playersLoading) return <MarketSkeleton />` blockt komplette Page bis players-Query loaded. PortfolioTab könnte parallel rendern. |

---

### /manager
**Health: 8/10**

| Section | Loading | Empty | Error | Optimistic |
|---------|---------|-------|-------|------------|
| ManagerInner page-level | ✅ Loader2 (auth) | ✅ "notSignedIn" text | ❌ kein top-level ErrorBoundary | n/a |
| KaderTab Holdings | ✅ Skeleton (dynamic) | ✅ NewUserTip + EmptyState (filter-empty) | ❌ kein isError-Branch (useManagerData) | ✅ Optimistic via useTradeActions |
| AufstellenTab events | ✅ Loader2 | ✅ "noOpenEvents" | ❌ kein isError-Branch | n/a |
| HistorieTab | ✅ Skeleton (dynamic) | ?(unverifiziert intern) | ?(unverifiziert intern) | n/a |

| Modal | preventClose | ESC | Loading-Indicator |
|-------|--------------|-----|-------------------|
| KaderSellModal (SellModalCore) | ✅ `busy=selling‖cancelling‖additionalBusy` | ✅ | ✅ |
| PlayerDetailModal | ❌ kein preventClose (nur Info-Tabs, keine Mutation darin) | ✅ | n/a |
| AlertDialog (LeaveEvent) | ✅ via `confirming={leaving}` cancel-guard | ✅ | ✅ |

**Findings:**
| # | Sev | File:Line | Issue |
|---|-----|-----------|-------|
| 4 | P1 | `src/features/manager/components/ManagerContent.tsx:37-89` | Kein Error-Branch wenn `useManagerData` errort. User sieht entweder Loader2 (auth) oder leere Page-Header — kein ErrorState mit Retry. |
| 5 | P1 | `src/features/manager/components/aufstellen/AufstellenTab.tsx:261` | `eventsLoading` zeigt nur Loader2 (Spinner). Sollte Skeleton sein laut `ui-components.md`. |
| 6 | P2 | `src/features/manager/components/kader/KaderTab.tsx:111` | `bulkSelling` blockt nur den Button (`disabled`). Bulk-Mode-Bar ist nicht persistent gegen ESC/Backdrop — kein Modal. UX akzeptabel, aber kein Modal-Close-Schutz nötig (Bar ist sticky-bottom). |

---

### /fantasy
**Health: 8/10**

| Section | Loading | Empty | Error | Optimistic |
|---------|---------|-------|-------|------------|
| Page-level events | ✅ FantasySkeleton | ✅ NewUserTip (joinedSet=0) | ✅ FantasyError + retry | n/a |
| EventsTab / SpieltagTab | ?(intern) | ?(intern) | ?(intern) | ?(intern) |

| Modal | preventClose | ESC | Loading-Indicator |
|-------|--------------|-----|-------------------|
| EventDetailModal | ✅ joining‖leaving‖resetting | ✅ | ✅ |
| EventSummaryModal | ❌ `preventClose={false}` mit TODO-Kommentar | ✅ | n/a |
| CreateEventModal | ❌ `preventClose={false}` mit TODO-Kommentar | ✅ | n/a |
| CreatePredictionModal | ✅ `createPredictionMut.isPending` | ✅ | ✅ |
| FixtureDetailModal | ?(unverifiziert) | ✅ | n/a |

**Findings:**
| # | Sev | File:Line | Issue |
|---|-----|-----------|-------|
| 7 | P2 | `src/components/fantasy/EventSummaryModal.tsx:48-50` | TODO-Kommentar dokumentiert: sobald Reward-Claim async wird, MUSS `preventClose={claiming}` rein. Aktuell synchron OK aber Risiko bei nächstem Claim-Refactor. |
| 8 | P2 | `src/components/fantasy/CreateEventModal.tsx:71-74` | TODO-Kommentar dokumentiert: Parent-Call ist synchron, aber sobald async-Mutation eingebaut wird MUSS `preventClose={creating}` ergänzt. Akzeptabel **wenn** kein Async-Body in `onCreate`. |

---

### /community
**Health: 8/10**

| Section | Loading | Empty | Error | Optimistic |
|---------|---------|-------|-------|------------|
| Posts feed | ✅ Skeleton multi-card | ✅ NewUserTip | ✅ ErrorState + invalidate | ✅ Optimistic vote/follow |
| CommunityFeedTab | ?(intern via children) | ?(intern) | ?(intern) | ?(intern) |
| PostReplies | ✅ Loader2 | n/a | n/a | ✅ |

| Modal | preventClose | ESC | Loading-Indicator |
|-------|--------------|-----|-------------------|
| CreatePostModal | ✅ `loading` | ✅ | ✅ |
| CreateResearchModal | ✅ `loading` | ✅ | ✅ |
| CreateBountyModal | ✅ `loading` | ✅ | ✅ |
| ReportModal | ✅ `reportMut.isPending` | ✅ | ✅ |
| FollowListModal | ❌ kein preventClose während `toggling` | ✅ | ✅ |

**Findings:**
| # | Sev | File:Line | Issue |
|---|-----|-----------|-------|
| 9 | P1 | `src/components/profile/FollowListModal.tsx:91` | Toggle-Follow setzt `setToggling(targetId)` aber Modal hat kein `preventClose`. ESC mid-toggle → setState auf unmounted Component. **State-Loss-Risiko** bei Modal-Close während Follow-RPC. Besser: `preventClose={!!toggling}`. |
| 10 | P3 | `src/components/community/PostReplies.tsx:34` | Replies-Loading nutzt Loader2 statt Skeleton — eine inline-replies-Liste, akzeptabel. |

---

### /missions
**Health: 9/10**

| Section | Loading | Empty | Error | Optimistic |
|---------|---------|-------|-------|------------|
| Page-level auth | ✅ Loader2 | n/a | n/a | n/a |
| DailyChallengeCard | ✅ `isLoading` prop | ?(intern wenn null) | ❌ inline `setError(err.message)` | n/a |
| MissionBanner | ✅ Skeleton | ✅ Empty CTA | ✅ red role=alert + msg | ✅ via useSafeMutation |
| ScoreRoadCard | ?(intern) | ?(intern) | ?(intern) | n/a |
| AchievementsSection | ?(intern) | ?(intern) | ?(intern) | n/a |

| Modal | preventClose | ESC | Loading-Indicator |
|-------|--------------|-----|-------------------|
| MysteryBoxModal | ✅ (isAnimating ‖ isOpening) | ✅ | ✅ |

**Findings:**
| # | Sev | File:Line | Issue |
|---|-----|-----------|-------|
| 11 | P2 | `src/components/gamification/DailyChallengeCard.tsx:109` | `setError(t('submitError'))` ist okay (i18n-resolved). Aber kein Retry-Button — User muss neu laden. Eine Try-Again-Hint wäre sauberer. |
| 12 | P3 | `src/app/(app)/missions/page.tsx:162` | Auth-Loading nutzt Loader2 (40px-Spinner). Fine für ms-Latenz, aber Skeleton ist Standard. |

---

### /transactions
**Health: 9/10**

| Section | Loading | Empty | Error | Optimistic |
|---------|---------|-------|-------|------------|
| Page-level auth | ✅ Loader2 | ✅ "signInPrompt" | n/a | n/a |
| Transactions list | ✅ "isLoading" branch | ✅ `rows.length === 0` | ✅ ErrorState onRetry | n/a |
| InfiniteScroll | ✅ ?(via useInfiniteTransactions) | n/a | n/a | n/a |

Keine Modals (page = list view).

**Findings:** keine kritischen Findings. 

---

### /founding
**Health: 7/10**

| Section | Loading | Empty | Error | Optimistic |
|---------|---------|-------|-------|------------|
| Page-level | ✅ Loader2 | n/a | ❌ Errors via Toast (`addToast`) — kein dedicated ErrorState | n/a |
| TierCards | n/a (static) | n/a | n/a | n/a |

| Modal | preventClose | ESC | Loading-Indicator |
|-------|--------------|-----|-------------------|
| Confirm Purchase | ✅ `purchasing` | ✅ | ✅ |

**Findings:**
| # | Sev | File:Line | Issue |
|---|-----|-----------|-------|
| 13 | P1 | `src/app/(app)/founding/page.tsx:128` | `addToast('Ein Fehler ist aufgetreten', 'error')` — **i18n-Bug**. Fest deutscher String, kein `t(...)`-Aufruf. TR-User sehen DE-Text. |
| 14 | P2 | `src/app/(app)/founding/page.tsx:88-99` | `loadData` setzt `loading=true` immer — auch beim Re-Fetch nach Purchase → Page-Spinner statt smooth Re-Render. Optimistic Approach: nur `counts.byTier[tier]+1` lokal updaten. |

---

### /inventory
**Health: 8/10**

| Section | Loading | Empty | Error | Optimistic |
|---------|---------|-------|-------|------------|
| Page-level auth | ✅ Loader2 | ✅ subtitle text | n/a | n/a |
| EquipmentSection | ✅ ?(intern) | ✅ EmptyState | ?(unverifiziert) | n/a |
| CosmeticsSection | ✅ isLoading | ✅ EmptyState | ?(unverifiziert) | n/a |
| WildcardsSection | ✅ isLoading | ✅ EmptyState | ?(unverifiziert) | n/a |
| MysteryBoxHistorySection | ✅ isLoading | ✅ EmptyState | ?(unverifiziert) | n/a |

| Modal | preventClose | ESC | Loading-Indicator |
|-------|--------------|-----|-------------------|
| EquipmentDetailModal | ❌ kein preventClose (nur Info, keine Mutation) | ✅ | n/a |

**Findings:**
| # | Sev | File:Line | Issue |
|---|-----|-----------|-------|
| 15 | P2 | Sections-Wide (`CosmeticsSection.tsx:70`, `WildcardsSection.tsx:21`, `MysteryBoxHistorySection.tsx:100`) | Kein `isError`-Branch in 3/4 Sections. React Query failed → User sieht ewig Loading-State (nicht Empty, weil `data=undefined` → Hook-default `[]`). |

---

### /rankings
**Health: 9/10**

| Section | Loading | Empty | Error | Optimistic |
|---------|---------|-------|-------|------------|
| GlobalLeaderboard | ✅ | ✅ | ?(unverifiziert) | n/a |
| FriendsLeaderboard | ✅ | ✅ | ?(unverifiziert) | n/a |
| ClubLeaderboard | ✅ | ✅ | ?(unverifiziert) | n/a |
| MonthlyWinners | ✅ | ✅ | ?(unverifiziert) | n/a |
| LastEventResults | ✅ | ?(unverifiziert) | ?(unverifiziert) | n/a |
| PlayerRankings | ✅ | ✅ | ?(unverifiziert, throws errors via service-throw) | n/a |
| SelfRankCard | ✅ scoresLoading | ?(unverifiziert) | ?(unverifiziert) | n/a |

Keine Modals (page = read-only list views).

**Findings:**
| # | Sev | File:Line | Issue |
|---|-----|-----------|-------|
| 16 | P2 | Rankings-Wide | **Kein einziges Section-Component** hat einen `isError`-Branch — alle Cards basieren auf `useQuery(...).isLoading` und `entries.length === 0`. Bei RPC-Error User sieht "noData" statt "Reload"-Button. |

---

### /airdrop
**Health: 8/10**

| Section | Loading | Empty | Error | Optimistic |
|---------|---------|-------|-------|------------|
| Stats Bar | n/a (static) | ✅ "comingSoon" Card | n/a | n/a |
| Leaderboard | ✅ Skeleton 5 rows | ✅ "noData" centered | ❌ kein isError-Branch | n/a |
| MyEntry highlight | n/a | implicit (returns null) | n/a | n/a |

Keine Modals.

**Findings:**
| # | Sev | File:Line | Issue |
|---|-----|-----------|-------|
| 17 | P2 | `src/app/(app)/airdrop/page.tsx:26-27` | `useAirdropLeaderboard` + `useAirdropStats` haben kein sichtbares isError-Handling auf Page-Ebene. Bei RPC-Failure: ewig leerer Loader-Screen. |

---

### /profile
**Health: 9/10**

| Section | Loading | Empty | Error | Optimistic |
|---------|---------|-------|-------|------------|
| Page-level | ✅ ProfileSkeleton | ✅ `if (!user) return null` | n/a (delegated to ProfileView) | n/a |
| ProfileView (sub) | ✅ | ?(intern) | ✅ ErrorState (line 141) | n/a |
| Tabs (Trader/Manager/Analyst/Timeline/ScoutCard) | mostly ✅ | mostly ✅ (length===0 checks) | ?(unverifiziert pro tab) | n/a |

Modale auf Profile-Detail-Seite werden über Children gerendert.

**Findings:** keine Page-Level-Findings. Tab-Internals nicht tief auditiert (Scope: Page-First).

---

### /profile/[handle]
**Health: 9/10**

| Section | Loading | Empty | Error | Optimistic |
|---------|---------|-------|-------|------------|
| Page-level | ✅ Custom Skeleton | ✅ "404 Profile not found" | ✅ catch → notFound=true | n/a |

Keine Modals page-direkt.

**Findings:** keine kritischen Findings.

---

### /profile/settings
**Health: 6/10**

| Section | Loading | Empty | Error | Optimistic |
|---------|---------|-------|-------|------------|
| Auth-Loading | ?(unverifiziert in dieser Read) | n/a | n/a | n/a |
| Profile-Save | n/a | n/a | ⚠️ inline `profileMsg.text` rendered | n/a |
| Account-Save | n/a | n/a | ⚠️ inline `accountMsg.text` rendered | n/a |
| Notif-Prefs | ✅ `notifPrefsLoaded` | n/a | ❌ silent `console.error` only | ✅ debounced auto-save |
| Push-Toggle | ✅ `pushLoading` | n/a | ❌ silent `console.error` only | n/a |

| Modal | preventClose | ESC | Loading-Indicator |
|-------|--------------|-----|-------------------|
| Delete-Account-Dialog | n/a (info-only) | ✅ | n/a |

**Findings:**
| # | Sev | File:Line | Issue |
|---|-----|-----------|-------|
| 18 | **P1** | `src/app/(app)/profile/settings/page.tsx:149,166` | **i18n-Key-Leak-Risiko**: `setProfileMsg({ ..., text: err.message })` und `setAccountMsg({ ..., text: err.message })` rendern raw Service-Throw direkt ins UI. Wenn Service `throw new Error('handleReserved')` macht → User sieht "handleReserved". Gleiche Klasse wie J1+J3. **Fix-Pattern:** `mapErrorToKey(normalizeError(err)) → te(key)`. |
| 19 | P2 | `src/app/(app)/profile/settings/page.tsx:69, 93, 107` | Notif-Prefs-Load + Push-Toggle + Notif-Save haben nur `console.error`. Toast/Inline-Error-Hint fehlt — User klickt "Speichern", nichts passiert sichtbar bei Fehler. |

---

### /player/[id]
**Health: 9/10**

| Section | Loading | Empty | Error | Optimistic |
|---------|---------|-------|-------|------------|
| Page-level | ✅ PlayerDetailSkeleton | ✅ "notFound" + back-link | ✅ ErrorState onRetry | n/a |
| TradingTab | ?(intern) | ?(intern) | ?(intern) | ✅ via usePlayerTrading |
| PerformanceTab | ?(intern) | ?(intern) | ?(intern) | n/a |
| CommunityTab | ?(intern) | ?(intern) | ?(intern) | n/a |

| Modal | preventClose | ESC | Loading-Indicator |
|-------|--------------|-----|-------------------|
| BuyModal | ✅ `buying ‖ ipoBuying` | ✅ | ✅ |
| SellModal (SellModalCore) | ✅ `busy` | ✅ | ✅ |
| OfferModal | ✅ `offerLoading` | ✅ | ✅ |
| LimitOrderModal | ❌ `preventClose={false}` mit TODO-Kommentar (Feature deaktiviert: FEATURE_LIMIT_ORDERS=false) | ✅ | n/a |

**Findings:** keine kritischen Findings. LimitOrderModal-TODO ist akzeptabel weil Feature-flagged-off.

---

### /clubs
**Health: 9/10**

| Section | Loading | Empty | Error | Optimistic |
|---------|---------|-------|-------|------------|
| Page-level | ✅ Skeleton + 6× SkeletonCard | ✅ EmptyState (search/no-clubs) | ✅ ErrorState onRetry | ✅ Follower-count optimistic |
| Followed-Clubs-Strip | n/a (returns null wenn 0) | ✅ implicit | n/a | n/a |

| Modal | preventClose | ESC | Loading-Indicator |
|-------|--------------|-----|-------------------|
| FanWishModal | ✅ `wishMut.isPending` | ✅ | ✅ |

**Findings:** keine kritischen Findings.

---

### /club/[slug]
**Health: 8/10**

| Section | Loading | Empty | Error | Optimistic |
|---------|---------|-------|-------|------------|
| Page-level | ✅ ClubSkeleton | ✅ "notFound" Card | ✅ ErrorState onRetry | ✅ Follow-button via useClubActions |
| SquadPreview | ?(intern) | ?(intern) | ?(intern) | n/a |
| ActiveOffers | n/a | ✅ returns null when 0 | n/a | n/a |
| MembershipSection | ?(intern) | n/a | ✅ via useSafeMutation `errorTag` | ✅ subscribeMut.isPending |
| RecentActivity / FormResults / Standings | ?(intern) | ?(intern) | ?(intern) | n/a |

Keine Page-Level-Modals (modals werden in Sub-Sections wie MembershipSection gerendert).

**Findings:**
| # | Sev | File:Line | Issue |
|---|-----|-----------|-------|
| 20 | P2 | `src/components/club/sections/MembershipSection.tsx:151` | Subscribe-Tier-Buttons disablen während Mutation, **aber** kein Modal-Confirm-Step für Geld-Transaktion. User klickt "Profi 25 EUR", direkter RPC-Call. Akzeptabel im Pilot, aber für Beta/Live mit echtem Geld → ConfirmDialog davor (P2 wegen Money-Risk). |

---

### /compare
**Health: 7/10**

| Section | Loading | Empty | Error | Optimistic |
|---------|---------|-------|-------|------------|
| Page-level | ✅ Skeleton 3 cards | ✅ "emptyTitle" placeholder bei <2 selected | ✅ ErrorState onRetry | n/a |
| Search-Results | n/a | implicit (filteredPlayers=[]) | n/a | n/a |

Keine Modals.

**Findings:**
| # | Sev | File:Line | Issue |
|---|-----|-----------|-------|
| 21 | P1 | `src/app/(app)/compare/page.tsx:79` | **`alert(t('linkCopied'))`** — native `alert()` blockt Main-Thread, ist nicht i18n-styled, nicht Mobile-friendly. Fix: `useToast().addToast(t('linkCopied'), 'success')`. |
| 22 | P2 | `src/app/(app)/compare/page.tsx:184-186` | Empty-Slot-Buttons haben `min-h-[120px]` aber kein touch-target-44px für innen-Button — visuell ein großer Touch-Button, OK. |

---

## Modal-Audit-Aggregat

- **Modals total geprüft (mit Mutation):** 18 (in Scope-Pages erreichbar)
- **preventClose-OK:** 14 (78%)
- **preventClose-FEHLT (P1):** 1 — FollowListModal (`src/components/profile/FollowListModal.tsx:91`)
- **preventClose-TODO-dokumentiert (P2):** 3 — EventSummaryModal, CreateEventModal, LimitOrderModal (alle 3 sind Feature-flagged-off ODER aktuell synchron-handler — akzeptabel, aber Re-Audit nach nächstem Async-Refactor pflicht)
- **preventClose-OK Money-Pfad:** 100% (BuyConfirm, SellModalCore, OfferModal, KaderSellModal, MysteryBoxModal, FoundingPass-Confirm) — **Money ist sauber**

Modal-Detail-Listing der OK-Fälle (zur Verifikation):

```
✅ BuyConfirmModal:  isPending
✅ SellModalCore:    busy (selling‖cancellingId‖additionalBusy)
✅ KaderSellModal:   delegiert an SellModalCore
✅ OfferModal:       offerLoading
✅ BuyModal:         buying‖ipoBuying
✅ MysteryBoxModal:  isAnimating‖isOpening
✅ FoundingPass:     purchasing
✅ CreatePostModal:  loading
✅ CreateResearchModal: loading
✅ CreateBountyModal: loading
✅ ReportModal:      reportMut.isPending
✅ FanWishModal:     wishMut.isPending
✅ EventDetailModal: joining‖leaving‖resetting
✅ CreatePredictionModal: createPredictionMut.isPending
✅ AlertDialog (LeaveEvent in Aufstellen): confirming={leaving}
```

---

## Top-3-Systemic-Issues (Detail)

### 1. err.message direkt rendern → i18n-Key-Leak (P1)

Settings-Page (`/profile/settings`) rendert `err.message` 2×. Wenn `updateProfile`-Service ein i18n-Key wirft (`throw new Error('handleReserved')`), zeigt User den raw Key.

**Fix-Pattern (errors-frontend.md):**
```ts
import { mapErrorToKey, normalizeError } from '@/lib/errorMessages';

catch (err) {
  const key = mapErrorToKey(normalizeError(err));
  setProfileMsg({ type: 'error', text: te(key) });
}
```

Audit: `grep -rnE "setError\\(err\\.message\\)|text: err\\.message" src/app/`

### 2. TODO-bekannte preventClose-Lücken (P2 mit Code-Kommentar)

Drei Modals haben `preventClose={false}` mit TODO-Kommentar. Aktuell akzeptabel (kein Async-Body, oder Feature-flagged-off), aber **Re-Audit nach jedem Refactor pflicht**:

- `CreateEventModal.tsx:74` — sobald `onCreate` async Mutation wird
- `EventSummaryModal.tsx:50` — sobald Reward-Claim async wird
- `LimitOrderModal.tsx:41` — sobald FEATURE_LIMIT_ORDERS=true

**Empfehlung:** Diese 3 Stellen als pending-Commit-Hook markieren, falls Money-Mutation eingebaut wird.

### 3. Loader2-Spinner statt Skeletons (P2/P3)

`ui-components.md` Regel: "Loading: Skeleton Screens (nicht Spinner). Ausnahme: Loader2 fuer Actions". Aktuell haben **6 Pages** generische Loader2-Spinner als Page-Loading-State:

- `/manager` ManagerInner Auth-Loading + ManagerContent dynamic-loading
- `/transactions` Page Auth-Loading
- `/inventory` Page Auth-Loading
- `/founding` Page Loading
- `/missions` Page Auth-Loading
- `/aufstellen` events-loading

**Empfehlung Polish-Sweep:** Alle replace mit dedicated Skeletons (z.B. `<KaderSkeleton />`, `<HistorySkeleton />`). Profile + Home + Market + Community haben es schon richtig.

---

## Severity-Regeln

- **P0 (State-Loss-Risiko):** Modal-ESC mid-Mutation, Whitescreen, Money-Path ohne preventClose → 0 gefunden
- **P1 (Sichtbare UX-Lücke):** Empty fehlt, Error-State fehlt komplett, Toast-only-Errors mit i18n-Key-Leak → 11
- **P2 (Inkonsistenz):** isError-Branch fehlt aber Empty-Branch da, TODO-preventClose, Loader2 statt Skeleton → 13
- **P3 (Detail):** Touch-Target 40 statt 44, Inkonsistente Retry-Scope → 3

---

## Summary

Money- und Trading-Modals sind **konsistent geschützt** (preventClose 100% in Money-Pfaden). Hauptproblem ist **Settings-Page i18n-Key-Leak** (Finding #18, P1) und **systemisches Fehlen von isError-Branches** in Section-Components (Rankings + Inventory + Airdrop). Polish-Sweep sollte erst Settings-i18n + FollowListModal preventClose fixen, dann Skeleton-Migration der 6 Loader2-Pages, dann isError-Branches in Section-Components ergänzen. Alle 7 Ligen launch-fähig nach diesen Fixes — keine P0-Blocker für 50-Tester-Beta.
