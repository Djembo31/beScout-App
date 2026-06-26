# Active Slice

```
status: active
slice: 405
title: Welle 1.1 — Player-Detail Order-Kauf Shape-Norm + BuyConfirmation est-total (was du siehst = was du zahlst, kanonischer Pfad)
size: S (UI/Hook — 2 Reviewer-Funde aus 404: onSuccess Shape-Norm + est-total aus Order-Preis statt Floor)
stage: PROVE
spec: worklog/specs/405-player-detail-shape-norm-estcost.md
impact: skipped (kein RPC/Migration/Cross-Domain; Money byte-identisch — Consumer in Spec §3/§4 gegreppt)
proof: worklog/proofs/405-vitest.txt
proof-note: vitest 47 grün + tsc clean; post-Deploy Playwright AC-5 pending
review: worklog/reviews/405-review.md — PASS (1 NIT status-quo, 1 INFO kosmetisch)
```

## Zuletzt
- **Slice 404** (2026-06-26) — Markt-Tab order-gebunden, post-Deploy Playwright voll bewiesen (AC01-08), DONE.
- **Slice 403** (2026-06-26) — buy_from_ipo Idempotency, DONE.

## Inline-Notiz
Slice 405 schließt die zwei vom 404-Reviewer faktisch gegen die Live-RPC verifizierten Player-Detail-Funde:
- **Bug A** `usePlayerTrading.ts:248-253` — onSuccess liest nur `buy_player_sc`-Shape → Order-Kauf: Toast „?", kein optimist. Balance, Holding-Preis 0. Fix: `?? buyer_new_balance` / `?? price` (Pattern S404).
- **Bug B** `BuyConfirmation.tsx:27` — est-total aus `floorBsd` statt gebundenem Order-Preis (Floor inkl. eigener Orders, Charge gegen fremde → unterschätzt). Fix: BuyModal resolved bound-order-Preis → `priceBsd`.

Money-Flow byte-identisch (kein RPC). Nächstes nach 405: **1.3** (Club-Geld-Doppelschreibung, Money) ODER **1.4** (Orderbuch-Gabelung, CEO). Kanon: `memory/session-handoff.md`.
