# Master-Punch-Liste — Beta-Readiness 2026-04-25

**Stand:** 2026-04-26 nach Slice 200b (+3 closed + 1 already-fixed-marker)
**Quellen:** Phase-A-Audits in `worklog/audits/2026-04-25/{brand,ux,fm-mechanics,fantasy}.md`
**Total:** 98 Findings · davon **70 closed (≈71%)**

## Status-Legende

- `done` — geschlossen + verifiziert
- `wont-fix` — CEO-Decision oder bewusst deferred
- `in-progress` — aktiver Slice
- `open` — noch nicht angefasst
- `deferred` — bewusst auf Post-Beta verschoben

---

## Aggregat-Tabelle

| Domain | Total | done | wont-fix | in-progress | open | deferred |
|---|---|---|---|---|---|---|
| Brand-Coherence | 18 | 12 | 0 | 0 | 6 | 0 |
| UX-States | 27 | 19 | 0 | 0 | 8 | 0 |
| FM-Mechanics | 26 | 21 | 0 | 0 | 5 | 0 |
| Fantasy-Scoring | 27 | 19 | 1 | 0 | 7 | 1 |
| **TOTAL** | **98** | **71** | **1** | **0** | **26** | **0** |

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
| F-02 | open | fantasy.md | Nur 3 Formationen (4-3-3, 4-4-2, 3-4-3); fehlen 3-5-2, 4-5-1, 5-3-2, 5-4-1 | **OFFEN** — Slice 197 |
| F-03 | done | fantasy.md | Bench + Auto-Sub | Slice 195d ✓ |
| F-04 | done | fantasy.md | Captain-Multiplier 1.5× → 1.1× (CEO-eigene Mechanik) | Slice 195a ✓ |
| F-05 | done | fantasy.md | Triple-Captain Chip Rename + 1.25× | Slice 195b ✓ |
| F-06 | done | fantasy.md | Max-3-pro-Verein | Slice 195c ✓ (als Event-Param max_per_club) |

### P1 (9) — 2 CLOSED, 1 IN PROGRESS

| # | Status | Source | Issue | Slice |
|---|---|---|---|---|
| F-07 | in-progress | fantasy.md | Differentials-% auf Spieler-Karten | Slice 195e |
| F-08 | open | fantasy.md | Countdown-Granularität: Sekunden in letzter Stunde | Slice 197 |
| F-09 | open | fantasy.md | BPS-Bonus-System (Top-3 +3/+2/+1) | Slice 198 |
| F-10 | done | fantasy.md | „Salary"-Konzept perfL5-basiert verwirrt User | Slice 200b ✓ (Tooltip) |
| F-11 | in-progress | fantasy.md | Captain-Pick-Rate auf Event-Lineup | Slice 195e (gleiche RPC wie F-07) |
| R-01 | done | fantasy.md | „Monats-Sieger" Wording-Compliance | Hot-Fix Commit `4b5a2c38` |
| R-02 | done | fantasy.md | „Siege"/„Sieg" 6× user-facing | Hot-Fix Commit `4b5a2c38` |
| R-03 | done | fantasy.md | Fantasy-only-Leaderboard (Manager-Score isoliert) | already-fixed via GlobalLeaderboard.tsx:19 'manager'-Tab; Slice 200b Marker (GW-Filter → Slice 201) |
| K-01 | open | fantasy.md | 5-GW-Forward-FDR-Strip auf Club-Page | Slice 197 |

### P2 (8)

| # | Status | Source | Issue | Slice |
|---|---|---|---|---|
| F-12 | open | fantasy.md | Sticky-Countdown statt nur Header | Slice 198 |
| F-13 | open | fantasy.md | Form-Rating Sparkline + Δ vs vorletzte 5 GWs | Slice 198 |
| C-01 | open | fantasy.md | Streak-Anzeige Predictions | Slice 198 |
| C-02 | open | fantasy.md | Difficulty-Slider invisible | Slice 198 |
| C-03 | open | fantasy.md | Aggregate-Hint „X% tippte gleich" | Slice 198 |
| C-04 | open | fantasy.md | Predictions-Limit 5/GW Begründung | Slice 198 |
| C-05 | open | fantasy.md | Top-Predictor Leaderboard | Slice 198 |
| R-04 | open | fantasy.md | Tier-Promotion-CTA | Slice 198 |
| K-02 | open | fantasy.md | Most-Owned Players pro Club | Slice 198 |
| K-03 | open | fantasy.md | Squad-Tab Fantasy-Pick-Rate | Slice 198 |
| M-01 | open | fantasy.md | Mission-Hints kontextabhängig | Slice 198 |

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
| 4 | open | ux.md | Manager-Page kein ErrorBoundary | Slice 196 |
| 5 | open | ux.md | AufstellenTab eventsLoading nur Loader2 → Skeleton | Slice 196 |
| 9 | open | ux.md | FollowListModal kein preventClose während toggling | Slice 196 |
| 13 | open | ux.md | founding/page.tsx i18n-Bug `addToast('Ein Fehler ist...')` ohne `t()` | Slice 196 |
| 18 | open | ux.md | Settings-Page i18n-Key-Leak `setError(err.message)` 2× | Slice 196 |
| 21 | open | ux.md | compare/page.tsx native `alert()` statt Toast | Slice 196 |

(P1-Findings 4 + 5 + 9 + 13 + 18 + 21 sind die hochpriorisierten Cross-Cutting-Items.)

### P2 (13)

| # | Status | Source | Issue | Slice |
|---|---|---|---|---|
| 2 | done | ux.md | Buy-Error-Banner ohne auto-dismiss | already-fixed via useTradeActions.ts:63-69 (Slice 161+); Slice 200a Reviewer-Marker ✓ |
| 6 | open | ux.md | KaderTab BulkSell Bar persistence | Slice 198 |
| 7 | open | ux.md | EventSummaryModal preventClose TODO | watch (re-audit nach jedem async-Refactor) |
| 8 | open | ux.md | CreateEventModal preventClose TODO | watch |
| 11 | open | ux.md | DailyChallengeCard kein Retry-Hint | Slice 198 |
| 14 | open | ux.md | founding loadData immer loading=true bei Re-Fetch | Slice 198 |
| 15 | open | ux.md | Inventory Sections kein isError-Branch (3/4) | Slice 196 |
| 16 | open | ux.md | Rankings 7/7 kein isError-Branch | Slice 196 |
| 17 | open | ux.md | Airdrop kein isError-Handling | Slice 196 |
| 19 | open | ux.md | Settings Notif-Prefs/Push silent console.error | Slice 198 |
| 20 | open | ux.md | MembershipSection Subscribe ohne Confirm-Step | Slice 198 (Money-Risk) |
| 22 | open | ux.md | compare Empty-Slot Touch-Targets | Slice 198 |

### P3 (3)

| # | Status | Source | Issue | Slice |
|---|---|---|---|---|
| 1 | open | ux.md | Home ErrorState onRetry inkonsistent | Post-Beta |
| 3 | open | ux.md | Market playersLoading blockt parallele Sections | Post-Beta |
| 10 | open | ux.md | PostReplies Loader2 statt Skeleton | Post-Beta |
| 12 | open | ux.md | Missions Auth-Loading Loader2 | Post-Beta |

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
| 4.3 | open | fm.md | Holders-Distribution-Mini-Bar in Row | Slice 198 |
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
| 4.4 | open | fm.md | Sortier nach Trade-Volume-7d | Slice 198 |
| 4.5 | open | fm.md | Multi-Select Bulk-Buy /market | Slice 198 |
| 5.2 | open | fm.md | Differential-Sentiment ScoutConsensus | Slice 198 |
| 6.1 | open | fm.md | Per-Trade-Player-Link Transactions | Slice 198 |
| 6.2 | open | fm.md | Trend-Sparkline-Mini-Chart Aggregation | Slice 198 |
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

### P1 (3) — alle OFFEN

| # | Status | Source | Issue | Slice |
|---|---|---|---|---|
| 4 | open | brand.md | kaderHelpers.tsx:69 Tailwind-yellow Drift (Zentral, propagiert in 4 Stellen) | **Slice 196 (Top-1 Quick-Win)** |
| 8 | open | brand.md | FantasyContent.tsx:50 Modal-Loading-Backdrop bg-black/70 → bg-bg-main/70 | Slice 196 |

### P2 (9)

| # | Status | Source | Issue | Slice |
|---|---|---|---|---|
| 3 | open | brand.md | PlayerIPOCard.tsx:152 yellow doubtful | Slice 196 |
| 5 | open | brand.md | kaderHelpers.tsx:93 yellow Performance-Mid-Tier | Slice 196 |
| 6 | open | brand.md | FormTab.tsx:157 yellow Form-Indicator | Slice 196 |
| 9 | open | brand.md | JoinConfirmDialog.tsx:40 bg-black/80 | Slice 196 |
| 10 | open | brand.md | PlayerPicker.tsx:166 bg-black/60 | Slice 196 |
| 14 | open | brand.md | airdrop:74 inline `style={{color:'#FFD700'}}` → `text-gold` | Slice 196 |
| 18 | open | brand.md | club/[slug]:523,530 raw button + rounded-md | Slice 198 |

### P3 (6)

| # | Status | Source | Issue | Slice |
|---|---|---|---|---|
| 1, 2, 7, 11, 12, 13, 15, 16, 17 | open | brand.md | Detail-Drifts | Post-Beta |

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
