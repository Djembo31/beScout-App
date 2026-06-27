# Active Slice

```
status: in-progress
slice: 429
title: finalizeGameweek entkoppeln — Score ≠ Advance (manueller Pfad scored, kein Liga-Advance) — GW-Fork 3/3 (B)
size: M
stage: PROVE (DONE) → LOG
spec: worklog/specs/429-finalize-decouple-advance.md
impact: skipped (Removal eines Advance-Calls, kein Schema/Contract/Money-Flow-Change)
proof: worklog/proofs/429-vitest.txt
review: worklog/reviews/429-review.md (reviewer-Agent PASS, 3 NIT — #2/#3 gefixt)
proof-summary: setActiveGameweek-Call aus finalize raus (nur Kommentar), scoreEvent unberührt (money-neutral), AdminGameweeksTab re-fetcht DB-Wahrheit, finalizeStep3 i18n truthful DE+TR. tsc 0 + 119 Tests + JSON-Gate.
note: Money-NEUTRAL (entfernt setActiveGameweek-Call aus finalize; scoreEvent-Minting unberührt). CEO-Entscheid Anil: Entkoppeln. Liga-Advance bleibt Cron + AdminSettings.

## GW-Fork-Fortschritt
- **427** (C) Status per-Liga ✅ committed aeaaae4e, gepusht.
- **428** (A) active_gameweek leagues=SSOT (Expand) ✅ committed 3d95d9f9, gepusht. **428b DROP** deferred (nach Deploy-Verify).
- **429** (B) finalize entkoppeln — jetzt.

## Zuletzt
- **Slice 428** (2026-06-28) — active_gameweek leagues=SSOT Expand-Phase (L, PASS).
- **Slice 427** (2026-06-27) — Gameweek-Status per-Liga (M, PASS).
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
