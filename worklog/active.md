# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
```

## Letzte Slices: 087 + 088 + 089 + 090 + 091 (2026-04-22)

### 091 — DB-Invariants INV-36/37/38 fixen
- Data-Fix: 130 rows auf `transfermarkt_stale` (123 Orphans + 7 Slice-081-Residual)
- Test-Filter INV-36/37: Poisoning-Signatur `-07-01` (legit `-06-30` Cluster ignoriert)
- 3/3 Target-Tests grün; INV-10 + INV-32 noch rot (pre-existing)
- Proof: worklog/proofs/091-after.txt

### 090 — silent-fail-audit Precision v2
- Pattern 1 `.range()`/`.limit()` multi-line-awareness + Pattern 7 allSettled-regression-guard
- 211 → 195 Total, 111 → 98 HIGH, HIGH-FP-Rate 0%

### 089 — allSettled Sweep
- 16 Stellen instrumentiert, 20 Sentry-Call-Sites

### 088 — Sentry Observability Util + Demo

### 087 — Upstream Silent-Fail Follow-Ups

## Pre-Existing Failures (weiter offen)
- INV-10 (floor_price <= 3x ipo_price) — Money-Critical
- INV-32 (RLS-Matrix aller public Tables) — Auth-Sicherheit
- TURK-03 (Turkish İ unicode) — i18n
- useMarketData.floorMap flaky

## Next-Session Options

1. **INV-10 fixen** — floor_price-Kalkulation prüfen, Money-Critical
2. **INV-32 fixen** — RLS-Matrix abgleichen, Auth-Sicherheit
3. **`.catch(() => null)` Observability** — `logSilentCatch` util + Pattern 8
4. **Sentry.setUser beim Login**
5. **Sentry Breadcrumbs für Supabase-Queries**
6. **CI-Gate: Audit-Baseline**
7. **Kanban-Items durcharbeiten**
