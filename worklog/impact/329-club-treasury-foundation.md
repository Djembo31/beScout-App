# Impact — Slice 329 Club-Treasury-Fundament

**Datum:** 2026-06-17 · Verifiziert gegen Live-DB `skzjfhvgccaeplydsunz` + `grep src/`.

## Consumer von get_club_balance / treasury_balance_cents

| Consumer | Art | Constraint |
|---|---|---|
| `src/lib/services/club.ts:722` `getClubBalance` | Service → RPC | `ClubBalance`-Type-Shape |
| `src/components/admin/AdminWithdrawalTab.tsx:45` | UI | nutzt `.available` |
| `src/lib/__tests__/db-invariants.test.ts:1114` | Test | **fixiert Keys:** `total_earned, trade_fees, sub_revenue, total_withdrawn, available` |
| `src/lib/services/__tests__/club.test.ts:469` | Test | `.available` |
| `src/lib/__tests__/contracts/schema-contracts.test.ts:266` | Test | `treasury_balance_cents` Spalte muss bleiben |

→ **Return-Shape MUSS 5 Keys behalten.** Nur Computation ändert sich (Ledger statt on-the-fly-SUM). Kein Consumer-Break. `treasury_balance_cents`-Spalte bleibt (jetzt als gepflegter Saldo statt Dead-Write).

## Einnahme-Pfade (Live-RPC-Bodies verifiziert)

| RPC | inserts trades.club_fee | touches treasury_balance_cents heute | touches subs |
|---|---|---|---|
| `buy_player_sc` | ✅ | ✅ (Dead-Increment) | discount-read |
| `buy_from_order` | ✅ | ✅ | discount-read |
| `accept_offer` (P2P) | ✅ | ✅ | — |
| `buy_from_ipo` (IPO 85%) | ✅ | ✅ | discount-read |
| `subscribe_to_club` | ❌ | ❌ | ✅ schreibt |
| `renew_club_subscription` | ❌ | ❌ | ✅ schreibt |

**Befund:** Die 4 Trade-RPCs inkrementieren `treasury_balance_cents` **bereits** (nur nie gelesen). P2P-club_fee landet via `trades` korrekt im Saldo (Q5 beantwortet — KEINE Lücke). **Einzige fehlende Buchung = Abo** (subscribe/renew schreiben in keinen Saldo-Store) → das IST der Abo-Bug + der einzige neu zu verkabelnde Income-Pfad.

## Design-Konsequenz (FINAL — trigger-zentrisch, minimaler Blast-Radius)

**Schlüssel-Befund:** `subscribe_to_club` nutzt `INSERT ... ON CONFLICT DO UPDATE`; `renew_club_subscription` ist reines `UPDATE expires_at`. → Ein `club_subscriptions`-Trigger verpasst Re-Subs + Renewals. **Abos brauchen RPC-Edits; Trades nicht** (alle Trade-RPCs INSERTen `trades`).

1. **`book_club_treasury(p_club_id, p_direction, p_type, p_amount, p_ref, p_desc)` Helper** (SECURITY DEFINER): `clubs`-Zeile `FOR UPDATE` (per-Club-Serialisierung), letzte `balance_after` lesen (Index `(club_id, created_at DESC)` → O(1)), `balance_after = prev ± amount`, Ledger-Zeile inserten. **Bank-Ledger-Pattern**, race-frei, kein contested cached column.
2. **`trg_trades_treasury_credit` AFTER INSERT ON trades:** wenn `NEW.club_fee > 0` → club_id aus `players` auflösen → `book_club_treasury(...,'credit','trade_fee',NEW.club_fee,NEW.id)`. **Fängt alle 4 Trade-RPCs + IPO + P2P ohne RPC-Edit** (D39-Philosophie). Semantik = identisch zur heutigen `SUM(trades.club_fee)`.
3. **2 Sub-RPC-Edits** (einzige Money-RPC-Edits): `subscribe_to_club` + `renew_club_subscription` → `book_club_treasury(...,'credit','subscription',price,sub_id)` nach der Zahlung.
4. **Backfill (Q1 Snapshot):** pro Club via Helper 2 credits — `opening_trade_fees` (= alte `SUM(trades.club_fee)`) + `opening_subscription` (= alte `SUM(active subs)`). 0-Werte skippen. balance_after chained korrekt.
5. **`get_club_balance` neu (gleiche 5 Keys):** `total_earned = letzter balance_after (COALESCE 0)` · `trade_fees = SUM(credit type IN trade_fee,opening_trade_fees)` · `sub_revenue = SUM(credit type IN subscription,opening_subscription)` · `total_withdrawn` = wie heute (club_withdrawals) · `available = total_earned − total_withdrawn`. Invariante: `total_earned = trade_fees + sub_revenue` (nur credits diese Slice).
6. **`treasury_balance_cents` bleibt unangetastet** (Legacy-Dead-Write wie heute — die 4 Trade-RPCs schreiben weiter rein, niemand liest's). Entfernen der RPC-Inkremente = unnötiges Money-RPC-Risiko → eigener Cleanup-Slice. Dokumentiert.
7. **Scope = credits only.** Withdrawals unverändert in `club_withdrawals`. Debits (CSF/Fan-Rewards) = Slice 330+ (Schema unterstützt `debit`).
8. **Source-Debt (accept_offer/request_club_withdrawal):** entfällt als 329-Aufgabe — beide werden NICHT editiert (Trades-Trigger fängt P2P-Income, Withdrawal unverändert). AR-43-Recovery → wenn diese RPCs nächstes Mal editiert werden ODER eigener Cleanup-Slice. AC-10 entsprechend Scope-Out.

**Blast-Radius:** 1 Tabelle + 1 Helper + 2 Trigger (append-only + trades-credit) + 2 Sub-RPC-Edits + 1 `get_club_balance`-Rewrite + Backfill. **0 Edits an buy_player_sc/buy_from_order/accept_offer/buy_from_ipo** (Slice-156-Revert-Risiko vermieden).

## Side-Effects
- **RLS:** neue Tabelle → SELECT-Policy (club_admin + platform_admin), kein INSERT/UPDATE/DELETE für Client (nur via SECURITY-DEFINER-RPC). Append-only-Trigger zusätzlich (D39).
- **Caching/Realtime:** keine (Admin-RPC, kein React-Query-Key-Change da Shape stabil).
- **Idempotency:** Buchung hängt an bestehenden Money-RPCs (deren Idempotency greift); kein neuer Doppel-Buchungs-Vektor solange Booking IN der bestehenden RPC-TX läuft.
- **Slice-156-Falle:** `get_club_balance` + 6 RPCs sind CREATE-OR-REPLACE → pg_get_functiondef als Baseline, Sub-Patches (discount/min_tier/auth-guard) erhalten.

## Migration-Plan (1 File, atomar wo nötig)
1. CREATE TABLE `club_treasury_ledger` + Indizes (club_id, created_at).
2. RLS-Policies + REVOKE Client-Writes.
3. append-only-Trigger (D39 + GUC `bescout.allow_treasury_mutation`).
4. `book_club_treasury()` Helper.
5. Backfill (2 opening-credits/Club) im GUC-Bypass-TX → setzt `treasury_balance_cents`.
6. **Verify-Gate:** `treasury_balance_cents == alt total_earned` für alle 134 (Proof) — VOR Schritt 7.
7. 6 RPCs editieren (book_club_treasury einhaken) — Baseline pg_get_functiondef.
8. `get_club_balance` neu (Ledger-Read, 5 Keys).
9. Source-Debt: `request_club_withdrawal` + `accept_offer` Bodies in Migration mit-aufnehmen (AR-43).
