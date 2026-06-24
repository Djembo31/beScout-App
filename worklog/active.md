# Active Slice

```
status: idle
slice: 362
title: ✅ DONE — platformAdmin chunked/paginated Reads (player_count Live-Bug + 5 HIGH silent-fail)
stage: LOG complete
size: S
slice-type: Service
spec: inline (Crash-Recovery-Nebenbefund-Kette 360→361→362)
impact: skipped (1 Service-File, 2 Caller verifiziert)
proof: worklog/proofs/362-platformadmin-chunked.txt
review: worklog/reviews/362-review.md (PASS, 2 NIT, NIT#1 adressiert)
next: E3 restliche Fee-Quellen REIN (Polls/Research/Bounty) — Money/CEO-Scope, selbst
```

## Kontext

- **Epic E3 Plattform-Treasury (D96), Slice 2 „Fees REIN", Teil 2/5 = IPO.** Anker `worklog/notes/358-platform-treasury-epic.md`.
- **Muster 1:1 aus 358:** Inline `IF v_platform_share > 0 THEN PERFORM book_platform_treasury('credit','ipo',v_platform_share,v_trade_id,'IPO-Fee (Erstverkauf)'); END IF;` nach PBT-Block in `buy_from_ipo`.
- **Live-verifiziert (D87):** `buy_from_ipo`-Body gelesen; `'ipo'` im source-CHECK schon erlaubt → keine CHECK-Migration. Policy D98 (100 % Auffang) approved.

## Zuletzt

- **Slice 362** ✅ — platformAdmin chunked/paginated Reads (1e3c9abc): getAllClubs.player_count Live-Bug (4472 vs 1000-Cap) + 5 HIGH silent-fail geklärt, Baseline 170/77/93.
- **Slice 361** ✅ — AdminTreasuryTab Promise.allSettled → logSilentRejects (890926cc).
- **Slice 360** ✅ — IPO-Fee REIN Plattform-Topf (E3-2b, 81ec6e0b).
- **Slice 359** ✅ — accept_offer side='sell' repariert ('offer_buy' in CHECK).
