# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
```

## Letzte Slices: 087-092 (2026-04-22)

### 092 — Silent-Catch Observability
- `logSilentCatch` util + 3 Tests + 5 Integrationen (community × 3, gameweek-sync × 2)
- Audit Pattern 8 NEU: `.catch(() => fallback)` regression-guard
- 25 Sentry Call-Sites (war 20)

### 091 — DB-Invariants INV-36/37/38 fix
### 090 — silent-fail-audit Precision v2
### 089 — allSettled Sweep (16 Stellen)
### 088 — Sentry Observability Util + Demo
### 087 — Upstream Silent-Fail Follow-Ups

## Pre-Existing Failures (CEO-Scope, offen)
- INV-10 (floor_price <= 3x ipo_price) — Money-Critical
- INV-32 (RLS-Matrix) — Auth-Sicherheit
- TURK-03, useMarketData.floorMap flaky

## Next (CTO autonom)
- Slice 093: CI-Gate Audit-Baseline (fail PR on HIGH-increase)
- Slice 094: Sentry Breadcrumbs für Supabase-Queries
