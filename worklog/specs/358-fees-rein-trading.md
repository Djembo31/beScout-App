# Slice 358 — E3-2 Fees REIN (Trading): Plattform-Fee in den Topf

**Slice-Type:** Migration (Money-RPC)
**Größe:** M
**CEO-Scope:** JA — Money-Path (§3). Policy CEO-approved 2026-06-24: **voller Auffang 100%** (gesamte Plattform-Fee → Topf, kein Teil-Burn/Cap). Kein Fee-%-Change → keine separate Fee-Approval nötig.
**Epic:** E3 Plattform-Treasury (BeScout-Topf), Slice 2 von 5. Fundament = Slice 357 ✅. Plan-Anker: `worklog/notes/358-platform-treasury-epic.md` §Slice 2.

---

## 1. Problem-Statement (mit Evidence)

**Befund (Live-verifiziert 2026-06-24 via `pg_get_functiondef`, D87):** In den Trading-RPCs wird der Plattform-Fee-Anteil berechnet und in `trades.platform_fee` **notiert, aber auf KEIN Konto gebucht** → er verbrennt. Gegenbeleg im selben Code: PBT wird inline gebucht (`credit_pbt` bzw. `pbt_treasury`-INSERT), Club wird inline gebucht (`UPDATE clubs SET treasury_balance_cents`). Nur der Plattform-Anteil hat kein Ziel.

Seit Slice 357 existiert der **Plattform-Topf** (`platform_treasury_ledger` + `book_platform_treasury()`), steht aber bei **0**, weil noch keine Quelle einzahlt.

**Scope-Befund (Code-Reading #5, Live-RPC-Inventar):** **DREI** Trading-Eintrittspunkte schreiben `trades.platform_fee` und sind frontend-verkabelt — nicht zwei:
- `buy_player_sc` (Orderbuch, Auto-Match billigste Order, 3,5 %) — `src/lib/services/trading.ts:102`.
- `buy_from_order` (kaufe konkrete Sell-Order, 3,5 %) — `src/lib/services/trading.ts:226`. **Identisches Fee-Schema** (`v_platform_fee := GREATEST(0, v_total_fee - v_pbt_fee - v_club_fee)`), gleicher Burn.
- `accept_offer` (P2P-Angebote, 2 %) — `src/lib/services/offers.ts:211`. `v_platform_fee := (v_total_cost * COALESCE(v_fee_cfg.offer_platform_bps, 200)) / 10000`.

`buy_from_ipo` schreibt ebenfalls `trades.platform_fee` (10 %), bleibt aber **out-of-scope** (eigener IPO-Slice, source `'ipo'`).

## 2. Lösungs-Design

**Inline-Buchung, kein Trigger.** Begründung: PBT + Club werden in allen RPCs **inline** gebucht (kein `trades`-Trigger existiert für Fee-Verteilung). Der Plattform-Anteil wird genauso inline daneben gebucht — Code-Konsistenz, minimaler Diff in der Money-RPC, **explizite Source-Tags** (Orderbuch vs. P2P im Ledger getrennt sichtbar; ein `trades`-Trigger könnte die Kanäle nur über fragile `sell_order_id`-Heuristik unterscheiden).

Pro RPC genau **ein Block**, platziert direkt nach dem Club-Fee-Block (symmetrisch), nach `v_trade_id`:

```sql
-- buy_player_sc UND buy_from_order (Orderbuch → Source 'trading'):
IF v_platform_fee > 0 THEN
  PERFORM book_platform_treasury('credit', 'trading', v_platform_fee, v_trade_id, 'Trading-Fee (Orderbuch)');
END IF;

-- accept_offer (P2P → Source 'p2p'):
IF v_platform_fee > 0 THEN
  PERFORM book_platform_treasury('credit', 'p2p', v_platform_fee, v_trade_id, 'P2P-Angebots-Fee');
END IF;
```

`IF v_platform_fee > 0`-Guard: `book_platform_treasury` ist zwar selbst-guardend (`amount <= 0 → RETURN NULL`), aber der Guard vermeidet die **Singleton-Row-`FOR UPDATE`-Akquise bei Null-Fee-Trades** (Serialisierungs-Schutz) und spiegelt den bestehenden `IF v_club_fee > 0`-Stil.

**Signatur (live, 357):** `book_platform_treasury(p_direction text, p_source text, p_amount bigint, p_ref uuid DEFAULT NULL, p_desc text DEFAULT NULL) RETURNS bigint`. SECURITY DEFINER, EXECUTE nur `postgres`+`service_role` → aus den Definer-RPCs (Owner postgres) intern aufrufbar. Source-CHECK hält `trading`+`p2p` ✅ (kein CHECK-Edit nötig).

## 3. Betroffene Files

| File | Änderung | Begründung |
|---|---|---|
| `supabase/migrations/NNN_fees_rein_trading.sql` | NEU — `CREATE OR REPLACE` für `buy_player_sc` + `buy_from_order` + `accept_offer` (je +1 inline-Block) | Money-RPC-Änderung via `apply_migration` (Registry, reference_migration_workflow.md) |
| `worklog/proofs/358-*` | Smoke-Outputs | PROVE |

**Kein** Service-/Type-/UI-Change: Return-Shape aller drei RPCs **unverändert** (nur Side-Effect ergänzt). `platform_fee` ist im Return bereits vorhanden.

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

1. **Live `pg_get_functiondef('buy_player_sc(uuid,uuid,integer,text)')`** — ✅ gelesen 2026-06-24. Vollen Body als Migrations-Baseline nehmen (NICHT die alte .sql-Datei — Drift-Gefahr, D87/FRE-2-Lehre). Frage: exakte Einfügestelle nach Club-Block, vor `INSERT INTO transactions`.
2. **Live `pg_get_functiondef('accept_offer(uuid,uuid)')`** — ✅ gelesen. Frage: Einfügestelle nach Club-Block, vor `INSERT INTO transactions`.
3. **Live `pg_get_functiondef('book_platform_treasury')`** — ✅ gelesen. Frage: Param-Reihenfolge + Self-Guard bestätigt.
4. **Source-CHECK `platform_treasury_ledger`** — ✅ gelesen: `trading/ipo/poll/research/bounty/p2p/monthly_liga/bescout_event`. Frage: 'trading'+'p2p' valide → ja.
5. **`grep -rn "INSERT INTO trades" supabase/ ` + RPC-Inventar** — gibt es WEITERE `trades`-schreibende Pfade mit `platform_fee` (Market-Sell?, Liquidation?), die sonst still weiter verbrennen? Scope-Entscheid: nur buy_player_sc+accept_offer in 358; falls weiterer Pfad gefunden → als Scope-Out + Epic-Notiz flaggen, NICHT stillschweigend übergehen.
6. **`docs/knowledge/domain/treasury.md` §10** — Epic-Kanon, Source-Taxonomie 'trading' vs 'p2p'. Frage: Wissens-Kopplung — muss §10 nach diesem Slice `updated:` bekommen (E0-W2gov/D88)?

## 5. Pattern-References

- **D96** (E3 Plattform-Treasury Epic, WARUM) + **D97** (Saldo = SUM-on-read Variante A).
- **D87** Money-Muster: Live-`pg_get_functiondef` VOR Spec — befolgt.
- **Slice 357** book_platform_treasury Fundament (REVOKE-only, Singleton-Lock).
- **errors-db.md** PATCH-AUDIT: CREATE OR REPLACE muss Live-Body als Baseline nehmen, **alle bestehenden Konstanten/Patches erhalten** (356-Fee-Heal-Lehre: 70/30-Regression durch stale Baseline).
- **Slice 329** Club-Treasury Inline-Booking-Muster (PBT/Club inline → Plattform analog).

## 6. Acceptance Criteria (executable)

- **AC1 [HAPPY-trading]** `buy_player_sc` **und** `buy_from_order` mit `platform_fee>0` → je genau **1** neue `platform_treasury_ledger`-Zeile: `direction='credit'`, `source='trading'`, `amount = trades.platform_fee`, `reference_id = trade_id`. VERIFY: COUNT vor/nach im Rollback-Smoke je Pfad.
- **AC2 [HAPPY-p2p]** `accept_offer` → 1 Zeile `source='p2p'`, `amount = trades.platform_fee`, `reference_id = trade_id`.
- **AC3 [ZERO]** Trade mit `platform_fee = 0` (Fee komplett wegrabattiert / Mini-Trade) → **keine** neue Ledger-Zeile. FAIL-IF: Zeile mit amount=0 (CHECK würde eh werfen) oder leere credit.
- **AC4 [ZERO-SUM]** Käufer-Wallet-Abzug == `seller_net + pbt_fee + club_fee + platform_fee`. Kein Cent erzeugt/vernichtet außer dem bewussten Routing.
- **AC5 [SALDO]** `get_platform_balance()` nachher == vorher + `platform_fee`. `balance_after` der neuen Zeile == neuer Saldo.
- **AC6 [IDEMPOTENT]** `buy_player_sc`-Replay mit gleichem `p_idempotency_key` → cached Response, **keine** zweite Ledger-Zeile.
- **AC7 [REGRESSION]** Return-Shape beider RPCs unverändert (alle bisherigen Keys present); PBT + Club + Seller-Proceeds wie vor 358 gebucht; `trades`/`transactions`-INSERTs unverändert.
- **AC8 [SECURITY]** `book_platform_treasury` EXECUTE weiterhin nur postgres+service_role (anon ausgeschlossen); interner PERFORM aus Definer-RPC erfolgreich.

## 7. Edge Cases Table

| Fall | Verhalten | Begründung |
|---|---|---|
| `platform_fee = 0` | kein Ledger-Eintrag, kein Lock | Guard `IF >0`; CHECK `amount>0` würde sonst werfen |
| Effektive Fee 0 (Abo-Rabatt drückt bps auf 0) | platform_fee=0 → wie oben | buy_player_sc setzt dann v_platform_fee:=0 explizit |
| Singleton-Row fehlt | `book_platform_treasury` RAISE → **ganzer Trade rollt zurück** (fail-closed) | Money: lieber lauter Fehler als stiller Burn. Row ist seeded + append-only-geschützt (357), praktisch unmöglich weg |
| 2 Trades gleichzeitig | serialisieren auf Singleton `FOR UPDATE` | Variante A (D97); Pilot-Volumen unkritisch, Revisit B bei Mio-Zeilen |
| Idempotenz-Replay (buy) | Body läuft nicht erneut → keine Doppelbuchung | Dedup-Cache returnt vor Body |
| Doppel-Accept (offer) | Status-Guard `<> 'pending'` → reject vor Buchung | bestehender Guard |
| Negativer/NULL platform_fee | Guard + Self-Guard fangen | unmöglich (GREATEST(0,…) / bps≥0) |
| `accept_offer` side='buy' vs 'sell' | platform_fee aus offer_*_bps unabhängig vom side → ein Buchungsblock deckt beide | Block steht nach gemeinsamem trade-INSERT |

## 8. Self-Verification Commands

```sql
-- Live-Body nach Migration verifizieren (alle drei enthalten book_platform_treasury):
SELECT pg_get_functiondef('public.buy_player_sc(uuid,uuid,integer,text)'::regprocedure)  LIKE '%book_platform_treasury%' AS buy_ok;
SELECT pg_get_functiondef('public.buy_from_order(uuid,uuid,integer,text)'::regprocedure)  LIKE '%book_platform_treasury%' AS bfo_ok;
SELECT pg_get_functiondef('public.accept_offer(uuid,uuid)'::regprocedure)                 LIKE '%book_platform_treasury%' AS offer_ok;
-- Source-Tags korrekt (kein Vertausch):
SELECT pg_get_functiondef('public.buy_player_sc(uuid,uuid,integer,text)'::regprocedure)  LIKE '%''trading''%' AS buy_src;
SELECT pg_get_functiondef('public.buy_from_order(uuid,uuid,integer,text)'::regprocedure)  LIKE '%''trading''%' AS bfo_src;
SELECT pg_get_functiondef('public.accept_offer(uuid,uuid)'::regprocedure)                 LIKE '%''p2p''%'     AS offer_src;
```
```bash
# Regression Service-Tests (Return-Shape unverändert):
CI=true pnpm exec vitest run src/lib/services/__tests__/trading
# Weitere trades-Schreiber suchen (Scope-Vollständigkeit):
grep -rn "INSERT INTO trades" supabase/migrations/ | sort -u
```

## 9. Open-Questions

- **CEO-geklärt:** voller Auffang 100% (2026-06-24). ✅
- **CTO-autonom:** Source-Tagging 'trading' (Orderbuch) vs 'p2p' (Angebote) folgt D96-Taxonomie (treasury.md §10 Tabelle) — keine neue Entscheidung. Inline statt Trigger = CTO-WIE.
- **CTO-autonom:** Description-Strings kurz (`'Trading-Fee (Orderbuch)'` / `'P2P-Angebots-Fee'`); Detail steckt via `reference_id=trade_id` im verlinkten Trade.
- **Code-Reading #5 RESULT:** weiterer Orderbuch-Burn-Pfad `buy_from_order` gefunden → **in 358 aufgenommen** (gleicher Kanal/Source 'trading', gleiches Fee-Schema, frontend-verkabelt). `buy_from_ipo` = anderer Kanal/Fee → eigener Slice.

## 10. Proof-Plan

- `worklog/proofs/358-money-smoke.txt` — Force-Rollback (`BEGIN…ROLLBACK`) **beide Pfade**: Saldo vorher → Trade → Saldo nachher (= +platform_fee), Ledger-Zeile (source/amount/balance_after), Zero-Sum-Rechnung. Plus Null-Fee-Pfad (keine Zeile) + Idempotenz-Replay (keine Doppelzeile).
- `worklog/proofs/358-rpc.txt` — `pg_get_functiondef` beider RPCs nach Migration (Beweis Buchung drin + Source-Tags korrekt + alle Altpatches erhalten).
- `worklog/proofs/358-vitest.txt` — Trading-Service-Tests grün (Regression Return-Shape).

## 11. Scope-Out

- IPO (`buy_from_ipo`), Polls (`cast_community_poll_vote`), Research (`unlock_research`), Bounty (`approve_bounty_submission`) — je eigener Folge-Slice (eine Quelle/Slice).
- **Kein** Fee-%-Change. **Kein** Backfill historisch verbrannter Fees (Topf startet bei 0, D96).
- **Kein** Teil-Burn/Cap-Mechanismus (CEO: voller Auffang).
- **Keine** neue Tabelle / RLS / Service / UI.
- RAUS-Kanäle (Monats-Liga/Events) = Slice 3/4.

## 12. Stage-Chain (geplant)

SPEC → IMPACT (skipped: keine neuen Consumer; Return-Shape unverändert; reine additive Side-Effect-Buchung — grep-Verify in Code-Reading #5 ersetzt Impact-Doc) → BUILD (1 Migration, apply_migration) → REVIEW (Reviewer-Agent, Money-Pflicht) → PROVE (Force-Rollback-Smoke + functiondef + vitest) → LOG (commit+push, Tracker-Reconcile MASTERPLAN/TODO/358-epic, treasury.md §10 `updated:` wenn nötig).

## 13. Pre-Mortem (Money → Pflicht)

1. **Stale Baseline** → CREATE OR REPLACE überschreibt einen Live-Patch (wie 356 70/30-Regression). **Mitigation:** Migrations-Body = exakt der heute gelesene Live-`pg_get_functiondef`, nur +1 Block; Diff Zeile-für-Zeile gegen Live vor apply. Reviewer prüft Vollständigkeit.
2. **Source vertauscht** (buy→p2p, offer→trading) → Ledger-Analytik falsch. **Mitigation:** AC + Self-Verify `LIKE '%''trading''%'` pro RPC.
3. **Doppelbuchung** durch falsche Platzierung (z.B. in einer Schleife / vor Status-Guard). **Mitigation:** Block nach `v_trade_id`, einmal pro Trade; Idempotenz-AC6 + Doppel-Accept-Edge.
4. **Singleton-Deadlock** wenn anderer Lock in inkonsistenter Reihenfolge. **Mitigation:** Buchung als **letzter** Lock vor Commit (nach allen Wallet/Holding/Order-Updates); alle Trades nehmen Singleton zuletzt → konsistente Ordnung.
5. **Privileg-Fehler** — interner PERFORM scheitert an REVOKE. **Mitigation:** Owner=postgres hat EXECUTE (live verifiziert); AC8 + Smoke fährt echten RPC-Call (nicht nur direkten book-Call).
6. **Zero-Sum bricht** durch Rundung. **Mitigation:** platform_fee ist bereits gerundeter BIGINT; buy_player_sc berechnet platform als Rest (total−pbt−club) → exakt; AC4 prüft Gleichung.
