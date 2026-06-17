# Slice 331 — Events ans Treasury (Voll-Reconcile)

**Slice-Type:** Migration (Money, CEO-Scope)
**Größe:** L
**Status:** SPEC (Anil-Approval ausstehend)
**Datum:** 2026-06-17

---

## 0. CEO-Entscheidungen (2026-06-17)

| # | Entscheidung |
|---|--------------|
| A | **Voll-Reconcile** — Event-Prize wird NICHT mehr geminted, sondern aus der Club-Treasury gedeckt. |
| Escrow | **Bei Erstellung** — prize_pool>0 debitiert die Treasury sofort; Guard blockt bei Unterdeckung. |
| Auto-Clone | Bei Unterdeckung **Klon überspringen + loggen** (Scoring läuft weiter, blockt nie). |
| score_event | Nicht-verteilten **Rest an Treasury zurück** (0 Entries / Rundung / weniger Ränge). |
| Cancel | Status→cancelled **erstattet Prize-Escrow an Treasury**. |
| Bestand | Bestehende Events **grandfathered** (minten beim Scoring wie bisher, kein Retro-Backfill). |
| Tickets | **Unangetastet** (Engagement-Währung, ≠ $SCOUT-Prize). |

**Implementierungs-Refinement (CTO):** Statt einer 30-Parameter-`create_event`-RPC → **trigger-zentrisch** (D39/Slice-329-Muster). Ein `events`-Insert-Trigger fängt BEIDE Erstellungs-Pfade (manuell + Auto-Clone) ohne Rewrite; ein Status-Update-Trigger fängt Cancel ohne RPC-Umbau. Minimaler src-Churn, gleiche Semantik.

## 1. Problem-Statement (Evidence)

`score_event` (Live, `20260425170000_slice_195d` Z.849-889) verteilt `prize_pool` durch **direkte Wallet-Gutschrift** der Gewinner (`UPDATE wallets SET balance = balance + reward` + `fantasy_reward`-Transaktion) — **kein Konto wird belastet**. `prize_pool` ist eine beim Erstellen frei gesetzte Zahl (`events.mutations.ts:54` Client-`.insert()`). → **Minting**, gleiche Klasse wie Pre-330-CSF.

Dual-Currency (`20260321_unified_event_payment.sql`): Live-Modus = **Tickets** (`user_tickets`, ≠ $SCOUT); `scout_events_enabled=false`. Entry-Tickets können den $SCOUT-Prize nicht decken → **Treasury ist die einzige nicht-mintende Quelle**.

Zwei Erstellungs-Pfade, beide Client-`.insert()`:
- `createEvent` (manuell, Admin-UI).
- `createNextGameweekEvents` (Auto-Clone, läuft bei **jedem Scoring** via `scoring.admin.ts:266`, klont prize_pool für nächste GW).

## 2. Lösungs-Design (trigger-zentrisch)

**2.1 Schema:** `ALTER TABLE events ADD COLUMN prize_escrowed boolean NOT NULL DEFAULT false`. Flag = „Treasury hält aktuell Escrow für dieses Event". Grandfathering: Bestands-Events = false → alte Mint-Semantik; nur escrowte Events bekommen Refund/Remainder.

**5-Quellen-Modell (verifiziert via UI, Slice 331):** `events.type` = Geldquelle. NUR `type='club'` zahlt aus der Vereins-Treasury. `bescout`/`special`/`sponsor`/`creator` haben andere (noch nicht gebaute) Quellen → **minten bewusst weiter** (eigene Slices). Trigger keyt auf `type='club'`, NICHT auf den Ersteller. Siehe `worklog/concepts/csf-club-treasury-model.md` §8 „5-Quellen-Modell".

**2.2 BEFORE INSERT Trigger `trg_events_escrow_prize`:**
```
IF NEW.type = 'club' AND NEW.prize_pool > 0 AND NEW.club_id IS NOT NULL THEN
  PERFORM 1 FROM clubs WHERE id = NEW.club_id FOR UPDATE;   -- Serialisierung (Race)
  v_available := (SUM credit − SUM debit aus ledger) − (offene club_withdrawals);
  IF v_available < NEW.prize_pool THEN
    RAISE EXCEPTION 'treasury_insufficient_for_event_prize: benoetigt %, verfuegbar %', NEW.prize_pool, v_available;
  END IF;
  PERFORM book_club_treasury(NEW.club_id, 'debit', 'event_prize', NEW.prize_pool, NEW.id, 'Event-Prize-Escrow: '||NEW.name);
  NEW.prize_escrowed := true;
END IF;
RETURN NEW;
```
> Downstream automatisch korrekt: score_event + cancel-Trigger gaten auf `prize_escrowed` — nur `type='club'`-Events bekommen das Flag, also bleiben non-club-Typen unberührt (minten + kein Refund).
- Manueller Insert: RAISE → `.insert()` errort → `createEvent` returnt `{success:false, error}` (mapErrorToKey → i18n).
- `NEW.id` ist bei BEFORE INSERT bereits per `gen_random_uuid()`-Default gesetzt → reference_id korrekt. `club_treasury_ledger.reference_id` hat keinen FK → kein Ordering-Problil.

**2.3 `score_event` — NICHT angefasst (Design-Refinement).** Statt die 1000+-Zeilen-RPC umzuschreiben (Transkriptions-Risiko), erledigt der Status-Trigger (2.4) den Rest-Refund: `score_event` setzt beim Verteilen bereits `lineups.reward_amount` je Gewinner UND danach `status='ended'` — der Trigger liest `SUM(reward_amount)` als „verteilt" und bucht den Rest zurück. Kein PATCH-AUDIT/Rewrite von score_event nötig.

**2.4 BEFORE UPDATE OF status Trigger `trg_events_prize_settle` (EIN Trigger für beide terminale Ausgänge):**
```
IF OLD.prize_escrowed AND OLD.prize_pool > 0 AND NEW.club_id IS NOT NULL
   AND NEW.status IS DISTINCT FROM OLD.status THEN
  IF NEW.status = 'ended' THEN
    v_distributed := COALESCE((SELECT SUM(reward_amount) FROM lineups WHERE event_id = NEW.id), 0);
    v_refund := GREATEST(OLD.prize_pool - v_distributed, 0);   -- Rest (0 Entries → voller Pool; Rundung → Rest)
  ELSIF NEW.status = 'cancelled' THEN
    v_refund := OLD.prize_pool;                                 -- Absage → voller Pool zurück
  ELSE
    v_refund := 0;   -- andere Übergänge: kein Settle
  END IF;
  IF v_refund > 0 THEN
    PERFORM book_club_treasury(NEW.club_id, 'credit', 'event_prize', v_refund, NEW.id, 'Event-Prize-Settle ('||NEW.status||'): '||NEW.name);
  END IF;
  IF NEW.status IN ('ended','cancelled') THEN NEW.prize_escrowed := false; END IF;  -- Escrow aufgelöst, in-row → keine Rekursion
END IF;
RETURN NEW;
```
- `ended`: distributed → Gewinner (Lieferung des Escrows, via score_event), Rest → Treasury. Net: Treasury −distributed (zero-sum, kein Minting).
- `cancelled`: voller Pool zurück.
- Grandfathered (prize_escrowed=false): Trigger ignoriert → mintet wie bisher, kein Refund.
- BEFORE UPDATE + `NEW.prize_escrowed:=false` in-row → **keine Rekursion** (kein Folge-UPDATE). Doppel-Refund-Schutz via Flag (nach Settle false). `lineups.reward_amount` ist beim `status='ended'`-UPDATE bereits gesetzt (score_event verteilt VOR dem Status-Update). Entry-Refunds (`cancelEventEntries`) bleiben orthogonal.

**2.5 `createNextGameweekEvents` (src):** Batch-`.insert(clones)` → **Schleife mit per-Klon-Insert + try/catch**. Klon-Insert der am Escrow-Guard scheitert (treasury_insufficient) → skip + `console.warn` + Counter; andere Klone laufen weiter. Return `{created, skipped, skippedInsufficient}`.

**2.6 UI (`createEvent`-Dialog, AdminEventsTab/useAdminEventsState):** Treasury-`available` (via getClubBalance) anzeigen + Client-Vorabprüfung „prize_pool ≤ available" mit klarer Meldung (der harte Guard bleibt der Trigger). Fehler-i18n `treasury_insufficient_for_event_prize`.

**2.7 i18n:** Fehler-Key (errors-Namespace) DE+TR. Ledger-Typ `event_prize` ist in 330b bereits gelabelt („Event-Belohnung").

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| `supabase/migrations/2026061715xxxx_slice_331_events_treasury_escrow.sql` | NEU: Spalte + 2 Trigger + score_event v2 |
| `src/features/fantasy/services/events.mutations.ts` | createNextGameweekEvents Batch→Loop (skip+log) |
| `src/components/admin/...EventsTab / useAdminEventsState` | Treasury-Check im Create-Dialog + Fehlermeldung |
| `src/features/fantasy/services/events.queries.ts` / types | `prize_escrowed` in Event-Type (falls gelesen) |
| `messages/de.json`, `messages/tr.json` | Fehler-Key treasury_insufficient_for_event_prize |
| `src/features/fantasy/services/__tests__/events*.test.ts` | createNextGameweekEvents Loop + skip |
| `src/lib/__tests__/db-invariants.test.ts` | (optional) Escrow-Invariante |

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

1. **Live** `pg_get_functiondef('public.score_event(uuid)')` — Baseline (PATCH-AUDIT); exakte Stelle der Verteilungs-Schleife + v_distributed + final UPDATE.
2. `20260321_unified_event_payment.sql` — Entry-Mechanik (Tickets vs scout, escrow), bestätigt: Tickets ≠ Prize-Quelle. **Gelesen.**
3. `20260617120500_slice_329b…` — `book_club_treasury`-Signatur (debit/credit). **Gelesen.**
4. Migration 330 `liquidate_player` — Guard-Pattern (clubs FOR UPDATE + ledger_net − withdrawals). **Gelesen.**
5. `events.mutations.ts` createEvent + createNextGameweekEvents + updateEventStatus + STATUS-Transitions. **Gelesen** (createEvent/clone); updateEventStatus-Body + Status-Map noch genau lesen.
6. `scoring.admin.ts:255-275` — wie createNextGameweekEvents im Scoring aufgerufen wird (Fehler-Toleranz, Return-Handling).
7. `src/components/admin/AdminEventsTab.tsx` + `useAdminEventsState` — Create-Dialog-Felder + Status-Change-Handler (Cancel).
8. `events.queries.ts` / Event-Type — wird `prize_escrowed` irgendwo gebraucht? PLAYER_SELECT-artige Spaltenliste?
9. `score_event` REVOKE/GRANT (live) — 1:1 erhalten.
10. db-invariants.test.ts — bestehende Event/score_event-Assertions, die brechen könnten.
11. `events`-RLS / wer darf `events` INSERT/UPDATE (Client-Insert heißt RLS erlaubt club-admin INSERT?) — Trigger läuft als Tabellen-Owner, book_club_treasury ist SECURITY DEFINER → ok, aber INSERT-Recht des Clients prüfen.

## 5. Pattern-References
- **Slice 329 trigger-zentrisch** (trg_trades_book_club_treasury) — Vorlage für Insert-Trigger + book_club_treasury aus Trigger.
- **Slice 330** Guard (clubs FOR UPDATE + ledger_net − withdrawals) + Debit der tatsächlich bewegten Summe.
- **errors-db.md D39** Trigger+GUC-Invariant; **PATCH-AUDIT (156)** score_event Baseline=live; **AR-44** REVOKE/GRANT.
- **errors-frontend.md** i18n beide Locales; mapErrorToKey für RAISE-Message.
- **concept §8** „extractive→investive", event_prize-Kanal.

## 6. Acceptance Criteria

| # | Kriterium | VERIFY |
|---|-----------|--------|
| AC1 | Insert mit prize_pool>0 debitiert Treasury + setzt prize_escrowed | force-rollback: Event-Insert → ledger debit event_prize == prize_pool, prize_escrowed=true |
| AC2 | Insert bei Unterdeckung blockt | Insert mit prize_pool>available → RAISE treasury_insufficient_for_event_prize, kein Event, kein Debit |
| AC3 | score_event escrowt: Rest an Treasury, prize_escrowed=false | force-rollback: score → winners credited + remainder credit event_prize, escrow=false |
| AC4 | score_event 0 Entries: voller Pool zurück | force-rollback: prize_pool back to treasury, 0 wallet credits |
| AC5 | Grandfathered (escrow=false): score mintet wie bisher, KEIN Treasury-credit | force-rollback auf Alt-Event |
| AC6 | Cancel escrowt: Prize zurück an Treasury, escrow=false, kein Doppel-Refund | force-rollback: status→cancelled credit == prize_pool; 2. cancel = no-op |
| AC7 | Auto-Clone skip bei Unterdeckung | createNextGameweekEvents: 1 Klon insufficient → skip+log, andere created |
| AC8 | Grants score_event 1:1 + neue Trigger-Funcs korrekt | pg grants |
| AC9 | tsc + vitest grün | tsc + events*.test |
| AC10 | i18n DE+TR Fehler-Key | grep |
| AC11 | Saldo-Invariante: Σ event_prize-debit − Σ event_prize-credit == Σ prize aktiver escrowter Events | SQL |

## 7. Edge Cases

| Fall | Verhalten |
|------|-----------|
| prize_pool=0 | kein Escrow, kein Flag, kein Trigger-Effekt (Gratis-Event ohne Prize) |
| club_id NULL (Arena/global) | kein Escrow (kein Club-Konto) — minten? Nein: ohne Club keine Quelle → prize_pool>0 + club_id NULL = **bewusst weiter minten** (Plattform-Events) ODER blocken. **OQ1.** |
| Auto-Clone, Club-Treasury reicht für 2 von 3 | 2 created+escrowed, 1 skipped+logged |
| Event escrowed, dann Admin ändert prize_pool via updateEvent | Differenz-Nachbuchung nötig? **OQ2** — Default: prize_pool-Edit auf escrowten Events sperren/ignorieren (kein Re-Escrow in v1). |
| Cancel eines grandfathered (escrow=false) Events | kein Refund (war nie debitiert) — korrekt |
| score_event remainder Rundung | v_remainder = prize_pool − Σ FLOOR(distributed) ≥ 0, exakt zurück |
| Doppel-Score (idempotenz) | score_event ist single-shot (status→ended); 2. Aufruf findet status≠scoring → skip (bestehend) |
| Re-Entrancy Cancel-Trigger | BEFORE UPDATE setzt NEW.prize_escrowed=false in-row, kein Folge-UPDATE |
| Tickets-Event mit prize_pool>0 | Escrow greift (Prize ist $SCOUT, unabhängig von Ticket-Entry) |

## 8. Self-Verification Commands

```sql
-- AC1/AC2 Insert-Escrow + Guard (force-rollback, als club-admin):
--   BEGIN; jwt; INSERT INTO events(...prize_pool=X, club_id=...); SELECT ledger; SELECT prize_escrowed; ROLLBACK;
-- AC3/AC4/AC5 score_event (force-rollback DO-Block, escrowtes + grandfathered Event)
-- AC6 cancel (force-rollback: UPDATE events SET status='cancelled')
-- AC11 Invariante:
SELECT
 (SELECT COALESCE(SUM(amount),0) FROM club_treasury_ledger WHERE type='event_prize' AND direction='debit')
 - (SELECT COALESCE(SUM(amount),0) FROM club_treasury_ledger WHERE type='event_prize' AND direction='credit') AS net_escrow_held,
 (SELECT COALESCE(SUM(prize_pool),0) FROM events WHERE prize_escrowed) AS open_escrow_sum;
-- müssen gleich sein
pnpm exec tsc --noEmit && CI=true pnpm exec vitest run events
```

## 9. Open-Questions

- **OQ1 — GEKLÄRT (Anil 2026-06-17):** 5-Quellen-Modell. Nur `type='club'` escrowt aus Vereins-Treasury; alle anderen Typen (inkl. club_id NULL) minten bewusst weiter bis zu ihrem eigenen Quellen-Slice. Permissions-Frage (darf Club-Admin non-club-Typen anlegen?) = separat, nicht 331.
- **OQ2 (CTO):** prize_pool-Edit auf bereits escrowten Events → in v1 **gesperrt** (UI verhindert; Trigger bucht nicht nach). Bestätigen/abnicken.
- **OQ3 (i18n):** TR-Fehler-Wording „treasury_insufficient_for_event_prize" — Anil-Sichtung.

## 10. Proof-Plan
| Artefakt | AC |
|----------|-----|
| 331-escrow-insert.txt (Insert-Debit + Guard-Block, force-rollback) | AC1/AC2 |
| 331-score-refund.txt (escrowt: winners+remainder; 0-entries; grandfathered) | AC3/AC4/AC5 |
| 331-cancel-refund.txt (refund + no-doppel) | AC6 |
| 331-autoclone.txt / vitest | AC7/AC9 |
| 331-invariante.txt (AC11) + grants + i18n-grep | AC8/AC10/AC11 |

## 11. Scope-Out
- Retro-Backfill bestehender Events (grandfathered).
- scout-Currency Entry-Escrow→Prize-Wiring (scout_events_enabled=false, separates Thema).
- Polls/Bounties RAUS-Kanäle (eigene Slices).
- prize_pool-Edit-Nachbuchung auf escrowten Events (OQ2 → gesperrt).
- Per-Event-Prize-Breakdown-UI über das Bestehende hinaus.

## 12. Stage-Chain (geplant, Waves)
SPEC → IMPACT (events-Insert/Update-Pfade + score_event-Consumer; Auto-Clone im Scoring) → BUILD **Wave 1** Migration (Spalte+Trigger+score_event) → DB-Verify → **Wave 2** src (createNextGameweekEvents Loop + UI + i18n + Tests) → REVIEW (reviewer Pflicht) → PROVE → LOG. Money §3 = selbst.

## 13. Pre-Mortem
1. **score_event PATCH-AUDIT** — Baseline=live functiondef, nicht 195d-Datei (spätere Patches möglich). → live ziehen.
2. **Cancel-Trigger-Rekursion** — Folge-UPDATE feuert Trigger. → BEFORE UPDATE + NEW-Flag in-row, kein Folge-UPDATE.
3. **Auto-Clone Batch-RAISE killt alle** — ein insufficient Klon rollt Batch zurück. → per-Klon-Loop + catch (Wave 2 Pflicht, sonst Scoring-Bruch!).
4. **Grandfathered Event bekommt fälschlich Refund** — score/cancel crediten Treasury für nie-debitierten Prize. → prize_escrowed-Flag-Gate (nur true → Refund).
5. **club_id NULL** — book_club_treasury wirft („club nicht gefunden") bei Plattform-Events. → Trigger-Guard `club_id IS NOT NULL` (OQ1).
6. **RLS/INSERT-Recht** — Client-Insert braucht events-INSERT-Policy; Trigger debit läuft als DEFINER. → prüfen dass bestehender Insert weiter geht (nur +Trigger).
7. **Saldo-Invariante driftet** — Refund-Pfad vergessen für einen Lifecycle-Ausgang (z.B. Event verfällt ohne score/cancel). → AC11-Invariante + alle terminalen Übergänge (ended via score, cancelled) abgedeckt; „expired ohne score" prüfen (gibt es das? Status-Map).

---

*Anil-Approval erbeten (OQ1 + Scope). Trigger-zentrisch statt create_event-RPC (CTO-Refinement, weniger Churn). Nach Approval: BUILD Wave 1 (Migration) selbst.*
