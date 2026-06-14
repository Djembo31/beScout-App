# Active Slice

```
status: idle
slice: 312
stage: LOG complete ✅ DONE
spec: worklog/specs/312-compare-perf-l5-matches-guard.md
impact: skipped (1 File UI-Display; fmtPerfL5-Pattern Slice 271)
proof: worklog/proofs/312-compare-l5-guard.txt
review: worklog/reviews/312-review.md (reviewer-Agent PASS, 2 NITPICKs out-of-scope; Radar-Achse bewusst Scope-Out)
decision: Sweep der P2/P3-Residuen — /compare zeigte L5/L15 roh (Slice-271-Bug übersehen). Fix: fmtPerfL5 + guardByMatches. Andere Residuen verifiziert: Lineup-Set=false-positive (kein persist), Offers-Dual=verschiedene Surfaces (kein Refactor), 24h-Change 2 Pfade konsistent, club-String/League-dual-axis=post-Beta-Migration. fantasy.md /1.5 korrigiert (D77).
spec: worklog/specs/311-gwstatus-single-source.md
impact: skipped (gwStatus-Consumer enumeriert in Spec §4; reine Logik-Unifikation, Output-Typ 'open'|'simulated'|'empty' unverändert)
proof: worklog/proofs/311-gwstatus.txt
review: worklog/reviews/311-review.md (reviewer-Agent PASS, 0 Findings, 1 harmlose Observation SpieltagPulse empty-Branch tot)
decision: EINE computeGwStatus(fixturesComplete, fixtureCount, events) in fantasy/lib/gwStatus.ts ersetzt divergente #2 (useGameweek) + #3 (SpieltagTab). getGameweekStatuses DRY auf isFixtureDone. SpieltagTab→React-Query out-of-scope. → Fantasy-Domäne S7-Phase-2 bis auf P2/P3-Reste durch.
```

## Zuletzt

- **Slice 305** (2026-06-13) — S7 #3 Orphan Community-Valuation Removal (refactor, CONCERNS→in-slice). 
- **Slice 304** (2026-06-13) — S7 #2 DbFeeConfig Type-Schema Alignment (fix, PASS).
- **Slice 303** (2026-06-13) — S7 #1 Floor-Price Source-of-Truth Consolidation (feat, PASS).
- **Slice 302** (2026-06-13) — S7 Source-of-Truth & Wiring Registry (docs/audit).
- **Slice 301** (2026-06-13) — S6 Dead-Artifact-Inventory + wildcards-Bridge-Delete.

**🚨 Slice 284 Wave 2 (284b) weiter blockiert:** API-Football-Key seit 06.05. suspendiert.
**TR-Review offen (Anil):** `market.bulkSellResult`, `rankings.noMarketMovement`, `fantasy.matchLive` (=„Canlı").

Nächstes nach 306: weitere S7-Phase-2-Findings P1 (active_gameweek 2-Spalten-Drift, GW-Status 3×, lineup wildcardSlots:Set-Rehydration) ODER Backlog-Slices (FM-08..11, FANT-11/12/16).
