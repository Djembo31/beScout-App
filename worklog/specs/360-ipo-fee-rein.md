# Slice 360 — IPO-Fee REIN in den Plattform-Topf

**Slice-Type:** Migration (Money-RPC) + Test
**Größe:** S
**CEO-Scope:** JA (Money §3) — Policy aber bereits approved (D98 100 % Auffang). Keine neue Fee-Änderung, nur Routing des bestehenden Plattform-Anteils.
**Epic:** E3 Plattform-Treasury (D96) · Slice 2 „Fees REIN", Teil 2 von 5 Quellen (IPO). Anker: `worklog/notes/358-platform-treasury-epic.md` §Slice 2.

---

## 1. Problem-Statement (Evidence)

Der **Plattform-Anteil der IPO-Fee (10 %, `ipo_platform_bps`=1000) verbrennt** — er wird in `trades.platform_fee` notiert, aber in **kein Konto gebucht**. Beleg: Live-`pg_get_functiondef('buy_from_ipo')` (gelesen 2026-06-24) — PBT-Anteil → `pbt_treasury` ✅, Club-Anteil → `clubs.treasury_balance_cents` ✅, **Plattform-Anteil (`v_platform_share`) wird nirgends gebucht.** Epic-Befund-Tabelle (358-epic) listet IPO als verbrennende Quelle.

Slice 358 hat das Muster für Trading/P2P etabliert; IPO ist die nächste Quelle (Anil-Wahl: höchstes Volumen zuerst).

## 2. Lösungs-Design

Eine additive Inline-Buchung in `buy_from_ipo`, **1:1 gespiegelt aus der Live-358-Zeile in `buy_player_sc`**: nach dem PBT-Buchungsblock, vor dem `INSERT INTO transactions`, einen Guard-geschützten `book_platform_treasury`-Aufruf einfügen.

```sql
-- E3-2b (Slice 360): IPO-Plattform-Fee in den BeScout-Topf — voller Auffang (D96/D98)
IF v_platform_share > 0 THEN
  PERFORM book_platform_treasury('credit', 'ipo', v_platform_share, v_trade_id, 'IPO-Fee (Erstverkauf)');
END IF;
```

- **Inline, kein Trigger** (spiegelt PBT/Club-Inline-Booking + 358).
- **CREATE OR REPLACE = exakter Live-`functiondef` + genau dieser eine Block** — kein anderer Zeilen-Diff (PATCH-AUDIT: alle Fee-Konstanten, Guards, Zero-Price-Guard AR-6, Limits, early_access-Logik unverändert).
- `'ipo'` ist im `platform_treasury_ledger_source_check` bereits erlaubt → **keine CHECK-Migration** (verifiziert via `pg_get_constraintdef`).
- `v_trade_id` als `reference_id` (existiert vor der Einfügestelle, RETURNING aus `trades`-INSERT).

## 3. Betroffene Files

| File | Änderung | Begründung |
|------|----------|-----------|
| `supabase/migrations/<ts>_360_ipo_fee_rein.sql` | NEU — CREATE OR REPLACE `buy_from_ipo` mit Inline-Booking | Money-RPC, via `mcp__supabase__apply_migration` |
| `worklog/proofs/360-money-smoke.txt` | NEU — Force-Rollback-Smoke | PROVE (Money-Pflicht) |
| (kein src/-Change) | — | Fee-Split-Anteile unverändert, kein Service/UI berührt |

## 4. Code-Reading-Liste (Pflicht VOR Code, D87)

1. ✅ **Live `pg_get_functiondef('buy_from_ipo(uuid,uuid,integer)')`** — Source-of-Truth (gelesen). Einfügestelle = nach `IF v_pbt_share > 0 … END IF;`, vor `INSERT INTO transactions`. Plattform-Var = `v_platform_share`, ref = `v_trade_id`.
2. ✅ **Live `buy_player_sc`** — 358-Vorbild der Booking-Zeile (gelesen): `IF v_platform_fee > 0 THEN PERFORM book_platform_treasury('credit','trading',…); END IF;`.
3. ✅ **`pg_get_constraintdef` `platform_treasury_ledger_source_check`** — `'ipo'` erlaubt (gelesen).
4. **Live `book_platform_treasury(p_direction,p_source,p_amount,p_ref,p_desc)`** — Signatur bestätigt (text,text,bigint,uuid,text). Prüfen: append-only, REVOKE FROM anon, Saldo-Lock.
5. `worklog/proofs/358-money-smoke.txt` — Smoke-Technik (in-txn `set_config('request.jwt.claim.sub',…)` + `RAISE EXCEPTION 'SMOKE_RESULT: %'` für Output+Rollback).
6. `.claude/rules/trading.md` — IPO-Fee-Split (10 % Platform / 5 % PBT / 85 % Club) zum Assert der Konstanten.
7. `.claude/rules/business.md` — IPO-Wording (Ledger-Desc ist admin-facing → „IPO" erlaubt; user-facing wäre „Erstverkauf").

## 5. Pattern-References

- **D96** (Plattform-Treasury Epic), **D98** (voller Auffang 100 %), **D97** (Saldo Variante A) — `memory/decisions.md`.
- **Slice 358** — identisches Inline-Muster (E3-2 Trading).
- **D87** (Money-Muster: Live-functiondef VOR Spec).
- **errors-db.md PATCH-AUDIT** — CREATE-OR-REPLACE muss Konstanten/Guards prüfen, nicht nur Präsenz (356-Lehre: 343 revertierte still 80/20→70/30).
- **treasury.md §10** — WIE Plattform-Topf.

## 6. Acceptance Criteria

- **AC-1 [HAPPY]** Nach `buy_from_ipo` mit Fee>0 ist der Topf-Saldo um exakt `v_platform_share` gestiegen.
  VERIFY: Smoke `get_platform_balance()` vorher/nachher. EXPECTED: Δ = platform_share aus RPC-Return. FAIL-IF: Δ=0 oder ≠ platform_share.
- **AC-2 [ZERO-SUM]** Käufer-Abzug = Σ(Club + PBT + Topf). VERIFY: Smoke-Output Zahlen. EXPECTED: `total_cost = club_share + pbt_share + platform_share` UND Topf-Δ = platform_share.
- **AC-3 [GUARD]** Fee=0 (Config 0 bps) → keine Topf-Buchung, kein CHECK-Fehler. VERIFY: Guard `IF v_platform_share > 0`. EXPECTED: 0 Ledger-Row.
- **AC-4 [NO-DRIFT]** Kein anderer Verhaltens-Diff in `buy_from_ipo` (Limits, early_access, AR-6, Fee-Split). VERIFY: `git diff` der Migration zeigt NUR den einen IF-Block. EXPECTED: 1 Block hinzugefügt.
- **AC-5 [CHECK]** `'ipo'` braucht keine CHECK-Migration. VERIFY: `pg_get_constraintdef` enthält `'ipo'`. EXPECTED: bereits vorhanden.
- **AC-6 [IDEMPOTENZ/RACE]** Keine Doppelbuchung; advisory_xact_lock unverändert. VERIFY: Smoke 2 Käufe → 2 Ledger-Rows mit korrekten Beträgen. FAIL-IF: doppelte Row für einen Trade.
- **AC-7 [TSC/TESTS]** `tsc --noEmit` grün, `db-invariants.test.ts` grün (kein CHECK-Snapshot-Change nötig). VERIFY: vitest run.

## 7. Edge Cases

| Fall | Verhalten | Abgedeckt durch |
|------|-----------|-----------------|
| platform_share = 0 (0-bps-Config) | keine Buchung | `IF v_platform_share > 0`-Guard (AC-3) |
| Fee-Config fehlt (club + NULL) | Default 1000 bps greift | unverändert aus Live-Body |
| IPO beendet/inaktiv | RETURN vor Buchung | unverändert (Buchung nach allen Guards) |
| early_access ohne Abo | RETURN vor Buchung | unverändert |
| Zero-Price (AR-6) | RETURN vor Buchung | unverändert |
| Concurrent Buy (2 User, gleicher IPO) | je eigene Buchung, kein Race | advisory_xact_lock + Topf-Row-Lock in `book_platform_treasury` |
| Topf-Saldo-Lese-Race | SUM unter Singleton-Row-Lock | Variante A (D97), in `book_platform_treasury` |

## 8. Self-Verification Commands

```sql
-- CHECK erlaubt 'ipo' (erwartet: Treffer)
SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='platform_treasury_ledger_source_check';
-- Booking-Zeile live drin (nach apply)
SELECT pg_get_functiondef('public.buy_from_ipo(uuid,uuid,integer)'::regprocedure) LIKE '%book_platform_treasury%' AS has_booking;
```
```bash
npx tsc --noEmit
CI=true pnpm exec vitest run src/lib/services/__tests__/db-invariants.test.ts
```

## 9. Open-Questions

- **Pflicht-Klärung:** keine. Quelle (IPO) von Anil bestätigt, Policy D98 approved, CHECK deckt `'ipo'`.
- **Autonom-Zone (CTO):** Ledger-Description-Text (`'IPO-Fee (Erstverkauf)'`), exakte Einfügestelle, Migrations-Timestamp.
- **CEO-Zone:** keine offen (keine Fee-Höhen-Änderung).

## 10. Proof-Plan

`worklog/proofs/360-money-smoke.txt` — Force-Rollback-Smoke (358-Technik): echter IPO-Kauf in `BEGIN…ROLLBACK`, `set_config('request.jwt.claim.sub', user, true)` für `auth.uid()`-Guard, `RAISE EXCEPTION 'SMOKE_RESULT: …'` gibt Saldo-vorher/nachher + Zero-Sum-Zahlen zurück und rollt zurück. Plus `pg_get_functiondef`-Snippet (Booking-Zeile present) + `db-invariants.test.ts`-Output.

## 11. Scope-Out

- **Nicht** die anderen 3 Quellen (Polls/Research/Bounty) — je eigener Slice.
- **Keine** Fee-Höhen-/Split-Änderung.
- **Keine** Admin-UI-Änderung (Topf-Card aus 357 zeigt Saldo schon; neue Quelle erscheint automatisch im Ledger).
- **Kein** `transactions`/`pbt`-CHECK-Touch.

## 12. Stage-Chain (geplant)

SPEC → IMPACT (skipped: additive Inline-Buchung, 0 Consumer-Contract-Change, kein Schema-Shape-Change) → BUILD (1 Migration) → REVIEW (reviewer-Agent, Money-Pflicht) → PROVE (Money-Smoke) → LOG (+ Tracker/MASTERPLAN/TODO reconcile, Epic-Note §Slice 2 Teil-IPO abhaken).

## 13. Pre-Mortem (optional bei S — kurz)

1. **Falsche Var** (`v_platform_fee` statt `v_platform_share`) → tsc/DB-Fehler beim apply. Mitigation: aus Live-Body kopiert.
2. **Falsche Einfügestelle** (vor `v_trade_id` RETURNING) → NULL-ref. Mitigation: nach `trades`-INSERT, nach PBT-Block.
3. **Still anderen Body-Teil verändert** (PATCH-AUDIT-Klasse) → Money-Drift. Mitigation: exakter Live-functiondef + nur 1 Block, AC-4 git-diff-Check.
4. **Doppelbuchung bei Idempotenz** — IPO hat keine dedup-key-Logik (anders als buy_player_sc), advisory_xact_lock schützt. Mitigation: AC-6 Smoke.
