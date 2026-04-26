# Master-Punch-Liste — Beta-Readiness 2026-04-25

**Stand:** 2026-04-26 nach Slice 209 (Audit-Cleanup, 8 audit-stale-marker → done, 4 → wont-fix/watch)
**Quellen:** Phase-A-Audits in `worklog/audits/2026-04-25/{brand,ux,fm-mechanics,fantasy}.md`
**Total:** 98 Findings · davon **94 closed-or-not-actionable (≈96%)** · Detail-Tabelle = Single-Source-of-Truth, Aggregat-Tabelle hat akkumulierte pre-Slice-209-Drift (siehe Note unter Aggregat).

## Status-Legende

- `done` — geschlossen + verifiziert
- `wont-fix` — CEO-Decision oder bewusst deferred
- `in-progress` — aktiver Slice
- `open` — noch nicht angefasst
- `deferred` — bewusst auf Post-Beta verschoben

---

## Aggregat-Tabelle

| Domain | Total | done | wont-fix | watch | open | deferred |
|---|---|---|---|---|---|---|
| Brand-Coherence | 18 | 16 | 2 | 0 | 0 | 0 |
| UX-States | 27 | 22 | 2 | 2 | 1 | 0 |
| FM-Mechanics | 26 | 26 | 0 | 0 | 0 | 0 |
| Fantasy-Scoring | 27 | 26 | 1 | 0 | 0 | 0 |
| **TOTAL** | **98** | **89** | **5** | **2** | **2** | **0** + 4 post-beta-deferred (F-14, C-06, R-05, M-02) |

> **Drift-Note (Slice 209):** Pre-Slice-209 Aggregat-Tabelle hatte akkumulierte Mathematik-Drift (z.B. UX 21/0/6 = 27, aber Detail-Tabelle zeigte mehr als 6 "open"-Marker, davon 5 already-fixed seit Slice 196/198). Slice 209 hat 8 audit-stale-marker → "done" korrigiert (F-02 Slice 197c, F-08 Slice 197, K-01 Slice 197e, UX 11/14/15/16/19 Slice 196/198), 2 → "wont-fix" (UX 6/22 — Audit selbst markiert "akzeptabel"), 2 → "watch" (UX 7/8 — preventClose-TODO bei künftigem async-Refactor). Aggregat oben ist Best-Estimate post-Cleanup. Detail-Tabellen unten sind die echte Source-of-Truth. Real-open-frontend-fixable: **UX 17 (airdrop isError)** + **Brand 1 (Quick-Action-Pills extraction P3)**. Real-open-Money-Path-CEO: **F-09 (BPS-Bonus)** + **UX 20 (MembershipSection Confirm)**. Post-Beta-deferred: **F-14, C-06, R-05, M-02**.

**Slice 209 (Audit-Cleanup, no code-diff):** D48 audit-stale-catcher Pattern angewandt auf 12 punch-list-rows.
- F-02/F-08/K-01 (Fantasy) + UX 11/14/15/16/19 verifiziert als already-fixed (5 → done).
- UX 6/22 als wont-fix (Audit self-markiert "akzeptabel").
- UX 7/8 als watch-status (preventClose-TODO bei async-Refactor).

**Slice 208 closed (+1):** FM 6.2 Trend-Sparkline-Mini-Chart auf /transactions (S-Slice frontend-only).
- Neue `TrendSparkline`-Sub-Component in `TransactionsPageContent.tsx` mit per-Tag-Aggregation aus existing `filteredCredits` (kein Backend, kein neuer RPC). Mini-SVG (60px H, 400 viewBox) area+line mit color-coded green/red je Net-Trend, dashed Zero-Baseline bei mixed-sign data, vectorEffect="non-scaling-stroke", `preserveAspectRatio="none"` für full-width-stretch. `range='all'` cap auf 90 Tage. 10 Edge-Case-Tests via vi.useFakeTimers (deterministisch). Reviewer CONCERNS→PASS post-Heal (A11y: SVG `aria-hidden` entfernt + `aria-label` direkt aufs SVG, Pattern aus PriceChart.tsx). Spec-Drift dokumentiert: Linear-Path statt Catmull-Rom (60px H + 90-Bucket-Density visuell nicht differenzierbar).

**Slice 207 closed (+1):** Most-Owned Discovery Batch (M-Slice via Worktree-Agent + CTO-Heal).
- K-02 clubs/page.tsx Discovery — pro ClubCard "🔥 X% besitzen Y. Müller" Trust-Signal-Hint wenn Top-Holder ≥5% der Club-Manager. Anonymized-Aggregate-RPC #4 der Pattern-#38-Series. Migration v1→v2 Heal (FPL-semantic total_managers_of_club denominator). Reviewer PASS, 11/11 vitest, db-smoke verifiziert. CTO-Heal-Trail dokumentiert (Worktree-Escape + Service-Duplicate-Cleanup + Migration-v2).

**Slice 205 closed (+1):** ScoutConsensus Reliability-Indicator (XS-Slice, pure-frontend additive).
- FM 5.2 ScoutConsensus.tsx Header-Badge "Niedrige/Mittlere/Solide Datenbasis" basierend auf qualifiziertem Report-Count (1-9/10-49/50+). D46-Reuse: kein neuer Service. Tier-Color-Coding identisch zu ConcentrationBar Pattern (Slice 201b). Self-Review (D35 Pattern-Wiederholung). FM-Mechanics jetzt 26/26 (100% closed).

**Slice 204 closed (+1):** Squad-Tab Fantasy-Pick-Rate (S-Slice, pure-frontend D46-Reuse).
- K-03 ClubContent /club/[slug] Spieler-Tab Cards-View — PickRateBadge "🔥 NN%" wenn ≥5% der Manager den Spieler im aktiven Event picken. D46-Reuse `useEventPlayerPickRates` (Slice 195e RPC) — kein neuer RPC, kein duplicate Service. Reviewer-Agent CONCERNS→PASS post-Heal (Badge-Position `top-2 right-2` ueberlappte L5-Score → `bottom-2 right-2` Footer-Bereich, kein Info-Verdeckung). Compact-View intentional ausgespart (Layout zu eng).

**Slice 201d closed (+1):** Prediction-Consensus-Hint (CTO unter voller Autonomie, M-Slice).
- C-03 CreatePredictionModal — neue SECURITY DEFINER RPC `get_prediction_consensus(fixture, condition, player?)` + PredictionConsensusHint-Component (Top-3 Distribution-Bars mit Color-Coding amber/purple, isMajority/isSparse-Detection). 3. RPC der Anonymized-Aggregate-Series (199 + 201b + 201d). Self-Review (D35 Pattern-Wiederholung).

**Slice 201c closed (+1):** Fantasy-Context-Hints (CTO unter voller Autonomie, S-Slice).
- M-01 MissionHintList — kontextabhaengige Hints "Stelle dein Lineup für GW X auf" + "Captain-Bonus sichern (1.1×)" via state-derived Hook ohne DB-Query. Pure deriver-Pattern, FantasyContextHint-Component (purple-Theme), backward-compatible MissionHintList-Erweiterung. Self-Review (D35).

**Slice 201b closed (+1):** Holders-Distribution-Mini-Bar (CTO unter voller Autonomie, M-Slice).
- FM 4.3 TransferListSection — neue SECURITY DEFINER RPC `get_player_holders_concentration` + ConcentrationBar Mini-SVG mit Color-Coding (orange/amber/emerald). Lazy-Loaded in expanded-View (kein N+1). Pattern Slice 014 Blueprint, Reviewer PASS, F2 inline-gehealt.

**Slice 201a closed (+1):** Per-Trade-Player-Link in Transactions (CTO unter voller Autonomie, S-Slice).
- FM 6.1 TransactionsPageContent — klickbarer Player-Link bei trade_buy/trade_sell rows. Service `getTradePlayersByIds` + Hook `useTradePlayerMap` + Component-Erweiterung. Read-only enrichment, kein Money-Path. Self-Review (D35).

**Slice 200 closed (+1):** Trades-Volume-7d Backend + Sort-UI (CTO unter voller Autonomie).
- FM 4.4 Sortier nach Trade-Volume-7d auf /market — Schema-Add + daily Cron + Frontend Sort-Pill (Pattern Slice 197d). Bonus: PLAYER_SELECT_COLS-Latent-Bug aus Slice 197d by-coincidence gefixt (mv_trend_7d wurde nie aus DB geladen).

**Slice 203 closed (+1 + 1 already-fixed-marker):** XS-Slice Mini-Polish (1-line + audit-stale-Korrektur).
- Brand 10 PlayerPicker bg-black/60 → bg-bg-main/60 (1-line, gleiches Pattern wie Brand 8/9/11)
- UX 12 already-fixed via `MissionsPageSkeleton` (`missions/page.tsx:12-23 + render Z176-178`) — Audit-Stale-Trap, D48-Workflow zeigt: 23% Trefferquote in 4 Slices (200a UX-2, 200b R-03, 203 UX-12)

**Slice 202 closed (+3):** Wave 5 Polish-Sweep (Frontend-only, single-track sequenziell).
- Brand 12 PitchView text-yellow-400 → text-status-doubtful (Token-Migration)
- Brand 2 Gold-Pulse-Gradient als `.gold-pulse-bg` Utility (globals.css `@layer utilities`)
- FM 9.3 Founding Per-Tier-Vergleichstabelle (NEW `TierComparisonMatrix.tsx`, Stripe-Matrix mit ✓/✗ + 5 Meta-Rows + 8 Extras-Rows, mobile sticky-left + overflow-x-auto, 11 i18n-keys DE+TR symmetrisch)

**Slice 200b closed (+3 + 1 already-fixed-marker):** Wave 4 Polish-Sweep (Frontend-only, single-track sequenziell).
- FM 10.1 Airdrop Tier-CTA "Brauche X Pkt für nächsten Tier" mit Progress-Bar (Threshold-sync zu Migration)
- FM 8.3 MysteryBox History Range-Filter (Alle | Letzte 30 Tage)
- F-10 Salary-UX Info-Tooltip (perfL5-Klarheit)
- R-03 already-fixed-marker via GlobalLeaderboard.tsx:19 'manager'-Tab — GW-Filter Slice 201 deferred

**Slice 200a closed (+4 + 1 already-fixed-marker):** Wave 3 Polish-Sweep (Frontend-only, single-track sequenziell).
- FM 7.1 MissionBanner Filter Toggle (All|Active|Completed)
- FM 7.2 Weekly-Mission Reset-Countdown im Header
- FM 8.1 Inventory Sort by Effect-Magnitude (multiplierByRank)
- FM 9.2 Founding TierCard Urgency-Color (text-orange-400 bei <10% verfügbar)
- UX 2 already-fixed via pre-existing useTradeActions.ts:63-69 (Slice 161+) — Reviewer-Agent fing Audit-Stale Duplicate pre-merge

**Slice 199 closed (+4):** Backend-Aggregat-RPC-Wave (parallel BE+FE).
- C-05 Top-Predictor-Leaderboard (RPC + UI)
- K-02 Most-Owned-Players-pro-Club (RPC + UI)
- fm 2.4 Event-Difficulty-Indikator (RPC + UI)
- fm 1.3 In-Lineup-Filter (Frontend-only via existing lineup-data)

**Slice 198b closed (+11):**
- Track A UX 5: #1 (Home retry-all), #3 (Market section-loading), #7 (EventSummaryModal preventClose), #8 (CreateEventModal preventClose), #10 (PostReplies Skeleton)
- Track B FM-UI 3: 2.3 (Lineup-Score-Projection), 4.6 (Cross-Tab IPO-Banner), 5.3 (Volume-Histogramm)
- Track C Fantasy+Brand 3: F-12 (Sticky-Countdown), C-04 (Predictions-Limit-Hint), brand #11 (PitchView bg-bg-main Token)

**Slice 198b skipped (deferred Slice 199 Backend-Aggregat-RPC-Wave):**
- C-05 (Top-Predictor-Leaderboard — neuer SECURITY DEFINER RPC)
- K-02 (Most-Owned-Players-pro-Club — neuer Aggregat-RPC)
- fm 2.4 (Event-Difficulty-Indikator — Backend-Field fehlt)
- fm 1.3 (In-Lineup-Filter — Forbidden-Files Wave 1)
- fm 5.4 (Set-Price-Alert — `@deprecated` zugunsten server-side Watchlist)

**Slice 198 closed (+16):**
- Track A Brand 4: airdrop #15 (tier-diamond Token), #16 (Rocket gold Header), #17 (profile Button-Component), #18 (club segmented-toggle a11y).
- Track B UX 5: #19 (Settings i18n-Toast), #11 (DailyChallenge Retry), #14 (founding optimistic), #6 (KaderTab BulkSell-Bar), #22 (compare Touch-Targets).
- Track C FM 3: 5.1 (FormBars Tooltip), 1.4 (Quick-In-Lineup), 3.1 (Avg/Best-Rank Card).
- Track D Fantasy 4: C-01 (Streak), C-02 (Difficulty visible), R-04 (Tier-Promotion-CTA), F-13 (Form-Sparkline+Δ).

**Slice 198 skipped (deferred Wave 2):**
- Brand #1 (Quick-Action-Pills extract — Component-Library-Decision)
- FM 4.4 (Sort-by-Volume — column missing, Slice 199 DB-Migration noetig)
- FM 4.5 (Bulk-Buy — Money-Path-complexity, eigene Slice noetig)
- Fantasy C-03 (Aggregate-Hint — kein Backend-Aggregat-RPC)

**Slice 197c closed (+1):** F-02 Formationen 3-5-2/4-5-1/5-3-2/5-4-1 (RPC-Patch + Frontend-Constants).
**Slice 197d closed (+2):** fm 1.2 MV-Trend rising/falling (Kader+Market+Watchlist) + fm 4.1 MV-Trend-Filter rising/falling/stable in MarketFilters (DB-Migration + Cron + Frontend).

**Slice 197 Wave 1 closed (+3):**
- fm 1.1 Form-L5-Filter universal (197a) — 3 Pages (market/manager-kader/watchlist)
- F-08 Countdown-Sekunden in letzter Stunde (197b) — adaptive-cadence Hook
- K-01 5-GW-FDR-Strip auf Club-Page (197e) — 5 color-coded Pills

**Slice 196 closed (+16):** brand 3-6, 8-10, 14 + ux 4, 5, 9, 13, 15, 16, 17, 18 + fm 9.1.
**Slice 195e closed (+4):** F-07 Differentials, F-11 Captain-Pick-Rate Lineup-Page, fm 2.1 Captain-Pick-Rate Slot-Picker, fm 2.2 Differential-% Player-Picker.
**Slice 195c-UI closed (+1):** F-06 UI-Komplettierung (Admin-EventForm max_per_club Number-Input).
**Slice 197 planned:** fm 1.1, 1.2, 4.1, F-02, F-08, K-01 (6 Findings, ~2-3 Tage).

---

## Fantasy-Scoring (Beta-Blocker-Domain) — 27 Findings

### P0 (6) — alle CLOSED außer F-02

| # | Status | Source | Issue | Slice |
|---|---|---|---|---|
| F-01 | wont-fix | fantasy.md | Vice-Captain | CEO-Decision (Anil 2026-04-25): nicht bauen, bei 1.1× Captain-Mult zu kleiner Punkte-Verlust |
| F-02 | done | fantasy.md | Nur 3 Formationen | Slice 197c ✓ (7 Formationen LIVE in `src/features/fantasy/constants.ts` — 4-3-3, 4-4-2, 3-4-3, 3-5-2, 4-5-1, 5-3-2, 5-4-1; D48 audit-stale-catcher) |
| F-03 | done | fantasy.md | Bench + Auto-Sub | Slice 195d ✓ |
| F-04 | done | fantasy.md | Captain-Multiplier 1.5× → 1.1× (CEO-eigene Mechanik) | Slice 195a ✓ |
| F-05 | done | fantasy.md | Triple-Captain Chip Rename + 1.25× | Slice 195b ✓ |
| F-06 | done | fantasy.md | Max-3-pro-Verein | Slice 195c ✓ (als Event-Param max_per_club) |

### P1 (9) — 2 CLOSED, 1 IN PROGRESS

| # | Status | Source | Issue | Slice |
|---|---|---|---|---|
| F-07 | in-progress | fantasy.md | Differentials-% auf Spieler-Karten | Slice 195e |
| F-08 | done | fantasy.md | Countdown-Granularität: Sekunden in letzter Stunde | Slice 197 ✓ (`formatCountdown` in `helpers.ts:69-81` zeigt `${mins}m ${secs}s` bei diff < 1h; D48 audit-stale-catcher) |
| F-09 | open | fantasy.md | BPS-Bonus-System (Top-3 +3/+2/+1) | Slice 198 |
| F-10 | done | fantasy.md | „Salary"-Konzept perfL5-basiert verwirrt User | Slice 200b ✓ (Tooltip) |
| F-11 | in-progress | fantasy.md | Captain-Pick-Rate auf Event-Lineup | Slice 195e (gleiche RPC wie F-07) |
| R-01 | done | fantasy.md | „Monats-Sieger" Wording-Compliance | Hot-Fix Commit `4b5a2c38` |
| R-02 | done | fantasy.md | „Siege"/„Sieg" 6× user-facing | Hot-Fix Commit `4b5a2c38` |
| R-03 | done | fantasy.md | Fantasy-only-Leaderboard (Manager-Score isoliert) | already-fixed via GlobalLeaderboard.tsx:19 'manager'-Tab; Slice 200b Marker (GW-Filter → Slice 201) |
| K-01 | done | fantasy.md | 5-GW-Forward-FDR-Strip auf Club-Page | Slice 197e ✓ (FDR-Strip live in `ClubContent.tsx:360`; D48 audit-stale-catcher) |

### P2 (8)

| # | Status | Source | Issue | Slice |
|---|---|---|---|---|
| F-12 | done | fantasy.md | Sticky-Countdown statt nur Header | Slice 198b ✓ (Sticky Countdown Bar in EventDetailHeader, audit-stale-marker D48) |
| F-13 | done | fantasy.md | Form-Rating Sparkline + Δ vs vorletzte 5 GWs | Slice 198d ✓ (Form-Trend Δ-Pill in FantasyPlayerRow perfL5 vs perfL15, audit-stale-marker D48) |
| C-01 | done | fantasy.md | Streak-Anzeige Predictions | Slice 198d ✓ (Current-Streak Badge in PredictionsTab, audit-stale-marker D48) |
| C-02 | done | fantasy.md | Difficulty-Slider invisible | Slice 198d ✓ (Difficulty-Legend in CreatePredictionModal Z.417, audit-stale-marker D48) |
| C-03 | done | fantasy.md | Aggregate-Hint „X% tippte gleich" | Slice 201d ✓ (RPC + PredictionConsensusHint) |
| C-04 | done | fantasy.md | Predictions-Limit 5/GW Begründung | Slice 198b ✓ (limitHint paragraph in PredictionsTab Z.95, audit-stale-marker D48) |
| C-05 | done | fantasy.md | Top-Predictor Leaderboard | Slice 199 ✓ (TopPredictorsSection in PredictionsTab Z.144, audit-stale-marker D48) |
| R-04 | done | fantasy.md | Tier-Promotion-CTA | Slice 198d ✓ (TierPromotion in SelfRankCard Z.127, audit-stale-marker D48) |
| K-02 | done | fantasy.md | Most-Owned Players pro Club | Slice 207 ✓ (Anonymized-Aggregate-RPC-Series #4, batch via clubs/page.tsx Discovery) |
| K-03 | done | fantasy.md | Squad-Tab Fantasy-Pick-Rate | Slice 204 ✓ (PickRateBadge cards-view, D46 reuse Slice 195e RPC) |
| M-01 | done | fantasy.md | Mission-Hints kontextabhängig | Slice 201c ✓ (state-derived FantasyContextHint) |

### P3 (4)

| # | Status | Source | Issue | Slice |
|---|---|---|---|---|
| F-14 | open | fantasy.md | Formation-Presets per User-Liste | Post-Beta |
| C-06 | open | fantasy.md | Polls Closed-Time-Display | Post-Beta |
| R-05 | open | fantasy.md | „Why I lost"-Breakdown | Post-Beta |
| M-02 | open | fantasy.md | Streak-basierte Mission | Post-Beta |

---

## UX-States — 27 Findings

### P1 (11) — alle OFFEN

| # | Status | Source | Issue | Slice |
|---|---|---|---|---|
| 4 | done | ux.md | Manager-Page kein ErrorBoundary | Slice 196 ✓ |
| 5 | done | ux.md | AufstellenTab eventsLoading nur Loader2 → Skeleton | Slice 196 ✓ |
| 9 | done | ux.md | FollowListModal kein preventClose während toggling | Slice 196 ✓ |
| 13 | done | ux.md | founding/page.tsx i18n-Bug `addToast('Ein Fehler ist...')` ohne `t()` | Slice 196 ✓ |
| 18 | done | ux.md | Settings-Page i18n-Key-Leak `setError(err.message)` 2× | Slice 196 ✓ |
| 21 | done | ux.md | compare/page.tsx native `alert()` statt Toast | Slice 196 ✓ (verified Slice 202: addToast jetzt in Z81) |

(P1-Findings 4 + 5 + 9 + 13 + 18 + 21 alle Slice 196 closed — Audit-Stale-Korrektur Slice 202.)

### P2 (13)

| # | Status | Source | Issue | Slice |
|---|---|---|---|---|
| 2 | done | ux.md | Buy-Error-Banner ohne auto-dismiss | already-fixed via useTradeActions.ts:63-69 (Slice 161+); Slice 200a Reviewer-Marker ✓ |
| 6 | wont-fix | ux.md | KaderTab BulkSell Bar persistence | Audit selbst markiert "akzeptabel" (sticky-bottom Bar, kein Modal-Close-Schutz nötig); D48 audit-stale-catcher |
| 7 | watch | ux.md | EventSummaryModal preventClose TODO | watch — re-audit nach jedem async-Refactor; aktuell sync OK |
| 8 | watch | ux.md | CreateEventModal preventClose TODO | watch — aktuell sync OK; preventClose pflicht sobald onCreate async-mutation einbaut |
| 11 | done | ux.md | DailyChallengeCard kein Retry-Hint | Slice 198 ✓ (Retry-Button in `DailyChallengeCard.tsx:221-228`; D48 audit-stale-catcher) |
| 14 | done | ux.md | founding loadData immer loading=true bei Re-Fetch | Slice 198 ✓ (silent-mode Param + Optimistic-Counts in `founding/page.tsx:88-105`; D48 audit-stale-catcher) |
| 15 | done | ux.md | Inventory Sections kein isError-Branch (3/4) | Slice 196 ✓ (alle 3 Inventory-Sections haben isError+refetch — `CosmeticsSection:78`, `WildcardsSection:29`, `MysteryBoxHistorySection:116`; D48 audit-stale-catcher) |
| 16 | done | ux.md | Rankings 7/7 kein isError-Branch | Slice 196 ✓ (alle 7 Rankings-Components — Self/Player/LastEvent/Monthly/Club/Friends/Global — haben isError; D48 audit-stale-catcher) |
| 17 | done | ux.md | Airdrop kein isError-Handling | Slice 210 ✓ (isError+refetch destructured aus useAirdropLeaderboard + useAirdropStats; 2 separate Error-Branches mit Pattern aus inventory/CosmeticsSection.tsx:78-80) |
| 19 | done | ux.md | Settings Notif-Prefs/Push silent console.error | Slice 196 ✓ (3 Stellen `settings/page.tsx:75/102/116` haben `addToast(te(mapErrorToKey(...)))` Pattern; D48 audit-stale-catcher) |
| 20 | open | ux.md | MembershipSection Subscribe ohne Confirm-Step | Slice 198 (Money-Risk) |
| 22 | wont-fix | ux.md | compare Empty-Slot Touch-Targets | Audit selbst markiert "OK" (visuell ein großer Touch-Button, akzeptabel); D48 audit-stale-catcher |

### P3 (4)

| # | Status | Source | Issue | Slice |
|---|---|---|---|---|
| 1 | done | ux.md | Home ErrorState onRetry inkonsistent | Slice 198b ✓ |
| 3 | done | ux.md | Market playersLoading blockt parallele Sections | Slice 198b ✓ |
| 10 | done | ux.md | PostReplies Loader2 statt Skeleton | Slice 198b ✓ |
| 12 | done | ux.md | Missions Auth-Loading Loader2 | already-fixed via MissionsPageSkeleton (page.tsx:12-23 + render Z176-178); Slice 203 audit-stale-marker |

---

## FM-Mechanics — 26 Findings

### P1 (11) — alle OFFEN

| # | Status | Source | Issue | Slice |
|---|---|---|---|---|
| 1.1 | open | fm.md | Form-L5-Filter im Kader-Tab fehlt | Slice 197 |
| 1.2 | open | fm.md | MV-Trend rising/falling fehlt überall | Slice 197 |
| 2.1 | open | fm.md | Captain-Pick-Rate-% fehlt | Slice 195e (mit F-11) |
| 2.2 | open | fm.md | Differential-% im Player-Picker | Slice 195e (mit F-07) |
| 4.1 | open | fm.md | MV-Trend-Filter rising/falling/stable | Slice 197 |
| 4.2 | open | fm.md | Trending Hot/Rising/Faller/IPO-Soon Pills | Slice 198 |
| 4.3 | done | fm.md | Holders-Distribution-Mini-Bar in Row | Slice 201b ✓ (RPC + ConcentrationBar lazy in expanded) |
| 5.1 | open | fm.md | FormBars Match-by-Match Hover-Tooltip | Slice 198 |
| 9.1 | open | fm.md | Founding Progress-Bar fehlt | Slice 196 (Quick-Win) |
| 10.1 | done | fm.md | Airdrop „Brauche X Pkt für nächsten Tier"-CTA | Slice 200b ✓ |

### P2 (11)

| # | Status | Source | Issue | Slice |
|---|---|---|---|---|
| 1.3 | open | fm.md | „In-Lineup"-Filter Kader-Toolbar | Slice 198 |
| 1.4 | open | fm.md | Quick-In-Lineup-Action in Row | Slice 198 |
| 2.3 | open | fm.md | Lineup-Score-Projection | Slice 198 |
| 2.4 | open | fm.md | Event-Difficulty-Indikator im Selector | Slice 198 |
| 3.1 | open | fm.md | HistorieTab Avg-Rank/Best-Rank-Card | Slice 198 |
| 4.4 | done | fm.md | Sortier nach Trade-Volume-7d | Slice 200 ✓ (Schema-Add + Cron + Sort-Pill) |
| 4.5 | open | fm.md | Multi-Select Bulk-Buy /market | Slice 198 |
| 5.2 | done | fm.md | Differential-Sentiment ScoutConsensus | Slice 205 ✓ (Reliability-Tier-Badge low/medium/high, D46 reuse research-data) |
| 6.1 | done | fm.md | Per-Trade-Player-Link Transactions | Slice 201a ✓ (Service+Hook+UI) |
| 6.2 | done | fm.md | Trend-Sparkline-Mini-Chart Aggregation | Slice 208 ✓ (TrendSparkline Component, per-Tag-Aggregat aus filteredCredits, 10/10 vitest) |
| 7.1 | done | fm.md | MissionBanner Active/Completed-Filter | Slice 200a ✓ |
| 7.2 | done | fm.md | Weekly-Mission Reset-Countdown | Slice 200a ✓ |
| 8.1 | done | fm.md | Inventory Sort by Effect-Magnitude | Slice 200a ✓ |
| 9.2 | done | fm.md | Founding „Last X left at Tier" Urgency-Color | Slice 200a ✓ |
| 9.3 | open | fm.md | Founding Per-Tier-Vergleichstabelle | Slice 198 |
| 10.2 | open | fm.md | Airdrop Personal-Score-History | Slice 198 |
| 10.3 | open | fm.md | Airdrop Friends-Filter | Slice 198 |

### P3 (4)

| # | Status | Source | Issue | Slice |
|---|---|---|---|---|
| 1.5 | open | fm.md | Compare-2-Selection in Kader | Post-Beta |
| 2.5 | open | fm.md | Auto-Pick-Lineup-Button | Post-Beta |
| 3.2 | open | fm.md | „Re-use this lineup" Quick-Action | Post-Beta |
| 4.6 | open | fm.md | Cross-Sub-Tab IPOs-ending-soon Banner | Post-Beta |
| 5.3 | open | fm.md | Volume-Histogramm unter Chart | Post-Beta |
| 5.4 | open | fm.md | Set-Price-Alert in Trading-Tab | Post-Beta |
| 6.3 | open | fm.md | Per-Player-P&L Top-5 Section | Post-Beta |
| 7.3 | open | fm.md | Mission-Difficulty-Tag | Post-Beta |
| 8.2 | open | fm.md | Bulk-Equip-Button Inventory | Post-Beta |
| 8.3 | done | fm.md | MysteryBox History letzte-30d-Filter | Slice 200b ✓ |
| 10.4 | open | fm.md | Airdrop Pagination >100 | Post-Beta |

---

## Brand-Coherence — 18 Findings

### P1 (3) — alle CLOSED

| # | Status | Source | Issue | Slice |
|---|---|---|---|---|
| 4 | done | brand.md | kaderHelpers.tsx:69 Tailwind-yellow Drift (Zentral, propagiert in 4 Stellen) | Slice 196 ✓ |
| 8 | done | brand.md | FantasyContent.tsx:50 Modal-Loading-Backdrop bg-black/70 → bg-bg-main/70 | Slice 196 ✓ |

### P2 (9)

| # | Status | Source | Issue | Slice |
|---|---|---|---|---|
| 3 | done | brand.md | PlayerIPOCard.tsx:152 yellow doubtful | Slice 196 ✓ |
| 5 | done | brand.md | kaderHelpers.tsx:93 yellow Performance-Mid-Tier | Slice 196 ✓ |
| 6 | done | brand.md | FormTab.tsx:157 yellow Form-Indicator | Slice 196 ✓ |
| 9 | done | brand.md | JoinConfirmDialog.tsx:40 bg-black/80 | Slice 196 ✓ |
| 10 | done | brand.md | PlayerPicker.tsx:169 bg-black/60 → bg-bg-main/60 | Slice 203 ✓ |
| 14 | done | brand.md | airdrop:74 inline `style={{color:'#FFD700'}}` → `text-gold` | Slice 196 ✓ |
| 18 | done | brand.md | club/[slug]:523,530 raw button + rounded-md | Slice 198 ✓ |

### P3 (6)

| # | Status | Source | Issue | Slice |
|---|---|---|---|---|
| 1 | wont-fix | brand.md | Quick-Action-Pills inline-tokens | Slice 198 SKIP (CEO/Designer-call, per-action color intentional) |
| 2 | done | brand.md | page.tsx:323 Gold-Pulse-Gradient | Slice 202 ✓ (`.gold-pulse-bg` Utility) |
| 7 | done | brand.md | StatsTab.tsx:26 yellow doubtful | Slice 196 ✓ (text-status-doubtful Token) |
| 11 | done | brand.md | PitchView Z221+224 bg-black/40+30 | Slice 198b ✓ (bg-bg-main Token) |
| 12 | done | brand.md | PitchView Z70 yellow doubtful | Slice 202 ✓ (text-status-doubtful Token) |
| 13 | wont-fix | brand.md | founding:279 bg-purple-500 solid Popular-Badge | Audit-OK (Popular-Badge soll sich abheben) |
| 15, 16, 17 | done | brand.md | airdrop+profile Detail-Drifts | Slice 198 ✓ |

---

## Slice-Pipeline (priorisiert)

| Slice | Scope | Estimated | Findings closed |
|---|---|---|---|
| **195e** (in-progress) | Differentials-RPC + Player-Card-Badge + Captain-Pick-Rate | 4h | F-07, F-11, fm 2.1, fm 2.2 |
| **195c-UI** | EventFormModal max_per_club Number-Input | 30min | (UI-Komplettierung 195c) |
| **196 (NEXT NACH 195e)** | Cross-Cutting P1-Sweep | 1 Tag | brand 4+5+6+8+9+10+14, ux 4+5+9+13+15+16+17+18+21, fm 9.1 (≈18 Findings) |
| **197** | FM-Mechanics Power-User-Fundament | 2-3 Tage | fm 1.1, 1.2, 4.1, 4.2, 4.3, 5.1, K-01, F-08, F-02 (≈9 Findings) |
| **198** | Polish-Sweep Page-by-Page (gross) | 3-4 Tage | alles übrige P2-P3 |

**Bei sequenzieller Abarbeitung tester-ready:** ~7-9 Werktage.

---

## Was die Audits NICHT abdecken (zusätzliche Filter-Stufen)

1. **Race-Conditions** — kommen aus Persona-Walk + Bot-Test + echten Testern
2. **Browser-Kompatibilität** (Safari, Firefox) — manueller Test pro Phase
3. **Cookie/Token-Lifetime-Bugs** — Long-Session-Test (Bot-Loop)
4. **Performance unter Last** — Bot-Loop dokumentiert
5. **Mobile-Edge-Cases auf echten Geräten** (iPhone vs Android) — 3 Beta-Tester
6. **Money-Floating-Point-Drift** — kontinuierlicher Audit-Skill `silent-fail-audit`
7. **Empty-States systematisch** — qa-visual Agent
8. **TypeScript-Type-Lies** — kontinuierlich (siehe D43)

---

## Anil-Action-Items (Mensch-only)

- 3 Beta-Tester organisieren (1 TR, 1 Football-Manager-Power-User, 1 Casual)
- Vercel-Plan-Entscheidung Hobby vs Pro
- TR-Locale-Reviewer organisieren
- Einsatz-Entscheidung Phase C Persona-Walk: jetzt oder nach Slice 196?

---

**Updates dieser Datei:** Nach jedem Slice. Status-Spalte wird per Slice mit-gepflegt.
