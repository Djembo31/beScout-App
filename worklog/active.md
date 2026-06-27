# Active Slice

```
status: idle
slice: 408
title: Welle 1.4b — Trading-Vokabular entwirren: Markt (sofort) vs Kaufgebot (P2P) — DONE
size: S (UI/i18n — kein Money; Wording-Klarheit + tote Sektion-6 raus)
stage: LOG (DONE)
spec: worklog/specs/408-trading-vocab-clarity.md
impact: skipped (reine Label/i18n + 1 toter Render-Block; Consumer §4 gegreppt)
proof: worklog/proofs/408-i18n.txt
proof2: worklog/proofs/408-live.txt — post-Deploy Playwright DE+TR LIVE PASS (neue Labels rendern, alte+tote Sektion 6 weg, kein Roh-Key, 0 Console-Errors)
review: worklog/reviews/408-review.md — self-review PASS (S UI/i18n, kein Money, Compliance-geprüft)
```

## Zuletzt
- **Slice 407** (2026-06-27) — P2P-Offer-Fee auf 6% (=Markt, 3,5/1,5/1) angeglichen, Reviewer PASS, Zero-Sum diff=0, DONE.
- **Slice 406** (2026-06-27) — Club-Treasury Single-Source (Counter-Orphan raus + DROP), Reviewer PASS, 3× Zero-Sum diff=0, DONE.
- **Slice 405** (2026-06-27) — Player-Detail Order-Kauf Shape-Norm + est-total, Reviewer PASS, post-Deploy Playwright AC1-6 LIVE PASS, DONE.
- **Slice 404** (2026-06-26) — Markt-Tab order-gebunden, post-Deploy Playwright voll bewiesen (AC01-08), DONE.

## Inline-Notiz
Slice 407 DONE — P2P-Offer-Fee auf 6 % (= Markt) angeglichen (Split 3,5 % Platform + 1,5 % PBT + 1 % Club). `fee_config` offer_* 200/50/50→350/150/100 + `accept_offer` COALESCE-Defaults + UI-Fee-Vorschau (`OffersTab:103`, exakt 3-Teil-Floor) + business.md/trading.md/index.ts angeglichen. Smoke 6 %-Split 700/300/200 + Zero-Sum diff=0, Reviewer PASS. Schließt Welle-1.4a (D112 Fork-B-Härtung). Slice 406 davor: Club-Treasury Single-Source (Counter-Orphan raus, Pattern S406).

**Geseedet PERMANENT (NICHT aufräumen, E2E-Beweis):** jarvis-Order Douglas @200 CR (96d3ce14, OPEN rem 1) + bot031-Order @300 CR (9405452f, filled). jarvis hält 4 Douglas. (406/407-Smokes force-rollback → keine neuen Artefakte.)

Nächstes (Welle 1.4-Härtung, D112): **1.4b** UI-Klarheit „Instant-Kauf vs Angebot machen" (CTO, nach Code-Check) · **1.4c** offers-Robustheit (Escrow/Expiry/counter) · **1.4d** Buy-Limit-gated-Doc · Mini-Slice IPO-Ledger-Label `trade_fee`→`ipo_fee` · dann 1.5/1.6. Kanon: `memory/session-handoff.md`.
