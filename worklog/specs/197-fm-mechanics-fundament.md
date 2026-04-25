# Slice 197 — FM-Mechanics-Fundament

**Datum:** 2026-04-25 (Spec)
**Groesse:** L (cross-domain, Schema-Migration + Cron + 6+ Components)
**CEO-Approval:** Pending — kein Money-Path, aber DB-Migration + Cron noetig (CTO-scope, post-Spec-Anil-Sichtung empfohlen)
**Trigger:** Phase-A Audit FM-Mechanics 6 P1-Findings, alle Cross-Cutting

## Ziel

FM/Comunio-Power-User-Standard erreichen. Hebt Power-User-Score von 7.6 auf ~9.0 laut FM-Audit Top-3-Empfehlung.

## Sub-Slices (priorisiert)

### 197a — Form-L5-Filter universalisieren (4h, S)

**Findings:** fm 1.1
**Hebel:** Bestehender Filter aus `/market` MarketFilters wird auf 3 weitere Pages propagiert.

#### Files
- `src/features/market/components/MarketFilters.tsx` — `applyFormL5Filter` Logic in Hook extrahieren (`useFormL5Filter`).
- `src/lib/queries/marketStore.ts` (oder neuer `formFilterStore.ts`) — Filter-State universal.
- `src/features/manager/components/kader/KaderToolbar.tsx` — Filter-Pill-Group ergänzen (0/45+/55+/65+).
- `src/features/manager/components/kader/KaderTab.tsx` — Filter anwenden auf Holdings-Liste.
- `src/components/watchlist/WatchlistView.tsx` — Filter analog auf Watchlist-Items.

### 197b — Captain-Countdown-Sekunden (1h, XS)

**Findings:** F-08
**Hebel:** Last-Minute-Engagement-Treiber.

#### Files
- `src/features/fantasy/lib/helpers.ts:65-74` — `formatCountdown(diff)` erweitern: wenn `diff < 3600000`, returnt `${mins}m ${seconds}s`. Auto-Re-Render via `useInterval(1000)` wenn diff <1h.
- `src/features/fantasy/components/event-detail/EventDetailHeader.tsx` — Sekunden anzeigen.
- `src/features/fantasy/components/EventDetailModal.tsx` — countdown-Polling 60s → 1s switchen wenn diff <1h.

### 197c — Formationen 3-5-2 / 4-5-1 / 5-3-2 / 5-4-1 (3h, S)

**Findings:** F-02
**Hebel:** Top-Manager-Power-Feature, FPL-Standard.

#### Files
- `src/features/fantasy/constants.ts:7-32` `FORMATIONS_11ER` — 4 neue Einträge.
- `supabase/migrations/...` — `lineups.formation` CHECK-Constraint (falls existing) erweitern. Pruefen ob `rpc_save_lineup` formation-Liste hardcoded hat (Slice 195c+d Body-Pruefung). **JA, Body von rpc_save_lineup hat `'1-4-3-3','1-4-4-2','1-3-4-3','1-2-2-2','1-3-2-1','1-2-3-1','1-3-1-2','1-1-3-2'` — diese Liste muss erweitert werden.**
- `src/features/fantasy/components/lineup/FormationSelector.tsx` — Dropdown mit neuen Optionen.
- `src/features/fantasy/lib/helpers.ts` — `getFormationSlots('1-3-5-2')` Slot-Layout-Computer pruefen, falls neue Formation-Strings nicht 1-X-Y-Z-Pattern matchen.

**WICHTIG:** Migration der `rpc_save_lineup` ist **doppelt-Source-of-Truth-getroffen** — Body in `20260425170000_slice_195d_bench_autosub.sql` (= Live-Body). Patch-Audit-Pflicht (siehe `errors-db.md`). Body komplett uebernehmen + nur formation-Liste erweitern.

### 197d — MV-Trend systemisch (1.5 Tage, M, Money-adjacent)

**Findings:** fm 1.2 + fm 4.1
**Hebel:** Comunio-Standard seit 2003. Trade-Reflex-Action #1.

#### DB-Migration
- `supabase/migrations/...` — `players.mv_trend_7d ENUM('rising','stable','falling')` + Cron-Update aus TM-scrape-history.
- Trigger oder Cron: nach jedem TM-Scrape Snapshot, vergleiche aktuellen MV mit MV vor 7 Tagen, setze `mv_trend_7d`.

#### Cron
- `src/app/api/cron/calculate-mv-trends/route.ts` — neu. Daily run: für jeden Player JOIN tm_scrapes 7d-old vs current MV.

#### Frontend
- `src/components/player/PerfPills.tsx` — neuer MV-Pfeil neben Form-Pfeil. ↑ rising (text-emerald-400), ↓ falling (text-rose-400), → stable (text-white/40).
- `src/features/market/components/MarketFilters.tsx` — Filter "MV-Trend: rising/falling/all".
- `src/features/manager/components/kader/KaderToolbar.tsx` — gleicher Filter.
- `src/features/manager/components/kader/KaderPlayerRow.tsx` — MV-Trend-Pfeil rendern.

**CTO-Note:** Money-adjacent weil Trader-Decision-Driver — aber kein Money-Path. Trend ist Display-Helper, kein Pricing-Trigger. Daher CTO-Decision ohne CEO-Pause.

### 197e — 5-GW-Forward-FDR-Strip auf Club-Page (4h, S)

**Findings:** K-01
**Hebel:** Wildcard/Free-Hit-Decision-Helper, FPL-Standard.

#### Backend
- `src/lib/services/clubs.ts` — `getNextFixturesByClub(clubId, n=5)` erweitern (existing returnt `n=1`, expand auf `n=5`).

#### Frontend
- `src/components/club/sections/ClubSquadSection.tsx` (oder neuer `ClubFixturesStrip.tsx`) — 5 Color-Coded Fixture-Pills (Grün=Easy, Gelb=Med, Rot=Hard via `getClubAvgL5(opponentShort, allPlayers)` Heuristik).
- `src/app/(app)/club/[slug]/ClubContent.tsx` — Strip prominent oberhalb Squad-Tab.

## Acceptance Criteria

1. **197a:** Form-L5-Filter Pills auf /market + /manager + /watchlist sichtbar, gleicher Filter-State.
2. **197b:** Countdown unter 1h zeigt Sekunden, Re-Render alle 1s.
3. **197c:** FormationSelector zeigt 12 Formationen (8 alte + 4 neue), `rpc_save_lineup` akzeptiert alle 4 neuen.
4. **197d:** `players.mv_trend_7d` befuellt fuer >80% der Players, MV-Pfeil sichtbar in PerfPills, Filter funktional.
5. **197e:** Club-Page zeigt 5 Fixture-Pills color-coded, klickbar zum Player-Detail.

## Edge Cases

1. **197a:** Filter-Aktivität persistent zwischen Page-Switches? Oder per-Page-State? **Decision:** per-Page-State (Power-User-Erwartung — Kader-Filter ≠ Market-Filter).
2. **197b:** `useInterval(1000)` re-renders Modal — Performance-Impact bei `useFantasyHoldings` Component-Tree? Mitigation: Sekunden-State separat, isoliert von Heavy-Renders.
3. **197c:** Existing Lineups mit alten Formations bleiben kompatibel (CHECK-Constraint nur bei neuen INSERTs).
4. **197d:** Player ohne 7d-old MV-Snapshot → `mv_trend_7d = NULL`. UI fallback `→` stable.
5. **197d:** Cron-Run dauert lange bei 4000+ Players. Batch via `.range()` Pattern (Slice 078 Pflicht).
6. **197e:** Clubs ohne kommende Fixtures (Saisonende, Pause) → 0-5 Pills, kein Crash.

## Proof Plan

| AC | Proof-Type |
|---|---|
| 1 | Visual: Filter-Pills auf 3 Pages sichtbar, klickbar, anwenden |
| 2 | Visual: countdown zeigt "23m 15s" bei <1h, ticking |
| 3 | DB Query: `SELECT formation FROM lineups WHERE formation IN ('1-3-5-2','1-4-5-1','1-5-3-2','1-5-4-1')` returnt rows |
| 4 | DB Query + Visual: Pfeil im PerfPills sichtbar |
| 5 | Visual: 5 Pills auf Club-Page |

## Scope Out

- Trade-Volume-7d Sortier (fm 4.4) — Slice 198
- Trending Hot/Rising/Faller-Pills (fm 4.2) — Slice 198
- Holders-Distribution-Mini-Bar (fm 4.3) — Slice 198 (Money-adjacent)
- BPS-Bonus-System (F-09) — Slice 198 (komplexer DB-Refactor)

## Stage-Chain

```
SPEC (this file) → IMPACT (cross-cutting, 6+ Files, 1 Migration, 1 Cron) →
BUILD (parallel-dispatch backend + 2× frontend + test-writer) →
REVIEW (reviewer-Agent) → PROVE → LOG
```

## CTO-Notes

- 197a + 197b + 197c + 197e sind UI-only, kein Money-Path. CTO-scope.
- 197d hat DB-Migration + Cron — formal CTO-scope weil keine Money-Mutation, aber Anil sollte Spec sehen vor Apply.
- Sub-Slices koennen unabhaengig gebaut werden. Bei Time-Constraint: 197a + 197b + 197e zuerst (alle UI-only, schnell), dann 197d (komplex), dann 197c (Migration-Patch).
