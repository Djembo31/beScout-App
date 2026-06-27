# Active Slice

```
status: active
slice: 417
title: Offers — Eigen-Gebot-Leak in "Offene Gebote" schließen (server-SSOT Eigen-Ausschluss, getOpenBids + dashboard-RPC)
size: S (Service +1 Filter + SEC-DEFINER-RPC read-filter + Tests; Money-Domain read-only, kein Geldfluss)
stage: PROVE (Live-UI nach Deploy ausstehend)
spec: worklog/specs/417-open-bids-own-exclusion.md
impact: inline (Consumer in Spec §3 gegrept; 3 Pfade, nur Pfad 1 sichtbarer Bug)
proof: worklog/proofs/417-rpc-verify.txt + 417-offers-tests.txt (Live-UI nach Deploy)
review: worklog/reviews/417-review.md — PASS (2 NIT out-of-scope)
```

## Diagnose (faktenbasiert, korrigiert den Handoff)
Der Handoff-Befund „cancel_offer_rpc nicht verkabelt" ist **falsch** — `cancelOffer` ist im "Ausgehend"-Tab verkabelt (`OffersTab.tsx:464` + Button `isSender && onCancel`). Der **echte** Bug: `getOpenBids({ownedByUserId})` (`offers.ts:115-122`) schließt eigene Gebote NICHT aus → jarvis' öffentliches Kaufgebot auf Douglas (das er besitzt) leckt in den "Offene Gebote"-Tab als **tote Zeile** (kein Accept: `isIncoming=false`; kein Cancel: nur `outgoing`-Tab). = exakt was der Walker live sah (Proof `welle1-e2e-lifecycle-walk.txt` Z.51). Wurzelklasse = Welle 1.6 (Eigen-Ausschluss, weil `accept_offer` Selbst-Annahme blockt, S416).

## Plan (server-SSOT)
1. `getOpenBids`: `if (ownedByUserId) query = query.neq('sender_id', ownedByUserId)` (Pfad 1, sichtbarer Bug).
2. RPC `get_market_user_dashboard` open_bids-Subquery: `AND sender_id <> p_user_id` (Pfad 2, server autoritativ → BestandView-Band-Aid Z.115 wird redundant, bleibt als Defense-in-Depth).
3. Pfad 3 (Player-Detail) schon via Welle-1.6-SSOT erledigt — nicht anfassen.

## Zuletzt
- **Slice 416** (2026-06-27) — Welle 1.6 Eigen-Order/Bid-Exclusion SSOT, 4 Surfaces (S, PASS). Welle 1 Trading e2e KOMPLETT.

Nächstes: nach 417 → Welle 2 Spieltag/Scoring [Money] (Anil-Wahl "2 dann 1").
