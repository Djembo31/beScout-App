# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
```

## Letzte Slices: 087 + 088 + 089 + 090 (2026-04-22)

### 090 — silent-fail-audit Precision v2
- Pattern 1 `.range()`/`.limit()` multi-line-awareness
- Pattern 7 NEU: `Promise.allSettled` ohne `logSilentRejects` (regression-guard)
- 211 → 195 Total · 111 → 98 HIGH (HIGH-FP-Rate 0%)
- Proof: worklog/proofs/090-after.txt

### 089 — allSettled Sweep
- 16 Stellen in 11 Files mit `logSilentRejects` instrumentiert
- 20 Sentry-Call-Sites (war 1 vor Slice 088)

### 088 — Sentry Observability Util
- `logSilentRejects(label, results)` util + 5 Unit-Tests
- 3 Demo-Integrationen

### 087 — Upstream Silent-Fail Follow-Ups
- gameweek-sync `.range()`-while-loop
- footballData `Promise.all` + explicit `.error`

## Next-Session Options

1. **DB-Invariants fixen** (INV-36/37/38) — Data-Poisoning-Residuen aus Slice 081
2. **`.catch(() => null)` Observability** — `logSilentCatch` util analog zu logSilentRejects (Pattern 8 im Audit)
3. **Sentry.setUser beim Login** — user_id in Sentry-Events
4. **Sentry Breadcrumbs für Supabase-Queries** — supabase client wrapper
5. **CI-Gate: Audit-Baseline** — fail PR bei HIGH-Count-Increase
6. **Kanban-Items durcharbeiten**
