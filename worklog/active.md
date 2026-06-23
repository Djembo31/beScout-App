# Active Slice

```
status: in-progress
slice: 349
title: Club-Fan-Treue-Board mounten (W2-B) — Top-Fans-Rangliste auf Club-Page sichtbar
stage: PROVE
size: S
slice-type: UI
spec: worklog/specs/349-mount-club-fan-leaderboard.md
impact: inline (reine UI; nutzt bestehenden Hook useClubFanLeaderboard + Service getClubFanLeaderboard, kein RPC/Schema/Query-Key neu)
proof: worklog/proofs/349-fan-board.txt (BUILD-Evidenz tsc/5 vitest/wiring/i18n/RLS; Playwright nach Deploy)
review: worklog/reviews/349-review.md (PASS, 2 NIT non-blocking)
next: BUILD — ClubFanLeaderboard-Komponente + Mount im "Mehr"-Tab + i18n DE/TR → REVIEW → Playwright-Proof gegen bescout.net (Sakaryaspor, 37 Fans)
```

## Kontext

W2-B aus reward-ranking.md/Pro-Stand-Roadmap: `getClubFanLeaderboard` + `useClubFanLeaderboard` sind gebaut + getestet, haben aber **0 UI-Consumer** (tote Brücke). Dieser Slice mountet die Top-Fans-Rangliste sichtbar.

- **RLS verifiziert:** `fan_rankings_select_leaderboard` (qual=true) → Board liest alle Zeilen, kein Blocker.
- **Live-Daten:** Sakaryaspor 37 Fans (Top 33.32) → Proof-Ziel; andere Clubs 0 → Empty/null.
- **Mount:** Club-Page „Mehr"-Tab, direkt nach `FanRankOverview` (eigener Rang → Top-Fans des Clubs).
