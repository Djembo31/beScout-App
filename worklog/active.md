# Active Slice

```
status: idle
slice: 359
title: ✅ DONE — fix(trading) accept_offer side='sell' repariert ('offer_buy' in CHECK)
stage: LOG complete
size: S
slice-type: Migration (Money-table CHECK) + Test
spec: worklog/specs/359-offer-buy-check-fix.md
impact: skipped (additiver CHECK-Wert = Superset, 0 bestehende Rows betroffen; Code/i18n schon vorhanden)
proof: worklog/proofs/359-smoke.txt
review: worklog/reviews/359-review.md (CONCERNS→adressiert: 330-Drift pbt_liquidation/success_fee mit-reconciled)
next: E3 restliche Fee-Quellen REIN (IPO/Polls/Research/Bounty)
```

## Kontext

- **Pre-existing Live-Bug aus Slice-358-Money-Smoke:** `accept_offer` side='sell' wirft `23514`, weil `type='offer_buy'` nicht im `transactions_type_check` steht → P2P-Sell-Offers seit jeher kaputt (Live `offer_buy`-Count=0).
- **Befund:** Frontend (`activityHelpers.ts`), Types (`transactionTypes.ts`), i18n (`de.json`+`tr.json` `offerBuy`) handhaben `offer_buy` BEREITS. Es fehlt nur der DB-CHECK + die Invariant-Test-Zeile (S330-Klasse: 4-File-Sync war unvollständig — nur CHECK vergessen).

## Zuletzt

- **Slice 358** ✅ — Fees REIN Trading (E3-2, fb31c6b6).
- **Slice 357** ✅ — Plattform-Treasury Topf-Fundament.
