# Slice 396 — User-Events Geld-Kern (E-4a)

**Slice-Type:** Migration + Service/RPC (Money)
**Größe:** L
**Scope:** CEO/Money (§3) — selbst bauen, Reviewer-Pflicht, force-rollback-Smokes, Live-`pg_get_functiondef` VOR jedem RPC-Edit (D87).

## 1. Problem-Statement
E-4 (User-Events) aus dem Event-Creator-Epic. Heute kann ein normaler Nutzer **kein** echtes Event erstellen — `CreateEventModal` ist eine Attrappe (synchroner Toast, Mock-IDs `creatorId:'user1'`, `type:'creator'`, hinter `PAID_FANTASY_ENABLED=false` versteckt, **kein DB-Write**).

**Evidence (Live-RPCs 2026-06-26, D87):** Der Geldfluss eines Events besteht aus zwei Strömen:
- **① Preis-Pot** — voll + zero-sum: `trg_events_escrow_prize` (BEFORE INSERT) escrowt `prize_pool` aus der Quelle (club→`book_club_treasury`, bescout/special→`book_platform_treasury`); `score_event` zahlt Gewinner aus `prize_pool` (mintet); `trg_events_prize_settle` gibt `prize_pool − distributed` an die Quelle zurück.
- **② Eintritt** — **nur halb gebaut:** `rpc_lock_event_entry` **sperrt** den Eintritt in der Teilnehmer-Wallet (`locked_balance += ticket_cost`) + rechnet `event_entries.fee_split` aus, bewegt aber **kein Geld**. `rpc_unlock_event_entry` / `rpc_cancel_event_entries` **lösen die Sperre wieder auf** (Refund). **`score_event` fasst die gesperrten Eintritte NIE an** → die Verbindung **„Eintritt → Pot" existiert nicht** (dormant; alle 208 Live-Events liefen Tickets/gratis, 0 mit Pot).

**Anil-Modell (gelockt 2026-06-26, → D108):** dynamischer Pot — jeder Eintritt (−5 % BeScout → Topf) wächst den Pot; optionaler Start-Pot aus Ersteller-Wallet; Ersteller verdient nichts; Start auch ohne volle Teilnehmerzahl; Ersteller-wählbare Mindest-Teilnehmerzahl (sonst Absage+Refund); Auszahlung Ersteller-wählbar (Top-3/Winner-all); Anti-Müll = admin-steuerbare Erstell-Gebühr → Topf; Scope öffentlich.

## 2. Lösungs-Design (der Geldfluss, vollständig)

**Worked Example** (Eintritt 10 Cr, Start-Pot 50 Cr, 5 Teilnehmer):
- Erstellen: Ersteller zahlt Erstell-Gebühr (→ Topf); Start-Pot 50 Cr → in Ersteller-Wallet **gesperrt**.
- Beitreten: 5 × 10 Cr Eintritt → je in Teilnehmer-Wallet **gesperrt** (Mechanik existiert).
- Auswertung: Pot = 50 + 5×(10−0,50) = **97,50 Cr**; 5×0,50 = **2,50 Cr → Topf**; gesperrte Eintritte werden **abgebucht** (locked→spent), Pot per `reward_structure` an Gewinner (mint). Zero-sum: rein 100 = raus (97,50 Gewinner + 2,50 Topf).
- Mindestzahl nicht erreicht → Absage: alle Sperren auf (Eintritte + Start-Pot zurück), kein Charge, kein Topf-Eintrag.

**Design-Prinzip (die fehlende Hälfte fertigstellen, NICHT umbauen):** Lock-on-join bleibt; **Charge-at-settle** wird NEU gebaut. Der Pot ist **virtuell** = Start-Pot + Σ(Eintritt−5 %), wird erst bei der Auswertung real bewegt. Komplett **zero-sum, kein Minting** über das hinaus was reinkam.

### Bausteine
1. **Schema:** `events_type_check` um `'user'` erweitern · `events.min_entries` (int, nullable, CHECK ≥1) · `event_fee_config('user', platform 500, beneficiary 0)` · Singleton-Config `platform_event_config(user_event_create_fee_cents)` (Default 1000 = 10 Cr) + Setter-RPC (platform_admin-Gate).
2. **`create_user_event`-RPC** (SEC DEFINER, `auth.uid()`-Guard, REVOKE anon): validiert (Name, Format, Bounds, `reward_structure` Σ=100, `min_entries`≤`max_entries`, optional `lineup_rules`), lockt Wallet FOR UPDATE, prüft `available ≥ Gebühr + Seed`, **bucht Gebühr ab → `book_platform_treasury('credit','event_create_fee')`**, **sperrt Seed** (`locked_balance += seed`, Muster `create_user_bounty`), INSERT Event `type='user'`, `status='registering'`, `created_by`, `currency='scout'`, `ticket_cost=entry_fee`, `prize_pool=seed`, `reward_structure`, `min_entries`, `prize_escrowed=true`, `club_id=NULL`, optional `league_id`/`lineup_rules`.
3. **Dynamischer Entry-Pot-Settle** (die fehlende Hälfte) — bei der Auswertung eines `type='user'`-Events: Pot = `prize_pool(=Seed)` + Σ über `event_entries(currency='scout')` von `(amount_locked − 5 %)`; pro Eintritt **5 % → Topf** (`book_platform_treasury('credit','event_entry_fee')`) + **Eintritt abbuchen** (`balance −= amount_locked`, `locked_balance −= amount_locked`); Seed abbuchen (`balance −= seed`, `locked_balance −= seed`); Pot per `reward_structure` an Gewinner (mint, wie heute). Idempotent (`scored_at`-Guard existiert).
4. **`min_entries`-Gate + Absage:** Bei Auswertung wenn `current_entries < min_entries` → **kein** Settle, stattdessen `status='cancelled'` → Refund-Pfad (Eintritte via `rpc_cancel_event_entries`-Logik + **Seed-Unlock**). Manueller Trigger durch Ersteller/Admin (kein Cron — wie Monats-Liga).
5. **Trigger-`user`-Zweige:** `trg_events_escrow_prize` — `type='user'`: **no-op** (Seed-Escrow macht die RPC wallet-basiert; nur sicherstellen dass kein Treasury-Escrow läuft). `trg_events_prize_settle` — `type='user'`: Refund des **nicht-ausgezahlten Rests + Seed** an die Ersteller-Wallet (`locked_balance` auflösen), NICHT an einen Topf.
6. **Club-loser Wildcard-Fix (380-Review-Vormerkung):** `rpc_save_lineup` Track-F-Wildcard-Lookup `club_id → clubs.league_id` auf `COALESCE(events.league_id, club→league)` — sonst `invalid_event_no_league` bei club-losem + liga-gebundenem User-Event mit Wildcard.

**Scope-Out (Folge-Slices):** Erstell-Builder-UI + öffentliche Discovery + Live-Pot-Vorschau + `RewardStructureEditor`-Einbau = **E-4b**. Admin-UI-Control für die Erstell-Gebühr (Config+Setter sind hier, der UI-Slider = E-4b). Orphan-`creator`-`event_fee_config`-Zeile löschen = E-4b/E-7 (Mock nutzt `type:'creator'` noch). Freunde/privat-Scope = späterer Slice.

## 3. Betroffene Files (geschätzt)
| File | Änderung |
|------|----------|
| `supabase/migrations/<ts>_user_events_money_core.sql` | type-CHECK, min_entries, fee_config, platform_event_config + Setter, create_user_event, score_event-user-Branch, 2 Trigger-user-Zweige, rpc_save_lineup-Wildcard-Fix |
| `src/lib/services/events*.ts` / `src/features/fantasy/services/*` | `createUserEvent`-Service (throw-Pattern) + Setter-Service |
| `src/types` | Event-Type-Erweiterung `'user'`, `min_entries`, Service-Return-Shapes |
| `.claude/rules/fantasy.md` / `docs/knowledge/domain/treasury.md` | Wissens-Kopplung (D88): user-Event-Geldfluss + Entry-Pot-Settle dokumentieren |

## 4. Code-Reading-Liste (Pflicht VOR Code — Live-functiondef, D87)
1. **Live `pg_get_functiondef`** für `rpc_lock_event_entry`, `score_event`, `create_user_bounty`, `trg_events_escrow_prize`, `trg_events_prize_settle`, `rpc_cancel_event_entries`, `rpc_unlock_event_entry`, `rpc_save_lineup` — ✅ in dieser Session gelesen; vor BUILD re-fetchen (Drift).
2. `event_fee_config`-Zeilen + `events`-Spalten (type-default, currency, ticket_cost, entry_fee, prize_pool, prize_escrowed, reward_structure, max_entries, current_entries, locks_at, gameweek) — ✅ verifiziert.
3. `book_platform_treasury` (source-CHECK — neue Sources `event_create_fee`/`event_entry_fee` müssen in den CHECK + AdminTreasuryTab-Label + i18n) — Live-functiondef + CHECK lesen.
4. `score_event` Idempotenz (`scored_at`-Guard) + `trg_fn_event_scored_manager` (feuert AFTER scored_at) — sicherstellen dass der user-Settle die Manager-Punkte-Logik nicht doppelt/bricht.
5. Platform-Admin-Gate-Muster: `set_liga_reward_config` (Slice 383) — als Vorbild für den Fee-Setter (AR-44 anon-REVOKE).
6. `wallets`-Spalten (`balance`, `locked_balance`) + `transactions`-type-CHECK (neue Types `event_create_fee`? Reuse bestehender?) — Live lesen.

## 5. Pattern-References
- **D98** (voller Auffang 100 % Fees → Topf) · **treasury.md §7/§10** (RAUS-Muster: Escrow-Trigger, Deckungs-Check unter Singleton-Row-Lock, `book_platform_treasury` hat KEINEN Negativ-Guard → D103 Hard-Gate) · **errors-db.md S377** (Refund-source/Halter nach `OLD.type`).
- **`create_user_bounty`** = Wallet-Escrow-Vorbild (`locked_balance`-Lock + Auth-Guard + Amount-Bounds).
- **Slice 383** (`set_liga_reward_config`) = admin-config-Setter-Muster.
- **errors-db.md PATCH-AUDIT** (CREATE OR REPLACE gegen Live-Baseline byte-vergleichen, Konstanten prüfen — FRE-2/356-Lehre).
- **S330** (4-File-Sync) · **D87** (Live-functiondef VOR Spec/Edit).

## 6. Acceptance Criteria (executable, force-rollback-Smokes in BEGIN…ROLLBACK)
- **AC1** [HAPPY Create]: `create_user_event(valid)` → Event `type='user'`, `status='registering'`, `created_by`=caller; Ersteller-Wallet: `balance −= Gebühr`, `locked_balance += Seed`; Topf +Gebühr (source `event_create_fee`). VERIFY: SELECT event + wallet + ledger.
- **AC2** [Auth]: `create_user_event` mit `auth.uid() ≠ p_user_id` → `auth_uid_mismatch`; anon → REVOKE (kein EXECUTE).
- **AC3** [Insufficient]: `available < Gebühr+Seed` → sauberer Reject, **0 Bewegung** (kein Charge, kein Lock, kein Event).
- **AC4** [HAPPY Settle, zero-sum]: Event mit Seed + N gesperrten Eintritten → user-Settle: Pot = Seed + Σ(Eintritt−5 %); Σ5 % → Topf (source `event_entry_fee`); Gewinner +Anteil; Teilnehmer/Ersteller `locked_balance` aufgelöst + `balance` belastet. **Zero-Sum:** Σ(rein) = Σ(Topf) + Σ(Gewinner). VERIFY: pre/post Wallet-Summen + Topf-Delta.
- **AC5** [min_entries Absage]: `current_entries < min_entries` bei Auswertung → `status='cancelled'`, **alle** Eintritte + Seed zurück (locked_balance auf), **kein** Topf-Eintrag, **kein** Charge. VERIFY: wallets restauriert, ledger unverändert.
- **AC6** [Idempotenz]: zweiter Settle-Call → no-op (`scored_at`-Guard), keine Doppel-Auszahlung.
- **AC7** [Fee-Setter]: `set_user_event_create_fee(p_cents)` nur platform_admin; Wert wirkt im nächsten `create_user_event`. Nicht-Admin → Reject.
- **AC8** [Wildcard club-los]: liga-gebundenes user-Event (club_id NULL) + Wildcard → `rpc_save_lineup` nutzt `events.league_id` (kein `invalid_event_no_league`). VERIFY: Live-Smoke.
- **AC9** [Money byte-identisch]: club/bescout/special-Event-Pfade unverändert (PATCH-AUDIT der CREATE-OR-REPLACE-RPCs gegen Live-Baseline; nur additive Branches). VERIFY: Diff der nicht-user-Zweige.
- **AC10**: `tsc --noEmit` + `CI=true vitest run` grün.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| Seed = 0 | erlaubt (reiner Eintritts-Pot); kein Seed-Lock |
| Entry = 0 + Seed > 0 | erlaubt (Geschenk-Pot, gratis Beitritt) |
| Entry = 0 + Seed = 0 | Reject (kein Pot möglich) ODER erlaubt als reines Punkte-Event? → **Open-Q** |
| 0 Teilnehmer bei Settle, kein min_entries | Pot = Seed → niemand gewinnt → Seed zurück an Ersteller (wie `score_event` `scored_count=0` + Refund-Trigger) |
| reward_structure Σ≠100 | Reject bei Create |
| min_entries > max_entries | Reject bei Create |
| Teilnehmer verlässt vor Deadline | `rpc_unlock_event_entry` (existiert) — Eintritt zurück, Pot schrumpft |
| Ersteller = auch Teilnehmer | erlaubt; zahlt Eintritt wie alle (Seed getrennt) |
| `book_platform_treasury` Negativ | NIE bei credit (Fees rein); Settle bucht nur credit/mint, kein Topf-debit → keine Unterdeckung möglich |
| Floating/Rundung 5 % | `(amount × 500) / 10000` INT-Division wie `rpc_lock_event_entry` (Rest bleibt im Pot — zugunsten Gewinner, nie Topf) |
| Concurrent Settle | `scored_at`-Guard + Row-Lock |

## 8. Self-Verification Commands
- Live-functiondef-Diff vor/nach (PATCH-AUDIT) für alle berührten RPCs/Trigger.
- force-rollback-Money-Smoke (`BEGIN; set_config jwt.sub; create + entries + settle; SELECT pre/post; ROLLBACK`) je AC1-AC9.
- `SELECT pg_get_constraintdef` für type-CHECK + fee_config + treasury-source-CHECK.
- `tsc --noEmit`; `CI=true vitest run` (Service-Tests).

## 9. Open-Questions
- **CEO/Anil:** (a) Entry=0 + Seed=0 erlauben (reines Punkte-/Bragging-Event) oder Reject? (b) Default-Erstell-Gebühr-Höhe (Vorschlag 10 Cr = 1000 cents)? (c) Wer darf Settle auslösen — nur Ersteller, oder auch platform_admin? (Vorschlag: beide; `score_event`-Gate erlaubt `created_by` schon.)
- **Autonom (CTO):** Trigger-vs-RPC-Aufteilung des Seed-Escrows, source-Namen (`event_create_fee`/`event_entry_fee`), transactions-type-Reuse, Migration-Reihenfolge.

## 10. Proof-Plan
`worklog/proofs/396-money-smoke.txt` — force-rollback-Smokes AC1-AC9 (Zero-Sum-Belege pre/post) + PATCH-AUDIT-Diff (nicht-user-Zweige byte-identisch) + constraint-Listings + tsc/vitest.

## 11. Scope-Out
Erstell-Builder-UI + Discovery + Live-Pot-Vorschau + RewardStructureEditor-Einbau (= **E-4b**) · Admin-UI-Slider für Fee (Config+Setter sind hier) · `creator`-fee_config-Cleanup (E-4b/E-7) · Freunde/privat-Scope · Cron-Auto-Settle (manuell wie Monats-Liga) · Tickets-Currency-User-Events (nur `scout`/Credits in E-4a).

## 12. Stage-Chain (geplant)
SPEC → **IMPACT** (Pflicht: /impact auf score_event-Consumer + entry-flow + treasury-source-CHECK + alle RPC-Caller) → BUILD (Wellen) → REVIEW (Reviewer-Pflicht, Money) → PROVE (force-rollback) → LOG (+ D108 + Wissens-Kopplung fantasy.md/treasury.md).

### Wave-Plan (BUILD)
- **W1 Schema:** type-CHECK, min_entries, fee_config('user'), platform_event_config + Setter-RPC, treasury-source-CHECK-Widen + AdminTreasuryTab-Label/i18n.
- **W2 Create:** `create_user_event` (Gebühr→Topf + Seed-Escrow) + Service + Types + Auth/Bounds.
- **W3 Settle:** dynamischer Entry-Pot-Settle (score_event user-Branch) + Trigger-user-Zweige (escrow no-op / settle-refund-Wallet) + min_entries-Absage/Refund.
- **W4 Wildcard-Fix** (380-Vormerkung) + Wissens-Kopplung + Proof.

## 13. Pre-Mortem (≥5, L-Pflicht)
1. **Doppel-Charge:** Settle bucht Eintritt ab UND ein Refund-Pfad löst auf → Geld doppelt weg/zurück. *Mitigation:* `event_entries`-Zeile nach Charge löschen/markieren wie `rpc_cancel`; `scored_at`-Idempotenz; klare Status-Maschine registering→ended XOR cancelled.
2. **Nicht-zero-sum durch Rundung:** Σ Gewinner-Anteile ≠ Pot wegen `pct`-Rundung → Geld entsteht/verschwindet. *Mitigation:* Rest-Cent bleibt im Pot/letzter Rang (FLOOR wie `score_event` heute); Zero-Sum-Smoke pflicht.
3. **Trigger doppelt-escrowt Seed:** RPC lockt Seed UND `trg_events_escrow_prize` versucht Treasury-Escrow für `type='user'` → Fehler/Doppel. *Mitigation:* expliziter `user`-no-op-Zweig im Escrow-Trigger; force-rollback-Test.
4. **club/bescout/special-Regression:** CREATE OR REPLACE von `score_event`/Triggern verändert bestehende Zweige. *Mitigation:* PATCH-AUDIT byte-Diff der nicht-user-Zweige (AC9), nur additive Branches.
5. **`book_platform_treasury`-source-CHECK Reject:** neue Sources nicht im CHECK → Settle/Create crasht live. *Mitigation:* W1 widert CHECK ZUERST; Smoke prüft Buchung.
6. **Settle ohne min_entries-Check zahlt leeren Pot / falsch:** Auswertung eines unter-min Events zahlt statt abzusagen. *Mitigation:* min_entries-Gate VOR Pot-Berechnung; AC5.
7. **Wallet-Race:** Concurrent Create/Entry/Settle auf dieselbe Wallet. *Mitigation:* `FOR UPDATE` + `pg_advisory_xact_lock` (Muster existiert in beiden RPCs).
