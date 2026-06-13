# Active Slice

```
status: idle
slice: 307 ✅ DONE
stage: LOG complete
spec: worklog/specs/307-last5-scores-unification.md
impact: skipped (kein Schema/RPC-Change; Consumer-Migration auf bereits-existierenden Kanon-Hook useRecentScores; gelöschter Code hat 0 Tests)
proof: worklog/proofs/307-last5-unification.txt
review: worklog/reviews/307-review.md (reviewer-Agent PASS, 1 NIT DRY-Helper deferred + 1 INFO enabled-loss accepted)
decision: S7 Phase-2 #4/#6 last-5-Scores auf Kanon-RPC vereinheitlicht (getBatchFormScores gelöscht, 3 Picker-Consumer → useRecentScores). Floor (#1/Trading#1/#3/#5) bereits durch 303 Teil C, Value (#2) durch 305, FeeConfig durch 304 — Registry-Tabellen aktualisiert.
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
