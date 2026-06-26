# Active Slice

```
status: idle
slice: 406
title: Welle 1.3 — Club-Treasury Single-Source-of-Truth (Counter-Orphan treasury_balance_cents raus + Spalte droppen, Ledger kanonisch) — DONE
size: M (Money/CEO — 4 RPC-Body-Reduktionen + DROP COLUMN; Option A approved 2026-06-27)
stage: LOG (DONE)
spec: worklog/specs/406-club-treasury-single-source.md
impact: skipped (Consumer live-gegreppt §3/§4: 0 Counter-Reader, einziger src-Consumer = schema-contract-Test; reine RPC-Body-Reduktion + DROP)
proof: worklog/proofs/406-money-smoke.txt
proof-note: AC1-8 PASS; 3× Zero-Sum diff=0, Spalte weg, Guards/ACL erhalten
review: worklog/reviews/406-review.md — PASS (2 NIT kosmetisch)
```

## Zuletzt
- **Slice 406** (2026-06-27) — Club-Treasury Single-Source (Counter-Orphan raus + DROP), Reviewer PASS, 3× Zero-Sum diff=0, DONE.
- **Slice 405** (2026-06-27) — Player-Detail Order-Kauf Shape-Norm + est-total, Reviewer PASS, post-Deploy Playwright AC1-6 LIVE PASS, DONE.
- **Slice 404** (2026-06-26) — Markt-Tab order-gebunden, post-Deploy Playwright voll bewiesen (AC01-08), DONE.

## Inline-Notiz
Slice 406 DONE — `clubs.treasury_balance_cents` war write-only Orphan (4 Writer, 0 Reader), gedriftet bis 5.715 Cr. Counter-Writes aus 4 Kauf-RPCs entfernt + Spalte gedroppt; Club-Treasury jetzt eine Quelle (`club_treasury_ledger`, SUM-on-read). Geldneutral (3× force-rollback Zero-Sum diff=0, Club-Anteil weiter via Trigger im Ledger). Pattern → errors-db.md S406.

**Geseedet PERMANENT (NICHT aufräumen, E2E-Beweis):** jarvis-Order Douglas @200 CR (96d3ce14, OPEN rem 1) + bot031-Order @300 CR (9405452f, filled). jarvis hält 4 Douglas (1 gelistet), Floor Douglas = 200 CR. (406-Smokes waren force-rollback → keine neuen Artefakte.)

Nächstes (Welle 1, Anil-Wahl): **1.4** Orderbuch `orders` vs `offers` = CEO-Architektur-Gabelung (VOR Bau klären) ODER **1.5/1.6** (BSD→Credits, Rate-Limit, fee_config-Lookup, Orderbuch Empty-State) ODER Mini-Slice IPO-Ledger-Label (`trade_fee`→`ipo_fee`). Kanon: `memory/session-handoff.md`.
