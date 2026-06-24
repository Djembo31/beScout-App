# Slice 376 — Monats-Liga e2e: Payout aus dem Plattform-Topf (E3 Slice 3, RAUS-Kanal #1)

**Slice-Type:** Migration (Money-RPC) · **Größe:** M · **Scope:** Money / CEO

## 1. Problem-Statement (Evidence)

`close_monthly_liga(p_month)` zahlt die Monats-Liga-Rewards heute durch **reines Minten**:
```
UPDATE wallets SET balance = balance + reward_cents …   -- aus dem Nichts
```
(Live-`pg_get_functiondef` gelesen 2026-06-25, D87.) Pro Monat entstehen so **34.000 Credits** (= 3.400.000 cents) aus dem Nichts: (5.000 + 2.500 + 1.000) × 4 Dimensionen (trader/manager/analyst/overall), Top-3.

Das ist der erste **RAUS-Kanal** im E3-Topf-Epic (D96/D98, Plan `worklog/notes/358-platform-treasury-epic.md`): das Geld soll **aus dem BeScout-Topf** kommen (`platform_treasury`, Slice 357), nicht gemintet — Modell deflationär→**zirkulär**.

Zwei begleitende Befunde:
- **`overall`-Bug:** Die `overall`-Dimension rankt heute nach `(ARRAY[trader_delta, manager_delta, analyst_delta])[2]` = **nur manager_delta**, nicht dem Median. Falsche Sieger → falsches Geld (Money-Korrektheit).
- **Cold-Start:** Topf-Saldo live = **3.297 cents** (~33 Credits), Monatsbedarf 3.400.000 cents. CEO-Entscheid (Anil, 2026-06-25): **Genesis-Seed 500.000 Credits** einmalig in den Topf + **manueller Trigger** (kein Cron) → Liga zahlt sofort sauber zirkulär, Deckungs-Check greift praktisch nie in der Beta.

## 2. Lösungs-Design

Eine Migration, drei Teile:

**(A) `source`-CHECK widern** auf `platform_treasury_ledger`: zusätzlich `'genesis'` (additiv, bricht keine Zeile). Liga-Debit nutzt `'monthly_liga'` (schon im CHECK).

**(B) Genesis-Seed** (einmalig, idempotent via `NOT EXISTS source='genesis'`): `book_platform_treasury('credit','genesis', 50000000, NULL, 'Genesis-Anschub Liga-Topf (Slice 376)')` = 500.000 Credits.

**(C) `close_monthly_liga` CREATE OR REPLACE** — byte-treu zum Live-Body, nur diese Änderungen:
1. **`overall`-Median:** Delta + Final-Score = Median der 3 Werte via `(a+b+c) - GREATEST(a,b,c) - LEAST(a,b,c)` (exakt für 3 Werte, ties-safe).
2. **Deckungs-Check + Debit:** Nach dem Snapshot/Winner-Aufbau, vor dem Wallet-Payout:
   - Singleton-Row-Lock `PERFORM 1 FROM platform_treasury WHERE id=true FOR UPDATE` (race-frei, spiegelt `book_platform_treasury`-internes Lock).
   - Saldo inline lesen: `SUM(CASE direction…)`. **`get_platform_balance()` NICHT nutzen** (verlangt platform_admin-`auth.uid()` + returnt json, nicht bigint).
   - `v_total_needed` = Σ `reward_cents` der Winner dieses Monats.
   - `IF v_pot < v_total_needed THEN RAISE EXCEPTION 'insufficient_treasury…'` → rollt die Snapshot/Winner-Inserts zurück → Monat bleibt **retry-bar** (Idempotenz erhalten, kein „month_already_closed"-Lock auf Fehlversuch).
   - Payout-Loop unverändert (Wallet-Credit + `liga_reward`-Transaction), akkumuliert `v_total_paid`.
   - **Nach** dem Loop **einmal** debitieren: `PERFORM book_platform_treasury('debit','monthly_liga', v_total_paid, NULL, 'Monats-Liga Payout '||p_month)` (nur wenn `v_total_paid > 0`). Debit = tatsächlich Ausgezahltes (≤ needed ≤ pot → nie negativ).

**Warum Debit gegen `v_total_paid` (actual), Check gegen `v_total_needed` (max):** Ein Winner ohne Wallet-Row wird im Payout-Loop übersprungen (`v_new_balance IS NULL`) und NICHT in `v_total_paid` gezählt. Coverage gegen die Obergrenze prüfen, debitieren was real floss → zero-sum exakt.

**Warum RAISE statt RETURN-jsonb bei Unterdeckung:** Die Pre-Persist-Guards (no_active_season, month_already_closed) bleiben RETURN-jsonb (nichts persistiert). Die Coverage-Failure passiert NACH den Snapshot-Inserts → nur `RAISE` (Exception) rollt die Inserts atomar zurück. Asymmetrie ist bewusst + dokumentiert.

## 3. Betroffene Files
- `supabase/migrations/20260625130000_slice376_monthly_liga_pot_payout.sql` (NEU) — CHECK-Widening + Genesis-Seed + RPC-Replace.
- KEINE src/-Änderung (Admin-Button `handleCloseMonth` zeigt `error.message` bereits als Toast → RAISE landet sauber; Success-Shape unverändert).

## 4. Code-Reading-Liste (erledigt VOR Implementation)
1. **Live `pg_get_functiondef('close_monthly_liga')`** ✅ (D87) — Minting-Pfad, Idempotenz-Guard, overall-`[2]`-Bug bestätigt.
2. **Live `book_platform_treasury` + `get_platform_balance`** ✅ — Booking schützt NICHT gegen Negativ (Coverage-Check muss in close_monthly_liga); get_platform_balance verlangt platform_admin + json → nicht im RPC nutzbar.
3. **Live `pg_get_constraintdef` source-CHECK + transactions-CHECK** ✅ — `monthly_liga` da, `genesis` fehlt (widern); `liga_reward` da.
4. **`AdminLigaTab.tsx:34-55`** ✅ — `handleCloseMonth` liest `result.error` (jsonb) + zeigt `error.message` (Throw) als Toast. Kein Code-Change nötig.
5. **`db-invariants.test.ts:1039`** ✅ — prüft NUR Return-Shape `[ok,error,month,winners_inserted,payouts_credited,total_paid_cents]` → unverändert, kein Bruch.
6. **Topf-Saldo live (Cold-Start)** ✅ — 3.297 cents vs 3.400.000 Bedarf → Genesis-Seed-Entscheid.

## 5. Pattern-References
- **Money-Muster 329–332 / D87:** Live-functiondef vor Spec · CREATE-OR-REPLACE byte-treu · race-frei unter Row-Lock · force-rollback-Smoke · Reviewer-Pflicht.
- **PATCH-AUDIT (errors-db, S356):** Bei CREATE-OR-REPLACE Fee-/Reward-**Konstanten** prüfen (500000/250000/100000 erhalten), nicht nur Präsenz.
- **Slice 358/360/363/364/365:** Inline-`book_platform_treasury`-Booking, `IF amount>0`-Guard, source-Wert im CHECK gedeckt.
- **D96/D98:** voller Auffang / zirkuläres Modell. **D97:** Saldo = SUM-on-read unter Lock (Variante A).

## 6. Acceptance Criteria (executable)
- **AC1** Genesis-Seed: nach Migration `get_platform_balance` (bzw. SUM) = vorher + 50.000.000 cents; genau 1 Ledger-Row `source='genesis'`. Re-Run der Seed-Logik bucht NICHT doppelt.
- **AC2** source-CHECK enthält jetzt `genesis` (`pg_get_constraintdef`), alle 8 alten Werte erhalten.
- **AC3** `overall`-Median: für ein konstruiertes Trio (z.B. Deltas 10/30/20) liefert overall score_delta = **20** (Median), nicht 30 (manager). Verifiziert via Force-Rollback-Smoke gegen echte scout_scores-Zeile.
- **AC4** Zero-Sum-Payout (Force-Rollback-Smoke, BEGIN…ROLLBACK): nach `close_monthly_liga` für einen ungeschlossenen Test-Monat gilt Σ(Wallet-Zuwächse) = `total_paid_cents` = Betrag des EINEN `monthly_liga`-Debit-Ledger-Eintrags. Topf-Saldo sinkt um exakt diesen Betrag.
- **AC5** Deckungs-Check: künstlich `v_pot < needed` (Smoke gegen leeren Test-Topf in eigener Txn) → `RAISE insufficient_treasury`, KEINE Snapshots/Winners persistiert (Monat bleibt schließbar), kein Wallet verändert, kein Debit.
- **AC6** Idempotenz erhalten: zweiter `close_monthly_liga` für denselben Monat → `{error:'month_already_closed'}`, kein zweiter Payout, kein zweiter Debit.
- **AC7** Return-Shape unverändert (AC: db-invariants-Test grün) + Reward-Konstanten 500000/250000/100000 byte-identisch.

## 7. Edge Cases
| Fall | Verhalten |
|---|---|
| Kein aktive Saison | RETURN `{error:'no_active_season'}` (unverändert, pre-persist) |
| Monat schon geschlossen | RETURN `{error:'month_already_closed'}` (unverändert, pre-persist) |
| Topf < Σ Rewards | RAISE `insufficient_treasury` → voller Rollback, Monat retry-bar |
| Winner ohne Wallet-Row | übersprungen (v_new_balance NULL), nicht in v_total_paid → Debit = real geflossenes |
| <3 User in einer Dimension | weniger Winners, v_total_needed < 34.000 → Debit entsprechend kleiner |
| overall-Deltas mit Ties (z.B. 5/5/1) | Median via GREATEST/LEAST = 5 (korrekt) |
| Re-Run Migration (Genesis schon da) | NOT EXISTS-Guard → kein Doppel-Seed |
| v_total_paid = 0 (keine Winner) | kein Debit-Aufruf (IF >0) |

## 8. Self-Verification Commands
- `pg_get_functiondef('close_monthly_liga')` post-Migration: Median-Expr + Lock + Coverage + Debit drin, Reward-Konstanten + Idempotenz-Guard + Return-Shape erhalten.
- `pg_get_constraintdef` source-CHECK: enthält `genesis`.
- Force-Rollback-Smoke (BEGIN…ROLLBACK): Zero-Sum + Coverage-Reject + Idempotenz + overall-Median (Output via RAISE NOTICE / temp-select, dann ROLLBACK).
- `CI=true pnpm exec vitest run src/lib/__tests__/db-invariants.test.ts` grün (Shape).
- `pnpm exec tsc --noEmit` (kein src-Change → trivially grün).

## 9. Open-Questions
- **Geklärt (Anil 2026-06-25):** Cold-Start → **Genesis-Seed 500.000 Credits**. Trigger → **manuell** (kein Cron). Beides via AskUserQuestion bestätigt.
- **Autonom-Zone:** Genesis-Betrag 50.000.000 cents (= 500.000 Credits, deckt ~14,7 Monate); Debit als EINE Buchung/Monatsabschluss (source `monthly_liga`, ref NULL, p_month im Desc).

## 10. Proof-Plan
- `worklog/proofs/376-money-smoke.txt`: Force-Rollback-Smoke (AC3/AC4/AC5/AC6) + AC1/AC2 post-Migration-Selects + functiondef-Diff-Belege.
- Live-Abschluss eines echten Monats = optional/Folge (Admin-UI); Smoke beweist den Money-Pfad (BEGIN…ROLLBACK, keine echten Wallets verändert).

## 11. Scope-Out (explizit NICHT in 376)
- **Cron** für Auto-Monatsabschluss → Folge-Slice (Anil: erst manuell).
- **Live-Standing-Board-UI** (laufender Monat, `useMonthlyLeaderboard`-Verkabelung + `getMonthlyLeaderboard` swallow→throw-Heal) → eigener UI-Slice (Engagement-Layer, nicht RAUS-Kanal).
- BeScout-Events aus Topf (Slice 4) + Wettkampf-Darstellung (Slice 5).

## 12. Stage-Chain (geplant)
SPEC ✅ → IMPACT (inline §3+§4, 1 RPC-Consumer grep-verifiziert) → BUILD (1 Migration via apply_migration) → REVIEW (reviewer, Money-Pflicht) → PROVE (force-rollback-smoke) → LOG.

## 13. Pre-Mortem
1. **`get_platform_balance` im RPC genutzt** → auth-Fehler im SECURITY-DEFINER-Kontext → vermieden: inline SUM unter Lock.
2. **Coverage-RETURN statt RAISE** → Snapshots persistieren auf Fehlversuch → `month_already_closed` blockt Retry für immer → vermieden: RAISE rollt zurück.
3. **Debit gegen needed statt paid** → Topf-Drift wenn Winner ohne Wallet → vermieden: Debit = v_total_paid (actual).
4. **`genesis` nicht im CHECK** → Seed-INSERT bricht mit 23514 → vermieden: CHECK zuerst widern.
5. **Reward-Konstante versehentlich geändert** beim Replace → falsches Geld → PATCH-AUDIT: Konstanten 500000/250000/100000 verifizieren.
6. **Doppel-Debit** wenn pro Winner statt einmal debitiert → vermieden: EINE Buchung nach dem Loop.
