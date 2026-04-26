# Slice 200 — Trades-Volume-7d Backend + Sort-UI

**Type:** M | **Owner:** CTO (volle Autonomie 2026-04-26) | **CEO-Scope:** Borderline (Schema-Add auf existing Table, kein Fee-Change, kein neuer Money-Path) | **Estimated:** 2h

## Ziel

FM-4.4 Audit-Finding: "Sortier nach Trade-Volume-7d" auf `/market`. Power-User wollen Trade-Reflex-Action wie auf Comunio (sortieren nach aktivsten Spielern).

## Architektur (Pattern Slice 197d MV-Trend-Blueprint)

1. **Schema:** `ALTER TABLE players ADD COLUMN trades_volume_7d BIGINT NULL`
2. **RPC:** `cron_calculate_trade_volume_7d()` SECURITY DEFINER STABLE — aggregiert COUNT(*) FROM trades GROUP BY player_id WHERE executed_at > NOW() - 7d
3. **Cron:** Daily 4:00 UTC via vercel.json → `/api/cron/calculate-trade-volume-7d`
4. **Frontend:** Sort-Option `volume_desc` in MarketFilters + `applySorting`

**Aggregations-Strategie-Wahl: Cron** (analog Slice 197d). Begründung:
- 7d-Window aendert sich nicht minutengenau (Trade-Volumen ist progressiv, daily-refresh reicht)
- Hobby-Vercel-Plan-kompatibel (12 Crons existing, 13. Daily ist OK)
- Trigger-on-trade-INSERT waere zu Schreib-Overhead (jeder Trade trigger-recompute fuer einen player → write-amplification)
- Materialized View braucht REFRESH-Cron sowieso → kein Vorteil

## Items (1)

- **FM 4.4 (P2)** Sortier nach Trade-Volume-7d in MarketFilters

## Dependencies

- `players` table (existing)
- `trades` table (existing — `player_id`, `executed_at`)
- `vercel.json` (12 Crons, +1 = 13)
- `MarketFilters.tsx` (SORT_KEYS array, applySorting switch)
- `marketStore.ts` (SortOption type)
- `Player` type (`tradesVolume7d?: number | null`)
- `dbToPlayer` mapper (db.trades_volume_7d → tradesVolume7d)

## Acceptance Criteria

1. tsc clean
2. Migration applied LIVE via mcp__supabase__apply_migration
3. RPC `cron_calculate_trade_volume_7d` existiert mit AR-44 REVOKE/GRANT
4. Initial backfill liefert Werte (`SELECT COUNT(*) WHERE trades_volume_7d IS NOT NULL > 0`)
5. New SortOption `volume_desc` selectable in MarketFilters dropdown
6. applySorting case `volume_desc` sortiert DESC nach `tradesVolume7d ?? 0`
7. Vercel.json hat 13. Cron-Eintrag (daily 4:00 UTC)
8. New Cron-Route `/api/cron/calculate-trade-volume-7d` rendert + ruft RPC auf
9. DE+TR i18n key `sortVolume` ergaenzt
10. Reviewer-Verdict != FAIL

## Edge Cases

1. Player mit 0 Trades: `trades_volume_7d = 0` (NICHT NULL — explicit zero ist mehr-info)
2. Player mit NULL `tradesVolume7d` (vor Initial-Cron): Sort behandelt als 0
3. Cron-Race: gleichzeitiger Manual-Run + Cron — RPC ist idempotent (UPDATE überschreibt mit gleichem Ergebnis)
4. Backward-Compat: existing players ohne Spalte → ALTER ist additive, NULL-default OK
5. Audit-Stale-Check (D48): Existing `rpc_get_trending_players` aggregiert 24h Trade-Volume per RPC-Call. Slice 200 ergänzt 7d-Window als persistent column. Kein Duplicate.

## Proof-Plan

- `worklog/proofs/200-tsc-mig-cron.txt` — tsc clean + DB-Verify (`SELECT COUNT(*) FROM players WHERE trades_volume_7d IS NOT NULL`) + Cron-Route-Build + i18n keys verifiziert

## Scope-Out

- Trending Hot/Rising/Faller Pills (FM 4.2 — eigene Slice)
- Holders-Distribution-Mini-Bar (FM 4.3 — Slice 201)
- Multi-Select Bulk-Buy (FM 4.5 — Money-Path, CEO-pending)
- Volume-Histogramm Aggregation (FM 6.2 — Backend-Slice eigene)

## Knowledge-Capture-Kandidaten

- Bestätigung Pattern: 197d Blueprint reusable für persistent-aggregate columns mit daily-cron-refresh.
