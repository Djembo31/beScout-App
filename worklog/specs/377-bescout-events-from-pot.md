# Slice 377 — BeScout-Events zahlen Prize aus dem Plattform-Topf (E3 RAUS-Kanal #2)

**Status:** SPEC · **Größe:** M · **Slice-Type:** Migration (Money-RPC/Trigger) · **Scope:** CEO-approved (Anil 2026-06-25, AskUserQuestion: Escrow-bei-Erstellung/Spiegel-331) · **Datum:** 2026-06-25

> Money/CEO-Scope, selbst gebaut (§3). D87-Muster: Live-`pg_get_functiondef` aller 3 Event-Trigger + `score_event` + `book_platform_treasury` VOR Spec gelesen (siehe §4 — alle live abgeglichen, NICHT aus Migrationsdateien).

---

## 1. Problem Statement

`type='bescout'`-Events (Plattform-Events) zahlen ihren Prize heute per **reinem Minten**: `score_event` schreibt `reward_amount` direkt in die Gewinner-Wallets (`UPDATE wallets SET balance = balance + …`) ohne irgendein Konto zu belasten. Nur `type='club'`-Events sind seit Slice 331 treasury-gedeckt (Escrow aus Vereins-Treasury). `treasury.md §7`-Tabelle markiert `bescout` explizit als „mintet bewusst weiter". Das ist der **zweite RAUS-Kanal** des E3-Plattform-Topfs (nach Monats-Liga 376) — Ziel: deflationär → zirkulär, kein Netto-Minting für Plattform-Rewards.

**Evidence:** Live-`score_event`-Body (§4 Item 4) — Prize-Distribution-Block mintet ohne Treasury-Debit. Live-Count: `bescout`=39 Events, **0 prized, 0 escrowed** → sauberer Boden, 0 Live-Geld in Gefahr (wie 331). Epic-Plan `worklog/notes/358-platform-treasury-epic.md` Slice 4. CEO-Entscheid: Anil 2026-06-25 (Escrow-bei-Erstellung, Spiegel 331).

**Wer/wie oft:** Plattform-Admins legen BeScout-Events an. Aktuell 0 prized live → Feature aktiviert sich erst beim ersten prized bescout-Event. Kein bestehender User-Flow ändert sich.

## 2. Lösungs-Design (Architektur)

**Trigger-zentrisch, Spiegel 331, `score_event` UNANGETASTET** (331-Philosophie D39: kein score_event-Rewrite). Die 3 bestehenden Event-Trigger werden um einen `type='bescout'`→`platform_treasury`-Zweig erweitert, parallel zum bestehenden `type='club'`→`club_treasury`-Zweig.

**Geldfluss bescout-Event (zero-sum):**
```
INSERT event(type=bescout, prize_pool=P)   → Topf −P (Escrow-Debit) ; RAISE wenn Topf<P
score_event verteilt D an Sieger           → mintet +D in Wallets (wie heute, UNVERÄNDERT)
UPDATE events status='ended'               → Topf +(P−D) (Rest zurück)
                                           ──────────────────────────────
Netto Topf = −P + (P−D) = −D   |   Netto Wallets = +D   |   System-Saldo = 0 ✅
```
Die Minting-Buchung in `score_event` ist jetzt durch den Topf-Escrow **gedeckt** → aus Netto-Minting wird zirkuläre Umverteilung. Bei `cancelled` (Slice 335): voller Refund P zurück.

**Drei Trigger-Änderungen** (alle `CREATE OR REPLACE`, exakter Live-Body als Baseline + bescout-Zweig):

1. **`trg_events_escrow_prize()`** (BEFORE INSERT): neuer `ELSIF NEW.type='bescout' AND NEW.prize_pool>0` → Singleton-Row-Lock (`platform_treasury FOR UPDATE`) → inline `SUM`-Deckungs-Check → `RAISE 'platform_treasury_insufficient_for_event_prize'` bei Unterdeckung (D103 Hard-Gate) → `book_platform_treasury('debit','bescout_event',NEW.prize_pool,NEW.id,…)` → `NEW.prize_escrowed:=true`. (bescout braucht KEIN `club_id`.)

2. **`trg_events_prize_settle()`** (BEFORE UPDATE OF status): bestehende Top-Bedingung von `NEW.club_id IS NOT NULL` entkoppeln; Refund-Ziel nach `NEW.type` verzweigen — `club`→`book_club_treasury` (unverändert), `bescout`→`book_platform_treasury('credit','bescout_event',v_refund,…)`. Refund-Betrag-Logik (ended=Rest, cancelled=voll) unverändert.

3. **`trg_events_resync_prize_escrow()`** (BEFORE UPDATE OF prize_pool, type): **Zwei-Treasury-Generalisierung.** Statt einer `v_target/v_held`-Differenz: pro Treasury `v_held_club/v_held_plat` (aus OLD, diskriminiert per `OLD.type`+`OLD.prize_escrowed`) und `v_tgt_club/v_tgt_plat` (aus NEW) berechnen, je Treasury Delta buchen (debit+Deckungs-Check / credit). Deckt `club↔bescout`-Wechsel sauber (refund alte Treasury + escrow neue). Verhindert Minting-Hintertür (331-Finding #1) auch für bescout.

**Warum Escrow statt Debit-bei-Settle:** CEO-Entscheid (Anil) — überzieh-sicher (kein bescout-Event ohne gedeckten Topf anlegbar), konsistent mit Club-Events, `score_event` bleibt unberührt (kein PATCH-AUDIT-Risiko an der größten Money-RPC).

**Keine** `source`-CHECK-Migration (`bescout_event` seit Slice 357 im Ledger-CHECK). **Kein** src/-Change, **kein** i18n-Change (`platformPotSrcBescoutEvent` Label + Admin-Map seit 357 vorhanden).

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `supabase/migrations/20260625140000_slice377_bescout_events_from_pot.sql` | NEU | 3× `CREATE OR REPLACE FUNCTION` (escrow/settle/resync). Trigger-Bindings bleiben (DROP/CREATE TRIGGER nicht nötig — Funktions-Replace reicht; ich re-attache NICHT, nur Body-Replace). |

**Greps (Consumer von dem was sich ändert):**
- `grep -rn "trg_events_escrow_prize\|trg_events_prize_settle\|trg_events_resync_prize_escrow" supabase/ src/` — nur Migrationsdateien (Trigger sind DB-intern, kein App-Consumer).
- `grep -rn "book_platform_treasury\|platform_treasury_ledger" src/` — Admin-UI liest Ledger read-only (AdminTreasuryTab), keine Schreibpfad-Änderung.
- Score/Settle-Pfad: `score_event` (RPC) + `cancel_event` (Slice 335) sind die UPDATE-Quellen, die settle/resync triggern — beide unverändert.

## 4. Code-Reading-Liste (Pflicht VOR Implementation) — ✅ alle live gelesen 2026-06-25

| File / Objekt | Zweck | Befund |
|------|-------|--------|
| `pg_get_functiondef('trg_events_escrow_prize()')` (LIVE) | Escrow-Baseline | Nur `type='club'`-Zweig, club_treasury-Deckungs-Check (ledger_net − offene withdrawals), `book_club_treasury('debit','event_prize',…)`. Setzt `NEW.id` falls NULL. |
| `pg_get_functiondef('trg_events_prize_settle()')` (LIVE) | Settle-Baseline | **DRIFT vs. 331-Migration:** Live behandelt `ended` UND `cancelled` (Slice 335). Top-Cond hat `NEW.club_id IS NOT NULL` — muss für bescout entkoppelt werden. ended→Rest, cancelled→voll. |
| `pg_get_functiondef('trg_events_resync_prize_escrow()')` (LIVE) | Resync-Baseline | Einzel-Treasury `v_target/v_held`-Delta, type-blind `v_held` (nur `OLD.prize_escrowed`). Muss type-diskriminiert werden, sonst falsche Treasury bei bescout. |
| `pg_get_functiondef('score_event(uuid)')` (LIVE) | Minting-Pfad (NICHT ändern) | Setzt `lineups.reward_amount` im Rank-Loop, DANN `UPDATE events SET status='ended'` → settle liest `SUM(reward_amount)` = bereits gesetzt (timing korrekt, wie 331-Comment). `v_scored_count=0`-Pfad: status='ended' ohne Distribution → settle refundet vollen Pool. |
| `pg_get_functiondef('book_platform_treasury(text,text,bigint,uuid,text)')` (LIVE) | Topf-Buchung | KEIN Negativ-Guard (`p_amount<=0`→NULL). Lockt selbst `platform_treasury FOR UPDATE`, SUM-Ledger, INSERT mit `balance_after`. → Deckungs-Check MUSS im Trigger inline davor. |
| `pg_get_constraintdef` platform_treasury_ledger source (LIVE) | CHECK-Drift | `source` enthält `'bescout_event'` ✅ (Slice 357) → keine CHECK-Migration. |
| `pg_get_constraintdef` events.type/status (LIVE) | CHECK-Wahrheit | type∈{bescout,club,sponsor,special}; status enthält `cancelled` ✅. |
| `supabase/migrations/20260617150000_slice_331_events_treasury_escrow.sql` | Vorbild-Struktur | Trigger-Set + Reviewer-Finding #1 (resync gegen Minting-Hintertür). |
| `supabase/migrations/20260625130000_slice376_monthly_liga_pot_payout.sql` | Topf-Debit-Muster | Inline-SUM-Deckungs-Check unter Singleton-Row-Lock + RAISE-Muster. |
| `AdminTreasuryTab.tsx` + `messages/{de,tr}.json` `platformPotSrcBescoutEvent` | Label-Vorhandensein | Map + i18n DE+TR seit 357 da → kein FE/i18n-Change. |

## 5. Pattern-References

- `decisions.md` **D96** — E3 Plattform-Topf REIN/RAUS, bescout-Events explizit als RAUS-Kanal genannt.
- `decisions.md` **D98** — voller Auffang 100 % (hier symmetrisch: voller Prize aus Topf).
- `decisions.md` **D103** — Cold-Start = Hard-Gate (`RAISE` bei Unterdeckung) + Genesis-Seed, kein Fallback-Mint. Gilt für ALLE RAUS-Kanäle.
- `decisions.md` **D87** — Live-`functiondef` VOR Spec (befolgt §4).
- `errors-db.md` "CREATE OR REPLACE FUNCTION — PATCH-AUDIT PFLICHT" — Baseline=Live, Konstanten-Audit (hier: kein Fee-Konstanten-Drift, aber Club-Zweig byte-identisch erhalten + bescout additiv).
- `errors-db.md` "Bank-Ledger balance_after: SUM unter Row-Lock" — Deckungs-Check race-frei.
- `errors-db.md` "Escrow-bei-INSERT + Settle-bei-status deckt editierbare Felder NICHT ab" (S331) — Resync-Trigger Pflicht, hier auf 2 Treasuries generalisiert.
- `errors-db.md` "transactions.type-CHECK-Drift / status/type-CHECK-Achse" — `pg_get_constraintdef` live geprüft (bescout_event ✓, cancelled ✓).

## 6. Acceptance Criteria

```
AC-01: [HAPPY-ESCROW] bescout-Event mit prize_pool>0 anlegen bei gedecktem Topf
  VERIFY: BEGIN; INSERT INTO events(...,type='bescout',prize_pool=10000,...); → SELECT prize_escrowed,
          + SUM(platform_treasury_ledger) vorher/nachher; RAISE zum Output; ROLLBACK;
  EXPECTED: prize_escrowed=true; Topf −10000; 1 Ledger-Row direction='debit' source='bescout_event' ref=event.id
  FAIL IF: prize_escrowed=false ODER Topf unverändert ODER doppelte Buchung

AC-02: [ERROR-COVERAGE] bescout-Event mit prize_pool > Topf-Saldo anlegen
  VERIFY: BEGIN; (Topf-Saldo lesen) INSERT ... prize_pool=(Saldo+1); → erwartet RAISE; ROLLBACK;
  EXPECTED: RAISE 'platform_treasury_insufficient_for_event_prize: benoetigt …, verfuegbar …'; KEINE Ledger-Row
  FAIL IF: Event wird angelegt ODER Topf negativ

AC-03: [HAPPY-SETTLE-ENDED] prized bescout-Event mit Teil-Distribution → ended
  VERIFY: BEGIN; INSERT bescout prize=10000 (escrow −10000); UPDATE lineups SET reward_amount summiert=8000;
          UPDATE events SET status='ended'; → Topf-Delta + Ledger; ROLLBACK;
  EXPECTED: Topf +2000 (Rest = 10000−8000) credit/bescout_event; prize_escrowed=false; Netto Topf über ganzen Flow = −8000
  FAIL IF: Refund ≠ 2000 ODER prize_escrowed bleibt true ODER an falsche Treasury gebucht

AC-04: [SETTLE-CANCELLED] prized bescout-Event → cancelled
  VERIFY: BEGIN; INSERT bescout prize=10000; UPDATE events SET status='cancelled'; → Topf-Delta; ROLLBACK;
  EXPECTED: Topf +10000 (voller Refund) credit/bescout_event; prize_escrowed=false; Netto Topf=0
  FAIL IF: Refund ≠ 10000 ODER kein Refund

AC-05: [RESYNC-TYPESWITCH] bescout-Event prize escrowt, type→club geändert
  VERIFY: BEGIN; INSERT bescout prize=10000 (Topf −10000); UPDATE events SET type='club', club_id=<club mit Treasury≥10000>;
          → Topf + club_treasury Deltas; ROLLBACK;
  EXPECTED: Topf +10000 (credit, Escrow zurück); club_treasury −10000 (debit); prize_escrowed=true
  FAIL IF: Topf-Refund fehlt (Minting-Hintertür) ODER doppelt escrowt ODER falsche Treasury

AC-06: [RESYNC-AMOUNT] bescout-Event prize 10000→15000 erhöht bei gedecktem Topf
  VERIFY: BEGIN; INSERT bescout prize=10000; UPDATE events SET prize_pool=15000; → Topf-Delta; ROLLBACK;
  EXPECTED: Topf zusätzlich −5000 (delta-debit); insgesamt −15000 escrowt
  FAIL IF: Delta ≠ 5000 ODER kein Deckungs-Check bei Erhöhung

AC-07: [REGRESSION-CLUB] type='club'-Pfad byte-identisch erhalten
  VERIFY: pg_get_functiondef der 3 Funktionen nach Apply; club-Zweige (book_club_treasury, club_withdrawals-Subtraktion, event_prize) Wort-für-Wort wie Live-Baseline
  EXPECTED: Club-Logik unverändert (nur additiver bescout-Zweig + resync-Generalisierung erhält club-Verhalten)
  FAIL IF: club-Deckungs-Check fehlt withdrawals-Subtraktion ODER club-Refund-Wording weg

AC-08: [REGRESSION-NONPRIZED] bescout-Event ohne prize / sponsor+special-Events
  VERIFY: BEGIN; INSERT bescout prize_pool=0; INSERT sponsor prize=5000; → kein Topf-Touch; ROLLBACK;
  EXPECTED: prize_escrowed=false, 0 Ledger-Rows (sponsor/special bleiben minting wie bisher — Scope-Out)
  FAIL IF: Topf bei prize=0 belastet ODER sponsor/special escrowt
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Escrow | Topf exakt = prize_pool | Saldo=10000, prize=10000 | erlaubt (`<` strikt, nicht `<=`) | `IF v_available < NEW.prize_pool` |
| 2 | Escrow | prize_pool=0 / NULL | bescout, kein Prize | kein Escrow, prize_escrowed=false | `AND NEW.prize_pool > 0` |
| 3 | Escrow | NEW.id NULL beim INSERT | Default-Timing | id gesetzt vor Ledger-ref | bestehende `IF NEW.id IS NULL`-Zeile erhalten |
| 4 | Settle | 0 Lineups (niemand spielte) | score_event `v_scored_count=0`-Pfad | voller Pool zurück (v_distributed=0) | `GREATEST(P − 0, 0)=P`; settle feuert auf status='ended' |
| 5 | Settle | bescout-Event, club_id NULL | type=bescout immer | Refund an Topf (nicht club) | Verzweigung auf `NEW.type`, club_id-Cond nur im club-Zweig |
| 6 | Settle | reward gerundet < Pool (Rest) | distrib=9999, pool=10000 | Rest 1 zurück | `GREATEST(P−D,0)` |
| 7 | Resync | type bescout→club, Topf-leer aber club gedeckt | Refund Topf, Debit club | beide unabhängig, club-Deckung geprüft | per-Treasury Delta-Blöcke |
| 8 | Resync | type club→bescout, Topf unterdeckt | Refund club, Escrow Topf scheitert | RAISE platform_insufficient, ganze TX rollt zurück | Deckungs-Check im plat-debit-Zweig |
| 9 | Resync | prize_pool 15000→10000 (Reduktion) | bescout | Topf +5000 zurück | `v_delta_plat<0`→credit |
| 10 | Concurrent | 2× INSERT bescout gleichzeitig | beide gegen selben Topf | serialisiert via `platform_treasury FOR UPDATE` | Singleton-Row-Lock vor SUM |
| 11 | Idempotenz | Settle 2× (status ended→ended) | `NEW.status IS DISTINCT FROM OLD.status` | 2. UPDATE no-op (status unverändert) | DISTINCT-Guard + prize_escrowed bereits false |

## 8. Self-Verification Commands

```bash
# Pflicht:
npx tsc --noEmit          # erwartbar 0 (kein src-Change, aber Gate)
# kein vitest-Service-File betroffen; db-invariants.test.ts liest CHECK-Sets (kein neuer type/source → kein Update nötig, verifizieren)

# Money-Path (Live, BEGIN…ROLLBACK Force-Smokes):
mcp__supabase__execute_sql  # AC-01..AC-08 als Transaktionen mit RAISE-Output + ROLLBACK
pg_get_functiondef('public.trg_events_escrow_prize()'::regprocedure)   # bescout-Zweig + club byte-identisch
pg_get_functiondef('public.trg_events_prize_settle()'::regprocedure)   # type-Verzweigung
pg_get_functiondef('public.trg_events_resync_prize_escrow()'::regprocedure)  # 2-Treasury
# Trigger-Bindings unverändert:
SELECT tgname, pg_get_triggerdef(oid) FROM pg_trigger WHERE tgrelid='public.events'::regclass AND NOT tgisinternal;
# Konstanten/Quelle:
pg_get_constraintdef → platform_treasury_ledger source enthält 'bescout_event'
```

## 9. Open-Questions

**Pflicht-Klärung:** — keine offen. CEO-Entscheid (Escrow-Modell) getroffen; Cold-Start = D103 (Hard-Gate); Quellen-Label vorhanden.

**Autonom-Zone:** Exakte Variablennamen/Kommentare in der Migration; Reihenfolge der per-Treasury-Blöcke im resync; Smoke-Test-Strukturierung.

**Nicht-Autonom (bereits via CEO geklärt):** Escrow-vs-Settle-Modell ✅; voller vs. Teil-Refund (voll, mirror 331) ✅.

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| Money-Trigger (DB) | `worklog/proofs/377-money-smoke.txt` — AC-01..AC-08 force-rollback Transaktionen (Topf vorher/nachher, Zero-Sum, RAISE-Capture) + `pg_get_functiondef` der 3 Funktionen post-Apply + Trigger-Bindings-Listing |

Zero-Sum-Beweis explizit: über ganzen Escrow→score→settle-Flow Netto Topf = −verteilt, Netto Wallets = +verteilt, Σ=0.

## 11. Scope-Out

- **`type='sponsor'`-Events** → eigener Slice (braucht Sponsor-Deposit-Pfad, treasury.md §7). Bleiben minting.
- **`type='special'`-Events** → eigener Slice (Quelle unklar — vermutl. Plattform; bewusst später).
- **`score_event`-Rewrite** → NICHT (331-Philosophie, Escrow-Modell macht ihn überflüssig).
- **Admin-UI „Event aus Topf"-Anzeige / Wettkampf-Darstellung** → Slice 5 (Wettkampf-Darstellung).
- **club_id-Change-Trigger-Hole** (resync feuert nicht auf club_id-only-Update) → pre-existing seit 331, out-of-scope (Trigger feuert nur auf prize_pool/type; club_id-Wechsel allein ist kein realer Admin-Flow).

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (inline §3+§4 — DB-interne Trigger, 0 App-Consumer, grep-verifiziert)
     → BUILD (1 Migration via apply_migration)
     → REVIEW (reviewer-Agent PFLICHT — Money/CEO)
     → PROVE (377-money-smoke.txt, force-rollback)
     → LOG (+ treasury.md §7-Update: bescout RAUS-Kanal DONE; epic-Note Slice 4 ✅)
```

## 13. Pre-Mortem (Money → Pflicht)

| # | Failure | Prob | Impact | Mitigation | Detection |
|---|---------|------|--------|------------|-----------|
| 1 | Zero-Sum bricht: settle liest `reward_amount` BEVOR score_event es setzt | LOW | hoch (Topf-Drift) | score_event setzt reward_amount VOR `UPDATE status='ended'` (live verifiziert §4); settle feuert auf status-UPDATE → liest gesetzte Werte | AC-03 Zero-Sum-Assert |
| 2 | Resync bucht falsche Treasury bei type-Switch → Minting-Hintertür | MED | hoch | 2-Treasury per-OLD.type-Diskriminierung + AC-05 | AC-05 Topf+club beide geprüft |
| 3 | Club-Pfad-Regression durch resync-Umbau | MED | hoch (Live-Club-Events) | Club-Zweige byte-identisch zum Live-Body; AC-07 functiondef-Vergleich | AC-07 + Reviewer |
| 4 | Deckungs-Check vergessen bei resync-Erhöhung → Topf negativ | LOW | hoch | Deckungs-Check in BEIDEN debit-Pfaden (escrow + resync-plat) | AC-06/AC-08 |
| 5 | `book_platform_treasury` NULL-Return bei amount=0 schluckt Buchung still | LOW | mittel | prize_pool>0-Guard vor jedem book-Call; refund nur `IF v_refund>0` | AC-02/AC-08 |
| 6 | settle entkoppelt von club_id bricht bestehende club-settle-Cond | MED | hoch | club_id-Cond bleibt im club-Refund-Zweig, nur Top-Level entkoppelt | AC-07 |

---

## Compliance-Check

- Kein user-facing Wording-Change (DB-Trigger + Admin-Ledger-Label seit 357 vorhanden). „BeScout-Event" (admin-facing) ist neutral, kein Securities/Glücksspiel-Vokabel. Kein $SCOUT/IPO/Asset-Framing. ✓

## Open Risiko (ehrlich)

Der resync-Trigger-Umbau ist der riskanteste Teil — er muss den bestehenden Club-Pfad exakt erhalten und gleichzeitig die zweite Treasury sauber führen. Mitigation: Club-Zweige byte-identisch aus Live-Baseline übernehmen, bescout additiv, AC-07 functiondef-Diff + Reviewer-Money-Pflicht. 0 prized bescout/club live → kein Live-Geld bei einem Fehler in Gefahr, aber Force-Rollback-Smokes beweisen Korrektheit vor Merge.
