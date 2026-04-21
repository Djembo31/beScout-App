# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
```

## Zuletzt: Slice 137 (2026-04-22) — Clubs-Discovery: Stale-GW-Filter + Opponent-Logo (S)

Bug + Feature in einem Slice:
- **Bug-Fix:** `getNextFixturesByClub` überspringt jetzt stale-scheduled Fixtures (played_at > 6h in Vergangenheit). Süper-Lig-Clubs zeigten inkonsistente GW (30 vs 31) durch Sync-Lag der 4 GW-30-Fixtures — jetzt alle GW 31.
- **Feature:** Gegner-Logo vor Vereinskürzel in Next-Fixture-Zeile auf `/clubs`.

Proofs: `worklog/proofs/137-tsc-vitest.txt` (29 Tests grün) + `worklog/proofs/137-db-truth.txt` (SQL-Evidenz der 4 stale Fixtures).
