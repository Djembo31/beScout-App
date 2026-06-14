# Slice 323 — Ticket-Ledger-Reconciliation (P1-Demo: Gamif #3)

**Slice-Type:** Migration (Data-Fix, money-adjacent)
**Größe:** XS
**Datum:** 2026-06-14
**CEO-Scope:** Ja (money-adjacent Daten-Mutation). Anil-OK 2026-06-14 (Richtung: balance=70 ist Wahrheit, Ledger +5).

## 1. Problem-Statement (Evidence: S7-Registry P1-Demo Gamif #3, live-investigiert 2026-06-14)

Genau 1 User (`99b601d2-ca72-4c36-8048-bdc563612cc3`): `user_tickets.balance=70`, aber `SUM(ticket_transactions.amount)=65` (15 Zeilen) → +5 Drift.

**Investigation (15 Ledger-Zeilen):** 14× `+5 daily_login` über einen Monat + 1× `-5 event_entry`. Die `balance_after`-Progression endet bei **70** (= user_tickets.balance), aber die `amount`-Summe ist 65. Bruch: ein `daily_login` ließ `balance_after` von 35→45 springen (+10) bei `amount +5` — eine seltene daily_login-Race (Tag-1 zeigt denselben Doppel-Grant mit identischem Timestamp). **→ balance (70) ist die gelebte Wahrheit** (Wallet operierte einen Monat auf diesen Levels; User hat real per daily_login verdient). Der Ledger ist um eine `+5`-`amount`-Zeile unvollständig.

**Wahl:** Ledger += 5 (Audit-Vervollständigung), NICHT balance−5 (würde dem User 5 real verdiente Tickets wegnehmen). Nur 1 von 130 daily_login-Usern betroffen → seltene Race, nicht systemisch (kein Root-Cause-Slice nötig).

## 2. Lösungs-Design

Idempotente Migration: `+5`-`ticket_transactions`-Reconciliation-Zeile (`source='admin_grant'` — einziger CHECK-erlaubter Reconcile-naher Wert; `balance_after=70`; erklärende `description`). Idempotent via DO-Guard: nur INSERT wenn `balance > SUM(amount)` (nach Insert gleich → Re-Run no-op).

## 3. Betroffene Files
- `supabase/migrations/20260614xxxxxx_slice_323_ticket_ledger_reconcile.sql` — NEU (Data-Fix).

## 4. Code-Reading-Liste (erledigt)
- Drift-Query (1 User, balance 70 vs ledger 65). ✓
- 15 Ledger-Zeilen (daily_login-Race, balance_after endet 70). ✓
- `ticket_transactions_source_check` (admin_grant erlaubt; kein 'reconciliation'). ✓
- Spalten: user_id/amount/balance_after/source NOT NULL; reference_id/description nullable. ✓
- Kein append-only-Trigger blockt INSERT. ✓

## 5. Pattern-References
- `errors-db.md` „Seed-Wert-Poisoning / Hygiene VOR Formel-Vertrauen (Slice 303)" — hier: Quell-Wahrheit (balance) vor naivem Ledger-Recompute geprüft.
- `database.md` Money = BIGINT cents — N/A (Tickets sind Stück-Counter, INT).

## 6. Acceptance Criteria
- **AC1:** Nach Migration: `user_tickets.balance == SUM(ticket_transactions.amount)` für den User (70==70).
- **AC2:** balance UNVERÄNDERT 70 (kein Ticket weggenommen).
- **AC3:** 0 Drift-User repo-weit (`HAVING balance <> SUM(amount)` = 0 rows).
- **AC4:** Migration idempotent (Re-Run kein Doppel-Insert).
- **AC5:** Reconcile-Zeile hat erklärende description + source='admin_grant'.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| Re-Run Migration | DO-Guard balance==ledger → no INSERT |
| balance < ledger (anderer Drift-Typ) | Guard `balance > ledger` → kein Insert (nicht dieser Fall) |
| User existiert nicht mehr | SELECT balance NULL → Guard skip |

## 8. Self-Verification
- Pre: Drift-Query zeigt 1 User (70 vs 65).
- Post: Drift-Query 0 rows; User balance=70, ledger_sum=70.

## 9. Open-Questions — keine (Richtung Anil-bestätigt).

## 10. Proof-Plan
`worklog/proofs/323-ticket-ledger-reconcile.txt`: Pre/Post Drift-Query + Reconcile-Zeile + Idempotenz-Note + Identity-#3-Surfacing-Notiz.

## 11. Scope-Out
- Kein daily_login-RPC-Root-Cause-Fix (seltene Race, 1/130, nicht systemisch — Backlog falls Drift wiederkehrt).
- **Identity #3 NICHT in diesem Slice:** profilloser Account = Beta-Tester Taki (taki.okuyucu, incomplete Onboarding, kein gewählter Handle) → an Anil surface, kein auto-Backfill mit geratenem Handle.

## 12. Stage-Chain
SPEC ✓ → IMPACT (inline §4) → BUILD (Migration) → REVIEW (self-review, 1-User-Data-Fix, money-adjacent Checkliste) → PROVE → LOG.

## 13. Pre-Mortem
1. source nicht CHECK-erlaubt → admin_grant verifiziert erlaubt. 2. Doppel-Insert bei Re-Run → DO-Guard. 3. balance fälschlich Wahrheit → Investigation (balance_after-Progression + Monat daily_login) belegt balance=70.
