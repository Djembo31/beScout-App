# Proof — Slice 330: CSF-Engine ans Treasury

Datum: 2026-06-17 · Projekt: skzjfhvgccaeplydsunz (beScout-App) · alle mutierenden Smokes force-rolled-back.

## AC1–AC4 + new formula (Struktur, `pg_get_functiondef` nach Apply)
```
has_csf_multiplier_BAD : false   ← Multiplikator raus
has_mastery_BAD        : false   ← Mastery raus
has_effective_qty_BAD  : false
has_115_cap_BAD        : false   ← 1.15-Deckel raus
has_guard_OK           : true    ← treasury_insufficient_for_csf
has_debit_csf_OK       : true    ← book_club_treasury('debit','csf',…)
has_new_formula_OK     : true    ← proportional_v3_2026_06_17
pbt_source_unchanged_OK: true    ← pbt_treasury SET balance (Quelle unverändert)
```

## AC11 — Grants (REVOKE/GRANT 1:1 Baseline)
```
grantees: authenticated,postgres,service_role   (kein anon, kein PUBLIC)
```

## AC9 — Guard-Simulation gegen Realdaten (read-only)
12 un-liquidierte Spieler mit sf_pool>0; Guard diskriminiert korrekt. Auszug:
```
player fe3080d2  sf_pool 2.250.000  avail 3.723.200  would_pass true
player da3eb36c  sf_pool 1.000.000  avail   850.000  would_pass FALSE
player 092e70ad  sf_pool   500.000  avail   425.000  would_pass FALSE
... (8× true dazwischen)
```

## AC10 — Block-Pfad fail-safe (Spieler 0e6b35dc, sf_pool 350.000 > avail 96.171)
Aufruf als Club-Admin (jwt gesetzt), DO-Block force-rollback:
```
ERROR P0001: treasury_insufficient_for_csf: benoetigt 350000, verfuegbar 96171
  (CONTEXT: liquidate_player line 102)
```
Post-Check (nichts committed):
```
csf_ledger_rows = 0 · player is_liquidated = false · liq_events = 0
```

## AC2 behavioral — Erfolgs-Pfad debitiert Treasury exakt (Spieler 2a2fee38, sf_pool 770.000 ≤ avail 886.347)
DO-Block force-rollback, nach erfolgreichem liquidate_player:
```
weighted=false  csf_debited=770000  sf_result=770000
ledger_debit: dir=debit amount=770000  (Saldo 886347 -> 116347)
sf_tx_rows=11   ← 11 Holder bekamen success_fee-Transaktionen (Constraint-Fix greift)
ledger_matches_result = t   (debit == csf_debited_cents AND bal_after == bal_before - debit)
(ROLLED BACK)
```

## Prereq-Fix (entdeckt in PROVE) — transactions_type_check
`liquidate_player` schreibt `pbt_liquidation` + `success_fee` seit Slice 178, beide fehlten im CHECK
→ jede Liquidation mit Auszahlung failt (23514). Verifiziert: 0 Rows mit diesen Typen je existent (latent).
Migration `20260617130500` ergänzt beide Werte. Erfolgs-Pfad-Proof oben (sf_tx_rows=11) beweist den Fix.

## AC6/AC7 — UI-Badge-Promise + i18n-Orphan weg
```
grep "csfBonus|showMultiplier|csfMultiplier" src/ messages/
→ nur dormante Service/Lib-Felder (fanRanking.ts Tier-Tabelle + services/fanRanking Return-Feld).
  KEIN csfBonus, KEIN showMultiplier mehr. Badge-Promise vollständig entfernt.
```

## AC8 — tsc + vitest
```
pnpm exec tsc --noEmit        → EXIT 0
vitest (liquidation, activityHelpers, gamification, club): 8 Files / 75 Tests passed
+ activityHelpers successFee-Assertion: 17/17 passed
```
