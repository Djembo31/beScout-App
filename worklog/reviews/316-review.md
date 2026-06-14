# Slice 316 Review — Founding-Pass Money-Härtung

**Verdict: PASS** (merge-ready) · Reviewer: cold-context reviewer-Agent · time-spent: 14 min · 2026-06-14

P0 Money + SECURITY DEFINER — höchste Sorgfalt.

## Spec-Coverage
- AC1 bcreditsCents {250000/1000000/3500000/10000000} ✓ (`foundingPasses.ts:39,51,63,75`)
- AC2 bcreditsLabel == fmtScout(centsToBsd(...)) → "2.500/10.000/35.000/100.000" ✓
- AC3 RPC v_price CASE (999/2999/7499/19999), INSERT+Kill-Switch nutzen server-Preis, Mismatch→RAISE ✓
- AC4 REVOKE PUBLIC+anon + GRANT authenticated, Signatur (uuid,text,integer,text) ✓
- AC5 Invariant deckt bcredits+price+bonus+label + Tier-Vollständigkeit ✓
- AC6 tsc clean + 32 Tests grün ✓

## Verifiziert
- **PATCH-AUDIT (Slice-156):** alle Pre-existing Features erhalten (admin-check, kill-switch return-shape, tx-log initcap, wallet-UPSERT, migration_bonus_pct). Live pg_get_functiondef als Baseline.
- **Reihenfolge:** admin → tier-validate → CASE → price-guard → kill-switch → INSERT → wallet → tx-log. Guard+Kill-Switch VOR jedem Write (kein Teil-Write).
- **Schema-Columns:** transactions(6 cols, type='founding_pass' im XC-09-CHECK), wallets-UPSERT, append-only-Trigger (INSERT erlaubt). price_eur_cents INTEGER vs v_price BIGINT (max 19999, safe cast).
- **Consumer-Audit:** kein hartcodierter bcredits/Preis-Consumer; page.tsx/TierComparisonMatrix/AdminFoundingPassesTab lesen alle derived aus FOUNDING_PASS_TIERS.

## Findings
| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | migration Z.51 | v_price BIGINT+Cast statt INTEGER — funktioniert, minimal verbose | keine Änderung |
| 2 | OBSERVATION (out-of-scope, PRE-EXISTING) | `founding/page.tsx:123` | Self-Service-Buy ruft `grantFoundingPass` für JEDEN eingeloggten User, aber RPC hat Admin-Gate → normaler User bekommt RAISE 'Nicht berechtigt'. Erklärt "0 Pässe verkauft". NICHT durch 316 verursacht. | Eigener Slice: Public-Wrapper-RPC für Self-Service ODER Buy-Button hidden bis Payment-Gateway live |

## Carry-over für Backlog
Finding #2 = die Founding-Pass-Kaufstrecke ist für normale User aktuell tot (Admin-gated RPC, kein Public-Purchase-Pfad + kein Payment-Gateway). Eigener Slice/Produkt-Entscheidung — an Anil gemeldet.
