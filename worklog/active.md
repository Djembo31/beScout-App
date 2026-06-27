# Active Slice

```
status: idle
slice: 417
title: Offers — Eigen-Gebot-Leak in "Offene Gebote" geschlossen (server-SSOT, getOpenBids + dashboard-RPC) — DONE
size: S (Service +1 Filter + SEC-DEFINER-RPC read-filter + Tests; Money-Domain read-only)
stage: LOG (DONE)
spec: worklog/specs/417-open-bids-own-exclusion.md
impact: inline (3 Consumer-Pfade gegrept; nur Pfad 1 sichtbarer Bug)
proof: worklog/proofs/417-rpc-verify.txt + 417-offers-tests.txt + 417-live-ui.txt
review: worklog/reviews/417-review.md — PASS (2 NIT out-of-scope)
```
**✅ DONE + LIVE-VERIFIED (2026-06-27, bescout.net jarvis-qa):** Bug = eigenes öffentliches Kaufgebot auf besessenen Spieler leckte als tote Zeile in „Offene Gebote". Handoff-Befund „cancel_offer_rpc nicht verkabelt" war FALSCH — Storno IST im „Ausgehend"-Tab. Fix = server-SSOT Eigen-Ausschluss an 2 Quellen (`getOpenBids` `.neq('sender_id', ownedByUserId)` + RPC `get_market_user_dashboard` open_bids `AND sender_id <> p_user_id`); Pfad 3 (Player-Detail) bewusst unberührt (Welle-1.6-Client-SSOT). Reviewer PASS, 36 Tests, tsc 0, PATCH-AUDIT (ACL+auth-guard erhalten), AC-3 force-rollback. **Live-Walk (geseedetes Yildiz-Gebot 50 CR):** „Offene Gebote" leer (Eigen-Gebot weg) · „Ausgehend" zeigt es mit „Zurückgezogen"-Button · Storno via UI → cancelled, balance +5000 refunded, locked 0. Seed sauber aufgelöst. Commit eb69c4e2 (Live-Proof folgt im Finalize-Commit).

## Zuletzt
- **Slice 416** (2026-06-27) — Welle 1.6 Eigen-Order/Bid-Exclusion SSOT, 4 Surfaces (S, PASS). Welle 1 Trading e2e KOMPLETT.

Nächstes: **Welle 2 Spieltag/Scoring [Money]** — größter Mock→Pro-Brocken (Scores an GW-Nummer statt Fixture-gebunden, Datenmodell-Integrität). Selbst (§3) + Live-`pg_get_functiondef` VOR Spec (D87) + Zero-Sum.
