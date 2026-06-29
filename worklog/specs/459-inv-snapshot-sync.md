# Slice 459 — INV-XS Doppel-Fix: INV-22 (success_fee) + INV-18 (events-Snapshot)

**Slice-Type:** i18n/Test-Sync · **Größe:** XS · **Scope:** Test-Snapshot + SSOT-Liste-Sync (kein Money-Verhalten, kein RPC, kein Geld-Fluss). Pattern-bekannt (S330/S359). Self-review (Ops-nah, kein Money-Pfad-Change).

## 1. Problem (Evidence: db-invariants.test.ts Live-DB-Run, 2026-06-29)
2 pre-existing INV-Failures (beim 457/458-vitest aufgefallen), beide **Snapshot-Drift gegen die Live-DB-Realität** (S330/S359-„5.-Sync-Punkt"-Klasse — CHECK erweitert, TS/Snapshot nie nachgezogen):
- **INV-22:** `success_fee` ist im Live `transactions_type_check` (seit Slice 330 CSF-Engine), fehlt aber in `ALL_CREDIT_TX_TYPES` (transactionTypes.ts) → bei künftiger CSF-Buchung raw-string-Fallback in der Activity-Timeline. **activityHelpers.ts handhabt success_fee bereits** (Icon Banknote, Color emerald, LabelKey `successFee`) + i18n `activity.successFee` existiert (DE „Community-Bonus", TR „Topluluk Bonusu"). Nur die SSOT-Liste fehlt. (Live: 0 Rows → latent.)
- **INV-18:** `events.status` expected-Snapshot fehlt `cancelled` (Live 1 Row, Event-Cancel seit Slice 399); `events.type` fehlt `user` (Live 2 Rows, User-Events seit Slice 396). Beide legitime gewollte Live-Werte → DB korrekt, Test-Snapshot stale.

## 2. Lösung
3 1-Zeilen-Edits, reiner Sync auf die verifizierte Live-Realität:
- `transactionTypes.ts` `ALL_CREDIT_TX_TYPES` += `'success_fee'`.
- `db-invariants.test.ts` INV-18 events.status expected += `'cancelled'`; events.type expected += `'user'`.

## 3. Betroffene Files
- `src/lib/transactionTypes.ts` (ALL_CREDIT_TX_TYPES)
- `src/lib/__tests__/db-invariants.test.ts` (INV-18 events cases)

## 4. Code-Reading (erledigt)
1. ✅ Live-CHECK gezogen: transactions_type_check enthält success_fee (+41 Werte); events_status_check enthält cancelled; events_type_check enthält user.
2. ✅ Row-counts: success_fee=0 (latent), events cancelled=1, events user=2 (legitim).
3. ✅ activityHelpers.ts komplett für success_fee; i18n `activity.successFee` DE+TR vorhanden.
4. ✅ INV-18 transactions.type-case enthält success_fee BEREITS (nur events driften).
5. ✅ INV-18 orders/offers-cases korrekt (Fehler nur events).

## 5. Pattern-References
- errors-db S330/S359: „5. Sync-Punkt = INV-18 expected-Snapshot in db-invariants.test.ts, oft vergessen". transactions.type-4-File-Sync (CHECK + activityHelpers + i18n + ALL_CREDIT_TX_TYPES).

## 6. Acceptance Criteria
- AC1: INV-22 grün (db-invariants isoliert) — ALL_CREDIT_TX_TYPES ⊇ alle 41 DB-CHECK-Werte.
- AC2: INV-18 grün für events.status + events.type (0 drifts dort).
- AC3: `npx tsc --noEmit` grün (CreditTxType-Union-Erweiterung bricht keinen Consumer).
- AC4: andere INV-Failures (19/31/32/33) bleiben unverändert (nicht mein Scope, nicht neu gebrochen).

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| success_fee bricht activityHelpers.test | success_fee schon vollständig in activityHelpers → kein Bruch |
| events.status/type weitere Drifts | Live-CHECK geprüft: nur cancelled/user fehlten |
| PUBLIC_TX_TYPES braucht success_fee | NICHT in diesem Slice (CSF public-visibility = CEO-Entscheid, konservativ privat lassen) |

## 8. Self-Verification
`npx vitest run src/lib/__tests__/db-invariants.test.ts` → INV-18 + INV-22 grün; `npx tsc --noEmit`.

## 9. Open-Questions
- Keine. PUBLIC_TX_TYPES-Erweiterung für success_fee bewusst Scope-Out (CSF-Sichtbarkeit = CEO).

## 10. Proof-Plan
`459-inv-sync.txt`: db-invariants Vorher/Nachher (INV-18/22 rot→grün, INV-19/31/32/33 unverändert) + tsc.

## 11. Scope-Out
- INV-19 (treasury-ledger RLS Cron-Only), INV-31 (no_guard-RPCs = W0), INV-32 (qual=true Tabellen), INV-33 (wallet-drift) = eigene Themen.
- success_fee in PUBLIC_TX_TYPES/RLS = CEO (CSF-Sichtbarkeit).

## 12. Stage-Chain
SPEC → BUILD → PROVE (db-invariants isoliert) → REVIEW (self-review, Pattern-bekannt XS) → LOG.

## 13. Pre-Mortem
- „success_fee macht success_fee public sichtbar" → nein, ALL_CREDIT_TX_TYPES ≠ PUBLIC_TX_TYPES; Sichtbarkeit unverändert.
- „events-Snapshot-Erweiterung versteckt echten ungewollten Drift" → cancelled/user live-verifiziert legitim (Slice 399/396).
