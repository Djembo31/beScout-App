# Active Slice

```
status: in-progress
slice: 428
title: active_gameweek leagues=SSOT — Reader/Writer→leagues, Dual-Write+Drift-Audit raus (Expand-Phase) — GW-Fork 2/3 (A)
size: L
stage: PROVE (DONE) → LOG
spec: worklog/specs/428-active-gameweek-leagues-ssot.md
impact: inline (Vollscan in Spec §3 — alle clubs.active_gameweek-Reader/Writer gemappt)
proof: worklog/proofs/428-rpc.txt
review: worklog/reviews/428-review.md (reviewer-Agent PASS, 2 NIT — #1 gefixt)
proof-summary: RPC functiondef kein-clubs-Write + ACL erhalten + Force-Rollback Round-Trip (leagues=12, clubs frozen=38) + Cron leagues-only (beide Advance) + getActiveGameweek→leagues + Drift-Audit entfernt. tsc 0 + 106 Tests.
note: DROP COLUMN clubs.active_gameweek bewusst NICHT hier → 428b nach Vercel-Deploy-Verify (Anil Expand/Contract). Spalte bleibt frozen+unread (kein Runtime-Reader, Reviewer-verifiziert).

## Zuletzt-427
- **Slice 427** (2026-06-27) — Gameweek-Status per-Liga (M, PASS, committed aeaaae4e).
```

## GW-Lifecycle-Per-Liga-Fork (CEO-Entscheid Anil 2026-06-27)

Recon: `worklog/notes/gameweek-engine-recon.md`. Money-Pfad sicher (score_event liga-korrekt). 3 Risse → 3 Slices:
- **427 (C, jetzt):** Status-View per-Liga (Riss 3) — getFullGameweekStatus(leagueId) 1..max + useClubEventsData leagueId. Fixt Phantom-GW 35-38 + latenten 1000-Cap (2438 Fixtures).
- **428 (A):** clubs.active_gameweek DROP, leagues=SSOT (Riss 1) + set_active_gameweek-Guard >38→>max.
- **429 (B):** finalizeGameweek liga-scoped (Riss 2, Money-nah=selbst + Zero-Sum).

## Zuletzt

- **Slice 426** (2026-06-27) — Orphan-Cleanup alte Lineup-Builder-UI (S, PASS).
- **Slice 425** (2026-06-27) — Welle-2 Display-Truth A/B/C auf LineupPanel (M, PASS).
- **Slice 424** (2026-06-27) — Synergie-Vorschau == Server (M, PASS).
