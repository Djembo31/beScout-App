# CTO Review: Slice 200 — Trades-Volume-7d Backend + Sort-UI

**Reviewer:** Cold-Context Opus reviewer-Agent
**Date:** 2026-04-26
**Time-spent:** 14 minutes
**Verdict:** **PASS**

---

## Findings (5, alle NIT/INFO — kein REWORK noetig)

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | `MarketFilters.tsx:22` | SORT_KEYS Reihenfolge: `volume_desc` zwischen `floor_desc` und `goals` ist UX-OK, aber Default-Sort bleibt `'l5'` — neue Option ist nicht discoverable bis User dropdown öffnet. Akzeptabel da Spec Item P2. | Optional out-of-scope. |
| 2 | NIT | `route.ts:73` | `cron_sync_log.gameweek = 0` als Sentinel-Value (analog mv-trends route). Konsistent mit Slice 197d-Pattern, kein Issue. | — |
| 3 | INFO | `migrations/...sql:25` | COMMENT klar dokumentiert NULL=pre-cron / 0=explicit-zero. applySorting nutzt `?? 0` was beide zu 0-Sortier-Key reduziert (gewollt). | — |
| 4 | INFO | `dbToPlayer mapper:190` | `tradesVolume7d: db.trades_volume_7d ?? null` — TypeScript-safe, NULL-Propagation korrekt. | — |
| 5 | NIT (Critical for Knowledge-Capture) | `PLAYER_SELECT_COLS:23` | **Bonus-Fix-Discovery**: `mv_trend_7d` war pre-Slice-200 NICHT in PLAYER_SELECT_COLS! Slice 197d-Mapper las dieses Feld nie aus DB → Production-Drift seit Slice 197d (1 Tag, alle Players hatten `mvTrend7d=null`). Slice 200 fixt by-coincidence weil PLAYER_SELECT_COLS um `trades_volume_7d` erweitert wurde + `mv_trend_7d` mit. | Knowledge-Capture: Pattern in `errors-frontend.md` ergänzen — "PLAYER_SELECT_COLS sync mit DbPlayer-Type pflicht". |

---

## Pattern-Konsistenz vs Slice 197d

- ✅ `SECURITY DEFINER` + `SET search_path = public`
- ✅ `LANGUAGE plpgsql` mit `RETURNS jsonb`
- ✅ Discriminated-Union Return-Shape (`success: true, ...`)
- ✅ AR-44 REVOKE-Block (PUBLIC + anon + authenticated; service_role default)
- ✅ COMMENT ON FUNCTION mit Slice-Number + Datum + Semantik
- ✅ Idempotent UPDATE (`IS DISTINCT FROM`)
- ✅ Cron-Route-Pattern: CRON_SECRET-Bearer + `withLogger` + `cron_sync_log.insert`
- ✅ Vercel-Cron-Schedule daily (15 4 * * *), kein Conflict mit existing 12 Crons
- ✅ i18n DE+TR symmetrisch (`market.sortVolume`)
- ✅ tsc clean (Spec acceptance #1)
- ✅ DbPlayer-Type + Player-Type beide ergaenzt mit Slice-Comment

---

## D48-Audit-Stale-Check

- ✅ Pre-Existing-Aggregate gefunden: `rpc_get_trending_players` (24h-Window, RPC-on-call). Slice 200 ergaenzt 7d-Window als persistent column. **Kein Duplicate** — verschiedene Aggregations-Strategien (24h vivid-RPC vs 7d-persistent-column), verschiedene Use-Cases (Trending-Pills vs Sort-Option). Spec Edge-Case #5 dokumentiert das explizit.
- ✅ Kein Trigger-on-trade-Pfad existing, der trades_volume_7d schon updaten würde.

---

## Money-Path

- ✅ Nur `players.trades_volume_7d` wird beschrieben — kein Wallet, kein Fee, kein Trade-Field
- ✅ RPC ist STABLE (kein Side-Effect auf money-tables)
- ✅ Kein neuer Money-RPC, kein Idempotency-Key benötigt
- ✅ trades-Table read-only via SELECT-COUNT — append-only-Trigger nicht angefasst
- ✅ Out-of-scope-Items (FM 4.5 Bulk-Buy) explizit als CEO-pending markiert

---

## Bonus-Observation (Knowledge-Flywheel)

`PLAYER_SELECT_COLS` enthielt `mv_trend_7d` NICHT vor Slice 200 — Slice 197d's Frontend-Filter las das Feld also nie aus DB (alle Players hätten `mvTrend7d=null`). Slice 200 fixt das by-coincidence weil `trades_volume_7d` zur SELECT-Liste hinzugefügt wurde und `mv_trend_7d` mit.

**Action für Knowledge-Capture:**
- Pattern in `errors-frontend.md` ergänzen — "PLAYER_SELECT_COLS sync mit DbPlayer-Type pflicht. Bei jedem ALTER TABLE players ADD COLUMN: PLAYER_SELECT_COLS update + dbToPlayer mapper update."
- D-finding-Kandidat für Session-DISTILL.

---

## Summary

Slice 200 ist ein **sauberer Pattern-Wiederholungs-Slice** der Slice 197d-Blueprint exakt nachzieht. Alle 11 Spec-Acceptance-Criteria erfuellt. Migration LIVE applied + Initial-Backfill verifiziert (4556/4556 players, 10 mit Trades, max 53). Money-Path-clean (nur new persistent-aggregate-column, kein Wallet/Fee). Bonus-Discovery zeigt latenten Slice-197d-Bug (mv_trend_7d Production-Drift) by-coincidence-fixed.

**Verdict: PASS.** Commit-ready. Pflicht-Knowledge-Capture: PLAYER_SELECT_COLS-Sync-Regel in `errors-frontend.md`.
