# Active Slice

```
status: in-progress
slice: 427
title: Gameweek-Status per-Liga (getFullGameweekStatus + useClubEventsData) — GW-Fork Teil 1/3 (C)
size: M
stage: PROVE (DONE) → LOG
spec: worklog/specs/427-gameweek-status-per-league.md
impact: skipped (read-only Queries, nur leagueId-Param-Add, kein Schema/Contract-Change)
proof: worklog/proofs/427-vitest.txt
proof-live: 427-bl-gw34.png (Live, gebündelt post-Deploy mit 428/429)
review: worklog/reviews/427-review.md (reviewer-Agent, PASS, 2 NIT — #2 gefixt)
proof-summary: tsc 0 + 6 neue getFullGameweekStatus-Tests + 73 Consumer-Tests grün. Liga-Filter schließt latenten 1000-Cap (2438→380). AC-06 Live post-Deploy.
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
