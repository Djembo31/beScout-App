# Active Slice

```
status: idle
slice: 385
title: E-3 Aufstellungs-Regel-Fundament — JSONB events.lineup_rules + generischer Validator + min_per_own_club
size: M
slice-type: Migration (Money-nahe RPC) + Service + UI + i18n
scope: Money-nah / §3 (selbst gebaut, Reviewer-Pflicht).
spec: worklog/specs/385-lineup-rules-foundation.md
stage: LOG
impact: inline (1 Migration/RPC + Read-Pfad 3 Selects/Mapper/Type + Write-Pfad mutations/useEventForm/EventFormModal + i18n; grep-verifiziert)
proof: worklog/proofs/385-lineup-rules-smoke.txt
proof-note: AC-1..AC-12 ALLE PASS — force-rollback AC-1..AC-7 (AC-6 = 0 Ressourcen-Move bei Reject) + Patch-Audit live + tsc 0 + 142 vitest + DE/TR + AC-12 UI-live (Club-Admin, Label aufgelöst, kein MISSING_MESSAGE, Input min1/max11). Voll-DONE.
review: worklog/reviews/385-review.md (reviewer PASS, 3 NIT bewusst nicht geheilt — kosmetisch/Scope-Out)
ceo-decision: Anil 2026-06-25 — E-3a "min. X vom Verein" = FESTE ZAHL. Architektur D107 (Weg B, JSONB-Regel-Liste).
```

## Zuletzt

- **Slice 384** (2026-06-25) — E-3 Türsteher: Follower-Pflicht + Fan-Rang-Gate (M, Money-nah, reviewer PASS, AC1-AC12 PASS).
- **Slice 383** (2026-06-25) — E-2b Pro-Liga-Payout (L, Money/CEO, reviewer PASS).
- **Slice 382** (2026-06-25) — E-1b Lineup-Picker-Liga-Vorfilter (M, reviewer REWORK→geheilt).

Nächstes: SPEC fertig → Anil-Approval (M-Slice) → BUILD (selbst, kein Worktree-Agent für Money-nah).
