# Slice 329 — Club-Treasury-Fundament (Saldo + append-only Ledger + Einnahmen-Verbuchung + Abo-Bug-Fix)

**Status:** SPEC · **Größe:** L · **Slice-Type:** Migration + Service · **Scope:** CEO-pending · **Datum:** 2026-06-17

> Erster echter Bau-Slice des Scout-Card-Money-Modells (nach Slice 328 IPO-MV-Anker). Basis: D83 + `worklog/concepts/csf-club-treasury-model.md` §8. Money-kritisch → CEO-Scope.

---

## 1. Problem Statement

Das Club-Treasury ist **kein echtes Konto**, sondern eine on-the-fly-Berechnung — verifiziert gegen Live-DB (`skzjfhvgccaeplydsunz`, 2026-06-17):

- `get_club_balance(club_id)` rechnet bei jedem Aufruf `SUM(trades.club_fee) + SUM(club_subscriptions.price_cents WHERE status='active') − SUM(club_withdrawals)`.
- 🐛 **Abo-Bug (live):** Der `status='active'`-Filter heißt: läuft/kündigt ein Abo, **verschwindet sein bereits verdienter Umsatz rückwirkend** aus `total_earned`. Verdientes Geld ist nicht permanent gebucht — mit einem echten Konto unvereinbar.
- **Dead-Write:** `clubs.treasury_balance_cents` (bigint) wird bei Trades/IPO inkrementiert, aber **nirgends gelesen** — toter Zähler, divergiert von der RPC-Wahrheit.
- **Keine RAUS-Seite + kein Audit-Trail:** Der Verein kann nur ansammeln. Es gibt keine append-only Bewegungs-Historie → CSF (Slice 330) + Fan-Rewards (Slice 332) haben kein Konto, gegen das sie buchen können.
- **Source-Schuld (AR-43):** `request_club_withdrawal` + `accept_offer`-Bodies leben nur in der Remote-DB, nicht in `supabase/migrations/` → Greenfield-/`db reset`-Risiko.

**Betroffen:** alle 134 Clubs (Saldo-Anzeige `AdminTreasuryTab`); akut sobald das erste Abo ausläuft (Umsatz-Schrumpfung). Blockiert die gesamte Money-Bau-Sequenz (D83 §Bau-Sequenz: Treasury → CSF → RAUS → Fan-Rewards).

## 2. Lösungs-Design (Architektur)

**Ziel:** Echtes Konto = **append-only Ledger** (Kontoauszug) + **gecachter Saldo** — exakt das etablierte `wallets.balance ↔ transactions`-Muster, nur für Clubs.

**Neue DB-Objekte:**

```sql
-- Append-only Kontoauszug (mirror von transactions, Slice 179 append-only-Pattern)
CREATE TABLE public.club_treasury_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id       uuid NOT NULL REFERENCES public.clubs(id),
  direction     text NOT NULL CHECK (direction IN ('credit','debit')),
  type          text NOT NULL,        -- 'trade_fee'|'ipo_fee'|'p2p_fee'|'subscription'|'opening_balance'|'withdrawal' (RAUS-Typen folgen in Slice 330+)
  amount        bigint NOT NULL CHECK (amount > 0),  -- immer positiv; direction trägt das Vorzeichen
  balance_after bigint NOT NULL,
  reference_id  uuid,                  -- trade_id / subscription_id / withdrawal_id
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
-- Saldo-SSOT: clubs.treasury_balance_cents reaktiviert als gecachter Saldo (trigger-maintained)
```

**Datenfluss vorher → nachher:**

| | Vorher | Nachher |
|---|---|---|
| Saldo-Quelle | on-the-fly `SUM(...)` in `get_club_balance` | `clubs.treasury_balance_cents` (= `SUM(ledger)`, trigger-gepflegt) |
| Einnahme verbucht | implizit via `trades.club_fee`-Existenz + aktive Abos | **explizit: 1 Ledger-credit beim Verdienen** (permanent) |
| Abo-Umsatz | `SUM(active)` → schrumpft rückwirkend | 1 credit bei Zahlung → bleibt für immer |
| Audit-Trail | keiner | jede Bewegung = 1 Ledger-Zeile |

**Append-only-Enforcement:** BEFORE UPDATE/DELETE-Trigger (D39-Pattern, GUC-Bypass `bescout.allow_treasury_mutation`) — analog `transactions_append_only_guard`.

**Saldo-Pflege:** AFTER INSERT auf `club_treasury_ledger` → `clubs.treasury_balance_cents = NEW.balance_after`. `balance_after` wird in der buchenden RPC unter `FOR UPDATE`-Lock auf `clubs`-Zeile berechnet (race-frei, wie `wallets`).

**Einnahmen-Verbuchung (REIN) — gehakt in die bestehenden RPCs:**
| Quelle | RPC | Ledger-Typ |
|---|---|---|
| Trading 1 % | `buy_player_sc`, `buy_from_order` | `trade_fee` |
| P2P 0,5 % | `accept_offer` | `p2p_fee` |
| IPO 85 % | `buy_from_ipo` | `ipo_fee` |
| Abo 100 % | `subscribe_to_club`, `renew_club_subscription` | `subscription` |

**Abo-Bug-Fix:** Abo-Umsatz wird bei Zahlung als `subscription`-credit gebucht (permanent). `get_club_balance` summiert **nicht mehr** `active`-Abos → keine rückwirkende Schrumpfung.

**Backfill (CEO-Entscheidung §9-Q1):** **Eröffnungssaldo-Snapshot** — pro Club **eine** `opening_balance`-credit-Zeile = heutiger `get_club_balance.total_earned`. Granulare Historie bleibt in `trades`/`club_subscriptions` abfragbar. Kein fragiles Per-Event-Reconstruction.

**Sicherheits-Migration (de-risk):** Ledger + Backfill bauen → **verifizieren `treasury_balance_cents == alter get_club_balance.total_earned` für alle 134 Clubs** → ERST DANN `get_club_balance` auf Ledger-Read umstellen. Kein Big-Bang-Switch ohne Abgleich.

**RAUS-Seite:** Schema unterstützt `debit` ab Tag 1 (für CSF/Fan-Rewards Slice 330+). In **diesem** Slice wird nur `withdrawal` als debit gebucht (request_club_withdrawal). Keine leeren RAUS-RPCs ohne Consumer bauen (D54 Build-without-Wire).

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `supabase/migrations/<ts>_slice_329_club_treasury_ledger.sql` | NEU | Tabelle + RLS + append-only-Trigger + Saldo-Trigger + Backfill + 6 RPC-Edits + `get_club_balance`-Umstellung |
| `src/lib/services/club.ts` | EDIT | `getClubBalance`-Return-Shape (Ledger-Felder); ggf. `getClubTreasuryLedger()` neu |
| `src/lib/services/clubSubscriptions.ts` | EDIT | falls Return-Shape von subscribe/renew sich ändert (sonst no-op) |
| `src/types/index.ts` | EDIT | `ClubTreasuryLedgerEntry`-Type + `ClubBalance`-Shape |
| `src/components/**/AdminTreasuryTab.tsx` | EDIT (Folge) | Ledger-Anzeige + Club-Fee nicht als „burn" — **ggf. Scope-Out → Slice 329b** (siehe §11) |
| `src/lib/services/__tests__/clubTreasury.test.ts` | NEU | Service-Tests gegen neue Shape |

**Vor diesem Slice greppt man:** `grep -rn "get_club_balance\|getClubBalance\|treasury_balance_cents" src/` — alle Consumer identifizieren.

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `pg_get_functiondef('public.get_club_balance')` | aktuelle Saldo-Wahrheit | ✅ verifiziert: SUM(club_fee)+SUM(active subs)−withdrawn |
| `pg_get_functiondef('public.buy_player_sc')` | Trade-Booking-Punkt | Wo wird `trades`-Row + `club_fee` inserted? FOR-UPDATE-Lock-Stelle? |
| `pg_get_functiondef('public.buy_from_order')` | 2. Trading-Pfad | gleiche Stelle |
| `pg_get_functiondef('public.accept_offer')` | P2P-Booking | Schreibt es `club_fee` in `trades`? (verifizieren — Concept §8 unklar) |
| `pg_get_functiondef('public.buy_from_ipo')` | IPO-85 %-Booking | club_fee-Insert-Stelle |
| `pg_get_functiondef('public.subscribe_to_club')` + `renew_club_subscription` | Abo-Zahlungs-Punkt | Wo wird gezahlt? `price_cents`-Quelle |
| `transactions` + `transactions_append_only_guard` (Migration Slice 179) | Append-only-Vorbild | Exaktes Trigger+GUC-Pattern kopieren |
| `wallets`-Saldo-Pflege (buy_player_sc balance_after) | Saldo-Cache-Vorbild | Wie wird `balance_after` race-frei berechnet (FOR UPDATE)? |
| `pg_policies WHERE tablename IN ('transactions','clubs')` | RLS-Vorbild | Wer darf Ledger lesen? (club_admin + platform_admin, kein anon) |
| `src/lib/services/club.ts` getClubBalance | Service-Consumer | Return-Shape + alle Aufrufer (`grep`) |
| `.claude/rules/errors-db.md` „Money-RPC Idempotency" + „Trigger+GUC-Invariant (D39)" + „CREATE OR REPLACE PATCH-AUDIT (Slice 156)" | bekannte Fallen | Idempotency, append-only, RPC-Body-Revert-Falle |
| `.claude/rules/trading.md` Fee-Split + Closed-Economy | Money-Wahrheit | Phase-1 kein Cash-out; Fee-%-Werte |

## 5. Pattern-References

- **D83** + `csf-club-treasury-model.md` §8 — das Zielbild (Saldo+Ledger, REIN/RAUS, extractive→investive). SSOT für Scope.
- **D39** (`errors-db.md` „Trigger+GUC-Invariant") — append-only-Enforcement-Template für `club_treasury_ledger`.
- **Slice 179** (`errors-db.md` „Transactions Append-Only") — exaktes Vorbild (`transactions` + guard).
- **AR-44** (`errors-db.md` Idempotency-Blueprint REVOKE/GRANT) — `CREATE OR REPLACE` resettet Grants → explizit renew.
- **Slice 156** (`errors-db.md` „CREATE OR REPLACE PATCH-AUDIT PFLICHT") — bei RPC-Body-Edit ALLE Vorgänger-Migrations als Baseline, sonst Silent-Revert.
- **AR-43** (`errors-db.md` Source-Schuld) — `request_club_withdrawal`+`accept_offer` aus Remote-DB in Migration zurückholen.
- **trading.md** „Geld-Regeln" — BIGINT cents, atomare RPCs, append-only.

## 6. Acceptance Criteria

```
AC-01: [HAPPY] Ledger-Tabelle + Saldo-Trigger existieren
  VERIFY: SELECT count(*) FROM information_schema.tables WHERE table_name='club_treasury_ledger';
  EXPECTED: 1; AFTER-INSERT-Trigger pflegt clubs.treasury_balance_cents
  FAIL IF: Tabelle fehlt ODER Saldo divergiert von SUM(ledger)

AC-02: [HAPPY] Backfill — jeder Club hat opening_balance == altem total_earned
  VERIFY: pro Club: treasury_balance_cents == alter get_club_balance.total_earned (alle 134)
  EXPECTED: 0 divergierende Clubs
  FAIL IF: ≥1 Club divergiert

AC-03: [HAPPY] Trade bucht Ledger-credit
  VERIFY: BEGIN; buy_player_sc(...) als Test-User; SELECT * FROM club_treasury_ledger ORDER BY created_at DESC LIMIT 1; ROLLBACK;
  EXPECTED: 1 credit type='trade_fee', amount==club_fee, balance_after==prev+club_fee
  FAIL IF: keine Zeile ODER amount≠club_fee ODER balance_after falsch

AC-04: [REGRESSION/Abo-Bug] Abgelaufenes Abo schrumpft Saldo NICHT
  VERIFY: BEGIN; sub buchen (credit gebucht); status='expired' setzen; get_club_balance; ROLLBACK;
  EXPECTED: total_earned unverändert (credit bleibt im Ledger)
  FAIL IF: total_earned sinkt bei status-Wechsel

AC-05: [HAPPY] get_club_balance liest Ledger-Saldo
  VERIFY: get_club_balance(club) vs SELECT treasury_balance_cents FROM clubs
  EXPECTED: available == treasury_balance_cents − pending/approved withdrawals
  FAIL IF: Divergenz

AC-06: [SECURITY] RLS + Grants korrekt
  VERIFY: SELECT policyname,cmd FROM pg_policies WHERE tablename='club_treasury_ledger'; + REVOKE-Check auf RPCs
  EXPECTED: SELECT nur club_admin+platform_admin; kein anon EXECUTE auf Buch-RPCs; append-only (UPDATE/DELETE revoked)
  FAIL IF: anon/public Zugriff ODER UPDATE/DELETE erlaubt

AC-07: [CONCURRENT] Doppel-Buchung race-frei
  VERIFY: 2× buy_player_sc parallel (Test) → balance_after-Kette lückenlos
  EXPECTED: kein verlorenes Update; balance_after streng monoton
  FAIL IF: balance_after-Sprung ODER doppelte ref

AC-08: [REGRESSION] tsc + vitest grün
  VERIFY: npx tsc --noEmit && CI=true npx vitest run src/lib/services/__tests__/clubTreasury.test.ts
  EXPECTED: 0 Fehler
  FAIL IF: rot

AC-09: [NULL/EMPTY] Club ohne Einnahmen
  VERIFY: get_club_balance für Club mit 0 Einnahmen
  EXPECTED: opening_balance=0 credit ODER keine Zeile; available=0; kein NULL/NaN
  FAIL IF: NULL/Fehler

AC-10: [SOURCE-DEBT] request_club_withdrawal + accept_offer in Migrations
  VERIFY: grep accept_offer/request_club_withdrawal in supabase/migrations/
  EXPECTED: beide Bodies in Migration vorhanden, pg_get_functiondef == Migration
  FAIL IF: nur in Remote-DB

AC-11: [I18N] keine neuen user-facing Strings ohne DE+TR (falls UI in-scope)
  VERIFY: AdminTreasuryTab-Strings — falls UI in diesem Slice; sonst N/A→329b
  EXPECTED: DE+TR oder Scope-Out dokumentiert
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Buchung | club_fee = 0 (gebührenfrei) | trade ohne club_fee | KEINE Ledger-Zeile (amount>0 CHECK) | `IF v_club_fee > 0 THEN insert` |
| 2 | Backfill | Club total_earned = 0 | kein Trade/Abo | keine opening_balance ODER amount=0-Skip | Skip wenn 0 |
| 3 | Saldo-Trigger | parallele Inserts | 2 RPCs gleichzeitig | balance_after via FOR UPDATE auf clubs | Row-Lock vor Berechnung |
| 4 | Abo-Status | active→expired→reactivate | status flippt | Umsatz-credits bleiben; reactivate = neue Zahlung = neuer credit | nur Zahlung bucht, nicht Status |
| 5 | accept_offer | P2P club_fee landet nicht in trades | unklar (verify!) | falls separat: eigener p2p_fee-credit | Code-Reading-Q klären |
| 6 | Withdrawal | available < requested | Race nach Saldo-Read | RPC re-checkt unter Lock | FOR UPDATE in withdrawal-RPC |
| 7 | Migration-Revert | CREATE OR REPLACE überschreibt neuere Patches | get_club_balance hatte Sub-Patches | Baseline = pg_get_functiondef (Slice 156) | PATCH-AUDIT vor Edit |
| 8 | Idempotency | Buchungs-RPC doppelt aufgerufen | Retry | kein Doppel-credit | bestehende Idempotency der Money-RPC nutzen (keine neue ref pro retry) |
| 9 | Dead-Column | treasury_balance_cents alt-divergent | alter Wert ≠ Saldo | Backfill überschreibt mit Wahrheit | Backfill setzt Spalte neu |
| 10 | RLS | non-admin liest Ledger | fremder User | leer/Fehler | SELECT-Policy club_admin+platform_admin |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
CI=true npx vitest run src/lib/services/__tests__/clubTreasury.test.ts
grep -rn "get_club_balance\|getClubBalance\|treasury_balance_cents" src/
```
```sql
-- Saldo == SUM(ledger) Invariante (alle Clubs)
SELECT c.id FROM clubs c
  LEFT JOIN (SELECT club_id, SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END) s
             FROM club_treasury_ledger GROUP BY club_id) l ON l.club_id=c.id
  WHERE COALESCE(l.s,0) <> c.treasury_balance_cents;  -- erwartet 0 Zeilen
-- Backfill-Abgleich vor get_club_balance-Switch (Sicherheits-Gate)
-- RPC-Bodies verifizieren (Slice 156 PATCH-AUDIT)
SELECT pg_get_functiondef('public.get_club_balance(uuid)'::regprocedure);
SELECT policyname,cmd FROM pg_policies WHERE tablename='club_treasury_ledger';
```
**Mutierende Smokes IMMER `BEGIN; … ROLLBACK;` (testing.md Slice 320-Lehre — sonst Live-Mutation).**

## 9. Open-Questions

**Pflicht-Klärung CEO (Anil) — VOR BUILD:**
1. **Backfill-Strategie:** (A) Eröffnungssaldo-Snapshot pro Club [EMPFEHLUNG — einfach, auditierbar, safe] vs. (B) granulare Per-Event-Rekonstruktion aus trades+subscriptions [vollständige Historie, aber fragil/aufwändig]. → bestimmt Migrations-Komplexität.
2. **Scope-Grenze:** Foundation = nur REIN-Seite + Saldo + Abo-Fix + Source-Debt; RAUS-RPCs (CSF/Fan-Rewards/Event/Poll/Bounty) erst mit ihren Consumer-Slices (330+)? [EMPFEHLUNG ja — vermeidet Build-without-Wire D54]. UI (`AdminTreasuryTab`) in 329 oder 329b?
3. **Pre-Migration-Abo-Datenverlust akzeptiert?** Der Opening-Snapshot nutzt die heutige (buggy) `active`-Sub-Rechnung → bereits ausgelaufene Abos sind im Startsaldo nicht drin (bereits heute verloren, in Beta vmtl. ~0). Akzeptabel + dokumentieren, oder pre-Migration-Sub-Audit?

**Autonom-Zone (CTO):** Ledger-Spaltennamen, Trigger-Implementierung, Saldo-Cache vs. Pure-SUM (Empfehlung: Cache via Trigger = wallets-Muster), Test-Struktur, Service-Funktionsnamen.

**Nicht-Autonom (CEO):** Q1-Q3 oben; jede Änderung an Fee-%-Werten (keine geplant); RLS-Design (geplant: club_admin+platform_admin SELECT).

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| DB-Schema + RPC | `worklog/proofs/329-treasury-ledger.txt` — BEGIN/ROLLBACK-Smokes: AC-02 Backfill-Abgleich (134 Clubs, 0 Divergenz), AC-03 Trade-credit, AC-04 Abo-Bug-weg, AC-06 RLS/Grants-Listing, Saldo==SUM(ledger)-Invariante |
| Service | `worklog/proofs/329-vitest.txt` — clubTreasury.test.ts grün |

## 11. Scope-Out

- **RAUS-Channel-RPCs** (CSF-Auszahlung, Fan-Reward-Airdrop, Event-Prize-Aufstockung, Poll-Reward, Club-Bounty) → Slices 330–332. Begründung: kein Consumer heute → Build-without-Wire (D54). Ledger-Schema unterstützt `debit` bereits.
- **Deposit-Pfad (Phase 1 intern)** → eigener Slice wenn Bedarf. Heute kein Use-Case (Club verdient, deponiert nicht).
- **`AdminTreasuryTab`-UI-Überarbeitung** (Ledger-Anzeige, Club-Fee nicht als „burn", per-Club-Breakdown) → **Slice 329b** falls Q2 so entschieden. Begründung: Backend-Fundament zuerst stabil, UI darauf.
- **Withdrawal-EUR-Cash-out** → Phase 2 (lizenz-gegated, trading.md Closed-Economy).
- **`csf_multiplier`-Removal** → mit CSF-Engine (Slice 330).

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (Pflicht: get_club_balance-Consumer + Money-RPC-Edits cross-cutting) → BUILD (selbst, Money/CEO — NICHT delegieren) → REVIEW (reviewer-Agent, Cold-Context — Money-RPC + append-only + RLS) → PROVE (DB-Smokes + vitest) → LOG (+ common-errors-Pattern falls neue Falle)
```
IMPACT nicht skipped (Schema + 6 RPC-Edits + Service-Consumer = cross-cutting). BUILD selbst (Money = CEO-Scope, trading.md/CLAUDE.md §3).

## 13. Pre-Mortem (L-Pflicht, ≥5)

| # | Failure | Prob | Impact | Mitigation | Detection |
|---|---------|------|--------|------------|-----------|
| 1 | `get_club_balance`-Rewrite reverted Sub-Patches (min_tier/fee_cfg etc.) | MED | hoch | Slice-156 PATCH-AUDIT: pg_get_functiondef als Baseline, alle Patches erhalten | post-apply pg_get_functiondef-Diff |
| 2 | Backfill setzt falschen Startsaldo (Faktor/Filter-Bug) | MED | hoch (Geld) | AC-02 Abgleich 134 Clubs == altes total_earned VOR read-Switch | Invarianten-Query 0 Zeilen |
| 3 | Saldo-Trigger race → balance_after-Lücke bei parallelen Trades | MED | hoch | FOR UPDATE auf clubs-Zeile vor Berechnung (wallets-Muster) | AC-07 Concurrent-Test |
| 4 | accept_offer P2P-club_fee doppelt/gar nicht gebucht | MED | mittel | Code-Reading-Q5: erst verifizieren wo P2P-club_fee landet, dann genau 1× buchen | Ledger-count vs trades.club_fee-Abgleich |
| 5 | append-only-Trigger blockt legitimen Backfill | LOW | mittel | GUC-Bypass `bescout.allow_treasury_mutation` im Backfill-TX | Backfill-Smoke grün |
| 6 | 6-RPC-Edit übersieht einen Income-Pfad → Saldo-Drift über Zeit | MED | hoch | IMPACT-Stage: alle club_fee-/Abo-Schreiber greppen; Invarianten-Query als Cron-Kandidat | Saldo==SUM(ledger)-Drift-Check |
| 7 | RLS zu offen → fremder liest Club-Finanzen | LOW | hoch | AC-06 RLS-Listing club_admin+platform_admin only | pg_policies-Check |

---

## Compliance-Check (Money-Path)
- Kein user-facing Wording in diesem Slice (Backend + Admin). $SCOUT intern. Keine Investment/ROI-Begriffe. „IPO" nur code-intern (ipo_fee-Typ). Falls AdminTreasuryTab in-scope: DE+TR + kein „burn"-Framing für Club-Fee.

## Open Risiko (ehrlich)
Die größte Gefahr ist **Saldo-Drift durch einen übersehenen Income-Pfad** (Pre-Mortem #6) und **Sub-Patch-Revert beim get_club_balance-Rewrite** (#1). Beide werden durch IMPACT-Grep + Slice-156-PATCH-AUDIT + die Saldo==SUM(ledger)-Invariante (als wiederkehrender Check, ggf. Cron) abgesichert. Der Sicherheits-Gate „Backfill verifizieren BEVOR read-Switch" verhindert einen Big-Bang-Geldfehler.
