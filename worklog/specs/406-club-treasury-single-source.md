# Slice 406 — Club-Treasury Single-Source-of-Truth (Counter-Orphan entfernen)

**Slice-Type:** Migration (+ minimaler Test-Fix)
**Größe:** M
**CEO-Scope:** JA (Money + Schema-DROP) — Anil hat Option A approved (Counter-Writes raus + Spalte droppen), 2026-06-27.
**Welle:** Mock→Pro Welle 1 Trading, Schritt 1.3.

---

## 1. Problem-Statement (Evidence)

Live-Verifikation (2026-06-27, `pg_get_functiondef` + Live-Daten) ergab: Der Club-Anteil jedes Kaufs wird in **zwei getrennte Konten** geschrieben:

1. **Ledger** `club_treasury_ledger` (kanonisch) — via Trigger `trg_trades_book_club_treasury` (AFTER INSERT ON trades, bucht `NEW.club_fee` → `book_club_treasury(..., 'trade_fee', ...)`). **Die Auszahlung (`get_club_balance` → `request_club_withdrawal`) liest ausschließlich den Ledger.**
2. **Counter** `clubs.treasury_balance_cents` — direkt im RPC-Body (`UPDATE clubs SET treasury_balance_cents += club_fee/club_share`).

**Wer liest den Counter:** `SELECT proname, prosrc ILIKE '%treasury_balance_cents%' …` → genau 4 Funktionen referenzieren die Spalte, **alle 4 schreiben nur** (`accept_offer`, `buy_from_ipo`, `buy_from_order`, `buy_player_sc`). **0 Funktionen lesen.** src-Grep: einzige Referenz = `schema-contracts.test.ts:266` (Spaltenliste). `DbClub`-Type enthält die Spalte gar nicht.

**Schaden (Live-Daten, Top-30 Clubs):** Counter ≠ Ledger bei 21/30 Clubs, Drift bis **571.514 Cents (5.715 Credits)** (Sivasspor). Beispiel Sakaryaspor: Ledger-trade_fee = 625.509 = exakt `SUM(trades.club_fee)`; Counter = 846.553 (+221.044 Legacy-Müll ohne Trades-Beleg).

**Klassifikation:** Mock→Pro Grund-Ursache #1 („von allem zwei"). **KEINE echte Doppelzählung im Geld-Pfad** (Counter ist leseseitig tot), sondern eine **gedriftete Karteileiche**. Money-Risiko heute: praktisch null. Integritäts-/Klarheits-Schuld.

## 2. Lösungs-Design

Eine Quelle der Wahrheit = der Ledger. EINE Migration `20260627100000_slice_406_club_treasury_single_source.sql`:

1. **CREATE OR REPLACE** der 4 RPCs — jeweils Live-Body byte-identisch übernommen (D87/PATCH-AUDIT), **nur** der Block `IF v_club_fee/v_club_share > 0 AND v_player.club_id IS NOT NULL THEN UPDATE clubs SET treasury_balance_cents = … END IF;` **entfernt**. Alles andere (auth-Guard, Idempotency, fee_config, Trigger-erzeugende `trades`-INSERTs, `book_platform_treasury`, pbt) unverändert.
2. **DANACH** `ALTER TABLE clubs DROP COLUMN treasury_balance_cents;` (keine Abhängigkeit → kein CASCADE).
3. AR-44: alle 4 RPCs sind bestehende Funktionen mit unveränderter Signatur → `CREATE OR REPLACE` **erhält** die ACL (S368c empirisch). Trotzdem per `proacl` verifizieren (kein REVOKE/GRANT nötig/erwünscht — würde nur bestätigen).

Reihenfolge RPCs→DROP: am Ende referenziert keine Live-Funktion mehr die Spalte, bevor sie fällt.

## 3. Betroffene Files

| File | Änderung | Begründung |
|------|----------|------------|
| `supabase/migrations/20260627100000_slice_406_club_treasury_single_source.sql` | NEU | 4× CREATE OR REPLACE (Counter-Write raus) + DROP COLUMN |
| `src/lib/__tests__/contracts/schema-contracts.test.ts` | `'treasury_balance_cents'` aus `clubs`-Spaltenliste (Z.266) entfernen | sonst Contract-Test rot nach DROP |

Kein `src/lib/services/*`-Edit (kein Reader). Kein Type-Edit (`DbClub` hat die Spalte nicht).

## 4. Code-Reading-Liste (vor BUILD — bereits erledigt, Live)

| # | Quelle | Zweck / geprüfte Frage | Befund |
|---|--------|------------------------|--------|
| 1 | `pg_get_functiondef` `buy_player_sc` | Wo Counter-Write? geldneutral entfernbar? | Block direkt nach `credit_pbt`; trades-INSERT vorher → Trigger bucht Ledger. ✅ |
| 2 | `pg_get_functiondef` `buy_from_order` | dito | identischer Block nach `credit_pbt`. ✅ |
| 3 | `pg_get_functiondef` `accept_offer` | dito + side='buy'/'sell' | Block nach pbt-Insert; trades-INSERT vorher. ✅ |
| 4 | `pg_get_functiondef` `buy_from_ipo` | IPO erzeugt trades-Row? (sonst NICHT neutral) | **JA** — INSERT INTO trades mit `club_fee=v_club_share` → Trigger bucht 85% in Ledger. Counter-Write redundant. ✅ |
| 5 | `pg_get_functiondef` `trg_trades_book_club_treasury` | bucht jede trades-Zeile in Ledger? | JA, `IF NEW.club_fee>0` → `book_club_treasury('trade_fee')`. ✅ |
| 6 | `pg_get_functiondef` `get_club_balance` | liest Counter? | NEIN, rein Ledger-basiert (`v_ledger_net`, type-Buckets). ✅ |
| 7 | `pg_get_functiondef` `request_club_withdrawal` | Auszahlungs-Gate-Quelle? | `get_club_balance.available` = Ledger-net − withdrawn. ✅ |
| 8 | `pg_depend`/`information_schema` | View/Index/Default an Spalte? | nur auto-deptype (Tabelle selbst); NOT NULL DEFAULT 0; kein View/Index → DROP glatt. ✅ |
| 9 | `prosrc ILIKE` über alle Funktionen | Counter-Reader? | 0 Reader, 4 Writer. ✅ |
| 10 | `src` grep + `DbClub` | TS-Reader/Type-Feld? | nur schema-contract-Test; Type hat Spalte nicht. ✅ |

## 5. Pattern-References

- **S156 PATCH-AUDIT (errors-db.md):** Body-Rewrite SEC-DEFINER → Baseline = Live-`pg_get_functiondef` (D87), Zwischen-Patches erhalten. Hier: alle 4 Bodies live gezogen, nur 1 Block entfernt.
- **S356 Konstanten-Audit:** Fee-Konstanten unverändert lassen (nicht angefasst). Post-Apply diff bestätigt.
- **database.md AR-44 / S368c:** CREATE OR REPLACE bestehender Funktion erhält ACL; per `proacl` verifizieren.
- **D97 (Platform-Treasury):** Saldo = SUM-on-read aus Ledger (Variante A) — Club-Treasury soll demselben Prinzip folgen (genau das macht der Ledger schon).

## 6. Acceptance Criteria

- **AC-1 [HAPPY] Geldneutral Trading:** force-rollback Smoke `buy_from_order` (oder `buy_player_sc`): `SUM(wallets.balance) + club_ledger_net + platform_topf + pbt` vor==nach (Zero-Sum diff=0). VERIFY: `DO`-Block `BEGIN…RAISE`. FAIL-IF: diff≠0.
- **AC-2 [HAPPY] Club-Anteil weiter im Ledger:** nach Smoke-Kauf existiert eine `club_treasury_ledger`-Zeile type='trade_fee' mit `amount=club_fee`. VERIFY: SELECT in Smoke. FAIL-IF: keine Ledger-Zeile.
- **AC-3 [HAPPY] IPO geldneutral:** force-rollback `buy_from_ipo`-Smoke: Club-Share (85%) landet im Ledger (trade_fee), Zero-Sum diff=0. FAIL-IF: Club-Share verschwindet.
- **AC-4 [STRUCT] Spalte weg:** `SELECT 1 FROM information_schema.columns WHERE table_name='clubs' AND column_name='treasury_balance_cents'` → 0 Zeilen. FAIL-IF: Spalte existiert noch.
- **AC-5 [STRUCT] Kein Counter-Reference mehr:** `SELECT count(*) FROM pg_proc WHERE prosrc ILIKE '%treasury_balance_cents%'` = 0. FAIL-IF: > 0.
- **AC-6 [REGRESSION] Bodies byte-identisch außer Counter-Block:** `pg_get_functiondef` jeder RPC enthält weiter `auth_uid_mismatch`, `book_platform_treasury`, `credit_pbt`/pbt-Insert, Idempotency-Block. FAIL-IF: ein Guard fehlt.
- **AC-7 [BUILD] tsc + vitest grün** inkl. angepasstem schema-contract-Test. FAIL-IF: rot.
- **AC-8 [SECURITY] ACL erhalten:** `proacl` der 4 RPCs = `{authenticated,service_role}` (kein anon). FAIL-IF: anon kann.

## 7. Edge Cases

| Fall | Verhalten | Abgedeckt |
|------|-----------|-----------|
| club_id NULL (vereinsloser Spieler) | kein Ledger-Eintrag (Trigger no-op `v_club_id IS NULL`), kein Counter mehr → konsistent | AC-2 |
| club_fee = 0 (fee_bps=0/Abo-Discount) | Trigger no-op, kein Ledger; vorher auch kein Counter (guard `>0`) | byte-Diff |
| IPO Club-Share 85% (groß) | weiter im Ledger via trades-INSERT-Trigger | AC-3 |
| Bestehende Drift (846k vs 625k) | Counter wird gedroppt → Drift verschwindet per Definition; Ledger unangetastet = korrekt | AC-4 |
| DROP mit NOT NULL DEFAULT 0 | DROP COLUMN entfernt Default+Constraint mit; keine Daten-Migration nötig | AC-4 |
| Greenfield `db reset` | Migration läuft nach allen RPC-Migrationen (Timestamp 20260627 > alle) → CREATE OR REPLACE auf existierende Funktion + DROP existierende Spalte; idempotent? DROP COLUMN ist nicht IF EXISTS → bei Re-Run Fehler. → `DROP COLUMN IF EXISTS` nutzen | BUILD |
| accept_offer side='buy' vs 'sell' | Counter-Block ist nach beiden Pfaden (gemeinsamer Code) → 1 Entfernung deckt beide | AC-1 |

## 8. Self-Verification Commands

```sql
-- Counter-Reader/Writer gone:
SELECT proname FROM pg_proc WHERE prosrc ILIKE '%treasury_balance_cents%';            -- erwartet: 0 rows
SELECT 1 FROM information_schema.columns WHERE table_name='clubs' AND column_name='treasury_balance_cents'; -- 0 rows
-- ACL:
SELECT proname, proacl FROM pg_proc WHERE proname IN ('buy_player_sc','buy_from_order','accept_offer','buy_from_ipo');
-- Guards erhalten:
SELECT proname FROM pg_proc WHERE proname IN ('buy_player_sc','buy_from_order','accept_offer','buy_from_ipo')
  AND pg_get_functiondef(oid) ILIKE '%auth_uid_mismatch%' AND pg_get_functiondef(oid) ILIKE '%book_platform_treasury%';
```
```bash
pnpm exec tsc --noEmit
CI=true pnpm exec vitest run src/lib/__tests__/contracts/schema-contracts.test.ts
```

## 9. Open-Questions

- **CEO (geklärt 2026-06-27):** Counter-Schicksal → **Option A** (Writes raus + DROP). ✅
- **Autonom-Zone (CTO):** Migrations-Timestamp, `IF EXISTS`-Guards, Smoke-Auswahl, schema-contract-Test-Edit.
- **Pflicht-Klärung:** keine offen.

## 10. Proof-Plan

- `worklog/proofs/406-money-smoke.txt` — force-rollback `DO`-Block: AC-1 (buy_from_order Zero-Sum), AC-2 (Ledger-Zeile), AC-3 (buy_from_ipo Zero-Sum), je `RAISE EXCEPTION 'REPORT >>> …'` (Rollback, null Persistenz).
- `worklog/proofs/406-struct.txt` — AC-4/AC-5/AC-6/AC-8 Live-Queries nach Apply.
- `worklog/proofs/406-vitest.txt` — schema-contract-Test grün.

## 11. Scope-Out

- **Nebenbefund IPO-Share als `'trade_fee'` (statt `'ipo_fee'`) im Ledger** → semantisches Label, kein Geld (beide Buckets summieren in `get_club_balance.v_trade_fees`). **Eigener Mini-Slice** (würde `trg_trades_book_club_treasury` um type-Unterscheidung via `NEW.ipo_id IS NOT NULL` erweitern). NICHT hier.
- Keine Daten-Reconciliation der Alt-Drift nötig (Counter wird gelöscht; Ledger ist bereits korrekt).
- Orderbuch `orders`/`offers`-Architektur (1.4) = separater CEO-Fork.

## 12. Stage-Chain (geplant)

SPEC ✅ → IMPACT (skipped — Consumer in §3/§4 live-gegreppt, einziger src-Consumer der Test; reine RPC-Body-Reduktion + DROP) → BUILD (1 Migration via apply_migration + 1 Test-Edit) → REVIEW (reviewer-Agent, Money-Pflicht) → PROVE (force-rollback Zero-Sum + Struct-Queries + vitest) → LOG.

## 13. Pre-Mortem (M, freiwillig — Money)

1. **RPC-Body bei Replace versehentlich verändert (Silent-Revert eines Guards)** → Mitigation: Live-Body 1:1 kopieren, nur den einen Block löschen; AC-6 ILIKE-Guards + Reviewer PATCH-AUDIT.
2. **DROP COLUMN bricht weil doch ein Reader existiert** → Mitigation: §4#8/#9 zeigen 0 Reader; `pg_depend` 0 View; falls Apply doch fehlschlägt → Fehlermeldung nennt Objekt, dann stoppen + melden (kein CASCADE blind).
3. **Greenfield-Re-Run Fehler (DROP ohne IF EXISTS)** → `DROP COLUMN IF EXISTS`.
4. **ACL versehentlich auf PUBLIC zurückgesetzt** → CREATE OR REPLACE erhält ACL (S368c); AC-8 verifiziert `proacl`.
5. **Zero-Sum-Bruch weil club_fee nun nirgends landet** → falsch: Trigger bucht weiter (trades-INSERT bleibt); AC-1/AC-2/AC-3 beweisen Ledger-Eintrag + diff=0.
