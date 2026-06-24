# Slice 359 — accept_offer side='sell' reparieren ('offer_buy' in CHECK)

**Slice-Type:** Migration (Money-table CHECK) + Test
**Größe:** S
**CEO-Scope:** Nein (kein Fee-/Money-Flow-Change; additiver CHECK-Wert, der einen bereits vom Code geschriebenen Typ erlaubt). Money-table → Reviewer + Money-Smoke trotzdem.

## 1. Problem-Statement (Evidence)

Slice-358-Money-Smoke (`worklog/proofs/358-money-smoke.txt`) deckte auf: `accept_offer` mit `v_offer.side='sell'` wirft `23514 transactions_type_check`. Code: `type = CASE WHEN v_offer.side='buy' THEN 'offer_execute' ELSE 'offer_buy' END`. Live-CHECK (`pg_get_constraintdef`) erlaubt `offer_execute/offer_sell/offer_lock/offer_unlock` — **nicht `offer_buy`**. Live-Beweis: `SELECT type,COUNT(*) … WHERE type LIKE 'offer_%'` → `offer_buy`-Count = **0** (jeder Sell-Offer-Accept scheitert seit jeher; `offer_execute`=1 = buy-Pfad ok). S330-CHECK-Drift-Klasse: 4-File-Sync war unvollständig, nur der CHECK wurde beim Einführen von `offer_buy` vergessen.

## 2. Lösungs-Design

Additiv: `'offer_buy'` in `transactions_type_check` aufnehmen (DROP + ADD, da Postgres CHECK nicht in-place ändert). Neuer Wertebereich = **Superset** des alten → alle bestehenden Rows passen weiter (Validierung = reiner Scan, kein Daten-Risiko). Frontend/Types/i18n unverändert (handhaben `offer_buy` schon).

## 3. Betroffene Files

| File | Änderung |
|---|---|
| `supabase/migrations/NNN_fix_offer_buy_check.sql` | DROP+ADD `transactions_type_check` inkl. `offer_buy` |
| `src/lib/__tests__/db-invariants.test.ts` | `expected`-Array (transactions_type_check) um `'offer_buy'` ergänzen, sonst Invariant-Test rot |

**Schon vorhanden (kein Edit):** `activityHelpers.ts` (icon/color/labelKey `offerBuy`), `transactionTypes.ts` (offer_buy gelistet), `messages/de.json`+`tr.json` (`offerBuy`).

## 4. Code-Reading-Liste (erledigt)

1. Live `pg_get_constraintdef('transactions_type_check')` — ✅ voller Wertebereich erfasst (36 Werte), `offer_buy` fehlt.
2. Live `pg_get_functiondef('accept_offer')` — ✅ schreibt `offer_buy` im side='sell'-Zweig.
3. `activityHelpers.ts` + `transactionTypes.ts` — ✅ `offer_buy` bereits behandelt.
4. `messages/de.json`+`tr.json` `offerBuy` — ✅ vorhanden (DE „Gebot angenommen (Kauf)", TR „Teklif kabul (Alım)").
5. `db-invariants.test.ts:645` `expected`-Array — ✅ enthält `offer_buy` NICHT → muss ergänzt werden.

## 5. Pattern-References

- **errors-db.md S330** — `transactions.type`-CHECK-Drift, 4-File-Sync (CHECK am häufigsten vergessen). Genau dieser Fall.
- **errors-db.md S156** — CREATE-OR-REPLACE PATCH-AUDIT (hier CHECK statt RPC, gleiche Sorgfalt: voller Live-Wertebereich als Baseline).
- **testing.md** — mutierende Live-Smokes in `BEGIN…ROLLBACK`.

## 6. Acceptance Criteria

- **AC1** Nach Migration: `pg_get_constraintdef('transactions_type_check')` enthält `'offer_buy'` UND alle 36 vorherigen Werte (kein Verlust).
- **AC2** `accept_offer` side='sell' (Sell-Offer akzeptieren) läuft erfolgreich durch — kein `23514` mehr. Force-Rollback-Smoke.
- **AC3** Dabei wird die Plattform-Fee korrekt als source 'p2p' gebucht (358-Integration intakt) + Zero-Sum.
- **AC4** `db-invariants.test.ts` grün (expected-Array matcht Live-CHECK).
- **AC5** Bestehende offer_execute/offer_sell-Pfade unberührt.

## 7. Edge Cases

| Fall | Verhalten |
|---|---|
| Bestehende Rows | Superset → alle valide, Validierung passiert ohne Fehler |
| Concurrent INSERT während DROP/ADD | ACCESS EXCLUSIVE kurz; beta-Volumen trivial |
| side='buy'-Pfad ('offer_execute') | unberührt |
| Validierungs-Scan schlägt fehl | unmöglich (Superset), sonst Rollback der Migration |

## 8. Self-Verification

```sql
SELECT pg_get_constraintdef(oid) LIKE '%''offer_buy''%' AS has_offer_buy
FROM pg_constraint WHERE conname='transactions_type_check';
```
```bash
CI=true pnpm exec vitest run src/lib/__tests__/db-invariants
```

## 9. Open-Questions
- Keine. Reiner additiver Fix eines latenten Bugs.

## 10. Proof-Plan
- `worklog/proofs/359-smoke.txt` — Force-Rollback: accept_offer side='sell' (vorher 23514) jetzt success, Topf p2p-Booking + Zero-Sum. Plus `pg_get_constraintdef`-Diff (offer_buy drin, 36 alte erhalten). vitest db-invariants grün.

## 11. Scope-Out
- Keine weiteren Typen. Keine RPC-Logik-Änderung an accept_offer (die ist korrekt; nur der CHECK war zu eng).

## 12. Stage-Chain
SPEC → IMPACT (skipped) → BUILD (1 Migration + 1 Test-Zeile) → REVIEW (Money-table) → PROVE (Smoke + vitest) → LOG.

## 13. Pre-Mortem
1. Wert-Verlust beim DROP+ADD → Mitigation: voller Live-Wertebereich als Baseline, AC1 prüft alle 36 + offer_buy.
2. Invariant-Test vergessen → Mitigation: AC4 + Build-Schritt 2.
3. Migration-Lock auf großer transactions-Tabelle → beta-Volumen trivial; additiv = schnelle Validierung.
