# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
```

## Letzte Slices: 087-096 (2026-04-22)

### 095 — INV-32 trades Tighten COMPLETE (Phase 1 + 2, CEO-approved Option B)
- Phase 1: PublicTrade type + 2 SECURITY DEFINER RPCs (handle+is_own projection) + UI Migration (5 components + 1 hook)
- Phase 2: 3 SECURITY DEFINER RPCs mit club_admin-guard für club.ts + RLS tighten `own_or_platform_admin`
- Baseline: 193/98/95 → 190/95/95
- Security-Gewinn: Portfolio-Inferenz-Leak geschlossen

### 096 — Sentry.setUser GDPR-conservative (CEO-delegated)
### 094 — INV-10 Fix: ipo_price Nachkalibrierung (CEO-approved)
### 093 — CI-Gate silent-fail-audit Baseline
### 092 — Silent-Catch Observability
### 091 — DB-Invariants INV-36/37/38 fix
### 090 — silent-fail-audit Precision v2
### 089 — allSettled Sweep
### 088 — Sentry Observability Util
### 087 — Upstream Silent-Fail Follow-Ups

## Remaining INV-32 Findings (separate Slice)
- `league_standings` / `player_transfers` — public-read wohl gewollt (leaderboard/history) — Whitelist oder Tighten decision offen
- TURK-03, useMarketData.floorMap flaky — separate QA
