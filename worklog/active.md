# Active Slice

```
status: idle
slice: 308 ✅ DONE
stage: LOG complete
spec: worklog/specs/308-ipo-price-strict.md
impact: skipped (1-Zeilen-Mapper-Fix in dbToPlayer; alle prices.ipoPrice-Consumer bereits null/0-guarded — verifiziert)
proof: worklog/proofs/308-ipo-price-strict.txt
review: worklog/reviews/308-review.md (reviewer-Agent PASS, 1 INFO benign enriched.ts dead-branch + 1 NITPICK stale Test-Name in-slice gefixt)
decision: S7 Phase-2 Trading-#4 — IPO-Preis strikt aus ipo_price (kein floor-Fallback). QUEUE (Anil-Batch): Player-#3-A (Pill aus Bars, Anil-confirmed Option A), Fantasy-#1 (active_gameweek drift, preventiv — live-drift aktuell 0), Fantasy-#5 (GW-Status 3×).
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
