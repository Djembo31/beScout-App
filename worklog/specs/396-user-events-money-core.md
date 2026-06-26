# Slice 396 — User-Events Geld-Kern (E-4a)

**Slice-Type:** Migration + Service/RPC (Money)
**Größe:** L
**Scope:** CEO/Money (§3) — selbst bauen, Reviewer-Pflicht, force-rollback-Smokes, Live-`pg_get_functiondef` VOR jedem RPC-Edit (D87).

## 0. Modell V3 (Anil 2026-06-26) — Eintritts-finanzierter Pot, KEIN Startgeld

**Wichtig:** V1/V2 (Modell B mit Ersteller-Seed + dynamischem Wachstum + min_entries-Warten) ist **VERWORFEN** (Anil: „das Startgeld war Schrott"). V3 ist das finale Modell. D108 wird entsprechend korrigiert.

**Das Modell in einem Satz:** Der Ersteller ist **Gastgeber** — er zahlt nur die **Erstell-Gebühr** (→ BeScout-Topf, Verdienst + Anti-Spam) und legt **keinen** Pot vor. Der **Pot entsteht ausschließlich aus den Eintritten** der Teilnehmer; die Gewinner teilen ihn nach der gewählten Verteilung. BeScout nimmt vom Pot/Eintritt **nichts** (Verdienst läuft über die Erstell-Gebühr).

**Regeln (alle CEO-bestätigt):**
- Ersteller zahlt **Erstell-Gebühr** aus Wallet → Topf (`event_create_fee`). Default **5000 cents (50 Cr)**, admin-steuerbar.
- Ersteller legt **keinen** Preis-Pot vor (kein Seed, `prize_pool=0`, `prize_escrowed=false`).
- Teilnehmer zahlen **Eintritt** (Höhe = Ersteller-wählbar, ≥0). Eintritt **100 % → Pot** (kein Plattform-Schnitt → `event_fee_config('user') = 0/0`).
- **Will der Ersteller mitspielen, zahlt er den Eintritt wie jeder andere** (zwei getrennte Zahlungen: Gebühr als Gastgeber + Eintritt als Mitspieler).
- Auszahlung Ersteller-wählbar (`reward_structure`, Reuse `RewardStructureEditor`, Σ=100).
- **Mindest-Teilnehmerzahl optional** (`events.min_entries`, NULL = keine). Gesetzt + nicht erreicht → Ersteller/Admin **sagt manuell ab** → alle Eintritte zurück (kein Cron, wie Monats-Liga).
- Settle-Recht: **Ersteller ODER platform_admin** (`score_event`-Gate erlaubt `created_by` schon).
- `scout_events_enabled` **global an** (CEO d).
- Scope **öffentlich** zuerst (Freunde/privat später).

## 1. Problem-Statement
E-4 (User-Events). Heute kann ein normaler Nutzer **kein** echtes Event erstellen — `CreateEventModal` ist eine Attrappe (synchroner Toast, Mock-IDs `creatorId:'user1'`, `type:'creator'`, hinter `PAID_FANTASY_ENABLED=false`, **kein DB-Write**).

**Evidence (Live-RPCs 2026-06-26, D87, selbst verifiziert):**
- **`score_event`** zahlt Gewinner aus `v_event.prize_pool` (Mint via `UPDATE wallets balance += reward`) — **fasst `event_entries`/`locked_balance` NIE an.** Die Verbindung „Eintritt → Pot" **existiert nicht** (dormant; 208 Live-Events liefen Tickets/gratis, 0 mit Pot). **Genau diese fehlende Hälfte ist der E-4a-Kern.**
- **`rpc_lock_event_entry`** sperrt den Eintritt (`locked_balance += ticket_cost`) + schreibt `event_entries.fee_split` (platform/beneficiary/prize_pool aus `event_fee_config`), bewegt aber kein Geld. `rpc_unlock_event_entry`/`rpc_cancel_event_entries` lösen die Sperre wieder auf.
- **3 events-Trigger** (`trg_events_escrow_prize` BEFORE INSERT, `trg_events_prize_settle` BEFORE UPDATE OF status, `trg_events_resync_prize_escrow` BEFORE UPDATE OF prize_pool,type) behandeln **nur** club/bescout/special (Treasury-Escrow). **Für `type='user'` trifft kein Zweig** → sie no-oppen von selbst (zusätzlich Gate `OLD.prize_escrowed AND prize_pool>0` = false, weil User kein Escrow nutzt). **→ Trigger werden NICHT angefasst.**

**3 Live-Blocker (gegen DB verifiziert, nicht gegen Annahme):**
- **B1 — `scout_events_enabled()` = `false`** (`platform_settings`). Der Credits-Beitritts-Zweig bricht sonst mit `scout_events_disabled` → niemand kann beitreten. → W1 global einschalten (CEO d).
- **B2 — `transactions_type_check` enthält `event_entry_lock` NICHT** (nur `event_entry_unlock`). Der bestehende Lock-Pfad ist latent kaputt (nie gefeuert: B1 + alle Events tickets/gratis). → W1 CHECK widen.
- **B3 — entfällt im V3-Modell.** Kein Ersteller-Seed → kein doppelt-anfassbarer Topf; Trigger no-oppen von selbst → **einziger Geld-Besitzer beim Settle ist `score_event`** (charge Eintritte → Pot → Gewinner); Cancel-Besitzer ist `cancel_user_event`. Sauber getrennt.

## 2. Lösungs-Design (Geldfluss, vollständig)

**Worked Example** (Eintritt 10 Cr, 5 Teilnehmer, Verteilung 50/30/20):
- Erstellen: Ersteller zahlt 50 Cr Gebühr → Topf (`event_create_fee`). `prize_pool=0`.
- Beitreten: 5 × 10 Cr → je in Teilnehmer-Wallet **gesperrt**; `event_entries.fee_split.prize_pool = 10` (kein Schnitt).
- Auswerten: Pot = Σ Eintritte = **50 Cr**. Gewinner #1/#2/#3 erhalten 25/15/10 Cr (mint). Gesperrte Eintritte werden **abgebucht** (locked→spent). FLOOR-Rest (hier 0) → Topf. **Zero-Sum:** rein 50 (Eintritte) = raus 50 (Gewinner) + 0 (Rest→Topf). Gebühr 50 separat → Topf.
- Mindestzahl gesetzt + nicht erreicht → Ersteller/Admin sagt ab → 5 × 10 Cr Sperren zurück, kein Charge.

**Design-Prinzip:** Die fehlende Hälfte (**Charge-at-settle** + Pot=Σ Eintritte) wird neu gebaut. Lock-on-join bleibt (existiert). Pot ist **virtuell** = Σ `event_entries.fee_split.prize_pool`, real bewegt erst beim Settle. Komplett **zero-sum, kein Minting über Eingezahltes hinaus**. **Trigger unangetastet** (no-oppen für `user`).

### Bausteine
1. **Schema + Schalter (W1):**
   - `events_type_check` += `'user'`.
   - `events.min_entries` (int, nullable, CHECK ≥1).
   - `event_fee_config('user', platform 0, beneficiary 0)` (Eintritt 100 % → Pot; orphan `creator`-Zeile NICHT nutzen, D108).
   - Singleton-Config `platform_event_config(user_event_create_fee_cents)` Default **5000** + Setter-RPC `set_user_event_create_fee` (platform_admin-Gate, AR-44 anon-REVOKE; Muster `set_liga_reward_config`).
   - **`transactions_type_check` widen (B2):** `event_entry_lock` (Fix) + `event_entry_charge` (Settle-Spend) + `event_create_fee`.
   - **`platform_treasury_ledger` source-CHECK widen:** `event_create_fee` + `event_entry_fee` (FLOOR-Rest) + AdminTreasuryTab-Label + i18n DE/TR.
   - **`scout_events_enabled` global an (B1):** `platform_settings` upsert `key='scout_events_enabled' value=true`.
2. **`create_user_event`-RPC** (SEC DEFINER, `auth.uid()`-Guard, REVOKE anon): validiert (Name, Format, `reward_structure` Σ=100, `entry_fee ≥ 0`, `min_entries` optional ≤ `max_entries`, optional `lineup_rules`), Wallet FOR UPDATE, prüft `available (balance − locked) ≥ Gebühr`, **bucht Gebühr ab** (`balance −= fee`, tx `event_create_fee`) **→ `book_platform_treasury('credit','event_create_fee')`**, INSERT Event `type='user'`, `status='registering'`, `created_by`, `currency='scout'`, `ticket_cost=entry_fee`, **`prize_pool=0`**, `reward_structure`, `min_entries`, **`prize_escrowed=false`**, `club_id=NULL`, optional `league_id`/`lineup_rules`. **KEIN Seed-Lock.** Beitritt = bestehender `rpc_lock_event_entry` (Reuse, unverändert) — gilt auch für den Ersteller selbst.
3. **Entry-Pot-Settle (`score_event` `type='user'`-Zweig — einziger „ended"-Besitzer):**
   - Pot `v_prize_pool` = Σ über `event_entries(event_id, currency='scout')` von `(fee_split->>'prize_pool')::bigint` (**gespeicherter Wert** — beim Lock berechnet, deterministisch).
   - Pro Eintritt **abbuchen**: `balance −= amount_locked`, `locked_balance −= amount_locked` (tx `event_entry_charge`). (Bei `event_fee_config('user')=0/0` ist `platform`-Anteil 0 → nichts an Topf aus Eintritten.)
   - Bestehender Verteil-Block mintet `v_prize_pool` per `reward_structure` an Gewinner (FLOOR, unverändert).
   - **FLOOR-Rest (`v_prize_pool − v_distributed`) → Topf** (`book_platform_treasury('credit','event_entry_fee')`) — explizites Zuhause, Zero-Sum exakt.
   - **Charge → DELETE `event_entries`** (keine status-Spalte vorhanden). Idempotenz via `scored_at`-Guard (existiert).
   - **Nur-additiv:** club/bescout/special laufen weiter über `v_event.prize_pool` (unverändert); der user-Zweig setzt `v_prize_pool` aus Eintritten **vor** dem bestehenden Verteil-Block.
4. **`cancel_user_event`-RPC** (SEC DEFINER, **Auth-Guard `created_by` ODER `platform_admin`**, REVOKE anon): nur `type='user'` + `status IN ('registering','late-reg')`; entsperrt alle Eintritte (`locked_balance −= amount_locked`, tx `event_entry_unlock`; Logik wie `rpc_cancel_event_entries`, currency='scout'), DELETE entries + lineups + holding_locks, `status='cancelled'`, `current_entries=0`. **`rpc_cancel_event_entries` NICHT direkt wiederverwenden** (hat KEINEN Auth-Guard).
5. **Trigger: UNANGETASTET.** `trg_events_escrow_prize` / `trg_events_prize_settle` / `trg_events_resync_prize_escrow` no-oppen für `type='user'` von selbst (kein Branch trifft + `prize_escrowed=false`). **PATCH-AUDIT belegt byte-Identität** (AC9). Kein user-Zweig nötig.
6. **Club-loser Wildcard-Fix (380-Review-Vormerkung):** `rpc_save_lineup` Track-F-Wildcard-Lookup `club_id → clubs.league_id` auf `COALESCE(events.league_id, club→league)` — sonst `invalid_event_no_league` bei club-losem + liga-gebundenem User-Event mit Wildcard.

**Scope-Out (Folge-Slices):** Erstell-Builder-UI + öffentliche Discovery + Live-Pot-Vorschau + `RewardStructureEditor`-Einbau = **E-4b**. Admin-UI-Slider für die Erstell-Gebühr (Config+Setter sind hier). Orphan-`creator`-`event_fee_config`-Zeile löschen = E-4b/E-7. Freunde/privat-Scope · Cron-Auto-Settle/Auto-Cancel · Tickets-Currency-User-Events (nur `scout`/Credits in E-4a).

## 3. Betroffene Files (geschätzt)
| File | Änderung |
|------|----------|
| `supabase/migrations/<ts>_user_events_money_core.sql` | type-CHECK, min_entries, fee_config('user',0,0), platform_event_config + Setter, tx-CHECK-Widen, treasury-source-Widen, scout_events_enabled an, create_user_event, score_event-user-Branch, cancel_user_event, rpc_save_lineup-Wildcard-Fix |
| `src/lib/services/events*.ts` / `src/features/fantasy/services/*` | `createUserEvent` + `cancelUserEvent` + `setUserEventCreateFee` (throw-Pattern) |
| `src/types` | Event-Type `'user'`, `min_entries`, Service-Return-Shapes |
| `src/components/.../AdminTreasuryTab*` | Labels für `event_create_fee` / `event_entry_fee` |
| `.claude/rules/fantasy.md` / `docs/knowledge/domain/treasury.md` | Wissens-Kopplung (D88): user-Event-Geldfluss (Pot=Eintritte, Gebühr→Topf) |

## 4. Code-Reading-Liste (Pflicht VOR Code — Live-functiondef, D87)
1. **Live `pg_get_functiondef`** für `score_event`, `rpc_lock_event_entry`, `rpc_cancel_event_entries`, `rpc_unlock_event_entry`, `book_platform_treasury`, die 3 events-Trigger, `rpc_save_lineup` — ✅ in dieser Session gelesen; vor BUILD re-fetchen (Drift).
2. `event_fee_config`-Zeilen (✅ heute: bescout/club/sponsor/special/creator; **kein `user`**) + `events`-Spalten (type/currency/ticket_cost/prize_pool/prize_escrowed/reward_structure/max_entries/current_entries/locks_at/gameweek/scored_at).
3. `book_platform_treasury` + `platform_treasury_ledger` source-CHECK (✅ heute: …,bescout_event,special_event,genesis — **kein event_create_fee/event_entry_fee**).
4. `transactions_type_check` (✅ heute: …event_entry_unlock… — **kein event_entry_lock/charge/create_fee**) + `event_entries`-Spalten (✅ event_id,user_id,currency,amount_locked,fee_split,locked_at — **keine id/status**).
5. `set_liga_reward_config` (Slice 383) — Setter-Vorbild (platform_admin-Gate, AR-44).
6. `score_event` Idempotenz (`scored_at`) + `trg_fn_event_scored_manager` (AFTER scored_at NULL→NOT NULL) + `trg_fn_event_status_unlock_holdings` (AFTER UPDATE OF status) — sicherstellen dass user-Settle/Cancel diese nicht bricht (club_id=NULL).

## 5. Pattern-References
- **treasury.md §7/§10** (Topf-Buchung, `book_platform_treasury` hat KEINEN Negativ-Guard — hier nur `credit`/mint, keine Topf-Unterdeckung möglich).
- **errors-db.md PATCH-AUDIT** (CREATE OR REPLACE byte-Diff gegen Live-Baseline + **Konstanten** prüfen — FRE-2/356-Lehre).
- **`set_liga_reward_config`** (Slice 383) admin-Setter-Muster · **S330** (4-File-Sync) · **D87** (Live-functiondef VOR Edit) · **S377** (Trigger-Escrow-Muster, hier nur als „nicht anfassen"-Beleg).

## 6. Acceptance Criteria (executable, force-rollback in BEGIN…ROLLBACK)
- **AC1** [HAPPY Create]: `create_user_event(valid)` → Event `type='user'`, `status='registering'`, `created_by`=caller, `prize_pool=0`, `prize_escrowed=false`; Ersteller-Wallet `balance −= Gebühr`; Topf +Gebühr (`event_create_fee`). VERIFY: SELECT event + wallet + ledger.
- **AC2** [Auth]: `create_user_event` mit `auth.uid() ≠ p_user_id` → Reject; anon → REVOKE (kein EXECUTE).
- **AC3** [Insufficient]: `available < Gebühr` → sauberer Reject, **0 Bewegung** (kein Charge, kein Event).
- **AC4** [HAPPY Settle, zero-sum]: User-Event + N gesperrte Eintritte → Settle: Pot = Σ `fee_split.prize_pool`; Gewinner +Anteil (mint); Teilnehmer `locked_balance` aufgelöst + `balance` belastet; FLOOR-Rest → Topf (`event_entry_fee`). **Zero-Sum:** Σ(Eintritte) = Σ(Gewinner) + Σ(Rest→Topf). VERIFY: pre/post Wallet-Summen + Topf-Delta.
- **AC5** [Cancel]: `cancel_user_event` (Ersteller/Admin) bei zu wenigen → `status='cancelled'`, **alle** Eintritte zurück (locked_balance auf), **kein** Charge, **kein** Topf-Eintrag. VERIFY: wallets restauriert, ledger unverändert.
- **AC6** [Idempotenz]: zweiter Settle-Call → no-op (`scored_at`-Guard); zweiter Cancel → no-op (status nicht mehr offen). Keine Doppel-Bewegung.
- **AC7** [Fee-Setter]: `set_user_event_create_fee(p_cents)` nur platform_admin; wirkt im nächsten Create. Nicht-Admin → Reject.
- **AC8** [Join inkl. Ersteller, B1+B2]: nach W1 `scout_events_enabled()=true`; `rpc_lock_event_entry` auf User-Event sperrt (kein `scout_events_disabled`), schreibt tx `event_entry_lock` **ohne CHECK-Violation**; Ersteller kann selbst beitreten und zahlt Eintritt. VERIFY: force-rollback Lock + tx + `current_entries++`.
- **AC9** [Money byte-identisch]: PATCH-AUDIT — club/bescout/special-Pfade in `score_event` + **alle 3 Trigger byte-identisch** zur Live-Baseline (user-Zweig nur additiv in score_event; Trigger 0 Änderung). VERIFY: Diff.
- **AC10** [Wildcard club-los]: liga-gebundenes user-Event (club_id NULL) + Wildcard → `rpc_save_lineup` nutzt `events.league_id` (kein `invalid_event_no_league`). VERIFY: Live-Smoke.
- **AC11** [Cancel-Auth]: `cancel_user_event` durch Nicht-Ersteller/Nicht-Admin → Reject (0 Bewegung).
- **AC12**: `tsc --noEmit` + `CI=true vitest run` grün.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| Eintritt = 0 | erlaubt — Event ohne Pot (reines Ranglisten-/Spaß-Event); Erstell-Gebühr fällt trotzdem an (Anti-Spam hält) |
| 0 Teilnehmer bei Settle | Pot = 0 → `score_event` `scored_count=0`/`prize_pool=0`-Pfad → niemand gewinnt, kein Charge, kein Topf |
| reward_structure Σ≠100 | Reject bei Create |
| min_entries gesetzt + nicht erreicht | kein Settle; Ersteller/Admin `cancel_user_event` → voller Refund |
| min_entries > max_entries | Reject bei Create |
| Teilnehmer verlässt vor Deadline | `rpc_unlock_event_entry` (existiert) — Eintritt zurück, Pot schrumpft |
| Ersteller spielt mit | tritt via `rpc_lock_event_entry` bei, zahlt Eintritt wie alle (Gebühr getrennt) |
| FLOOR-Rundungs-Rest | `pot − distributed` → Topf (`event_entry_fee`) — nie verloren, nie an Ersteller |
| `book_platform_treasury` Negativ | unmöglich (nur `credit`/mint im user-Pfad) |
| Concurrent Settle/Entry/Cancel | `scored_at`-Guard + `pg_advisory_xact_lock` (in lock/unlock vorhanden); Settle nimmt Event-Zeile FOR UPDATE |

## 8. Self-Verification Commands
- Live-functiondef-Diff vor/nach (PATCH-AUDIT) für `score_event` + die 3 Trigger (Trigger müssen byte-identisch bleiben).
- force-rollback-Money-Smoke (`BEGIN; set_config jwt.sub; create + N entries + settle/cancel; SELECT pre/post; ROLLBACK`) je AC1-AC11.
- `pg_get_constraintdef` für events_type / transactions_type / platform_treasury_ledger-source + `event_fee_config('user')`-Zeile + `scout_events_enabled()`.
- `tsc --noEmit`; `CI=true vitest run` (Service-Tests).

## 9. Open-Questions — ALLE GEKLÄRT (CEO 2026-06-26)
- Modell V3: kein Seed, Ersteller zahlt nur Gebühr, Pot=Eintritte, kein Pot-/Eintritts-Schnitt (Verdienst = Erstell-Gebühr). · Eintritt creator-wählbar (≥0). · Ersteller spielt mit = zahlt Eintritt. · scout_events_enabled global an. · Gebühr 5000 cents. · Settle Ersteller+Admin. · min_entries optional, manuelles Cancel.
- **Autonom (CTO):** tx-Typ-Namen (`event_entry_charge`/`event_create_fee`), FLOOR-Rest-Routing (→Topf), Migration-Reihenfolge (W1 CHECK+Schalter ZUERST), Setter-Naming.
- **Bei BUILD re-fetchen (D87):** Live-functiondef aller berührten RPCs erneut ziehen.

## 10. Proof-Plan
`worklog/proofs/396-money-smoke.txt` — force-rollback AC1-AC11 (Zero-Sum pre/post) + PATCH-AUDIT-Diff (`score_event` nicht-user-Zweige + 3 Trigger byte-identisch) + constraint-Listings + tsc/vitest.

## 11. Scope-Out
Erstell-Builder-UI + Discovery + Live-Pot-Vorschau + RewardStructureEditor-Einbau (**E-4b**) · Admin-UI-Slider Gebühr · `creator`-fee_config-Cleanup (E-4b/E-7) · Freunde/privat · Cron-Auto-Settle/Cancel · Tickets-Currency-User-Events.

## 12. Stage-Chain (geplant)
SPEC → **IMPACT** (/impact auf `score_event`-Consumer + entry-flow + tx/treasury-CHECK + alle RPC-Caller) → BUILD (Wellen) → REVIEW (Reviewer-Pflicht, Money) → PROVE (force-rollback) → LOG (+ D108-Korrektur + Wissens-Kopplung fantasy.md/treasury.md).

### Wave-Plan (BUILD)
- **W1 Schema/Schalter:** type-CHECK, min_entries, fee_config('user',0,0), platform_event_config + Setter, tx-CHECK-Widen (event_entry_lock+charge+create_fee), treasury-source-Widen (create_fee+entry_fee) + AdminTreasuryTab/i18n, scout_events_enabled=true.
- **W2 Create+Cancel:** `create_user_event` (Gebühr→Topf) + `cancel_user_event` (Auth+Refund) + Services + Types.
- **W3 Settle:** `score_event` user-Branch (Pot=Σ Eintritte, charge, FLOOR-Rest→Topf, DELETE entries) — additiv, PATCH-AUDIT.
- **W4 Wildcard-Fix** (380) + Wissens-Kopplung + Proof.

## 13. Pre-Mortem (≥5, L-Pflicht)
1. **Doppel-Charge Eintritt:** Settle bucht ab UND ein Refund-Pfad löst auf. *Mitigation:* `scored_at`-Idempotenz; Charge→DELETE entries; Status-Maschine registering→ended XOR cancelled (cancel nur bei offen).
2. **Nicht-zero-sum durch Rundung:** Σ Gewinner ≠ Pot. *Mitigation:* FLOOR-Rest → Topf explizit; Zero-Sum-Smoke Pflicht.
3. **club/bescout/special-Regression:** CREATE OR REPLACE von `score_event` verändert bestehende Zweige; Trigger versehentlich angefasst. *Mitigation:* user-Zweig nur additiv; PATCH-AUDIT byte-Diff score_event + 3 Trigger (AC9).
4. **B2 CHECK-Crash live:** erster Credits-Eintritt wirft `event_entry_lock`-Violation. *Mitigation:* W1 widert tx-CHECK ZUERST; AC8 prüft Lock+tx empirisch.
5. **`scout_events_enabled` vergessen:** niemand kann beitreten. *Mitigation:* W1 setzt Flag; AC8 prüft `scout_events_disabled` ist weg.
6. **Cancel ohne Auth:** beliebiger User sagt fremdes Event ab. *Mitigation:* eigener `cancel_user_event` mit created_by/admin-Guard (AC11), NICHT `rpc_cancel_event_entries` reuse.
7. **Wallet-Race:** Concurrent Entry/Settle/Cancel. *Mitigation:* `pg_advisory_xact_lock` (lock/unlock) + Event-Zeile FOR UPDATE im Settle + `scored_at`.
