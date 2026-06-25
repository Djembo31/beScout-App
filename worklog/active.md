# Active Slice

```
status: idle
slice: 382
title: ✅ DONE — E-1b: Lineup-Picker-Liga-Vorfilter + Club-Admin-Liga-Picker (E5)
size: M
slice-type: UI + i18n (Frontend, KEIN Money) — macht E-1 RPC-Gate (380) im Picker sichtbar
spec: worklog/specs/382-e1b-lineup-picker-league-prefilter.md
stage: LOG complete
impact: inline (Spec §3+§4 — Frontend-only, kein Schema/RPC-Change; events.league_id existiert seit 380)
proof: worklog/proofs/382-picker-filter.txt (tsc 0, 155 vitest, Namespace-Fix verifiziert; UI-Playwright post-Deploy offen)
review: worklog/reviews/382-review.md (reviewer REWORK→GEHEILT — S333-Namespace-Bug + NIT#2 gefixt; Kern Picker≡RPC-Parität PASS)
ceo-decision: Anil 2026-06-25 (AskUserQuestion) — Club-Admin-Liga-Picker = "Alle Ligen + Offen" (volle Symmetrie zum Platform-Admin). E-1b nach E-2a gewählt ("erst e1b").
build: tsc EXIT 0 · 155 vitest grün · MITGEFIXT pre-existing CI-Rot aus 380 (EDITABLE_FIELDS upcoming 23→24/registering 22→23 Counts stale) · S200-Befund: events-Read-Query zog league_id nicht → in 3 Selects ergänzt · Reviewer-Heal: S333-Namespace (admin statt fantasy)
next: nach 382 → E-2b (Pro-Liga-Payout, Money/CEO) ODER E-3 (Teilnahme-Bedingungen). Anil-Wahl.
```

## Zuletzt

- **Slice 381** (2026-06-25) — E-2a BeScout-Saison Rename + Pro-Liga-Anzeige (M, reviewer PASS, UI live PASS).
- **Slice 380** (2026-06-25) — E-1 Liga-Bindung der Event-Aufstellung (M, reviewer PASS).
- **Slice 379b** (2026-06-25) — Bounty-Review Wallet-Hinweis-Gate (XS).

Nächstes: SPEC-Approval durch Anil (M-Slice + 1 Produkt-Frage) → BUILD.
