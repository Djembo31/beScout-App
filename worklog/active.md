# Active Slice

```
status: active
slice: 333
title: Polls P1 — Erstellung + Quellen-Identität + Treasury-REIN-Routing + Follower-Tor
stage: LOG
size: L
type: Migration + Service + UI + i18n (Money/CEO-Scope)
spec: worklog/specs/333-polls-p1-creation-treasury.md
impact: worklog/impact/333-polls-p1.md
build: DONE — Migration applied+verified (force-rollback money smoke PASS, +Defense-in-Depth-Guard) · Service+Types · UI (CreatePollModal/Button, 2 Einstiege) · i18n DE+TR
review: worklog/reviews/333-review.md (PASS, NIT#1 gefixt, #2/#3 accepted)
proof: worklog/proofs/333-treasury-routing.txt + worklog/proofs/333-vitest.txt
offen: AC-09 Mobile-Playwright gegen bescout.net POST-DEPLOY · TR-Strings Anil-Review (feedback_tr_i18n_validation)
review: pending
```

## Zuletzt

- **Slice 332** (2026-06-17) — Club-Bounties ans Treasury (Reward-Escrow bei Erstellung). RAUS-Kanäle damit komplett.
- **Slice 331** (2026-06-17) — Events ans Treasury (Prize-Escrow, 5-Quellen-Modell).
- **E0-W3b** (2026-06-17) — cortex-Trio retired (Hygiene, kein Code).

Nächstes: SPEC-Approval durch Anil (Money/CEO-Scope), dann IMPACT → BUILD.

## Money-SSOTs (NIE neu erarbeiten)
- Polls (D86, REIN): `docs/knowledge/domain/polls.md` — community_polls hatte KEINE Erstellung.
- Treasury (D83): `docs/knowledge/domain/treasury.md` — REIN-Seite, `book_club_treasury(club_id, direction, type, amount, ref, desc)` (Slice 329).
