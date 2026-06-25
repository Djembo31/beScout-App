# Active Slice

```
status: idle
slice: 381
title: ✅ DONE — E-2a: BeScout-Saison Begriffs-Umzug + Pro-Liga-Ranglisten-Anzeige
size: M
slice-type: Migration (read-only RPC) + Service + UI + i18n (cross-domain, KEIN Money)
spec: worklog/specs/381-bescout-season-perleague-rankings.md
stage: LOG complete
impact: inline (Spec §3+§4 — read-only Aggregat, kein scout_scores-Umbau, 0 Money-Pfad)
spec-approved: Anil 2026-06-25 ("passt")
build: tsc EXIT 0 · 18 vitest grün · Rename-Negativ-Check grün
proof: worklog/proofs/381-season-rpc.txt (RPC+Seed live: ACL kein anon, Gesamt=30, Bundesliga-Board=3 nach money-neutralem Seed [Topf 14→14/Saldo unverändert], leere Liga=0). UI-Playwright (AC-01/07/08/09) post-Deploy offen.
review: worklog/reviews/381-review.md (reviewer PASS, 2 NIT non-block — Doppel-testid + Spec-Drift seasonScore-Key)
ceo-decision: Anil 2026-06-25 (AskUserQuestion) — "Voll bauen + 1 Demo-Event seeden": Rename + Pro-Liga-Board mit Umschalter, plus 1 liga-gebundenes Demo-Event mit gewerteten Lineups für sichtbaren Proof.
key-finding: Live 2026-06-25 — 0/444 Lineups auf liga-gebundenen Events (E-1 kein Backfill). 39 is_liga_event-Events (alle type=bescout, ended) ohne league_id. → Pro-Liga-Board heute leer ohne Seed.
next: nach 381 → E-1b (Lineup-Picker-Vorfilter) ODER E-2b (Pro-Liga-Payout, Money/CEO). Anil-Wahl.
```

## Zuletzt

- **Slice 380** (2026-06-25) — E-1: Fußball-Liga an Event-Aufstellung binden (M, reviewer PASS).
- **Slice 379b** (2026-06-25) — Bounty-Review Wallet-Hinweis-Gate (XS, self-review PASS).
- **Slice 379** (2026-06-25) — Ticket-Source-Drift gefixt (XS, self-review PASS).

Nächstes: SPEC-Approval durch Anil (M-Slice) → BUILD.
