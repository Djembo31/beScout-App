# Active Slice

```
status: idle
slice: 407
title: Welle 1.4a — P2P-Offer-Fee auf 6% (= Markt) angleichen (Fee-Änderung, CEO-approved) — DONE
size: S (Money/CEO — accept_offer COALESCE 350/150/100 + fee_config UPDATE + 1 UI-Zeile + business.md/trading.md)
stage: LOG (DONE)
spec: worklog/specs/407-p2p-fee-6pct.md
impact: skipped (Consumer §4 live-gegreppt: nur accept_offer liest offer_*_bps; 1 UI-Fee-Stelle OffersTab:103)
proof: worklog/proofs/407-money-smoke.txt
proof-note: AC1-7 PASS; 6%-Split 700/300/200, Zero-Sum diff=0, fee_config 350/150/100, Docs angeglichen
review: worklog/reviews/407-review.md — CONCERNS→geheilt→PASS (1 LOW Stale-Kommentar gefixt)
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
