# Active Slice

```
status: idle
slice: 333
title: ✅ DONE — Polls P1 (Erstellung + Quellen-Identität + Treasury-REIN-Routing + Follower-Tor)
stage: LOG complete
commit: 5c674e3d (pushed origin/main)
```

## Zuletzt

- **Slice 333** (2026-06-18) — Polls P1 (L, Money/CEO). Reviewer PASS (NIT#1 Defense-in-Depth gefixt). `community_polls` jetzt erstellbar (war „Hülle ohne Tür"). Geld-Routing keyt auf `source` ('club'→Treasury `poll_revenue` / 'user'→Wallet). Force-Rollback-Money-Smoke live PASS.
- **E0-W3b** (2026-06-17) — cortex-Trio retired (Hygiene).

## Offen aus Slice 333 (post-Deploy / Anil)
1. **AC-09 Mobile-Playwright** gegen bescout.net (CreatePollModal beide Pfade, 393px) — erst NACH Vercel-Deploy.
2. **TR-Strings Anil-Review** (feedback_tr_i18n_validation) — Poll-Create-Wording DE+TR geschrieben, ungeprüft. Kernstrings: createPollTitle/createClubPollTitle/pollFollowerGateHint.

## Nächstes Money-Stück (Polls-Roadmap, D86 §8)
- **P2** — `player_id`-Bezug + Discovery (Filter Verein/Spieler über Polls + Paywalls).
- **P3** — soziale Schicht (Follower-Reichweite, Abo-2×-Gewicht bei Paid-Polls, Fan-Rang).
- **P4** — Auszahl-Idee an Teilnehmer (offen, §7).
- Daneben: Fan-Reward-Engine (treasury.md §8) · events.status 'cancelled'-Fix (Backlog-Stolperfalle).

## Money-SSOTs (NIE neu erarbeiten)
- Polls (D86, REIN): `docs/knowledge/domain/polls.md`. Treasury (D83): `docs/knowledge/domain/treasury.md`.
- Ledger-REIN-Helper: `book_club_treasury(club_id, direction, type, amount, ref, desc)` (Slice 329). Poll-Credit-Typ = `poll_revenue`.
