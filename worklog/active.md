# Active Slice

```
status: active
slice: 200a
stage: LOG
spec: worklog/specs/200a-wave3-polish-sweep.md
impact: skipped (kein Schema/RPC/Service, pure Frontend)
proof: worklog/proofs/200a-tsc-vitest.txt
review: worklog/reviews/200a-review.md
```

## Zuletzt

- **Slice 200a** (2026-04-26) — Wave 3 Polish-Sweep (S, single-track sequenziell). 4 Findings closed (FM 7.1 Filter, FM 7.2 Weekly-Countdown, FM 8.1 Effect-Sort, FM 9.2 Urgency-Color) + 1 already-fixed-marker (UX 2). Reviewer REWORK→PASS post-Heal (Audit-Stale Duplicate-useEffect entfernt). Punch-Liste 63/98 → 67/98 closed (~68%).
- **Slice 199** (2026-04-25) — Backend-Aggregat-RPC-Wave (L, parallel BE+FE). 4 Findings closed (C-05, K-02, fm 2.4, fm 1.3). 3 SECURITY DEFINER RPCs LIVE + 4 UI-Consumers. Reviewer PASS, 2 inline-fixed. 20/20 RPC-Tests grün.
- **Slice 198b** (2026-04-25) — Polish-Sweep Wave 2. 11 closed, 5 begruendet skipped. Reviewer PASS.
- **Slice 198** (2026-04-25) — Polish-Sweep Wave 1. 16 closed, 4 begruendet skipped. Reviewer PASS.

## Backlog (priorisiert)

- **Slice 200**: fm 4.4 `players.trades_volume_7d` Column-Migration + Aggregations-Strategie (Trigger vs Materialized View vs Cron) + Frontend Sort-Pill — Schema-Change auf existing Table → CEO-scope (3 Optionen)
- **Slice 201**: Backend-Slice fuer FM-6.1 (Per-Trade-Player-Link) + FM-4.3 (Holders-Distribution) + M-01 (Mission-Hints kontextabhaengig) — neue RPCs/Definitions
- **Wave 4 Polish-Rest**: Restposten ~25 P2/P3 (Brand 6 + UX 8 + FM 5 + Fantasy 8). Frontend-only, low-risk, CTO-scope.
- **Holdings-RPC-Migration** (PostgREST → SECURITY DEFINER, post-Beta)
- **L5-Data-Drift Audit** (11% ohne perf_l5)
- **TR-Locale-Reviewer** organisieren (Anil-Action)

## Anil-Action-Items

- **3 Beta-Tester anrufen** (Familie/Freunde, min 1 TR)
- **Vercel-Plan-Entscheidung** (Hobby vs Pro)
- **TR-Locale-Reviewer organisieren**
- **Slice 200 Aggregations-Strategie-Approval** (3 Optionen: Trigger / MV / Cron)
- **Inkognito-Verify** auf bescout.net Manager → keine Ghost-Rows mehr
- **TR-Wording-Review Slice 200a:** "Tümü / Aktif / Tamamlandı / Bu görünümde görev yok / Etki Gücü" — kurz checken bei nächster Session
