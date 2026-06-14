# Active Slice

```
status: idle
slice: 310
stage: LOG complete ✅ DONE
spec: worklog/specs/310-active-gameweek-single-truth.md
impact: skipped (Consumer in Spec §4 grep-verifiziert; set_active_gameweek einzige Write-RPC, scoring.admin erbt, Read-Consumer enumeriert)
proof: worklog/proofs/310-active-gameweek.txt
review: worklog/reviews/310-review.md (reviewer-Agent PASS, 2 NIT [1 in-slice gefixt] + 1 pre-existing Cron-Observation den der Drift-Guard fängt)
decision: Anil — (1) set_active_gameweek LIGA-WEIT (alle Clubs der Liga + leagues-Zeile atomar, hält clubs===leagues; leagues=einzige Lese-Wahrheit), (2) Drift-Guard = Skript scripts/audit/gameweek-drift.js wired in nightly (kein DB-Trigger). QUEUE-Rest: Fantasy-#5 (GW-Status 3×).
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
