# Slice 108 — liquidate_player: Tier-Table → Lineare Formel (CEO Pricing-Asset-Model)

## Ziel (1 Satz)
`liquidate_player` RPC rechnet Success-Fee pro Card als **linear** `MV_EUR / 10` cents statt 10-stufiger Tier-Table, konsistent mit dem CEO Pricing-Asset-Model. Cap + Mastery + PBT bleiben unverändert als Bonus-Layer.

## CEO-Approval
Anil 2026-04-20: "Option C, cap berücksichtigen" nach Audit-Report. Grundregel ist klar:
- **1 Mio € MV → 10 € pro Card = 1.000 $SCOUT = 100.000 cents** (Sivasspor-verifiziert)
- Card-Preis = `MV_EUR / 100.000` € = `MV_EUR / 10` cents
- 10% Community-Pool bei voll 10.000 ausgegebenen Cards (ergibt sich automatisch aus Formel)

## Root-Cause

Der aktuelle Live-RPC (verifiziert via `pg_get_functiondef` 2026-04-20) nutzt eine 10-stufige Tier-Table:
```
>= 50M€ → 7.500.000 cents  (soll: 5.000.000)
>= 1M€  →   150.000 cents  (soll:   100.000)
<100K€  →     5.000 cents  (soll:  MV/10)
```
Payout ist systematisch ~1,5× höher als CEO-Regel → Verein zahlt zu viel, User kriegt zu viel (nicht existentiell, aber wirft das mentale Modell um).

## Betroffene Files

| File | Änderung |
|------|----------|
| `supabase/migrations/20260420XXXXXX_liquidate_player_linear_formula.sql` | NEU: RPC rewrite, Tier-CASE → `v_transfer_value / 10`, Rest identisch |
| `src/components/player/PlayerRow.tsx:90-111` | `SUCCESS_FEE_TIERS` Tier-Array → linearer Helper `calcSuccessFee(mv) = mv/10` |
| `src/components/admin/AdminPlayersTab.tsx` | Nutzt `getSuccessFeeTier().fee` → ersetzen durch `calcSuccessFee()` |
| `src/components/player/detail/RewardsTab.tsx` | Gleicher Check |
| Tests für RPC-Invariante + Helper-Formel |

## Acceptance Criteria

1. `SELECT (liquidate_player(admin, player, 1_000_000)::jsonb)->>'fee_per_dpc_cents'` = `100000` (= 1.000 $SCOUT, matcht Bekir-Baseline).
2. Bei `MV = 5_000_000 €` → `fee_per_dpc_cents = 500000` (5× Growth matcht 5× Payout).
3. `success_fee_cap_cents` Cap wird vor Formel-Output angewendet (LEAST).
4. Cap Maximum 10.000.000 cents (aus `set_success_fee_cap` Bound) bleibt respektiert.
5. Mastery-Bonus (1.00-1.35×) + CSF-Multiplier, kombiniert gecappt auf 1,15×, bleiben identisch.
6. PBT-Treasury-Distribution bleibt proportional zu effective_qty, unverändert.
7. Auth-Guard `auth.uid() != p_admin_id` → Exception, unverändert.
8. Frontend Helper `calcSuccessFee(marketValueEur)` returned `marketValueEur / 10` als cents, keine Tier-Buckets mehr.
9. Invariant-Test: `fee_per_dpc_cents == FLOOR(transfer_value_eur / 10)` (bei Cap = null).
10. Live-RPC-Body enthält NICHT mehr das `CASE WHEN v_transfer_value >= ... THEN`-Tier-Block.

## Edge Cases

1. **MV = 0** — `fee_per_dpc = 0`, kein Payout (v_total_sf_pool = 0). Wallet-Update wird übersprungen. ✓
2. **MV < 10 EUR** (z.B. MV=5) — `5 / 10 = 0` (integer division) → fee = 0. OK, Player mit Mini-MV hat schon Liquidation-Probleme. Kein Guard nötig.
3. **Cap gesetzt, liegt unter Formel-Output** — z.B. MV=100M, fee = 10M cents, cap = 5M cents → LEAST → 5M cents. Cap schützt Verein vor Runaway-Payouts.
4. **Cap = NULL (nie gesetzt)** — IF-Branch skippt, Formel-Output direkt. ✓
5. **Cap = 0** — `set_success_fee_cap` mapped 0 → NULL (`CASE WHEN p_cap_cents = 0 THEN NULL`). Kein Konflikt.
6. **p_transfer_value_eur = 0** — fallback auf `v_player.market_value_eur` (existing logic unverändert).
7. **Holdings leer (niemand hält Cards)** — v_total_dpcs = 0, pool = 0, loop läuft 0× durch. is_liquidated := TRUE ohne Payout. ✓
8. **Concurrent Trade während Liquidation** — FOR UPDATE Lock auf holdings (unverändert) verhindert.
9. **Migration idempotent** — `CREATE OR REPLACE FUNCTION`, kein DROP. Alte Tier-Tabellen-Werte werden einfach überschrieben.
10. **Rollback-Strategie** — Revert-Migration mit altem Tier-Body hinterlegen falls Produktions-Incidents.

## Proof-Plan

1. `worklog/proofs/108-rpc-body-before.txt` — Aktueller Tier-Body (schon gezogen)
2. `worklog/proofs/108-rpc-body-after.txt` — `pg_get_functiondef('liquidate_player')` nach Migration
3. `worklog/proofs/108-dryrun-formel.txt` — Testcases MV ∈ {100K, 1M, 5M, 50M, 100M} mit erwarteten vs tatsächlichen `fee_per_dpc_cents`
4. `worklog/proofs/108-tests.txt` — Vitest für `calcSuccessFee` Helper
5. `worklog/proofs/108-invariant.txt` — DB-Invariant-Test: `SELECT fee_per_dpc_cents, transfer_value_eur FROM liquidation_events` → Ratio muss 1:10 sein (bei kein Cap)

## Scope-Out

- PBT-Treasury-Logik bleibt unverändert (nicht Teil der CEO-Regel-Korrektur)
- Mastery/CSF-Multiplier-System bleibt (ist Gamification-Layer on top)
- `reference_price = MV × 10` Legacy-Trigger bleibt (fast ungenutzt, separater Slice)
- `ipo_price` Import-Script-Defaults bleiben (separater Slice 109)
- `success_fee_cap_cents` Upper-Bound von 10M cents (100k $SCOUT) bleibt — passt jetzt zu 1 Mrd € MV-Spielern als sinnvoller Cap

## Migration-Strategie

1. Create migration via `mcp__supabase__apply_migration` (NIE `supabase db push` — Registry-Drift-Regel).
2. Migration: `CREATE OR REPLACE FUNCTION liquidate_player` mit neuer Formel.
3. Post-migration: RPC-Body via `pg_get_functiondef` dumpen und als Proof ablegen.
4. Keine existierenden `liquidation_events` mutieren — alter Payout bleibt historisch korrekt. Nur neue Liquidations folgen Formel.

## Sicherheits-Checks

- **SECURITY DEFINER** bleibt (unverändert)
- **Auth-Guard** bleibt (`auth.uid() != p_admin_id` → Exception)
- **Club-Admin-Check** bleibt (via `club_admins`)
- **FOR UPDATE Locks** bleiben (player + holdings + pbt_treasury)
- **REVOKE/GRANT** bleibt (nur authenticated via Club-Admin-Check)

## Kommunikation Post-Deploy

Da User in Pilot möglicherweise basierend auf Tier-Werten Erwartungen gebildet haben:
- Keine aktiven Erwartungen: noch keine Liquidation stattgefunden? → silent deploy OK
- Wenn schon kommuniziert wurde: Club-Admin FAQ updaten
- `business.md` erweitern mit CEO-Regel als user-facing Referenz

