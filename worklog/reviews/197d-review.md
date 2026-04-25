# Slice 197d Review — MV-Trend systemisch

**Datum:** 2026-04-25
**Reviewer:** reviewer-Agent (Cold-Context Opus)
**Verdict 197d Backend:** PASS
**Verdict 197d Frontend:** CONCERNS → PASS (M1 healed inline by CTO)
**Time-Spent:** 22 min

## Summary

Solide Wave-2 Implementation: Backend-Track ist clean (RLS-cron-only Pattern korrekt, AR-44 REVOKE-Block, Discriminated-Union, ON CONFLICT idempotent, History-Cleanup). Frontend-Track hatte 3 MINOR-Findings rund um Cross-Track-Bridge-Casts — proaktiv gehealt vor Reviewer-Output. Type-Truth-Audit (D43) alignt sauber über alle 6 Layer. 2 Learning-Drafts promote-worthy.

## Findings

### CRITICAL — keine
### MAJOR — keine

### MINOR (alle gehealt oder Backlog)

| # | Slice | Issue | Status |
|---|---|---|---|
| M1 | Frontend | Augment-Type `PlayerWithMvTrend` in 3 Files redundant nach CTO-Fix | **HEALED inline** — alle 3 Augment-Types entfernt, `(p as PlayerWithMvTrend).mvTrend7d` → `p.mvTrend7d` |
| M2 | Tests | MarketFilters.test.ts pre-existing Supabase-env-mock-Issue | Backlog (nicht durch Slice verursacht; Helper-Coverage durch mvTrendFilter.test.ts 11/11) |
| M3 | UI | `'all'`-Pfad in iconColor-Branch unerreichbar (KaderToolbar+MarketFilters) | Trivial Code-Hygiene, defensive bleibt |

## Type-Truth Audit (D43) — 6/6 Layer aligned

| Layer | Wert | Status |
|---|---|---|
| 1. DB Column | `players.mv_trend_7d TEXT NULL` + CHECK rising/stable/falling | ✓ |
| 2. RPC Body | `INSERT history` + `UPDATE players SET mv_trend_7d` | ✓ |
| 3. RPC Return | `{success, snapshot_count, trend_updated_count, history_pruned, date}` | ✓ |
| 4. DbPlayer.mv_trend_7d | `'rising' \| 'stable' \| 'falling' \| null` | ✓ |
| 5. Player.mvTrend7d | `'rising' \| 'stable' \| 'falling' \| null` (nach CTO-Fix) | ✓ |
| 6. dbToPlayer Mapper | `mvTrend7d: db.mv_trend_7d ?? null` | ✓ |

**Zero-Drift bestätigt.** Backend Cron schreibt direkt in DB-Column, Frontend liest via dbToPlayer-Mapper.

## Aufrufpfad-Audit

```
Vercel-Cron (45 3 * * * UTC, daily Hobby-kompatibel)
  → /api/cron/calculate-mv-trends (Bearer-Auth + service_role)
    → cron_snapshot_and_calc_mv_trends() RPC
      → INSERT history (idempotent ON CONFLICT)
      → UPDATE players.mv_trend_7d (5% threshold, IS DISTINCT FROM)
      → DELETE history >30d
    → Discriminated-Union Pre-Cast-Guard
    → cron_sync_log INSERT (best-effort)

Read-Pfad:
  Player-Query → dbToPlayer.mvTrend7d
    → KaderTab Filter (per-page state)
    → MarketFilters Filter (store-state)
    → KaderPlayerRow PerfPills mvTrend prop
    → kaderHelpers.PerfPills Render (TrendingUp/Down/Minus + i18n)
```

Coverage: 4 Konsumenten, alle linear, single-consumer-chains.

## Cross-Track-Cast-Cleanup — DONE

CTO-Mapper-Fix erweiterte `Player.mvTrend7d` als First-Class field. Augment-Type-Hack obsolet, Casts no-op, Code-Smell für Future-Reader → **proaktiv vor Reviewer-Output gehealt**:
- 3 `type PlayerWithMvTrend` Definitionen entfernt
- 4 `(p as PlayerWithMvTrend).mvTrend7d` → `p.mvTrend7d`
- Cross-Track-Bridge-Comment-Blöcke ersetzt durch Post-Merge-Notice

## Vercel-Cron-Hobby-Compatibility

`45 3 * * *` daily ✓ — kein hourly/sub-day-Pattern (errors-infra.md D36).
Slot 03:45 UTC mit 30 Min Abstand zu existing dedup-cleanup (03:15) und 15 Min zu sync-fixtures-future (04:00).

## Knowledge-Flywheel — Promote-Worthy

1. **Draft 1: RLS-cron-only Table-Pattern** (`backend-rls-cron-only-table-pattern.md`)
   - `ENABLE RLS + 0 Policies = service_role-only access`
   - Saubere Defense-in-Depth für Snapshot/Audit-Tables ohne User-Read-Bedarf
   - **PROMOTE** zu `.claude/rules/database.md` als neue Section "RLS-Pattern: Cron-Only Table"

2. **Draft 2: Cross-Track-Type-Race-Pattern** (`frontend-cross-track-type-race.md`)
   - Workflow-Pattern, kein Bug
   - **PROMOTE** zu `memory/patterns.md` mit Cleanup-Pflicht-Step

## Empfehlung

**Healer-Pass nicht mehr nötig** (M1 inline gehealt). M2 Backlog, M3 Trivial.

**Direkt commit + push.** Knowledge-Flywheel-Drafts post-commit promoten.

**Verify ab Tag 8 (2026-05-02):** Erste echte Trends in DB. Falls alle NULL → Cron läuft nicht (cron_sync_log prüfen).

**Phase A Findings closed:** fm 1.2 + fm 4.1 = 2 P1.

**Verdict-Summary:** Backend PASS, Frontend CONCERNS-mit-inline-Healing → **PASS combined**.
