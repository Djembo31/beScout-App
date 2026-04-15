---
name: Phase 3 — DB Audit (Cross-Cutting Sweep)
description: Systematische Datenbank-Sicherheits + Korrektheits-Analyse über alle 214 RPCs, 130 CHECK Constraints, 120 Tabellen, 67 Trigger. Ergebnis aus Live-DB Queries + Migration-File-Audit.
type: project
status: ready-for-healer
created: 2026-04-15
owner: CTO (Claude Opus 4.6)
---

# Phase 3 — DB Audit: Cross-Cutting Sweep

**Total: 47 Findings — 8 CRITICAL + 14 HIGH + 16 MEDIUM + 9 LOW**

**Live-DB Stats:**
- 214 Functions (193 SECURITY DEFINER + 21 INVOKER)
- 130 CHECK Constraints (auf 100+ Tabellen)
- 120 public Tabellen (66 ohne INSERT-Policy, 81 ohne UPDATE-Policy, 99 ohne DELETE-Policy, 7 ohne SELECT-Policy)
- 67 Triggers (alle korrekt SECURITY DEFINER für Cross-User-Writes)
- 7 Stub-Migrations (verboten per AR-43)
- 37 CREATE FUNCTION Migrations OHNE REVOKE-Block (AR-44 Verstoß)

---

## 🚨 AKUT — LIVE-BROKEN BUGS

### P3-01 🚨 CRITICAL: 69 SECURITY DEFINER RPCs erlauben anon EXECUTE — 11 davon mit Cross-User-Impersonations-Risiko (AR-44 Massive Verstoß)

**Live-DB Beweis (zwei Queries):**
```sql
-- (a) 69 Funktionen mit prosecdef=TRUE UND has_function_privilege('anon', oid, 'EXECUTE')=TRUE
-- (b) 11 davon haben p_<role>_id Parameter UND keine auth.uid()=p_*_id Guard:
--      accept_mentee(p_mentor_id, p_mentorship_id)
--      add_club_admin(p_club_id, p_user_id, p_role)            ← Privileg-Eskalation potential
--      cancel_scout_subscription(p_subscriber_id, p_subscription_id)
--      check_analyst_decay(p_user_id)
--      get_club_by_slug(p_slug, p_user_id)
--      is_club_admin(p_user_id, p_club_id)                      ← Info-Leak
--      remove_club_admin(p_club_id, p_user_id)                  ← Privileg-Removal potential
--      renew_club_subscription(p_user_id, p_subscription_id)
--      request_mentor(p_mentee_id, p_mentor_id)
--      rpc_lock_event_entry(p_event_id, p_user_id)              ← DoS via Holding-Lock
--      subscribe_to_scout(p_subscriber_id, p_scout_id)
```

**Root Cause:** `CREATE OR REPLACE FUNCTION ... SECURITY DEFINER` ohne `REVOKE EXECUTE FROM PUBLIC, anon` resettet Privilegien auf Default (PUBLIC = grant). Die J4-Audit-Regel (AR-44) ist live nur partiell durchgesetzt — 37 Migration-Files verletzen sie.

**Impact:**
- **11 RPCs mit `p_<role>_id` Parameter UND OHNE `auth.uid()` Guard** = anon kann auf fremde Identität wirken (Detailliste oben)
- 58+ weitere RPCs sind anon-callable aber mit interner `auth.uid()` Logic geschützt — niedrigeres aber nicht null Risiko (DOS, info-leak, fail-open bei Logik-Bug)
- J4 hatte `earn_wildcards` als LIVE-EXPLOIT, dieselbe Klasse betrifft jetzt 69 RPCs in Summe

**Top-Risiko Beispiele:**
1. `rpc_lock_event_entry(p_event_id, p_user_id)` — anon kann beliebige User für Events locken (DoS)
2. `subscribe_to_scout(p_subscriber_id, p_scout_id)` — anon kann fake-Subscriptions für jeden anlegen
3. `accept_mentee(p_mentor_id, p_mentorship_id)` — anon kann Mentee-Annahmen für fremde Mentoren auslösen
4. `cancel_scout_subscription(p_subscriber_id, p_subscription_id)` — anon kann beliebige Subscriptions canceln
5. `add_club_admin(p_club_id, p_user_id, p_role)` — anon kann theoretisch User zu Club-Admin machen (ohne interne Guards Privileg-Eskalation)
6. `request_club_withdrawal(p_club_id, p_amount_cents, p_note)` — anon kann (ohne interne Guards) Withdrawal-Requests stellen

**Fix-Owner:** Backend-Migration. **Sofortmaßnahme:** Bulk REVOKE-Migration für die 9 trust-param-RPCs OHNE `auth.uid()` Guard. Mittelfristig: alle 69 nachziehen.

**Empfohlene SQL:**
```sql
-- Pro Funktion (mit korrekten arg-types):
REVOKE EXECUTE ON FUNCTION public.<name>(<args>) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.<name>(<args>) FROM anon;
GRANT EXECUTE ON FUNCTION public.<name>(<args>) TO authenticated;
-- Plus für trust-param-RPCs Body-Patch:
-- IF auth.uid() IS DISTINCT FROM p_user_id THEN
--   RAISE EXCEPTION 'auth_mismatch';
-- END IF;
```

---

### P3-02 🚨 CRITICAL: `lineups.captain_slot` CHECK Constraint blockt 6 Slots der 11-Spieler-Aufstellung

**Live-DB Beweis:**
```sql
-- CHECK Constraint:
captain_slot = ANY(ARRAY['gk','def1','def2','mid1','mid2','att'])  -- 6 Slots

-- RPC erlaubt aber 12 Slots inkl. def3, def4, mid3, mid4, att2, att3:
-- pg_proc rpc_save_lineup hat: p_slot_def3, p_slot_def4, p_slot_mid3, p_slot_mid4, p_slot_att2, p_slot_att3

-- Daten zeigen NUR 6 Slots als Captain (durch Constraint geblockt):
SELECT captain_slot, COUNT(*) FROM lineups GROUP BY captain_slot:
  att=31, mid1=24, def2=14, mid2=14, def1=13
```

**Impact:** User mit 11-Spieler-Lineup (Formation 4-4-2, 4-3-3, 3-5-2 etc.) können `def3`, `def4`, `mid3`, `mid4`, `att2`, `att3` NICHT als Kapitän setzen. PG wirft Constraint-Violation. Frontend zeigt "auth_mismatch" oder generischen Error → User confused. **Triggert auf jedem 11-Spieler-Event!** Nur 7-Spieler-Events ist OK.

**Fix-Owner:** Backend-Migration. **Quick-Fix:**
```sql
ALTER TABLE lineups DROP CONSTRAINT lineups_captain_slot_check;
ALTER TABLE lineups ADD CONSTRAINT lineups_captain_slot_check 
  CHECK (captain_slot IS NULL OR captain_slot = ANY(ARRAY[
    'gk','def1','def2','def3','def4','mid1','mid2','mid3','mid4','att','att2','att3'
  ]));
```

---

### P3-03 🚨 CRITICAL: `transactions.type` hat KEINE CHECK Constraint — 15 verschiedene Werte live, davon 4 Legacy

**Live-DB Beweis:**
```sql
SELECT type, count(*) FROM transactions:
  ipo_buy:679, tier_bonus:108, trade_sell:61, trade_buy:61, deposit:55, 
  welcome_bonus:17, streak_reward:8, buy:6, sell:6, offer_lock:4, 
  admin_adjustment:2, mission_reward:2, offer_unlock:1, offer_execute:1, offer_sell:1
-- + 'mystery_box_reward' wird live via open_mystery_box_v2 INSERTED!

SELECT * FROM pg_constraint WHERE conrelid='transactions'::regclass AND contype='c':
  []  -- KEINE CHECK Constraint
```

**Impact:**
- 12 Legacy 'buy'/'sell' Rows (vor `trade_buy`/`trade_sell` Standardisierung) — wenn UI casted gegen modernen Type-Union, werden diese als "unknown" gerendert oder crashen
- `mystery_box_reward` wird neu eingeschoben aber niemand kontrolliert die Whitelist
- TS-Type ist offen — Drift kann unbemerkt wachsen
- Legacy-Daten-Anti-Pattern: `'buy'/'sell'` (6 each, 12 total)

**Fix-Owner:** Backend (CEO-Approval, Geld-Tabelle).
- Migration A: Backfill `'buy'→'trade_buy'`, `'sell'→'trade_sell'` (12 Rows)
- Migration B: ADD CHECK constraint mit allen ~15 Werten
- Migration C: TS-Type alignen mit DB-Whitelist

---

### P3-04 🚨 HIGH (downgrade): `platform_settings` Tabelle hat KEINE RLS — aber Inhalt ist nicht-sensitiv

**Live-DB Beweis:**
```sql
SELECT * FROM platform_settings:
  [{"key":"scout_events_enabled","value":false,"updated_at":"2026-03-21..."}]
-- Nur 1 Row, ein Feature-Flag (boolean) — KEINE Secrets/PII

-- Tabellen-Status:
SELECT relname, relrowsecurity FROM pg_class WHERE policies COUNT=0:
  - platform_settings: rls_enabled=FALSE        ← OFFEN, aber Inhalt harmlos
  - _rpc_body_snapshots: rls_enabled=TRUE, 0 policies (default-deny OK)
  - club_external_ids: rls_enabled=TRUE, 0 policies (default-deny OK)
  - mystery_box_config: rls_enabled=TRUE, 0 policies (default-deny OK)
  - player_external_ids: rls_enabled=TRUE, 0 policies (default-deny OK)
```

**Impact (re-evaluiert):**
- `platform_settings` ist offen für anon SELECT/INSERT/UPDATE/DELETE — aber nur 1 Row mit `scout_events_enabled=false`. **Keine Secrets**, keine PII.
- ABER: anon kann THEORETISCH `scout_events_enabled=true` setzen → BeScout-Events Live-Schalten ohne Approval → CEO-Kill-Switch defeated. **Funktional Beta-blocking trotzdem.**
- Andere 4 Tabellen sind RLS-enabled mit 0 Policies = default-deny — funktional korrekt, kosmetisch unsauber

**Fix-Owner:** Backend.
```sql
-- Sofort:
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_settings_public_select ON platform_settings 
  FOR SELECT TO authenticated USING (true);
-- INSERT/UPDATE/DELETE → service_role only (default-deny via no-policy)
```

---

### P3-05 🚨 HIGH: 7 Stub-Migration-Files violation AR-43 (verbotenes Pattern)

**File-Beweis (lokal):**
```bash
SHORT (<10 lines): 
  20260330_fantasy_missions.sql (5 lines)
  20260410170000_mystery_box_daily_cap_and_price_change_7d.sql (7 lines)
  20260411114500_mystery_box_daily_cap_opened_at_fix.sql (4 lines)
  20260411114600_mystery_box_equipment_branch_fix.sql (6 lines)
  20260411114700_mystery_box_ticket_source_fix.sql (5 lines)
  20260411120000_cancel_order_remove_cooldown.sql (5 lines)
  20260411130100_create_offer_null_guard_fix.sql (8 lines)
```

**Impact:** Greenfield `db reset` schlägt fehl (Stub kann nicht "applied" werden ohne SQL). AR-43 explizit verboten in `database.md`. Nicht akut Beta-blocking aber Tech-Debt.

**Fix-Owner:** Backend. Stubs durch finale SQL ersetzen.

---

## CRITICAL Findings (8 total)

| ID | Severity | Bereich | Pattern | Fix-Effort |
|----|----------|---------|---------|------------|
| **P3-01** | 🚨 CRITICAL | RPCs Security | 69 SECDEF + anon-EXEC, davon 9 mit p_user_id ohne auth.uid()-Guard | Migration-Bulk |
| **P3-02** | 🚨 CRITICAL | CHECK Constraint | lineups.captain_slot blockt 6 von 12 Slots | Migration |
| **P3-03** | 🚨 CRITICAL | CHECK Constraint | transactions.type ohne CHECK, 12 Legacy 'buy'/'sell' Rows | Migration + Backfill |
| **P3-04** | 🚨 CRITICAL | RLS | platform_settings hat KEINE RLS aktiviert | Migration |
| **P3-06** | CRITICAL | i18n-Leak | 8 RPCs mit dynamischen Werten in Error-Messages (J3 Triple-Red-Flag Pattern) | Service+RPC |
| **P3-07** | CRITICAL | Money | open_mystery_box_v2 schreibt `'mystery_box_reward'` mit String " CR" in description (StGB §284 Risk + non-existent CR Currency) | RPC-Patch |
| **P3-08** | CRITICAL | Type-Drift | mystery_box_results.equipment_type column existiert, RPC inserted v_eq_key (= equipment_key), TS-Type-Mismatch | Service-Fix |
| **P3-22** | CRITICAL | RPC | `lock_event_entry`/`unlock_event_entry` Stub-Wrappers leiten an `rpc_lock_event_entry/rpc_unlock_event_entry` weiter — letzteres OHNE auth.uid() Guard, anon-DENY ja, aber Stub-Wrapper anon-EXEC=true → Wrapper exposed (Test bestaetigt: anon kann Stub callen, Stub ruft auth.uid()→NULL→Inner-RPC, RAISE/Reject) | Migration |

### Detail P3-06: i18n-Leak via dynamische Error-Messages

**Live-DB Beweis:** 8 Funktionen mit `RAISE EXCEPTION '...% ...', value`:
```sql
check_event_allows_lineup: 'Event ist beendet — Lineup-Änderung nicht möglich. Status: %', v_status;
check_season_chip_limit: 'season_chip_limit_exceeded: % already used % of % times', NEW.chip_type, v_current_uses, v_max_uses;
credit_tickets: 'Ungueltige Ticket-Quelle: %', p_source;
enforce_research_weekly_cap: 'research_weekly_cap: Max 3 Research-Posts pro Woche erlaubt. Nächster Post möglich ab %.', ...;
grant_founding_pass: 'Ungueltiger Tier: %', p_tier;
set_league_active_gameweek: 'League % not found', p_league_id;
spend_tickets: 'Ungueltige Ticket-Quelle: %', p_source;
update_club_fantasy_settings: 'Club % not found', p_club_id;
```

**Impact:** Pattern aus J3-Healer-A Triple-Red-Flag (a) DE/EN-Mix, (b) dynamische Werte in Error, (c) interne Internals leaken. Frontend kann nicht via `mapErrorToKey()` resolven. User sieht "season_chip_limit_exceeded: triple_captain already used 3 of 3 times" wörtlich.

**Fix:** Pattern auf alle 8 anwenden — RPC wirft i18n-Key (`'season_chip_limit_exceeded'`), Service mapped + Component nutzt `t(key, {chip, used, max})` für Format.

### Detail P3-08: equipment_type vs equipment_key Type-Drift

**Live-DB Beweis:**
- `mystery_box_results` columns: `equipment_type TEXT`, `equipment_rank INT`
- RPC `open_mystery_box_v2` Body inserted: `... equipment_type, equipment_rank ... VALUES (..., v_eq_key, v_eq_rank, ...)`
- `v_eq_key` = `equipment_key` aus `equipment_definitions.key` (z.B. `'gauntlet_lightning'`)
- Spaltenname ist semantisch falsch: `equipment_type` suggeriert Type-Discriminator, ist aber ein Key

**Impact:** TS-Cast `result.equipment_type` als Type ist falsch — sollte `equipment_key` heißen. UI rendered Key, Glossar/Lookups failen. Plus Inkonsistenz mit `user_equipment.equipment_key` (richtig benannt).

**Fix:** Spalte umbenennen `mystery_box_results.equipment_type → equipment_key` + Service-Cast aktualisieren.

---

## HIGH Findings (14 total)

| ID | Severity | Bereich | Issue |
|----|----------|---------|-------|
| **P3-05** | HIGH | Migrations | 7 Stub-Files <10 Zeilen (AR-43 verbotenes Pattern) |
| **P3-09** | HIGH | RPCs Security | 50 SECURITY DEFINER RPCs OHNE `SET search_path` — auch wenn Default `public` ist, Defense-in-Depth nicht erfüllt (Schema-Hijacking via search_path-Manipulation theoretisch möglich) |
| **P3-10** | HIGH | RLS | `notifications_insert_any_authenticated`: any auth user kann beliebige notification mit fremder user_id INSERTen (AR-58 doc'd als bewusste Beta-Risk-Acceptance, Post-Beta MUSS auf RPC-Wrapper) |
| **P3-11** | HIGH | RLS | `holdings_select_all_authenticated USING (true)` — jeder auth User sieht ALLE Holdings aller User. Öffentliche Trading-Aktivitaet OK?, aber Anil hat in `database.md` `getWallet()` als nicht-cachen markiert wegen RLS — hier ist es offen |
| **P3-12** | HIGH | RLS | `trades_select USING (true)` + `pbt_treasury_select USING (true)` + `pbt_transactions_select USING (true)` — alles öffentlich (auch fee/PBT-Bewegungen). Compliance-Frage: dürfen User andere User-PBT-Bewegungen sehen? |
| **P3-13** | HIGH | RLS | `orders_select USING (true)` für public role (anon+auth) — anon sieht ALLE buy/sell orders. Inklusive `expires_at`, `quantity`, `max_price`. Marktdaten-Leak OK? |
| **P3-14** | HIGH | Phase 4 | `current_setting('app.paid_mystery_box_enabled', true)` Feature-Flag in `open_mystery_box_v2` — `setting_value=null` live → COALESCE-fallback false → paid box komplett disabled. Phase-4 Gate funktioniert, aber NIE in Pre-Beta-Migration aktiviert |
| **P3-15** | HIGH | Privacy | `wallets`-Tabelle: anon hat SELECT-Privileg gewährt (RLS-Policy `auth.uid() = user_id` schützt aber). Falls RLS-Bug → komplette Wallet-Leak |
| **P3-16** | HIGH | RPCs Type | `rpc_save_lineup` ist Trust-Client RPC mit `p_user_id` Parameter UND `IF auth.uid() IS DISTINCT FROM p_user_id THEN` Guard — gut. ABER es ist auch anon-EXEC=true → anon callt → auth.uid()=NULL → Guard wirft 'auth_mismatch' → korrekt aber DoS-fähig. Sollte trotzdem REVOKE FROM anon |
| **P3-17** | HIGH | Type-Konsistenz | 11 INTEGER-Money-Spalten gemischt mit BIGINT-Money: `user_wildcards.balance INT`, `wildcard_transactions.amount INT`, `mystery_box_results.tickets_amount INT`, `chip_usages.ticket_cost INT`, `cosmetic_shop_listings.price_tickets INT`, `mystery_box_config.reward_weight INT`, `events.ticket_cost INT`, `daily_challenges.reward_correct/wrong INT`, `user_founding_passes.price_eur_cents INT`. Tickets/Wildcards = abstrakte counter, INT mag OK sein. ABER `events.ticket_cost INT` und `user_founding_passes.price_eur_cents INT` sind grenzwertig (max 2.1M €) |
| **P3-18** | HIGH | RPC-Mismatch | `mystery_box_results` INSERT in `open_mystery_box_v2` fehlt Spalte `opened_at` (aber default `now()` — OK). Aber Cast-Drift: RPC liefert `'rewardType'` camelCase im jsonb, Service muss matchen. Pattern aus common-errors.md noch active |
| **P3-19** | HIGH | StGB §284 | 'mystery_box' source in `ticket_transactions_source_check` ALLOWED — Mystery Box als Reward-Quelle ist Glücksspiel-grenzwertig. Geschützt nur durch Phase-Gate (paid_mystery_box_enabled=false) |
| **P3-20** | HIGH | Wording | `open_mystery_box_v2` description ends with `(v_bcredits / 100) || ' CR'` — was ist "CR"? Compliance-frame "CR" als Bezeichnung nicht in Glossar/Compliance-Dokumenten. Sollte "$SCOUT" sein wenn Trading-Cents oder leer |
| **P3-21** | HIGH | RPC-Anti-Pattern | `accept_offer` RPC hat FOR UPDATE Lock auf `offers` aber NICHT auf `wallets` direkt — Race möglich: user A startet accept, B startet Trade auf gleicher offer-related wallet. Fix: explizit `SELECT * FROM wallets WHERE user_id=v_seller FOR UPDATE` vor balance-update |

---

## MEDIUM Findings (16 total)

| ID | Severity | Bereich | Issue |
|----|----------|---------|-------|
| P3-23 | MEDIUM | RLS | `bounties_select USING (true)` — alle bounties public (auch closed/cancelled). Vermutlich gewollt, aber Bewertung |
| P3-24 | MEDIUM | RLS | `feedback_insert` OK aber **kein SELECT-Policy** — User sehen ihre eigenen Feedbacks NIE (auch nicht Admin-Reply). UI muss "send-only" sein |
| P3-25 | MEDIUM | RLS | `clubs_insert_service WITH CHECK (false)` — Clubs nur via service_role/RPC einlegbar. Konsistent |
| P3-26 | MEDIUM | RLS | 99 Tabellen ohne DELETE-Policy — meist OK (default-deny), aber Audit nötig: `holding_locks` hat DELETE-Policy, sollte aber prüfen ob admin/user/client für jeden Use-Case |
| P3-27 | MEDIUM | RLS | `predictions_select_resolved USING (status IN ('correct','wrong'))` — leakt anderen Usern resolved predictions (gewollt für Leaderboards?), aber pending bleibt private. Konsistent |
| P3-28 | MEDIUM | Performance | `trg_recalc_floor_on_trade` ist non-SECDEF Trigger auf `players` — bei jedem Trade läuft full recalc. Bei Beta mit 50 Mann + 10 Trades/User/Tag = 500 Trades → 500 Floor-Recalcs/Tag. OK aber profile post-Beta |
| P3-29 | MEDIUM | RPC-Konsistenz | `daily_price_volume_reset()` ist anon-EXEC=true — Cron-Funktion. Sollte revoke + service_role only granten |
| P3-30 | MEDIUM | Migration-Konsistenz | `apply_migration` stempelt remote Version mit Aufruf-Zeit, nicht File-Name — bekannt aus database.md, aber Drift ist real und behindert `db push` (Greenfield-Reset broken) |
| P3-31 | MEDIUM | Type-Drift | `mystery_box_results.uncommon`-rarity (3 Rows) live, aber `mystery_box_config.rarity` CHECK = `('common','rare','epic','legendary','mythic')` — neue Inserts sind 'uncommon'-blocked, aber Legacy-Rows existieren noch. Frontend J5-Fix: Type erweitern statt Backfill |
| P3-32 | MEDIUM | Trigger | 12 non-SECDEF Triggers, alle 'OWN' write_type — keine Cross-User-Issues. Nur `trg_recalc_floor_on_trade` schreibt zu `players` (alle User sehen das, OK weil Public-Daten) |
| P3-33 | MEDIUM | Cleanup | `_rpc_body_snapshots` Tabelle existiert, vermutlich für Schema-Snapshots. Hat anon SELECT-Grant (privilege-leak von RPC-Bodies)? RLS=TRUE, 0 Policies → default-deny anon. OK |
| P3-34 | MEDIUM | RPC | `set_success_fee_cap(p_admin_id, p_player_id, p_cap_cents)` — anon-EXEC=false, aber Body kein auth.uid()-Check für admin-status. Admin-Auth nur über Whitelist-Check intern |
| P3-35 | MEDIUM | RPC | `expire_pending_orders()` — Cron RPC, anon-EXEC=false. OK aber sollte service_role only |
| P3-36 | MEDIUM | RPC | `reward_referral(p_referee_id)` — anon-EXEC=false. Body sollte auth.uid()-check oder service_role-only |
| P3-37 | MEDIUM | Schema | `transactions.balance_after BIGINT` — gut. ABER 15 Type-Werte ohne CHECK = ungenehme Type-Drift |
| P3-38 | MEDIUM | RLS | `notifications_insert_any_authenticated` ist Beta-Workaround — Risk-Acceptance dokumentiert (AR-58). Post-Beta MUSS fixen |

---

## LOW Findings (9 total)

| ID | Severity | Issue |
|----|----------|-------|
| P3-39 | LOW | `clubs_subscriptions.tier` CHECK ist 'silber' (ß) — UI muss exact match (kein 'silver') |
| P3-40 | LOW | `airdrop_scores.tier` CHECK enthält 'diamond' — TS-Type-Sync nötig |
| P3-41 | LOW | `events.event_tier` 'arena'/'club'/'user' — 3 Werte sehr generisch, einfach zu vergessen |
| P3-42 | LOW | `chk_tournament_no_paid_entry` CHECK auf events — Tournament-Logik verwirrend (warum nicht über `event_fee_config`?) |
| P3-43 | LOW | `events.events_status_check` — 'late-reg' mit Bindestrich (gut visible aber Code-Inkonsistenz mit anderen snake_case) |
| P3-44 | LOW | `cosmetic_definitions.rarity` CHECK enthält 'uncommon' — anders als `mystery_box_config.rarity` (kein 'uncommon'). System-Inkonsistenz |
| P3-45 | LOW | `predictions.confidence` CHECK >=50 AND <=100 — UI muss validieren, sonst PG-Constraint-Error |
| P3-46 | LOW | `tips.amount_cents` CHECK >=1000 AND <=100000 — 10 bis 1000 SCOUT, eng aber dokumentiert |
| P3-47 | LOW | `bounties.reward_cents` CHECK >=500 AND <=100000 — 5 bis 1000 SCOUT, dokumentiert |

---

## 🟢 VERIFIED OK

### Trigger-Functions
**Alle 32 Triggers korrekt:**
- 12 non-SECDEF Triggers schreiben nur 'OWN'-Tabellen (kein Cross-User)
- 20 SECDEF Triggers, davon 2 mit Cross-User-Write (`sync_level_on_stats_update`, `notify_watchlist_price_change`) — beide bewusst SECDEF
- Kein Trigger missbraucht `auth.uid()` in falschen Kontexten

### CHECK Constraints (130 total)
- Money-Constraints: `wallets.balance >= 0`, `holdings.quantity >= 0`, `pbt_treasury.balance >= 0` ✓
- Status-Whitelists: `events.status`, `orders.status`, `offers.status`, `bounties.status` alle vollständig
- Tier-Whitelists: `user_stats.tier`, `club_subscriptions.tier`, `airdrop_scores.tier` alle korrekt
- Self-Reference Guards: `mentorships.mentor != mentee`, `user_follows.follower != following` ✓
- Fee-Splits: `fee_config.trade_split_check`, `ipo_split_check` enforce =10000 sum ✓

### RLS Coverage Big-Picture
- **120 public Tabellen, 119 mit RLS aktiviert** (nur `platform_settings` offen — siehe P3-04)
- 113 Tabellen haben mindestens 1 SELECT-Policy
- 7 Tabellen ohne SELECT-Policy (alle Service-/Config-Tabellen, default-deny OK)

### FOR UPDATE Locking (Race-Protection)
- `accept_offer`, `buy_from_ipo`, `buy_from_order`, `buy_player_sc`, `place_buy_order` haben `FOR UPDATE` Lock ✓
- `open_mystery_box_v2` lockt user_tickets via `PERFORM 1 FROM ... FOR UPDATE` ✓
- ⚠️ `accept_offer` lockt `offers` aber nicht `wallets` (P3-21)

### Money-Type-Konsistenz
- 80+ BIGINT cents-Spalten (Standard) ✓
- 11 INTEGER counter (Tickets, Wildcards) — pragmatisch (P3-17 hint)

### Phase 4 Feature Flags
- 1 RPC mit `current_setting('app.*')` Pattern (`open_mystery_box_v2` mit `app.paid_mystery_box_enabled`)
- AR-49 J7 hat Feature-Gate korrekt — paid mystery box ist live disabled (NULL → COALESCE false)

---

## LEARNINGS

### L1: SECURITY DEFINER + REVOKE-Block ist Auditing-Sieve mit Löchern
**Fund:** 37 Migration-Files mit `CREATE FUNCTION` ohne `REVOKE EXECUTE FROM PUBLIC, anon`. AR-44 Regel ist **partiell durchgesetzt** (J4 hat ~30 RPCs nachgezogen, aber nicht alle).

**Pattern:** Live-DB-Privilegs-State ist die Wahrheit, NICHT die Migration-File. `CREATE OR REPLACE` resettet Privilegien, also auch wenn frühere Migration REVOKE hatte, kann die neue es überschreiben.

**Fix für Knowledge:** `database.md` AR-44 muss EXPLIZIT sagen: "Audit per pg_proc + has_function_privilege, NICHT per Migration-Grep".

### L2: anon-EXEC ist nicht gleich Exploit — interne Guards können retten
**Fund:** Die 9 trust-param-RPCs ohne auth.uid()-Guard sind KRITISCH, aber die anderen 60 RPCs mit anon-EXEC=true haben oft interne `auth.uid()` Logik die NULL für anon zurückgibt → Guard wirft → reject.

**Pattern:** Auch wenn anon EXEC darf, ist der RPC nicht zwangsläufig exploitable. Aber Defense-in-Depth: REVOKE FROM anon ist trotzdem korrekt, da:
1. Reduziert Angriffsfläche (DOS)
2. Fail-Safe wenn interne Guard vergessen wird
3. Compliance/Auditing einfacher

### L3: CHECK Constraints sind oft Veralteter Snapshot
**Fund:** `lineups.captain_slot` CHECK = 6 Slots, RPC schreibt 12 Slot-Spalten = Snapshot vom 7-Spieler-Lineup-System, das auf 11-Spieler erweitert wurde ohne CHECK-Update.

**Pattern:** Bei Schema-Erweiterung (neue Slots, neue Reward-Types) IMMER CHECK Constraints mit erweitern. AR-43 hat `mystery_box_config.rarity` CHECK gefixt (mythic dazu) — gleicher Patch fehlt für `lineups.captain_slot`.

### L4: Stub-Migrations sind ein Audit-Toter-Winkel
**Fund:** 7 Stub-Files lokal, alle vor 2026-04-12. AR-43 Regel verbietet sie, aber Existing-Stubs wurden noch nicht gerätselt.

**Pattern:** Wenn `mcp__supabase__apply_migration` für Realtime-Patches genutzt wurde, dann lokal nur ein Comment hinterlegt — das ist die Drift. AR-43 muss durchgesetzt werden für Greenfield-DB-Reset Funktionalität.

### L5: i18n-Key-Leak via dynamische Errors
**Fund:** 8 RPCs mit `RAISE EXCEPTION '...% ...'`. Pattern aus J3 noch nicht voll ausgerollt.

**Pattern:** Service+Component müssen jeden Error-Key als Tupel `(key, params)` consumeren. RPC darf NIE statisches Plus dynamisches mixen. Common-errors.md hat das dokumentiert, aber 8 RPCs verletzen es weiter.

### L6: `transactions.type` ist Enum-Drift im freien Lauf
**Fund:** Keine CHECK Constraint auf `type`, Daten zeigen 15 verschiedene Werte inkl. 12 Legacy `'buy'/'sell'`-Rows. Mystery_box_reward wird neu eingeschoben.

**Pattern:** Money-relevante Type-Spalten MÜSSEN CHECK Constraint haben. Sonst:
- Legacy-Daten-Rest bleibt (Migration-Backfill vergessen)
- Neue Werte schleichen ein (kein Gate)
- TS-Type Drift unbemerkt

---

## Recommended Fix-Strategy

### Sprint 1: Akut (vor Beta Launch)

| Item | Severity | Owner | Effort | Approval |
|------|----------|-------|--------|----------|
| **AR-60** Bulk REVOKE für 9 trust-param-RPCs ohne auth.uid()-Guard (P3-01) | CRITICAL | Backend | 1h | CEO (Security) |
| **AR-61** lineups.captain_slot CHECK auf 12 Slots erweitern (P3-02) | CRITICAL | Backend | 15m | Auto |
| **AR-62** transactions.type CHECK + Legacy Backfill (P3-03) | CRITICAL | Backend | 30m | CEO (Money) |
| **AR-63** platform_settings RLS aktivieren (P3-04) | CRITICAL | Backend | 15m | Auto |
| **AR-64** open_mystery_box_v2 description: "CR" → "$SCOUT" + i18n (P3-20) | CRITICAL | Backend | 15m | CEO (Wording) |
| **AR-65** mystery_box_results.equipment_type → equipment_key Rename (P3-08) | CRITICAL | Backend | 30m | CEO (Schema-Change) |
| **AR-66** 8 RPCs i18n-Error-Pattern Refactor (P3-06) | HIGH | Backend | 1h | Auto |

### Sprint 2: Härten (während Beta)

| Item | Severity | Owner | Effort |
|------|----------|-------|--------|
| **AR-67** Bulk REVOKE für restliche 60 SECDEF-RPCs mit anon-EXEC | HIGH | Backend | 3h |
| **AR-68** SET search_path auf alle 50 SECDEF-RPCs ergänzen (Defense-in-Depth) | HIGH | Backend | 2h |
| **AR-69** 7 Stub-Migration-Files mit echter SQL ersetzen | HIGH | Backend | 2h |
| **AR-70** notifications_insert_any_authenticated → RPC-Wrapper rpc_create_notification mit Rate-Limit | HIGH | Backend | 4h |
| **AR-71** accept_offer FOR UPDATE auf wallets ergänzen (P3-21) | HIGH | Backend | 30m |

### Sprint 3: Aufräumen (post-Beta)

| Item | Severity | Effort |
|------|----------|--------|
| **AR-72** holdings_select_all_authenticated → restrict to followed users? | MEDIUM | 1h |
| **AR-73** orders/trades/pbt_treasury öffentlich SELECT — Compliance-Review ob OK | MEDIUM | Discussion |
| **AR-74** transactions.type Frontend cleanup (Legacy 'buy'/'sell' UI-Rendering) | MEDIUM | 1h |
| **AR-75** events.ticket_cost INT → BIGINT (P3-17) | LOW | 30m |
| **AR-76** user_founding_passes.price_eur_cents INT → BIGINT (P3-17) | LOW | 30m |

---

## Cross-Cutting Patterns (für common-errors.md)

### Pattern X1: SECDEF-RPCs Audit nur via Live-DB
```sql
-- TRUE Privileg-Zustand:
SELECT proname, has_function_privilege('anon', oid, 'EXECUTE') 
FROM pg_proc WHERE pronamespace=(SELECT oid FROM pg_namespace WHERE nspname='public')
  AND prokind='f' AND prosecdef=TRUE;
```
NICHT auf Migration-Grep verlassen. CREATE OR REPLACE resettet.

### Pattern X2: CHECK Constraints sind Schema-Snapshot, mit Schema-Erweiterung wachsen
Bei jeder Spaltenerweiterung (neue Status, neue Slots, neue Tier-Werte) → CHECK auch updaten. Test: Insert mit neuem Wert → CHECK violation? Dann fehlt die Migration.

### Pattern X3: Dynamic Error-Messages = i18n-Key-Leak
RPCs sollten **statische Error-Keys** werfen. Dynamische Werte (Limits, Counts, IDs) gehören in Service-Layer nach Resolution. Pattern aus J3, aber 8 RPCs verstoßen weiterhin.

### Pattern X4: Type-Whitelisting via CHECK ist Pflicht für Money-Tabellen
`transactions.type` ohne CHECK = Drift. Audit alle anderen Money-relevant Type-Spalten:
- `wildcard_transactions.source` ✓ hat CHECK
- `ticket_transactions.source` ✓ hat CHECK
- `pbt_transactions.source` ✓ hat CHECK
- **transactions.type ✗ FEHLT**
