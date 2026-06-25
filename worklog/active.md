# Active Slice

```
status: idle
slice: 383
title: E-2b — Pro-Liga-Payout (close_monthly_liga zahlt zusätzlich pro Liga, konfigurierbare Beträge)
size: L
slice-type: Migration (Money-RPC) + Service + UI + i18n
scope: Money / CEO (§3 — selbst bauen, Reviewer-Pflicht)
spec: worklog/specs/383-perleague-payout.md
stage: LOG
impact: inline (Spec §3 — 1 RPC-Consumer + Service/Hook/UI-Kette grep-verifiziert)
proof: worklog/proofs/383-money-smoke.txt
proof-note: AC1-AC12 ALLE PASS — force-rollback (DB) + tsc 0/67 vitest + UI-Playwright post-Deploy live (Card 7 Ligen, Write-Pfad set_liga_reward_config, 0 Console-Errors)
review: worklog/reviews/383-review.md (reviewer PASS, 3 NIT — kein Rework)
ceo-decision: Anil 2026-06-25 (AskUserQuestion) — (1) ZUSÄTZLICH zum globalen Manager-Payout, (2) Beträge PRO LIGA EINZELN einstellbar, (3) Default 100k/50k/25k Cents/Rang.
```

## Zuletzt

- **Slice 382** (2026-06-25) — E-1b Lineup-Picker-Liga-Vorfilter + Club-Admin-Liga-Picker (M, reviewer REWORK→GEHEILT, Club-Admin-Select live PASS).
- **Slice 381** (2026-06-25) — E-2a BeScout-Saison Rename + Pro-Liga-Anzeige (M, reviewer PASS, UI live PASS).
- **Slice 380** (2026-06-25) — E-1 Liga-Bindung der Event-Aufstellung (M, reviewer PASS).

Nächstes: Spec-Approval durch Anil (L-Money-Slice) → BUILD (selbst, kein Worktree-Agent für Money).
