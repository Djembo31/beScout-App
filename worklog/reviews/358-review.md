# Review — Slice 358 (E3-2 Fees REIN Trading)

**Reviewer-Agent (Cold-Context), 2026-06-24 · time-spent: 9 min**

## Verdict: PASS

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | INFO | `accept_offer` (pre-existing) | CHECK-Drift: `type = CASE … ELSE 'offer_buy' END`, aber `offer_buy` fehlt in `transactions_type_check` → side='sell'-Accept wirft 23514 (S330-Klasse). Korrekt out-of-scope; 358-Buchungsblock läuft VOR dem failenden INSERT → Topf unbeschädigt. Live `offer_buy`-Count=0 = P2P-Sell-Offers sind seit jeher kaputt. | Eigener Slice: `offer_buy` in CHECK + 4-File-Sync (activityHelpers + de/tr.json). |
| 2 | NITPICK | beide Orderbuch-RPCs | Identischer Description-String `'Trading-Fee (Orderbuch)'` für buy_player_sc + buy_from_order. source-Tag korrekt 'trading' für beide; Unterscheidung nur via reference_id→trade. | Optional distinkter Suffix. Nicht merge-blockierend. |

## One-Line
Ja — Senior merged das: chirurgischer +1-Block je RPC, Zero-Sum live bewiesen (350/350/200 in den Topf), alle Guards/Fee-Konstanten erhalten, korrekt geguarded und als letzter Lock platziert.

## Belege
- **PATCH-AUDIT:** kein Silent-Revert. Auth-Guards, Idempotenz, Fee-Konstanten (Trading 600/150/100, P2P 200/50/50 = trading.md), Seller-Ownership-Guard alle intakt. Konstanten-Smoke (350+150+100=600) deckt S356-Lehre ab.
- **Platzierung:** nach v_trade_id, nach Club-Block, einmal/Trade, `IF >0`-guarded, kein Pfad vor Status-/Auth-Guards. Idempotenz-Replay returnt vor Body → keine Doppelbuchung (AC6: 1 Zeile).
- **Source/Zero-Sum:** trading/trading/p2p korrekt zur D96-Taxonomie. Zero-Sum je Pfad live.
- **Lock:** Singleton-FOR-UPDATE zuletzt akquiriert in allen 3 RPCs → kein Deadlock-Zyklus. Variante-A unkritisch beim Pilot.
- **Scope:** grep `INSERT INTO trades` → nur die 3 RPCs (+ IPO bewusst eigener Slice). Vollständig.

## Positive
Chirurgischer Diff · Force-Rollback gegen echte RPC-Calls (AC8 implizit) · ehrlicher Proof (Nebenbefund offen dokumentiert statt umgangen) · Source-Trennung via Tag statt fragiler Trigger-Heuristik = richtige Architektur.

## Empfehlung
Mergefähig. Nachzieher: pre-existing `offer_buy`-CHECK-Bug als eigenen Slice anlegen (Backlog).
