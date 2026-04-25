# Review — Slice 200a Wave 3 Polish-Sweep

**Date:** 2026-04-26
**Reviewer:** Cold-Context-Reviewer-Agent (Opus, read-only)
**Scope:** Spec `worklog/specs/200a-wave3-polish-sweep.md` + git diff (4 source files + 2 i18n)

## Verdict: PASS (post-Heal)

Initial-Verdict: REWORK (1 CRITICAL Finding).
Heal-Action: UX-2 Duplicate-useEffect entfernt aus `MarketContent.tsx:82-92`. Spec-Acceptance via pre-existing Hook erfüllt.

## Spec-Coverage

- [x] **UX-2** Buy-Error-Banner auto-dismiss — already-fixed in `useTradeActions.ts:63-69` (pre-Slice-200a). Punch-List "as fixed via existing".
- [x] **FM-7.1** MissionBanner Filter Toggle — sauber, Empty-State funktioniert.
- [x] **FM-7.2** Weekly-Reset-Countdown — sauber, Edge-Case "1h 5m" verifiziert OK.
- [x] **FM-8.1** Equipment Sort effect-magnitude — sauber, Tie-Breaker korrekt, ranks-leer-Fallback.
- [x] **FM-9.2** Founding TierCard urgency-color — sauber, `cn`-conditional, Mobile-Layout-Shift unbedenklich.
- [x] tsc clean post-Heal.
- [x] 5 i18n-Keys vollständig DE+TR (`filterAll/Active/Completed/noMissionsForFilter` + `equipmentSortEffectDesc`).

## Findings

| # | Severity | File:Line | Issue | Resolution |
|---|----------|-----------|-------|------------|
| 1 | CRITICAL | `MarketContent.tsx:82-92` | Duplicate auto-dismiss useEffect — pre-existing in `useTradeActions.ts:63-69` macht exakt das gleiche. Audit-Stale: Punch-List behauptete UX-2 sei offen, war aber 12 Zeilen tiefer im consumed Hook bereits implementiert. | **HEALED** — Duplicate gelöscht, tsc clean |
| 2 | LOW | `MissionBanner.tsx:36-44` | `getTimeUntilEnd` ohne setInterval-Update. Etablished-Pattern-Konsistent (gleicher Bug in `getTimeUntilMidnight`), kein Regression. | Backlog (kein Heal in 200a) |
| 3 | LOW | `MissionBanner.tsx:49-53` | `MissionStatus = 'expired'` Fall nicht abgedeckt — Spec-konform per definition (`completed = (completed, claimed)`). | Doku-only, kein Bug |
| 4 | INFO | `MissionBanner.tsx:286-292` | Header-Countdown nutzt nur `weeklyMissions[0]?.period_end`. Real-World identisches `period_end` für alle weekly missions. | Keine Aktion |
| 5 | INFO | `MissionBanner.tsx:323` | `min-h-[32px]` statt 44px — etablierte Sub-Control-Convention. | Keine Aktion |
| 6 | INFO | `EquipmentSection.tsx:127-134` | `effect_desc` Fallback-Verhalten (multiplierByRank leer) → identisch zu `rank_desc`. Spec-konform und behavior-defined. | Keine Aktion |

## Positive

- **i18n-Coverage 100%** — alle 5 neuen Keys in beiden Locales (verifiziert per grep). FM-7.1 + FM-8.1 hätten leicht ein "Hardcoded-DE-Anti-Pattern" werden können, wurden sauber via `tm()` integriert.
- **`cn`-conditional bei FM-9.2** statt inline-style (spec-konform, vermeidet `border-[${var}]`-Anti-Pattern).
- **`multiplierByRank` Fallback bei leerer ranks-Tabelle** — saubere Defensive-Programming.
- **`filteredEmpty`-Branch** zeigt korrekten Empty-State NUR wenn Filter ungleich `'all'` (vermeidet Doppelt-Empty mit existing `missions.length === 0`-branch).
- **Pre-existing MissionBanner-Tests bleiben grün** (2/2 — Mocks expanded sauber).

## Knowledge-Capture (für errors-frontend.md + patterns.md)

### Pattern: Polish-Audit Pre-Existing-Code-Drift (Slice 200a)

**Anti-Pattern:** Punch-List-Item klassifiziert "X fehlt", aber Code 12 Zeilen tiefer im consumed Hook löst es bereits. Gefahr: Duplicate-useEffect in production, beide Timer feuern parallel, Cleanup-Order undefiniert.

**Detection-Pflicht VOR Audit-"fehlt"-Klassifikation:**
```bash
# Vor Polish-Implementation: grep über alle Hooks/Services die das betroffene Component konsumiert
grep -rn "<spec-pattern>" src/features/<domain>/hooks/ src/features/<domain>/services/
```

**Real Audit-Stale (Slice 200a):**
- Audit `worklog/audits/2026-04-25/ux.md` UX-#2: "Buy-Error-Banner auto-dismiss fehlt"
- Realität: `src/features/market/hooks/useTradeActions.ts:63-69` setTimeout 5s + clearTimeout cleanup seit Slice 161+
- Erkennung erst durch Reviewer-Agent post-BUILD

**Prevention:** Bei Polish-Sweeps ab Slice 198+ Audit-Items vor Implementation per `grep` über consumed-hook-source verifizieren — ähnlich wie bei Cross-Domain-Slices D46 für Service-Duplicates gilt.

## Time-spent

~22 min (Spec-Read + 4 File-Reads + i18n-Verify + business.md-Compliance-Check + Edge-Case-Trace + Pre-Existing-Code-Find).

## Summary

4/5 Items sauber Ferrari-Quality umgesetzt mit Defensive-Programming und vollständiger i18n. UX-2 war Audit-Stale (already-fixed) — Heal entfernt Duplicate. Punch-Liste sollte UX-2 als "already-fixed (Slice 161 useTradeActions.ts)" markieren, nicht als "newly-fixed in 200a".

**Effective closed in 200a:** 4 Items (FM-7.1 + FM-7.2 + FM-8.1 + FM-9.2).
**Already-fixed-marker:** UX-2 (existing pre-200a code).
