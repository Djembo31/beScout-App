# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
```

## Letzte Slices: 087 + 088 + 089 (2026-04-22)

### 089 — allSettled Sweep
- 16 Stellen in 11 Files mit `logSilentRejects` instrumentiert
- Priority 1 Money/Admin/User-Critical zuerst, dann Priority 2 Enrichment
- 1177/1178 Tests in tangierten Suites grün
- 20 Sentry-Call-Sites (war 1 vor 088)
- Proof: worklog/proofs/089-after.txt

### 088 — Sentry Observability Util
- `logSilentRejects(label, results)` util + 5 Unit-Tests
- 3 Demo-Integrationen: AuthProvider · platformAdmin · scoring.queries
- 136/136 Tests grün
- Proof: worklog/proofs/088-after.txt

### 087 — Upstream Silent-Fail Follow-Ups
- gameweek-sync:1244-1264 `.range()`-while-loop
- footballData:371-389 `Promise.allSettled` → `Promise.all`

## Pre-Existing Failures (nicht durch 087/088/089 verursacht)
- 6 DB-Invariants gegen Live-Supabase: INV-10/32/36/37/38/TURK-03 — Daten-State-Issues, follow-up aus Slice 081/082-Phase-C
- 1 flaky `useMarketData.floorMap` — unabhängig von Sentry-Arbeit

## Next-Session Options

1. **Silent-Fail-Audit Precision v2** — multi-line `.range()` + Promise.allSettled pattern → audit-count sinkt
2. **`.catch(() => null)` Observability** — `logSilentCatch` util analog zu logSilentRejects
3. **Sentry.setUser beim Login** — user_id in Sentry-Events
4. **Sentry Breadcrumbs für Supabase-Queries** — supabase client wrapper
5. **DB-Invariant-Failures fixen** (INV-36/37/38 — Data-Poisoning-Residuen aus Slice 081)
6. **Kanban-Items durcharbeiten** (Task 3 aus gestrigem Plan)
