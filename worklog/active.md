# Active Slice

```
status: idle
slice: 405
title: Welle 1.1 — Player-Detail Order-Kauf Shape-Norm + BuyConfirmation est-total (was du siehst = was du zahlst, kanonischer Pfad) — DONE
size: S (UI/Hook — 2 Reviewer-Funde aus 404: onSuccess Shape-Norm + est-total aus Order-Preis statt Floor)
stage: LOG (DONE)
spec: worklog/specs/405-player-detail-shape-norm-estcost.md
impact: skipped (kein RPC/Migration/Cross-Domain; Money byte-identisch — Consumer in Spec §3/§4 gegreppt)
proof: worklog/proofs/405-vitest.txt
proof2: worklog/proofs/405-live.txt — LIVE bescout.net (Douglas, jarvis): BuyConfirmation „1×300 → 300 CR" (Order-Preis, NICHT Floor 200), Order-Kauf Header 12.697→12.397 sofort (−300 exakt DB-reconciled), Toast kein „?", Holding 3→4, bot031-Order filled. ALLE AC1-6 PASS.
review: worklog/reviews/405-review.md — PASS (1 NIT status-quo, 1 INFO kosmetisch)
```

## Zuletzt
- **Slice 405** (2026-06-27) — Player-Detail Order-Kauf Shape-Norm + est-total, Reviewer PASS, post-Deploy Playwright AC1-6 LIVE PASS, DONE.
- **Slice 404** (2026-06-26) — Markt-Tab order-gebunden, post-Deploy Playwright voll bewiesen (AC01-08), DONE.
- **Slice 403** (2026-06-26) — buy_from_ipo Idempotency, DONE.

## Inline-Notiz
Slice 405 DONE — schloss die zwei vom 404-Reviewer gegen die Live-RPC verifizierten Player-Detail-Funde (Bug A onSuccess Shape-Norm `?? buyer_new_balance`/`?? price`; Bug B BuyConfirmation est-total aus gebundenem Order-Preis statt Floor). Welle-1.1-Kaufpfad komplett konsolidiert (Markt-Tab 404 + Player-Detail 405).

**Geseedet PERMANENT (NICHT aufräumen, E2E-Beweis):** jarvis-Order Douglas @200 CR (96d3ce14, OPEN rem 1) + bot031-Order @300 CR (9405452f, filled). jarvis hält jetzt 4 Douglas (1 gelistet), Floor Douglas = 200 CR.

Nächstes (Welle 1, Anil-Wahl): **1.3** (Club-Geld-Doppelschreibung, Money — erst verifizieren ob echte Doppelzählung vs Legacy-Drift) ODER **1.4** (Orderbuch `orders` vs `offers` = CEO-Architektur-Gabelung, VOR Bau klären) ODER 1.5/1.6. Kanon: `memory/session-handoff.md`.
