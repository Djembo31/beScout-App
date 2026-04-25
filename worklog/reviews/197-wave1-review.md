# Slice 197 Wave 1 Review (197a + 197b + 197e)

**Datum:** 2026-04-25
**Reviewer:** reviewer-Agent (Cold-Context Opus)
**Verdict 197a:** PASS
**Verdict 197b:** CONCERNS → PASS (M1 healed inline)
**Verdict 197e:** PASS
**Time-Spent:** 35 min

## Summary

Wave 1 ist insgesamt sauber: 197a liefert produktionsreifen generischen Helper mit 12-Test-Coverage, propagiert Form-L5-Pattern auf 3 Pages mit Required-Props (Anti-Silent-Fallback). 197e ist textbook-additive Service-Erweiterung mit symmetrischen i18n-Keys, statischen Tailwind-Maps. 197b CONCERNS wegen Helper-Import-Drift + 1s-Tick-Render (M1 inline gehealt; m1 als Wave-2-Backlog).

## Findings

### CRITICAL — keine

### MAJOR (alle inline gehealt)

| # | Slice | Location | Issue | Status |
|---|-------|----------|-------|--------|
| M1 | 197b | EventDetailHeader.tsx Z12 + 3 weitere | Helper-Import inkonsistent: 4 Files via `@/components/fantasy/helpers` (Re-Export-Bridge), 2 Files canonical `@/features/fantasy/helpers`. | **HEALED inline** — alle 4 Files (EventDetailHeader, BenchRow, PitchView, ScoreBreakdown) auf canonical Pfad migriert. |

### MINOR (Backlog)

| # | Slice | Issue | Action |
|---|-------|-------|--------|
| m1 | 197b | 1s-Tick re-rendert ganzen EventDetailHeader-Subtree (3600 Vollrenders/h). Slice 197b-Optimization: CountdownLabel als React.memo'd Sub-Component | Wave-2 oder Healer-Slice nach Beta-Tester-PostHog-Daten |
| m2 | 197b | Adaptive-cadence Closure-Pattern OK, akzeptabel as-is | — |
| m3 | 197b | Toter `timeoutId`-Code in useCountdownTick | Trivial, mit nächstem Touch der Datei |
| m4 | 197a | WatchlistView Pill-Group außerhalb Filter-Toggle (KaderToolbar inside) — beide funktional | Akzeptabel, Watchlist <30 Items |
| m5 | 197e | FDR-Heuristik inline-dupliziert statt `getFDR()` aus FDRBadge | Wave-2 Konsolidierung |
| m6 | 197e | FDRBadge nutzt 'medium', ClubFixturesStrip nutzt 'med' — Type-Drift potenziell | Wave-2: einigen auf 'medium' |
| m7 | 197e | Template-Literal in `.or(home_club_id.eq.${clubId},...)` — clubId aus DB-Lookup, kein User-Input | Akzeptabel, Slice 148-Pattern |

## Cross-File-Sanity

**197a value-extractor pattern:** Bewusste Spec-Verbesserung (Type-Magic vermieden, 3 Item-Shapes ohne Adapter). ✓

**197b backward-compat:** `formatCountdown` Signature unchanged. 4 andere Caller bekommen Sekunden-Output bei Frozen-State automatisch. ✓

**197e additive vs extension:** `getNextFixturesForClub` neben existing `getNextFixturesByClub` — keine Drift, klare Cardinality-Trennung (Map vs Array). ✓

**Type-Truth (D40-D43):** Keine RPC/DB-Änderung in Wave 1. ✓

**Aufrufpfad-Audit:**
- 197a: formL5Filter → 3 importers verifiziert ✓
- 197e: getNextFixturesForClub → useClubNextFixtures → ClubFixturesStrip → ClubContent — single-consumer-chain ✓

## Performance-Audit

**197b Tick-Cadence:** 1s-Tick in letzter Stunde re-rendert ganzen Subtree. Pragmatisch akzeptabel (Modal-only, max 1h Mount-Zeit). m1-Backlog für Beta-PostHog-Validation.

**197e Query-StaleTime:** 5min angemessen, `enabled: !!clubId` gateet, parallel zu prefetched usePlayers. ✓

**197a:** Pure-Function-Helper, kein Roundtrip, useMemo-eingehängt. ✓

## Knowledge-Flywheel — Promote-Worthy

1. **197a — Generic Filter-Helper mit Value-Extractor** (statt `T extends {...}` Type-Constraint) → patterns.md
2. **197e — Additive Service-Function vs Extension** (Cardinality-Diff: Map vs Array) → Learning-Draft promote-worthy
3. **197b — Backward-compat über Output-Erweiterung statt Signature-Change** → patterns.md PROCESS
4. **197b — Adaptive-Cadence-Hook** (60s>1h, 1s<1h) → patterns.md, generalisierbar auf Order-Expiry, Auction-End

## Phase-A-Coverage

- ✓ **fm 1.1 Form-L5-Filter universal** auf /market + /manager + /watchlist
- ✓ **F-08 Countdown-Sekunden** in letzter Stunde via adaptive-cadence Hook
- ✓ **K-01 ClubFixturesStrip** 5-Pill mit Easy/Med/Hard FDR

## Empfehlung

**Wave-1 ready to commit.** Wave-2 (197c + 197d) darf parallel starten — keine Konflikt-Risiken (3 Sub-Slices in disjoint File-Sets bis auf additive `messages/de.json + tr.json` Keys).

Healer-Pflicht: nicht zwingend (M1 inline gehealt). m1 (Render-Optimization) auf Backlog.

Knowledge-Flywheel: 4 Patterns promote-worthy, im nächsten DISTILL.
