# Active Slice

```
status: idle
slice: 309
stage: LOG complete ✅ DONE
spec: worklog/specs/309-kader-l5-pill-from-bars.md
impact: skipped (1 File-Logik, kein Service/RPC/DB; reines Display-Derive aus bereits-vorhandenem scores-Prop)
proof: worklog/proofs/309-kader-l5-derived.txt
review: worklog/reviews/309-review.md (reviewer-Agent PASS, 1 INFO Doc-Präzisierung in-slice gefixt, 2 NITPICKS kein Change)
decision: derivedL5 = LEAST(100, ROUND(avg(non-null bars))) spiegelt cron_recalc_perf-Skala (KEIN /1.5 — fantasy.md-Doc stale, live-SQL-verifiziert D77). Beide L5-Displays (Circle + PerfPills) auf derivedL5. Sort bleibt perf.l5 (Anil tighter-scope, dokumentiert). QUEUE-Reste: Fantasy-#1 (active_gameweek drift, preventiv), Fantasy-#5 (GW-Status 3×).
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
