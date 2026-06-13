# BeScout Current Product Truth

Status: active SSOT pointer
Created: 2026-06-13
Reason: Slice 287 / S0 Product Truth Freeze after Stabilization Master Audit

---

## 1. Canonical current truth

This file is the compact current-product-truth layer for agents and humans.

Authoritative current sources:

1. `CLAUDE.md` — CTO playbook, current scope, process, top rules.
2. `memory/decisions.md` — durable decisions, especially D1 and D71.
3. `worklog/active.md` — current slice/status reality.
4. `worklog/audits/2026-06-12/stabilization-master-audit.md` — stabilization operating model.
5. `worklog/beta-phase.md` — beta phase aggregate, with the D71 live-status correction.

If these conflict with older README/vision/briefing files, the list above wins.

---

## 2. What BeScout is now

BeScout is a B2B2C football fan-engagement platform.

For clubs:
- BeScout is a club-owned fan economy / CRM / revenue tool.
- Clubs can sell Scout Cards, start fantasy/events/votes, and activate fan expertise.

For fans:
- BeScout turns football knowledge into reputation, activity, status, and platform credits.
- Fans build a football CV through Scout Cards, fantasy, research, social activity, rankings, and club interaction.

For the product:
- The core loop is: Scout Cards -> Market/Portfolio -> Fantasy/Manager -> Club/Community -> Profile/Reputation.
- The current stabilization goal is not to add more breadth, but to make the core demo path reliable and coherent.

---

## 3. Current scope

Current scope per D1:
- 7 leagues are the quality target: Süper Lig, TFF 1. Lig, Bundesliga, 2. Bundesliga, Premier League, La Liga, Serie A.
- Sakaryaspor/TFF1 was the original hook, but it is no longer the exclusive pilot scope.
- DE/TR remain priority markets because of founder context, but the quality standard applies across all supported leagues.

Current beta reality per D71 / beta-phase:
- Beta is factually live with Taki + Nail Mo since <= 2026-05-06.
- The older iPhone visual-verify blocker was superseded by factual live testing and tester-driven fixes.
- The formal signoff history remains documented; do not rewrite history.

Current stabilization reality:
- Slice 284 Waves 1, 3, 4 are live.
- Slice 284 Wave 2 is blocked on API-Football key reactivation for safe data-heal verification.
- Slice 285 and 286 addressed rankings header scope and league-filter cold-load race.
- Next strategic mode is Stabilization, not new feature expansion.

---

## 4. What BeScout is NOT

BeScout is not:
- a betting product,
- a securities/investment product,
- an NFT/blockchain product in Phase 1,
- a DraftKings/FPL clone,
- a Socios clone.

User-facing language must avoid investment, ROI, profit, ownership, and cash-out promises.
Code/internal strategy docs may discuss analogies, but public/product UI copy must stay utility/compliance-safe.

---

## 5. Historical docs rule

Some older files are valuable context but not current truth:

- `README.md` was an MVP-starter README and is no longer architecture truth.
- `docs/VISION.md` contains strategic narrative and some historical/compliance-sensitive language; use with this file as a safety overlay.
- `memory/semantisch/produkt/bescout-vision.md` contains early pilot/token/rollout assumptions; treat Phase-1 Sakaryaspor-only and 25-player/50-tester language as historical.
- `memory/current-sprint.md` is an old session snapshot, not current status.

Do not delete historical docs just because they are stale. Add historical markers and route agents back to this file.

---

## 6. Journey status vocabulary

Do not mark a journey simply as `done` without qualification.

Use these statuses:

- `wired`: the happy path exists in UI/services/tests.
- `production-data-stable`: verified against current production-like data and known season/gameweek edge cases.
- `beta-user-validated`: real tester/user feedback confirms the user understands and can complete the journey.
- `demo-green`: suitable for founder/customer demo.
- `demo-yellow`: usable but with known caveats.
- `demo-red`: do not demo.

This prevents the old pattern where a journey was marked done but later broke under live-data drift.

---

## 7. Demo path lock

For the next stabilization phase, optimize for this demo path first:

1. Welcome/Login — user understands BeScout and enters safely.
2. Home — user understands what matters now.
3. Market — user finds Scout Cards and understands price/status.
4. Player Detail — user understands why a player/card matters.
5. Buy/Sell/Portfolio — actions and holdings are consistent.
6. Manager — squad/value/P&L match Market/Portfolio truth.
7. Fantasy — Spieltag/Lineup/Score lifecycle is understandable.
8. Club — club context explains why BeScout matters to clubs/fans.
9. Profile — user sees their football CV/reputation.

Everything outside this path is secondary until these are at least demo-yellow, ideally demo-green.

---

## 8. Current next work

Recommended sequence after Slice 286:

1. S1 Page Contract Audit: `/market` + `/player/[id]`.
2. S2 Page Contract Audit: `/` + `/manager`.
3. S3 Page Contract Audit: `/fantasy` + `/clubs` + `/club/[slug]`.
4. S4 Source-of-Truth Boundaries.
5. S5 Test Confidence Audit.
6. S6 Dead Artifact Inventory.

No broad new feature roadmap before the demo path is coherent.
