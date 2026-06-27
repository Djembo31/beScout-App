# Slice 413 Review — Markt-Kauf-RPCs vereinheitlichen (Welle 1.5 a/c/d/e)

**Reviewer:** Cold-Context reviewer-Agent (Money) · **Datum:** 2026-06-27 · **time-spent:** 9 min

## Verdict: PASS (merge-fähig)

## Findings
| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | INFO | migration:71/217 | `'Max 20 Trades/24h'`-String jetzt inhaltlich falsch für gold/silber/bronze (Limit 200/50/30). Bestand vor 413, durch (a) nun in beiden. Mappt korrekt, kein Money-Risiko. | Optional i18n-Polish-Slice (`rateLimitExceeded` generisch). |
| 2 | INFO | migration:108/246 | `'Nicht genug BSD'`-Legacy-Prosa. Out-of-Scope (§11, 1.5b-Hygiene). | Geplanter Hygiene-Slice. |

## PATCH-AUDIT (S156) — verifiziert byte-treu
- **buy_player_sc:** geändert exakt (e) SELECT `+last_price`, (d) Reject Z.94, (e) price_change Z.137-140. Auth-Guard/Idempotency-5-Block/advisory-lock/circular/self-trade/club-admin/fee-split/escrow/holdings/trades/credit_pbt/book_platform_treasury/recalc_floor/transactions/Return-Shape **unverändert**.
- **buy_from_order:** geändert exakt (a) tier-Subquery Z.217 (nutzt korrekt `p_buyer_id`), (c) created_at DESC Z.223-224. Rest byte-identisch.
- **Konstanten (trading.md):** 600/150/100 Fee-Split + tier 200/50/30/20 in beiden intakt (kein S356-Wert-Drift).
- **ACL:** beide unverändert `{postgres,authenticated,service_role}`, kein anon (AR-44). Treasury source 'trading' unverändert (kein S379-Gate). transactions.type unverändert (kein S330-Sync).

## Money-Verifikation
- AC1 reject ✓ · AC2 price_change=-33.3333 ✓ · AC3 tier (code-Beleg, ehrlich nicht behavioral) · AC4 fee_config created_at DESC effective_fee_bps=600 ✓ · AC5 Zero-Sum delta=0 beide RPCs ✓ · AC6 ACL/Guards erhalten ✓.
- Keine Stelle, an der Geld entsteht/verschwindet. (c) geldneutral (fee_config 1 Row). S406-ILIKE-FP (Kommentar-Artefakt) proaktiv im Proof entschärft.

## Summary
4 Drift-Dimensionen zwischen den beiden Markt-Kauf-RPCs sauber angeglichen, beide Bodies byte-treu, Zero-Sum bewiesen. PASS. Die 2 INFO-Findings sind Legacy-String-Hygiene (eigene Slices).
