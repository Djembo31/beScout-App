# Active Slice

```
status: idle
slice: 368c
title: ✅ DONE — Floor-Orderbuch transparent + manipulationssicher (Preis-Band ÷3..×3 + Floor-Quelle + Label-Vereinheitlichung)
stage: LOG complete
size: M
slice-type: Migration (Money-RPC) + Service + UI
spec: worklog/specs/368c-floor-orderbook-transparency.md
impact: worklog/specs/368c-floor-orderbook-transparency.md §3+§4 (place_sell_order Consumer + Floor-Label-Stellen grep-verifiziert)
proof: worklog/proofs/368c-floor-band.txt (Live-Reject/Pass/Boundary-Smoke + AC1 cap/9 + AC9 Money-Pfad unberührt + Grants). Playwright-Sublabel offen post-Deploy (AC7).
review: worklog/reviews/368c-review.md (reviewer PASS, 3 LOW, alle nicht-blockierend)
next: 369 /api/push→500, dann 370 E2E-Sweep ②–⑤
```

## CEO-Entscheid (2026-06-24, Anil)
- Anti-Manipulation = **symmetrisches Preis-Band beim Order-Erstellen**: min = Anker÷3, max = Anker×3 (Cap existiert schon). Faktor **÷3** bestätigt.
- Umsetzung: `get_price_floor = get_price_cap ÷ 9` (kohärent: cap = 3×Referenz → floor = Referenz÷3 = cap÷9). Reuse der reviewten Cap-Logik.
- Sybil (mehrere Accounts im Ring A→B→C→A) = **separater späterer Slice** (braucht Identitäts-/Geräte-Signale, Phase-2-relevant, Credits Phase 1 = wertloses Spielgeld).

## Schon existierender Schutz (Live-verifiziert, NICHT neu bauen)
- Selbst-Handel blockiert (buy_from_order/buy_player_sc/accept_offer: `user_id != buyer` / „Eigene Order").
- Reziprok-Ping-Pong A↔B blockiert (`v_circular_count`, 7 Tage).
- Max 20 Trades/Spieler/24h · Max 10 Orders/Spieler/h · Preis-OBERgrenze 3×Anker · Club-Admin-Handelsverbot.

## Zuletzt
- **Slice 368b** (2026-06-24) — RewardsTab-Anzeige-Wahrheit (M, PASS, live).
- **Slice 368a** (2026-06-24) — Scout-Card-Wertmodell als Kanon (D100, XS, PASS).
