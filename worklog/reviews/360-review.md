# Slice 360 Review — IPO-Fee REIN in Plattform-Topf

**verdict: PASS**
**reviewer:** Cold-Context-Reviewer-Agent (Money-Pflicht §3)
**time-spent:** 6 min

## Findings
| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| N1 | NITPICK | migration / 358-Vorbild | 358 nutzt `v_platform_fee`, hier korrekt `v_platform_share` (real korrekter Name in `buy_from_ipo`). Kein Bug. | keiner |
| N2 | NITPICK | Proof [6] | `ipo_buy ∈ transactions_type_check` behauptet statt per `pg_get_constraintdef` belegt. Kein neuer Typ → tolerierbar. | optional Snippet |

Keine MEDIUM+/REWORK/FAIL-Findings.

## One-Line
„Ja — chirurgischer additiver 1-Block-Diff, korrekte Variable + ref, Race-/CHECK-/Zero-Sum-Risiken sauber adressiert, Money-Smoke beweist Δ=1000 mit cleanem Rollback. Mergebereit."

## Belege (6 Prüfpunkte)
1. **PATCH-AUDIT** — Body = exakter Live-Stand, genau 1 additiver Block nach PBT-Block vor `INSERT INTO transactions`. Fee-Konstanten (8500/1000/Rest 500), AR-6, early_access, Limits, auth+lock alle unverändert. Kein 80→70-Drift-Äquivalent.
2. **Variable/ref** — `v_platform_share` korrekt (`v_platform_fee` existiert hier nicht), ref `v_trade_id`. Pre-Mortem #1 vermieden.
3. **Einfügestelle** — nach `RETURNING id INTO v_trade_id` → ref nie NULL. Pre-Mortem #2 vermieden.
4. **CHECK/Race** — `'ipo'` im source-CHECK gedeckt, advisory_xact_lock + Singleton-Row-Lock (D97), 1 Ledger-Row/Trade. Guard `IF v_platform_share > 0` deckt AC-3.
5. **Zero-Sum/Konstante** — `10000 = 8500+1000+500`, `platform 1000 = 10%`, Rollback sauber (pot_now=0).
6. **Compliance** — Ledger-Desc `'IPO-Fee (Erstverkauf)'` admin-facing, business.md erlaubt „IPO" admin-facing; „Erstverkauf" doppelt sicher.

## Spec-Coverage
AC-1..AC-7 alle ✅ (siehe Proof).

## Adressierung
N1/N2 = informativ, keine Code-Änderung. Merge ohne Rework.
