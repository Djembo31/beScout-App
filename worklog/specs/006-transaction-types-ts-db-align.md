# 006 — ALL_CREDIT_TX_TYPES ⊇ DB alignment (A-05 Follow-up)

## Ziel
`ALL_CREDIT_TX_TYPES` Union in `src/lib/transactionTypes.ts` als echtes Superset der DB `transactions.type` CHECK-Values. Fehlende DB-Values werden hinzugefuegt (`admin_adjustment`, `order_cancel`, `offer_execute`, `liga_reward`, `mystery_box_reward`, `tip_send`, `subscription`, `founding_pass`, `referral_reward`, `withdrawal`). INV-22 sichert gegen Future-Drift.

## Klassifizierung
- **Slice-Groesse:** S (1 File, 1 Test)
- **Scope:** CTO-autonom (Type-Union-Extension, NICHT removal; keine i18n; keine UI-Labels).
- **Referenz:** Slice 003 Follow-up-Backlog

## Betroffene Files
| Pfad | Aktion | Begruendung |
|------|--------|-------------|
| `src/lib/transactionTypes.ts` | EDIT — Extend `ALL_CREDIT_TX_TYPES` | Aktuelle Liste fehlt 10 DB values |
| `src/lib/__tests__/db-invariants.test.ts` | EDIT — INV-22 | Regression guard: TS ⊇ DB |

## Acceptance Criteria
1. `ALL_CREDIT_TX_TYPES` enthaelt alle aktuellen DB CHECK values (28 items).
2. TS-extras bleiben erhalten (`buy`, `sell`, `offer_buy`, `streak_bonus`, `research_earning`, `fantasy_reward`, `entry_fee`, `entry_refund`, `poll_earning`, `vote_fee`, `scout_subscription_earning`, `creator_fund_payout`, `ad_revenue_payout`, `pbt_liquidation` — die sind im activityHelpers referenziert).
3. INV-22: fetched DB CHECK values fuer `transactions.type`, ueberprueft alle ∈ `ALL_CREDIT_TX_TYPES`. Fail wenn DB einen Wert hat der TS nicht kennt.
4. tsc clean.
5. Bestehende Tests gruen (activityHelpers.test.ts).
6. Proof: `worklog/proofs/006-inv22.txt`.

## Edge Cases
1. **Neuer DB-Wert ueber Migration hinzugefuegt** → INV-22 fail sofort. Gewollt.
2. **TS-Wert entfernt der activityHelpers referenziert** → tsc-Error. Deshalb: NUR add, kein remove.
3. **`'reward'` als Alias in activityHelpers.ts:12,44** → Weder in DB noch `ALL_CREDIT_TX_TYPES`. Historisch. Lasse ich.
4. **PUBLIC_TX_TYPES unveraendert** — nicht Teil dieses Slices (welche types user-public sind ist CEO-Decision).

## Proof-Plan
- `npx vitest run -t "INV-22"` gruen (TS ⊇ DB erfuellt).

## Scope-Out
- **KEIN i18n Update** — neue DB-types haben ggf. keine DE/TR Labels. Fallback in activityHelpers greift (raw string). TR ist CEO-Scope.
- **KEIN activityHelpers-Mapping fuer neue Types.** Fallback 'Activity'-Icon + raw label funktioniert. Bessere Labels = separater Slice.
- **KEIN PUBLIC_TX_TYPES Update.** Aenderung was oeffentlich sichtbar ist = CEO-Decision.
- **KEIN Remove von TS-only Werten** (consumer-checks brauchen langen Scope).

## Stages
- SPEC — dieses File
- IMPACT — skipped (1 File Extend + 1 Test)
- BUILD — transactionTypes.ts + INV-22
- PROVE — vitest
- LOG — Eintrag + Commit
