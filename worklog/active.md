# Active Slice

```
status: idle
slice: 360
title: ✅ DONE — IPO-Fee REIN in Plattform-Topf (E3-2b)
stage: LOG complete
size: S
slice-type: Migration (Money-RPC) + Test
spec: worklog/specs/360-ipo-fee-rein.md
impact: skipped (additive Inline-Buchung, 0 Consumer-Contract-Change, kein Schema-Shape-Change)
proof: worklog/proofs/360-money-smoke.txt
review: worklog/reviews/360-review.md (PASS, 2 NIT informativ)
next: E3 restliche Fee-Quellen REIN (Polls/Research/Bounty)
```

## Kontext

- **Epic E3 Plattform-Treasury (D96), Slice 2 „Fees REIN", Teil 2/5 = IPO.** Anker `worklog/notes/358-platform-treasury-epic.md`.
- **Muster 1:1 aus 358:** Inline `IF v_platform_share > 0 THEN PERFORM book_platform_treasury('credit','ipo',v_platform_share,v_trade_id,'IPO-Fee (Erstverkauf)'); END IF;` nach PBT-Block in `buy_from_ipo`.
- **Live-verifiziert (D87):** `buy_from_ipo`-Body gelesen; `'ipo'` im source-CHECK schon erlaubt → keine CHECK-Migration. Policy D98 (100 % Auffang) approved.

## Zuletzt

- **Slice 359** ✅ — accept_offer side='sell' repariert ('offer_buy' in CHECK).
- **Slice 358** ✅ — Fees REIN Trading (E3-2, fb31c6b6).
- **Slice 357** ✅ — Plattform-Treasury Topf-Fundament.
