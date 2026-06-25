# Active Slice

```
status: active
slice: 384
title: E-3 Türsteher — Follower-Pflicht + Fan-Rang-Gate auf Events (rpc_lock_event_entry)
size: M
slice-type: Migration (Money-nahe RPC) + Service + UI + i18n
scope: Money-nah / §3 (Eintritts-RPC — selbst bauen, Reviewer-Pflicht). Kein neuer Geld-Flow (Zugangs-Gate VOR Geld).
spec: worklog/specs/384-event-entry-gates.md
stage: PROVE
impact: inline (Spec §3 — 1 RPC + 1 Service-Wrapper-Check + Builder/Service/Type/i18n-Kette grep-verifiziert)
proof: worklog/proofs/384-money-smoke.txt
proof-note: DB-Smoke AC1-AC7 force-rollback PASS (kein Geld bei Reject) + tsc 0 + 140 vitest + i18n DE/TR. AC12 UI post-Deploy offen.
review: worklog/reviews/384-review.md (reviewer PASS, 2 NIT — beide bewusst nicht geheilt, dokumentiert)
nit-note: NIT#1 Gate-Felder nicht disabled bei club-losem Event = bewusste Drift (Konsistenz mit min_subscription_tier-Schwester-Gate, gateHint kommuniziert). NIT#2 belassen.
review: pending
ceo-decision: Anil 2026-06-25 — E-3 Weg A (Türsteher zuerst), Follower + Fan-Rang. Architektur D107 (§3b Epic).
```

## Zuletzt

- **Slice 383** (2026-06-25) — E-2b Pro-Liga-Payout (L, Money/CEO, reviewer PASS, AC1-AC12 PASS).
- **Slice 382** (2026-06-25) — E-1b Lineup-Picker-Liga-Vorfilter + Club-Admin-Liga-Picker (M, reviewer REWORK→geheilt).
- **Slice 381** (2026-06-25) — E-2a BeScout-Saison Rename + Pro-Liga-Anzeige (M, reviewer PASS).

Nächstes: SPEC schreiben → Anil-Approval (M-Slice) → BUILD (selbst, kein Worktree-Agent für Money-nah).
