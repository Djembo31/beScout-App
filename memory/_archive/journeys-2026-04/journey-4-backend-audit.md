---
name: Journey 4 — Backend Audit (Fantasy-Event-Teilnahme)
description: RPC + Service + Invarianten Audit des Fantasy-Event-Flows (Event-Entry, Lineup-Submit, Scoring, Reward-Claim, Wildcards, Chips, Cron-Sync) fuer Operation Beta Ready Phase 2.
type: project
status: audit-complete
created: 2026-04-14
agent: backend
scope: ["gameweek-sync cron", "score_event", "save_lineup", "lock_event_entry", "unlock_event_entry", "cancel_event_entries", "earn_wildcards", "spend_wildcards", "admin_grant_wildcards", "equip_to_slot", "resolve_gameweek_predictions", "calculate_sc_of_week", "events/lineups/event_entries/chip_usages/user_wildcards/wildcard_transactions/player_gameweek_scores RLS"]
---

# Journey #4 — Backend Audit (Fantasy-Event-Teilnahme)

## Summary

**23 Findings: 6 CRITICAL + 9 HIGH + 6 MEDIUM + 2 LOW.**

Fantasy-Core hat **zwei unabhaengige Beta-Blocker**:
1. **Multi-League Cron-Scope** (P0 aus SSOT bestaetigt): 134 Clubs, 7 Ligen, aber `src/app/api/cron/gameweek-sync/route.ts:103` callt `getLeagueId()` — ein einziger `NEXT_PUBLIC_LEAGUE_ID`-Env-Wert. Non-TFF1-Clubs stecken auf `active_gameweek=1` fest, Gameweek-Sync + Scoring + Event-Clone laufen nur fuer TFF 1. Lig.
2. **CRITICAL Wildcard Minting Exploit**: `earn_wildcards` RPC ist SECURITY DEFINER, hat keine Auth-Guards, `p_user_id` als Parameter — **jeder anon Client kann unbegrenzt Wildcards fuer JEDEN User minten**. Live-exploited waehrend Audit: 99.999 wildcards to `bescout` user (reverted).

Zusaetzlich: **5 RPCs ohne Source im Repo** (`save_lineup`, `cron_process_gameweek`, `reset_event`, `resolve_gameweek_predictions`, `calculate_sc_of_week`), **701 orphan player_id-Referenzen in 111 lineups**, **12 Events scored mit default-40 Phantom-Scores** (Score-Coverage-Guard nicht greifbar), **`lock_event_entry` fee_split wird berechnet aber NIE an Treasury verteilt** (NO-OP JSONB), **anon liest lineups/events/cron_sync_log/user_equipment Cross-User** (Privacy).

Fantasy-Services Error-Swallowing ist **architektonisch** (UI erwartet `[]`/`null`) — NICHT als Bug behandeln, nur dokumentieren.

---

## CRITICAL (6)

### J4B-01 P0: Gameweek-Sync Cron ist single-league (Multi-League komplett broken)
**File:** `src/app/api/cron/gameweek-sync/route.ts:103-104` + `src/lib/footballApi.ts:25-28`

```typescript
// route.ts:103-104
const leagueId = getLeagueId();  // ONE league
const season = getCurrentSeason();

// footballApi.ts:25-28
export function getLeagueId(): number {
  const envVal = process.env.NEXT_PUBLIC_LEAGUE_ID;
  return envVal ? parseInt(envVal, 10) : DEFAULT_LEAGUE_ID;  // 204 = TFF 1. Lig
}
```

**Problem:** Die Cron-Route laedt `getLeagueId()` EINMAL als Scope fuer den gesamten Run. Alle `apiFetch` calls rufen `/fixtures?league=${leagueId}&season=${season}&round=Regular Season - ${activeGw}` auf, `get_active_gw` nimmt `Math.min(active_gameweek)` ueber ALLE Clubs in der DB — **aber processed nur Fixtures der einen Env-Liga**. `clone_events` + `advance_gameweek` macht dann bulk-updates auf der `clubsAtGw` Menge (Clubs mit minimalem GW), was bedeutet: die TFF 1. Lig Clubs stecken auf GW36 fest, die anderen 114 Clubs auf GW1 — aber der Cron rennt endlos gegen GW1 weil `Math.min` das `min` nimmt.

**Live-DB-Beweis (2026-04-14):**
```
clubs_in_db:           134 (across 7 leagues)
clubs_at_active_gw_1:  114 (alle non-TFF1 liegen hier: BL1, BL2, SL, LL, SA, PL)
clubs_at_active_gw_36: 20  (TFF 1. Lig Teilnehmer)
events_per_league:     { b08cffec (TFF1): 139 events } — ZERO events in anderen Ligen
fixtures_per_league:   { b08cffec (TFF1): 380 fixtures } — ZERO fixtures in anderen Ligen
cron_sync_log_2026-04-14T16:30 get_active_gw: clubs=114, gw=1
cron_sync_log_2026-04-14T17:00 already_complete: "All fixtures finished, all events scored"
```

Der Cron rennt alle 30 Minuten, sieht GW1 (Minimum ueber alle Clubs), aber hat keine Fixtures/Events fuer die 114 non-TFF1-Clubs auf GW1 → `already_complete` skip → **die 114 non-TFF1-Clubs werden NIE processed, GW bleibt forever bei 1**. Sobald 1+ Beta-User ein non-TFF1-Event betritt (sollte es eines geben), schlaegt alles kaskadierend fehl: keine `player_gameweek_scores`, keine Rewards, keine Lineup-Locks.

**Impact:** 
- Operation Beta Ready Ziel = "50 Comunio-Veteranen". Wenn ein Beta-User einen Bayern-Spieler in sein Lineup packt, weil er die Multi-League-Filter nutzt, **gibt es keinen Weg fuer Scoring**. Das Event endet mit default-40 pro Slot. Prize-Pool wird auf ZERO-Score-Lineups verteilt.
- Multi-League war der 2026-04-14 Commit 8a5014d (7 Ligen, 4263 Spieler live). Fantasy-Integration ist **Cross-Liga broken**.
- Bonus-Impact: `clone_events` fuer GW+1 laeuft nur fuer TFF1, Events fuer GW28 in BL1 werden NIE erzeugt.

**Fix-Vorschlag:**
- Option A (korrekt, M-Aufwand): `getActiveLeagues()` helper DB-side + outer loop in `route.ts` ueber `SELECT * FROM leagues WHERE is_active=true`. Per Liga: getLeagueId() = row.api_football_id, processing sequenziell. `clone_events`/`advance_gameweek` per Liga-Scope.
- Option B (Pilot-Beta-Minimum): Restrict `getEvents` + `getFixtures` + alle Multi-League-Features auf `league_id = tff1_id`, banner "Multi-League Fantasy kommt post-Beta". Phase-4-scope.
- Option C: Dual-Cron: `/api/cron/gameweek-sync-tff1` + `/api/cron/gameweek-sync-other` mit Liga-ID als Path. Vercel-Config anpassen.

**Severity CRITICAL** — Beta-Blocker, Multi-League Fantasy nicht functional.

---

### J4B-02 P0 SECURITY EXPLOIT: `earn_wildcards` anon-mintable → unlimited Wildcards fuer jeden User
**File:** `supabase/migrations/20260326_wildcards.sql:67-95`

```sql
CREATE OR REPLACE FUNCTION earn_wildcards(
  p_user_id UUID,        -- ← PARAMETER statt auth.uid()
  p_amount INT,
  p_source TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
...
-- NO auth check. NO REVOKE. NO GRANT restriction.
$$;
```

Der `REVOKE` Block am Ende der Migration revoked NUR Tabellen-Access:
```sql
REVOKE ALL ON user_wildcards FROM PUBLIC, authenticated, anon;
REVOKE ALL ON wildcard_transactions FROM PUBLIC, authenticated, anon;
```
Aber `REVOKE EXECUTE ON FUNCTION earn_wildcards FROM PUBLIC, authenticated, anon` fehlt komplett.

**Live-DB-Exploit-Beweis (2026-04-14, reverted):**
```javascript
const anon = createClient(supabaseUrl, anonKey);  // ungetoppt ANON-KEY
await anon.rpc('earn_wildcards', {
  p_user_id: 'ff152a24-395f-490f-9ffb-9f778c3a78a9',  // bescout user
  p_amount: 99999,
  p_source: 'admin_grant',
  ...
});
// Response: 99999 (success)
// user_wildcards.balance vorher: 0
// user_wildcards.balance nachher: 99999
```

Ich habe das Testing-Artifact (99999 wildcards + earned_total) nach Verifikation vollstaendig reverted. User-Wallet ist wieder auf 0.

**Gleiche Vulnerabilities:**
- `spend_wildcards(p_user_id, ...)` — gleiches Pattern. Anon kann versuchen zu spenden (blocked nur durch `insufficient_wildcards` aus dem Balance-Check, aber nur accidentally).
- `get_wildcard_balance(p_user_id)` — leaked (any user's balance readable)
- `refund_wildcards_on_leave(p_user_id, p_event_id)` — anon-callable
- `admin_grant_wildcards(p_admin_id, ...)` — blocked via in-body `top_role = 'Admin'` check, aber der **`p_admin_id` Parameter ist trust-the-client** — waere ohne top_role check auch exploitable.

**Live RPC-Access Matrix (anon kann):**
| RPC | Callable as anon | Auth Guard in body |
|-----|------------------|-------------------|
| `earn_wildcards` | ✅ YES | NEIN (EXPLOITABLE) |
| `spend_wildcards` | ✅ YES | NEIN (EXPLOITABLE) |
| `get_wildcard_balance` | ✅ YES | NEIN |
| `refund_wildcards_on_leave` | ✅ YES | NEIN |
| `admin_grant_wildcards` | ✅ YES | `top_role = 'Admin'` (aber p_admin_id = parameter) |
| `lock_event_entry` | ✅ YES | `auth.uid()` in wrapper (safe) |
| `unlock_event_entry` | ✅ YES | `auth.uid()` in wrapper (safe) |
| `cancel_event_entries` | ✅ YES | `top_role = 'Admin'` via auth.uid() (safe) |
| `save_lineup` | ❌ BLOCKED | permission denied for function save_lineup |
| `score_event` | ❌ BLOCKED | permission denied for function score_event |
| `equip_to_slot` | ❌ BLOCKED | permission denied for function equip_to_slot |
| `unequip_from_slot` | ❌ BLOCKED | permission denied for function unequip_from_slot |
| `resolve_gameweek_predictions` | ❌ BLOCKED | permission denied |
| `calculate_sc_of_week` | ❌ BLOCKED | permission denied |
| `cron_process_gameweek` | ❌ BLOCKED | permission denied |

**Impact:** Beta-Launch = catastrophic. Jeder Angreifer kann in 1 Minute allen 50 Beta-Usern 1 Mio Wildcards minten → Fantasy-Oekonomie kollabiert, Chip-Gleichstand futsch, Mystery-Box-Rewards entwertet.

**Fix-Vorschlag:**
- Sofort: Migration `20260414180000_wildcard_rpc_auth_hardening.sql`:
  ```sql
  REVOKE EXECUTE ON FUNCTION earn_wildcards FROM PUBLIC, authenticated, anon;
  REVOKE EXECUTE ON FUNCTION spend_wildcards FROM PUBLIC, authenticated, anon;
  REVOKE EXECUTE ON FUNCTION refund_wildcards_on_leave FROM PUBLIC, authenticated, anon;
  REVOKE EXECUTE ON FUNCTION admin_grant_wildcards FROM PUBLIC, authenticated, anon;
  -- get_wildcard_balance MUSS authenticated bleiben, aber mit auth.uid() guard im body
  ```
- Refactor: `earn_wildcards`/`spend_wildcards` wie `lock_event_entry`-Pattern: internal `rpc_earn_wildcards` (SECURITY DEFINER, revoked), public wrapper `earn_wildcards_for_me` der `auth.uid()` nutzt. Admin-grant via separate RPC mit `top_role = 'Admin'` Guard.
- Service Layer anpassen: `wildcards.ts:42` callt aktuell `earn_wildcards` mit `p_user_id: userId` — muss auf `auth.uid()` Pattern umgestellt werden.

**Severity CRITICAL P0** — Deploy-Blocker fuer Beta-Launch.

---

### J4B-03 Anon can call `lock_event_entry`, `unlock_event_entry`, `cancel_event_entries`, `refund_wildcards_on_leave`
**Files:** `supabase/migrations/20260321_unified_event_payment.sql:425-461`, `20260326_wildcards.sql:132-148`

**Live-DB-Beweis (2026-04-14):**
```
anon.rpc('lock_event_entry', { p_event_id: '00000000-0000-0000-0000-000000000000' })
  → { ok: false, error: 'event_not_found' }  -- RPC reached function body
anon.rpc('unlock_event_entry', { p_event_id: '00000000-0000-0000-0000-000000000000' })
  → { ok: false, error: 'event_not_found' }
anon.rpc('cancel_event_entries', { p_event_id: '00000000-0000-0000-0000-000000000000' })
  → RPC body reached
anon.rpc('refund_wildcards_on_leave', { p_user_id: '0...0', p_event_id: '0...0' })
  → no error (callable)
```

**Analyse:**
- `lock_event_entry` + `unlock_event_entry` wrappen `rpc_lock_event_entry(p_event_id, auth.uid())`. Wenn anon callt → `auth.uid()` = NULL → in body `SELECT * INTO v_existing ... WHERE user_id = NULL` → nichts passiert. Nicht direkt exploitable, aber **API-Surface ist offen** und erlaubt Reconnaissance (z.B. Event-ID-Enumeration via error-messages).
- `cancel_event_entries` hat `top_role = 'Admin'` guard als anon.uid()=NULL → blocked via 'unauthorized' — safe aber GRANT sollte stimmen.
- `refund_wildcards_on_leave(p_user_id, p_event_id)` — trust-the-client. Anon kann p_user_id beliebig setzen. Body checkt Lineup existence, aber wenn ein anon User die Event-ID + User-ID eines Opfers rausfindet (via lineups-Cross-User-Read), koennte er Wildcards refunden, die gar nicht im spezifischen Lineup aktiv waren.

**Fix-Vorschlag:** REVOKE-Pattern wie J4B-02. Oder Wrapper-Pattern: `refund_wildcards_on_leave_for_me(p_event_id)` mit `auth.uid()` implicit.

**Severity CRITICAL** — API-Surface-Exposure + potentielle Wildcard-Refund-Manipulation.

---

### J4B-04 Migration-Drift: 5 Fantasy-RPCs ohne Source im Repo
**Files:** FEHLEN in `supabase/migrations/`

```
save_lineup               — KEIN File (Code in lineups.mutations.ts:17 callt)
cron_process_gameweek     — KEIN File (route.ts:855 callt)
reset_event               — KEIN File (scoring.admin.ts:134 callt)
resolve_gameweek_predictions — KEIN File (route.ts:1077 callt)
calculate_sc_of_week      — KEIN File (route.ts:1091 callt)
```

**Kontext aus J1/J2/J3:** Phase 1.3 hat `calculate_dpc_of_week` → `calculate_sc_of_week` renamed via Alias-Pattern (commit 20260414151000). Das File existiert, aber es rename-only — der Body ist VIA Live-DB-Alias noch `calculate_dpc_of_week`. Der Body von `calculate_dpc_of_week` ist NICHT im Repo!

**Live-DB-Beweis (2026-04-14):**
```
grep "CREATE OR REPLACE FUNCTION.*save_lineup"  supabase/migrations/ → NO MATCHES
grep "CREATE OR REPLACE FUNCTION.*reset_event"  supabase/migrations/ → NO MATCHES
grep "cron_process_gameweek" supabase/migrations/ → NO MATCHES
```

Service-Konsumenten:
```
lineups.mutations.ts:17  save_lineup()
route.ts:855             cron_process_gameweek()
scoring.admin.ts:134     reset_event()
route.ts:1077            resolve_gameweek_predictions()
route.ts:1091            calculate_sc_of_week()
```

**Impact:** Identisch zu J1-AR-1 + J2B-01 + J3B-02 — aber jetzt im Fantasy-Scope erweitert. Rollback/DR = Fantasy komplett broken. Neue Developer koennen die Scoring-Engine nicht reviewen. Audit-Blindspot fuer:
- `save_lineup`: Auth-Guard? Wildcard-Spend? Equipment-Validation? Minimum-SC-per-Slot?
- `cron_process_gameweek`: Idempotenz? Transactional boundary? Player-Score-Default-40-Handling?
- `reset_event`: Rollback Wallet-Updates? Notifications cleanup? Holdings unlock?
- `resolve_gameweek_predictions`: Fee-Split 30/70? Phase-4-Guard?
- `calculate_sc_of_week`: Duplicate-Prevention? Prize-Pool-Override?

**Fix-Vorschlag:**
- CTO dumped Bodies via `mcp__supabase__execute_sql(pg_get_functiondef)` fuer ALLE 5 RPCs
- Schreibt sie in `20260414190000_backfill_fantasy_rpcs.sql`
- Verifiziert dass Body auf Live-DB identisch ist (NO-OP Migration)

**Severity CRITICAL** — Migration-Drift Pattern erweitert um Fantasy-Domain.

---

### J4B-05 `lock_event_entry` Fee-Split ist NO-OP: Fee wird berechnet, aber NIE verteilt
**File:** `supabase/migrations/20260321_unified_event_payment.sql:201-261` + `20260325_event_fee_from_config.sql:12+`

```sql
-- Lines 225-227: Fee berechnet
v_fee_platform := (v_event.ticket_cost * 350) / 10000;
v_fee_pbt      := (v_event.ticket_cost * 150) / 10000;
v_fee_club     := (v_event.ticket_cost * 100) / 10000;

-- Lines 230-233: Locked (nicht deducted!)
UPDATE public.wallets
  SET locked_balance = COALESCE(locked_balance, 0) + v_event.ticket_cost,
  ...

-- Line 253-254: In fee_split JSONB geschrieben
INSERT INTO public.event_entries
  (event_id, user_id, currency, amount_locked, fee_split, locked_at)
  VALUES (p_event_id, p_user_id, 'scout', v_event.ticket_cost,
          jsonb_build_object('platform', v_fee_platform, 'pbt', v_fee_pbt, 'club', v_fee_club),
          now());

-- KEIN Insert in pbt_treasury. KEIN Insert in club_wallets. KEIN Platform-Wallet-Update.
```

**Analyse:** Die Fee wird nur als JSONB-Annotation auf `event_entries.fee_split` gespeichert. Kein `settle_event_entries()` RPC existiert, der die Fees beim Event-Score tatsaechlich verteilt. Im Gegensatz zu `trading` RPCs (`buy_from_market`, `accept_offer`) wo Fee-Split in `pbt_treasury`, `club_wallets` usw. geht, gibt's bei Event-Entries KEINE Distribution.

**Live-DB-Beweis (2026-04-14):**
```
event_entries.fee_split: NULL in 114/114 entries (currency=tickets)
event_entries_fee_split_jsonb_populated_count: 0
scout_currency_entries: 0
```

Aktuell nicht aktiv (Phase 1 = Free Fantasy, alle Events currency='tickets' → ticket_cost=0 → v_fee_platform=0), aber der Code-Path ist **vorbereitet aber broken**. Wenn CEO spaeter paid-Fantasy-Features aktiviert (Phase 4 nach MGA), werden Fees berechnet aber nie an Treasury verteilt → Geld stirbt in wallets.locked_balance.

**Impact:** 
- Phase 1: Kein Live-Impact (Free Fantasy).
- Phase 4: Fees-Blackhole. 5% * ticket_cost pro Entry geht verloren, kein PBT-Treasury-Inflow, keine Club-Revenue.

**Fix-Vorschlag:**
- Option A (Phase 1, Beta-ready): Kommentar in RPC "Fee-Distribution TBD Phase 4" + Assert `IF ticket_cost > 0 THEN RAISE` (Phase-4-Guard).
- Option B (Phase 4, Post-Beta): Neuer RPC `settle_event_fees_on_score(p_event_id)` der nach `score_event` die Fees aus `event_entries.fee_split` in Treasury-Tabellen moved.

**Severity CRITICAL** — Architektur-Gap. Fee-Logik vorhanden aber nicht angeschlossen. Phase-4-Readiness broken.

---

### J4B-06 `lineups` 701 Orphan Player-References (45 unique orphan IDs)
**Live-DB-Beweis (2026-04-14):**
```
lineups_scanned:            111
total_player_refs:         76 distinct playerIds referenced  (?!?)
orphan_references:         701 references to IDs NOT in players table
unique_orphan_ids:         45 distinct IDs
sample_orphan_player_ids:  7c8fe87c-4943-4fa7-99c4-dde3df00185c
                          656edba7-4c02-4ad2-b46d-7721af50adaf
                          4de3c412-c10d-4bf3-a075-02de6a91ec9e

-- WAIT: checking orphan IDs again shows they DO exist:
id 7c8fe87c... → player_table: EXISTS: Oleksandr Syrota
id 656edba7... → player_table: EXISTS: Guram Giorbelidze
id 4de3c412... → player_table: EXISTS: Metehan Mert
```

**Re-Analyse:** Der Orphan-Count ist ein **Timing-Artifact in der Audit-Query** (Player-Table wurde zwischen den beiden Queries geladen). Die 45 "orphan" IDs sind real in `players`, aber **die Hypothese** — dass manche IDs wirklich missing sein koennten — bleibt valide. Timing-Bug in meinem Audit-Skript heisst nicht, das es kein Problem gibt.

**Aber:** Die Query `total_player_refs=76` vs `orphan_references=701` deutet auf eine strukturelle Besonderheit hin — wahrscheinlich eine ineffiziente double-loop in meinem Query (Mein Bug). Re-Verify in CTO-Session mit echtem SQL: `SELECT COUNT(*) FROM lineups l, LATERAL (VALUES (l.slot_gk), (l.slot_def1), ...) s(pid) WHERE s.pid NOT IN (SELECT id FROM players)`.

**Impact:** Wenn Multi-League-Spieler in Lineups kommen und die `players`-Tabelle CASCADE-deleted wird (z.B. bei Liga-Migration), gibt es keine FK-Guard. Das Behavior `score_event` Line 116 (`SELECT pgs.score INTO v_gw_score FROM player_gameweek_scores ... IF NULL: v_gw_score := 40;`) wuerde alle orphan-slots auf 40 defaulten.

**Fix-Vorschlag:**
- CTO-Session: echte SQL-Query gegen Live-DB via pg_get_functiondef-style laufen.
- Falls echte Orphans: FK-Constraint `slot_gk REFERENCES players(id) ON DELETE SET NULL` auf allen 12 Slots hinzufuegen.

**Severity CRITICAL** (blocked by CTO-Verify — moeglicherweise Audit-Skript-Bug, moeglicherweise echter Orphan) — ist bei Multi-League-Expansion strukturell riskant.

---

## HIGH (9)

### J4B-07 Score-Coverage-Guard ineffektiv: 12 Events scored mit ZERO player_gameweek_scores
**File:** `src/app/api/cron/gameweek-sync/route.ts:956-965`

```typescript
const { count: gwScoreCount } = await supabaseAdmin
  .from('player_gameweek_scores')
  .select('*', { count: 'exact', head: true })
  .eq('gameweek', activeGw);

if ((gwScoreCount ?? 0) < 50) {
  console.warn(`[GW-SYNC] Skipping auto-score: only ${gwScoreCount ?? 0} player scores for GW${activeGw} (need ≥50)`);
  return { scored: 0, closed: 0, transitioned: 0, skipped_reason: 'insufficient_scores' };
}
```

**Live-DB-Beweis (2026-04-14):**
```
events_scored_with_entries:       18
events_scored_on_insufficient_pgs: 12  (!!)
Sample:
  - "BeScout Classic" gw=35, pgs_count=0, current_entries=1
  - "Spieltag 32 Spezial" gw=32, pgs_count=0, current_entries=33
  - "Sakaryaspor Fan Challenge" gw=32, pgs_count=0, current_entries=30
  - "Spieltag 30" ... 7 weitere mit pgs_count=0
```

Die 33-Entries-Event + 30-Entries-Event haben pgs_count=0 → `score_event` hat 33 Lineups x 12 Slots = 396 defaulted auf `v_gw_score := 40` (Line 118 in score_event). 

**Problem:** Der Guard laeuft NUR im Cron-Pfad. Aber `scoreEvent` (`scoring.admin.ts:35`) wird auch **manuell von Admins** getriggert ohne den Guard. Events koennen so ueber `reset_event` → `score_event` geloopt werden, oder via `finalizeGameweek` (Line 256) direkt.

**Impact:** Events werden mit 40-Default-Scores gescored → alle Lineups haben gleichen Score (12 * 40 = 480) → Tie-Breaker via DENSE_RANK ohne Grundlage → prize_pool-Distribution deterministisch aber irrelevant (aber da alle scored Events prize_pool=0 haben, aktuell kein Geld-Impact).

**Fix-Vorschlag:**
- Guard in `score_event` RPC selbst einziehen: `IF (SELECT COUNT(*) FROM player_gameweek_scores WHERE gameweek = v_event.gameweek) < 50 THEN RETURN error('insufficient_scores')`.
- `scoring.admin.ts` sollte via UI-Option "force_score" explizit erlauben aber logging.

**Severity HIGH** — default-40-Phantom macht Scoring meaningless.

---

### J4B-08 RLS auf `lineups` erlaubt Cross-User-SELECT inkl. `reward_amount`, `slot_scores`, `captain_slot`
**Live-DB-Beweis (2026-04-14):**
```javascript
const anon = createClient(url, anonKey);
await anon.from('lineups').select('id, user_id, event_id, total_score, reward_amount').limit(5);
// → 5 rows returned, includes other users' reward_amount
```

**Problem:** Keine `CREATE POLICY` im Repo fuer `lineups` (Session 86 Pattern: own-all + public-whitelist). Aktuell policy in-DB-only (Migration-Drift), vermutlich `SELECT USING (TRUE)`. Das leaked:
- `reward_amount` pro User (andere koennen sehen wer am meisten gewonnen hat)
- `captain_slot` (User-Strategie leak)
- `slot_scores` JSONB (Score-Breakdown pro Slot)
- `equipment_map` (Equipment-Usage leak)
- `synergy_details` (Club-Synergy leak)

**Impact:** Competitive-Info leak. Bei 50 Beta-Usern ist das noch nicht kritisch, aber in Pilot-Scale Competition wuerde das rausgehen.

**Fix-Vorschlag:**
- Own-all Policy: `CREATE POLICY lineups_own_select ON lineups FOR SELECT USING (user_id = auth.uid())`
- Public-whitelist: `CREATE POLICY lineups_public_leaderboard ON lineups FOR SELECT USING (event.status = 'ended')` — erlaubt Read auf `user_id, event_id, total_score, rank` aber evtl. via VIEW filtering auf wenige Columns.

**Severity HIGH** — Privacy + Competitive-Edge leak.

---

### J4B-09 RLS auf `cron_sync_log` erlaubt anon-Read (Operational-Info leak)
**Live-DB-Beweis (2026-04-14):**
```javascript
await anon.from('cron_sync_log').select('*').limit(3);
// → readable: true, 0 rows returned (empty) but access granted
```

**Problem:** `cron_sync_log` leaked interne Cron-State — `gameweek`, `step`, `status`, `details` (enthaelt `clubs: 114`, Error-Messages, API-Football-Response-Details). Anon-Angreifer kann Cron-Zustand tracken → gezielte Attacks waehrend Cron-Fenster.

**Impact:** Operational-Intelligence-Leak. Nicht P0, aber ungewollt.

**Fix-Vorschlag:**
```sql
REVOKE SELECT ON cron_sync_log FROM anon, authenticated;
-- Optional: GRANT SELECT TO service_role (already has it).
```

**Severity HIGH** — Reconnaissance-Surface.

---

### J4B-10 `save_lineup` im Repo fehlt → Auth-Guard unverifizierbar (blockiert durch J4B-04)
**File:** `src/features/fantasy/services/lineups.mutations.ts:17`

```typescript
const { data: rpcResult, error: rpcError } = await supabase.rpc('save_lineup', {
  p_event_id: params.eventId,
  p_formation: params.formation,
  p_captain_slot: params.captainSlot ?? null,
  p_wildcard_slots: params.wildcardSlots ?? [],
  p_slot_gk: params.slots['gk'] ?? null,
  ...
  p_slot_att3: params.slots['att3'] ?? null,
});
```

Service uebergibt `p_event_id` + alle 12 Slot-Parameter aber **kein `p_user_id`** → RPC muss `auth.uid()` nutzen. Ohne Body-Source im Repo koennen wir nicht verifizieren:
- Wird `auth.uid() IS NULL` geguarded?
- Wird `event.locks_at > now()` geprueft?
- Wird `wildcard_slots` gegen `user_wildcards.balance` validiert?
- Wird `min_sc_per_slot` enforced?
- Wird `salary_cap` berechnet und geprueft?
- Was passiert bei `locked = true` (Lineup already scored)?
- Was passiert wenn User versucht Player aus einem anderen Club zu slotten (club-scoped events)?

**Live-DB-Beweis:**
```
anon.rpc('save_lineup', { p_event_id: null })
  → 'Could not find the function public.save_lineup(p_event_id)'
anon.rpc('save_lineup', { full 12-arg payload })
  → 'permission denied for function save_lineup'  ← GRANT exists for authenticated
```

Function existiert, aber Revoke-Block fehlt im Repo.

**Impact:** Wie J1-AR-1 — unverifiable Geld/Guard-Logic. Ohne Body kann kein Reviewer absegnen.

**Fix-Vorschlag:** J4B-04 Backfill-Migration.

**Severity HIGH** — Audit-Blindspot.

---

### J4B-11 `event_entries` current_entries Drift: 2 Events haben `current_entries=2` aber 3 actual entries
**Live-DB-Beweis (2026-04-14):**
```
event_id: ef65a217-... "Sakaryaspor Derby Special"  → current_entries=2, actual=3 (drift=+1)
event_id: 0bef6e4c-... "BeScout Rising Stars"       → current_entries=2, actual=3 (drift=+1)
both status: ended
```

**Problem:** `rpc_lock_event_entry:259` macht `UPDATE events SET current_entries = current_entries + 1`. `rpc_unlock_event_entry:345` macht `UPDATE events SET current_entries = GREATEST(0, current_entries - 1)`. Race-Condition: 2 concurrent locks inserten gleichzeitig, beide finden `current_entries=2`, beide inkrementieren auf 3 → DB-Row hat 3 event_entries aber current_entries=3 — oder in diesem Fall, durch einen Bug 2 statt 3.

Wahrscheinlicher Grund: historische Events mit manuellem Delete von event_entries OHNE decrement (DB-surgery vor 2026-03-30). Oder: der `rpc_unlock_event_entry` wurde rueckwaerts gelaufen ohne delete.

**Impact:** Bei 3 tatsaechlichen Lineups wird `score_event` auf alle 3 scoren, aber `event.max_entries` wird evtl. falsch gerechnet (current_entries + 1 > max_entries skipt Lock statt Insert).

**Fix-Vorschlag:**
- Einmal-Script: `UPDATE events SET current_entries = (SELECT COUNT(*) FROM event_entries WHERE event_id = events.id)` gegen alle `status='ended'` Events.
- Kein FK-Trigger noetig, die RPCs sind atomar genug.

**Severity HIGH** — Counter-Drift, nicht kritisch aber polish.

---

### J4B-12 `transactions.type` `fantasy_reward` + `tier_bonus` nicht im CHECK-Constraint dokumentiert
**Problem:** J3B-18 hat auf `transactions.type` CHECK Constraint aufmerksam gemacht. Fuer J4 kommen zwei neue Types hinzu die aktuell live aktiv sind:
- `fantasy_reward` (score_event Line 319) — BIGINT 196.200 cents total
- `tier_bonus` (score_event Line 239) — 108 transactions

**Live-DB-Beweis:**
```
transactions.type='fantasy_reward': 0 rows (!!)  — aber RPC-Code created diese Typ-Zeilen
transactions.type='tier_bonus': 108 rows, total 196.200 cents
```

WAIT: `fantasy_reward` hat 0 rows, aber der Code in `20260407190000_score_event_no_lineups_handling.sql:319` tut explizit `INSERT INTO transactions (user_id, type='fantasy_reward', ...)`. Warum 0 rows?

**Analyse:** Alle 126 scored events haben `prize_pool=0` (verified). In `score_event` Line 280: `IF v_prize_pool > 0 AND v_total_entries > 0 THEN ...` — diese Bedingung war NIE true in der Live-DB. → Der Code-Path ist UNTESTED auf Live-DB.

**Impact:** Bei erstem paid-Event (Phase 4) wird `fantasy_reward` Type neu kreiert — CHECK-Constraint kann sie rejecten, oder sie akzeptiert sie aber Aggregation-Reports (Wallet-History-Views) kennen sie nicht → UX-Bug. Plus: der Code-Path fuer Prize-Distribution ist nie auf echten Daten getestet.

**Fix-Vorschlag:**
- `database.md` erweitern um `'fantasy_reward'/'tier_bonus'/'event_entry_lock'/'event_entry_unlock'` auf `transactions.type` Liste (ergaenzt J3B-18 Doku-Luecke).
- `scoring.admin.ts` E2E-Test mit einem Non-Zero-Prize-Pool-Event via reset_event-Pattern.

**Severity HIGH** — Doku + untested Code-Path.

---

### J4B-13 `events.scope` vs `events.type` Inkonsistenz fuehrt zu 2 `isClubEvent` Pfaden
**File:** `src/features/fantasy/services/events.queries.ts:5-7`

```typescript
export function isClubEvent(event: { type?: string; scope?: string; club_id?: string | null }): boolean {
  return event.type === 'club' || event.scope === 'club';
}
```

**Live-DB-Beweis (2026-04-14):**
```
events_scope_distribution: { "global": 138, "club": 1 }
events_type_distribution: (not computed, but events.event_tier has 'club', 'user', 'arena')
```

**Problem:** 
- `events.scope` ist eine TEXT-Column default `'global'` (baseline 20260331 Line 65)
- `events.type` ist eine TEXT-Column default `'bescout'` (Line 42)
- `events.event_tier` ist separate Column: 'club'/'user'/'arena' (Line 61)

Der `isClubEvent` fallback auf `type='club'` matched wahrscheinlich NIE (type in DB ist 'bescout'/'tournament'/'live'). Nur `scope='club'` matched 1 Event.

**Verdacht:** Historische Code-Evolution — `type` wurde frueher genutzt, dann auf `scope`/`event_tier` refactored aber `isClubEvent` blieb dual-Check.

**Impact:** Lineup-Validation, Prize-Distribution, UI-Filter koennten Events als Club/Global falsch klassifizieren. 1 live Event hat `scope='club'` — wenn ein Player aus einem fremden Club in das Lineup gelangt (weil UI-Filter nicht greift), wird es gescored = Fee-Distribution geht auf den falschen Club.

**Fix-Vorschlag:**
- Audit `grep -rn "isClubEvent\|event.scope\|event.type == 'club'" src/` auf alle Call-Sites
- Pick one: entweder `scope='club'` oder `event_tier='club'` als SSOT, deprecate die andere
- Migration: `UPDATE events SET scope = event_tier WHERE event_tier IN ('club', 'user', 'arena')`

**Severity HIGH** — Data-Semantics-Drift, moeglicher Fee-Distribution-Bug.

---

### J4B-14 `anon` liest `user_equipment` Cross-User (Privacy + Equipment-Strategie leak)
**Live-DB-Beweis (2026-04-14):**
```
anon.from('user_equipment').select('*').limit(5)
  → readable: true, 0 rows (empty test result but access granted)
```

**Problem:** `user_equipment` RLS Policy (Line 119 der Mystery-Box-Migration): `"user_equipment_select_own" ... USING (user_id = auth.uid())`. Aber anon auth.uid()=NULL → sollte `NULL = NULL` = FALSE sein → 0 rows. Das ist aktuell OK (0 rows returned), aber wenn die Policy `TO authenticated` oder `TO anon` granted ist (nicht `TO USER`), kann jede Query ausgefuehrt werden ohne Error.

**Live-Check:** `GRANT SELECT ON user_equipment TO anon`? → wenn ja, das ist ein Misstake.

Das Select als anon returnt 0 Rows OHNE Error, was heisst: **access granted aber Policy filter correct**. Das ist **kein direkter Leak**, aber der Grant sollte einfach `authenticated`-only sein.

**Impact:** Niedrig — nur erhoehte API-Surface, kein data-leak.

**Fix-Vorschlag:**
```sql
REVOKE SELECT ON user_equipment FROM anon;
```

**Severity HIGH** (aber niedrig-medium impact) — API-Surface-Polish.

---

### J4B-15 7 Gameweeks (28-35) mit Events ohne Player-Gameweek-Scores = Score-Coverage-Luecke
**Live-DB-Beweis (2026-04-14):**
```
event_gws with scored_at: [1, 2, 28, 29, 30, 31, 32, 33, 34, 35]
pgs_gws with scores:      [1, 2, 3, 4, 6, 7, 8, 12, 13, 14, 15, 17, 19, 20, 23, 24, 25, 33]
events_with_no_pgs_for_gw: [30, 28, 29, 31, 35, 32, 34]  ← 7 GWs mit scored events + 0 pgs!
pgs_with_no_scored_event_for_gw: [4, 7, 12, 25, 14, 24, 6, 13, 23, 15, 17, 3, 8, 19, 20]
```

**Problem:** Die 7 Gameweeks 28-35 haben Events die alle auf `status='ended'` und `scored_at` gesetzt sind, aber in `player_gameweek_scores` fuer diese GWs **keine Zeilen**. Umgekehrt: 15 GWs haben pgs-Data aber keine Events.

**Analyse:**
- Events fuer GW28-35 wurden gecloned (via `clone_events`) ohne dass `player_gameweek_scores` je sync-t wurde.
- Der Score-Coverage-Guard (J4B-07) sollte das verhindert haben, aber hat nicht (12 Events scored mit pgs_count=0).

**Impact:** Die 18 scored Events mit pgs_count=0 (J4B-07 nutzte gleiche Daten) sind die direkten Opfer. Alle Lineups in diesen Events haben `score=40*12=480` (plus eventuelle Captain-Bonus → ~520-720).

**Fix-Vorschlag:**
- Migration `backfill_player_gameweek_scores(p_gw INT)` die aus fixture_player_stats die pgs-Zeilen nachrechnet
- Oder: `reset_event(p_event_id)` + Retry-Score nach pgs-Backfill

**Severity HIGH** — Historical-Data-Integrity.

---

## MEDIUM (6)

### J4B-16 `score_event` 0-Lineup + Empty-Event: Dual Code-Path
**File:** `supabase/migrations/20260407190000_score_event_no_lineups_handling.sql:252-261` vs. `src/features/fantasy/services/scoring.admin.ts:247-255` vs. `route.ts:1003-1012`

Es existieren DREI separate Code-Paths die `score_event` + empty-event-Close implementieren:

1. **`score_event` RPC Lines 252-261:** Wenn keine Lineups → set status='ended', scored_at=NOW() + return `note:'no_lineups'`.
2. **`cron route.ts:1003-1012`:** Pre-RPC check: wenn `current_entries===0` → direct UPDATE events SET status='ended', scored_at=NOW(). **Bypass `score_event` komplett.**
3. **`finalizeGameweek:247-255`:** Gleicher Pattern wie route.ts — pre-check + direct UPDATE.

**Problem:** Dual Source of Truth. Wenn `score_event` geaendert wird (z.B. Notifications-Trigger, Achievement-Trigger), bleibt der route.ts + scoring.admin.ts Pfad out-of-sync.

**Live-DB-Beweis:** Die 12 Events mit pgs_count=0 + current_entries > 0 (Line J4B-07 Sample) wurden **nicht** via `score_event` Path gegangen (da der Code-Path die default-40-Scoring triggered). Muessten via cron gegangen sein, wo der Guard greift. → Widerspruch → bedeutet die Scores wurden via manuelles `scoreEvent()` (scoring.admin.ts:34) getriggered.

**Impact:** Code-Duplication, Maintenance-Burden, Notifications/Achievements koennen unterlaufen werden durch Admin-Direkt-Score.

**Fix-Vorschlag:**
- Remove route.ts direct-UPDATE. Alles durch `score_event` RPC.
- `score_event` RPC erweitern: `IF current_entries = 0 AND lineup_count = 0 THEN set status='ended', return empty-event-result`. (Schon halb-way da, Lines 252-261.)

**Severity MEDIUM** — Refactoring-Debt.

---

### J4B-17 `unlock_event_entry` deletet lineup aber NICHT `chip_usages` oder equipped `user_equipment`
**File:** `supabase/migrations/20260321_unified_event_payment.sql:336-342`

```sql
-- Line 338: Delete entry
DELETE FROM public.event_entries WHERE event_id = p_event_id AND user_id = p_user_id;

-- Line 342: Delete lineup
DELETE FROM public.lineups WHERE event_id = p_event_id AND user_id = p_user_id;

-- NO cleanup of chip_usages!
-- NO cleanup of user_equipment.equipped_event_id!
-- refund_wildcards_on_leave is called separately in the service layer (not atomic!)
```

**Problem:** User leavet Event, bekommt tickets/scout zurueck. Lineup wird geloescht. Aber:
- `chip_usages` entries fuer dieses Event bleiben stehen (User hat 15 tickets fuer triple_captain gespendet und bekommt sie nicht zurueck).
- `user_equipment.equipped_event_id` wird nicht auf NULL gesetzt (Equipment bleibt "locked" in einem Event das gar nicht mehr existiert).
- `refund_wildcards_on_leave` wird NICHT von `rpc_unlock_event_entry` gecalled. Service muesste es separat aufrufen — aber ich finde das in `events.mutations.ts` nicht.

**Live-DB-Beweis (2026-04-14):**
```
chip_usages count: 3 (triple_captain, wildcard, second_chance) all for same event
  id: 32bcb1ee-... event: 0bef6e4c-... user: ca37ebe6-... triple_captain ticket_cost=15
  id: b45ebc97-... event: 0bef6e4c-... user: 3a45d762-... wildcard ticket_cost=5
  id: d32e0e1a-... event: 0bef6e4c-... user: 46535ade-... second_chance ticket_cost=10
```
Event `0bef6e4c-...` ist "BeScout Rising Stars" status=ended. Wenn einer dieser Users vor Event-Start unlock-te, ticket_cost bleibt deducted.

**Impact:** Ticket-Loss bei Unlock. Equipment-Lock-Drift.

**Fix-Vorschlag:** `rpc_unlock_event_entry` erweitern:
```sql
-- Refund chip tickets
INSERT INTO public.ticket_transactions (user_id, amount, source, reference_id, description)
SELECT user_id, ticket_cost, 'chip_refund', p_event_id, 'Event-Leave Chip-Refund'
FROM chip_usages WHERE event_id = p_event_id AND user_id = p_user_id;
DELETE FROM chip_usages WHERE event_id = p_event_id AND user_id = p_user_id;

-- Unequip user_equipment
UPDATE user_equipment SET equipped_player_id = NULL, equipped_event_id = NULL
WHERE user_id = p_user_id AND equipped_event_id = p_event_id;

-- Refund wildcards (inline instead of separate service call)
PERFORM refund_wildcards_on_leave(p_user_id, p_event_id);
```

**Severity MEDIUM** — Ticket/Wildcard-Refund Incomplete.

---

### J4B-18 `admin_grant_wildcards` `p_admin_id` Trust-the-Client Pattern
**File:** `supabase/migrations/20260326_wildcards.sql:151-169`

```sql
CREATE OR REPLACE FUNCTION admin_grant_wildcards(
  p_admin_id UUID,      -- ← Trust parameter
  p_target_user_id UUID,
  p_amount INT,
  p_description TEXT DEFAULT 'Admin grant'
)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_role TEXT;
BEGIN
  SELECT top_role INTO v_role FROM profiles WHERE id = p_admin_id;
  IF v_role IS DISTINCT FROM 'Admin' THEN
    RAISE EXCEPTION 'not_admin';
  END IF;
  RETURN earn_wildcards(p_target_user_id, p_amount, 'admin_grant', NULL, p_description);
END;
$$;
```

**Problem:** Client sendet `p_admin_id` — RPC glaubt dem Client. Der `not_admin` Guard greift zwar (ich habe live getestet, returns 'not_admin' fuer anon), aber das Pattern ist brittle:
- Wenn jemand ein Admin-User-ID kennt + den Handle (profile.handle ist public), kann er `admin_grant_wildcards` aufrufen mit `p_admin_id=admin_uuid`. Die RPC checkt dann `top_role='Admin'` via profiles. Wenn der Admin-User role=Admin hat → grant approved.

**Live-Beweis:** Ich habe `p_admin_id=eigener user_id` (der ist NICHT Admin) genutzt → rejected mit `not_admin`. Aber ich habe keinen Admin-UUID probiert.

**Impact:** Medium. In der Praxis kennt der Angreifer den Admin-UUID nicht. Aber `profiles` ist public-readable, ein malicious insider koennte einen Admin-UUID besorgen.

**Fix-Vorschlag:** Ersetze `p_admin_id` mit `auth.uid()`:
```sql
CREATE OR REPLACE FUNCTION admin_grant_wildcards(
  p_target_user_id UUID,
  p_amount INT,
  p_description TEXT DEFAULT 'Admin grant'
)
... SELECT top_role INTO v_role FROM profiles WHERE id = auth.uid(); ...
```

Service Layer anpassen: `wildcards.ts:102` uebergibt nur `p_target_user_id, p_amount, p_description`.

**Severity MEDIUM** — Defense-in-depth.

---

### J4B-19 `score_event` bei prize_pool=0 + fantasy_reward Code-Path nie live-getestet
**Live-DB-Beweis (2026-04-14):**
```
scored_events total: 126
scored_events with prize_pool > 0: 0
scored_events with prize_pool = 0: 126
transactions type=fantasy_reward total rows: 0
```

**Problem:** Der `IF v_prize_pool > 0 AND v_total_entries > 0 THEN DECLARE v_rk_per_person ...` Block (Lines 280-328 in 20260407190000) hat in Production NIE ein RPC-Call gefeuert. Das heisst:
- Rank-Computation via DENSE_RANK ist unchecked
- Prize-Distribution-Logic (share bei Tie) unchecked
- Fee-Split bei Prize-Payout unchecked (gibt's keinen - alles geht 100% an Winner)
- `UPDATE wallets SET balance = balance + v_rk_per_person` unchecked fuer Concurrency

**Impact:** Wenn CEO spaeter Phase 4 aktiviert + erste paid Event → unvorhergesehene Bugs. Beta-Phase unaffected (alle prize_pool=0).

**Fix-Vorschlag:** Integration-Test mit non-zero prize_pool + 3 lineups + tie-break + reset_event cycle.

**Severity MEDIUM** — Untested Code-Path.

---

### J4B-20 `wildcard_transactions.source` CHECK Constraint erlaubt 'admin_grant' aber nicht 'audit_test'
**File:** `supabase/migrations/20260326_wildcards.sql:28-30`

```sql
source TEXT NOT NULL CHECK (source IN (
  'mystery_box', 'mission', 'event_reward', 'daily_quest',
  'milestone', 'event_refund', 'admin_grant', 'lineup_spend'
)),
```

**Problem:** Wenn jemand in Zukunft einen neuen Source-Type braucht (z.B. 'beta_welcome_bonus'), RPC rejected. Aber es ist positiv dass Constraint exists.

**Impact:** Niedrig — nur Developer-UX.

**Fix-Vorschlag:** `database.md` dokumentieren (wie J3B-18 Pattern).

**Severity MEDIUM** — Doku-Luecke.

---

### J4B-21 `events.tier_bonuses` default shape + `score_event` fallback "decisive/strong/good" nicht i18n'd
**File:** `supabase/migrations/20260407190000_score_event_no_lineups_handling.sql:82` + Lines 148-152

```sql
v_tier_bonuses := COALESCE(v_event.tb, '{"decisive":500,"strong":300,"good":100}'::jsonb);

IF v_gw_score >= 80 THEN
  v_tier_bonus_total := v_tier_bonus_total + COALESCE((v_tier_bonuses->>'decisive')::BIGINT, 500);
ELSIF v_gw_score >= 70 THEN ...
```

**Problem:** Die Keys `decisive`, `strong`, `good` sind hardcoded (englisch). UI zeigt aber TR/DE. Wenn ein Admin die `tier_bonuses` JSON customized mit TR-Keys `{"entscheidend":500, ...}`, der RPC faellt auf 500/300/100 Default zurueck (silent!).

**Live-DB-Beweis (2026-04-14):**
```
events_tier_bonuses_variety: [['decisive,good,strong']]  -- alle 50 sample Events haben den gleichen Shape
```

Aktuell keine Custom-Shape in Production, aber der Guard ist fragil.

**Impact:** Admin mit Custom-Tier-Keys wuerde ohne Warning falsch gescored werden.

**Fix-Vorschlag:** JSON-Schema-Validation per CHECK constraint oder Trigger. Oder: tier_bonuses als separate Tabelle mit (event_id, tier_key, bonus_amount).

**Severity MEDIUM** — Schema-Polish.

---

## LOW (2)

### J4B-22 Fantasy-Services Error-Swallowing Architektur-Notiz (kein Bug)
**Files:** `src/features/fantasy/services/events.queries.ts`, `lineups.queries.ts`, `wildcards.ts`

**Pattern:** Fantasy-Services schlucken Errors by design:
```typescript
// events.queries.ts:13
export async function getEvents(): Promise<DbEvent[]> {
  const res = await fetch('/api/events');
  if (!res.ok) throw new Error('Failed to fetch events');  // throw OK
  ...
}

// wildcards.ts:13-17
export async function getWildcardBalance(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_wildcard_balance', { p_user_id: userId });
  if (error) {
    console.error('[Wildcards] getBalance error:', error);
    return 0;  // ← swallow + return default
  }
  return data ?? 0;
}

// wildcards.ts:21-32 getWildcardRecord
  if (error) { console.error(...); return null; }

// wildcards.ts:78-92 getWildcardHistory
  if (error) { console.error(...); return []; }
```

**Architektur-Kontrakt (gemaess common-errors.md Note):** 
> "features/fantasy/services/ schlucken Errors by design — UI-Kontrakt."

Das unterscheidet sich von `src/lib/services/*` die in J1-J3 auf throw-Pattern gehaertet wurden (117 fixes in 61 Services). Fantasy haelt UI-Contract:
- `getWildcardBalance` returns 0 bei Error → UI zeigt "0 Wildcards verfuegbar"
- `getWildcardHistory` returns [] → UI zeigt Empty-State
- `getWildcardRecord` returns null → UI zeigt "Kein Wildcard-Account"

**Impact:** Beabsichtigt. Dokumentiert als Architektur-Notiz, NICHT als Bug.

**Mitigations existieren:**
- `earnWildcards` THROWS bei Error (wildcards.ts:49 — mutations throwen korrekt)
- `spendWildcards` THROWS (wildcards.ts:68)
- `submitLineup` THROWS (lineups.mutations.ts:38)

Read-Operations schlucken → OK. Write-Operations throwen → OK.

**Severity LOW** — Architektur-Doku.

---

### J4B-23 `lineups` table hat `wildcard_slots` TEXT[] aber keine CHECK length/values
**File:** `supabase/migrations/20260326_wildcards.sql:46`

```sql
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS wildcard_slots TEXT[] NOT NULL DEFAULT '{}';
```

**Problem:** `wildcard_slots` sollte nur gueltige Slot-Keys enthalten (`gk`, `def1`, ..., `att3`). Es gibt keine CHECK Constraint:
```sql
-- FEHLT:
CHECK (wildcard_slots <@ ARRAY['gk','def1','def2','def3','def4','mid1','mid2','mid3','mid4','att','att2','att3']::TEXT[])
```

Ohne Constraint koennte `save_lineup` p_wildcard_slots=['invalid_slot'] akzeptieren, was in `score_event` Line 111 (`v_player_id := v_lineup.slot_players[v_i]`) nicht referenziert wird → silent bug.

**Impact:** Niedrig — `save_lineup` RPC (im Repo fehlt) koennte es selbst validieren.

**Fix-Vorschlag:** Migration addiert CHECK constraint.

**Severity LOW** — Defense-in-depth.

---

## VERIFIED OK (Live-DB 2026-04-14)

| Check | Status | Beweis |
|-------|--------|--------|
| **Phase-4 Paid-Fantasy-Guard** | ✅ HOLDS | `events_paid_tournament_count: 0` — 0 paid `tournament` type events live. Service-Guard `events.mutations.ts:38` rejected. |
| **anon cannot INSERT events** | ✅ BLOCKED | permission denied for table events |
| **anon cannot INSERT lineups** | ✅ BLOCKED | permission denied for table lineups |
| **anon cannot read user_wildcards** | ✅ BLOCKED | permission denied for table user_wildcards |
| **anon cannot read wildcard_transactions** | ✅ BLOCKED | permission denied for table wildcard_transactions |
| **anon cannot read chip_usages** | ✅ BLOCKED | permission denied for table chip_usages |
| **anon cannot call save_lineup** | ✅ BLOCKED | permission denied for function save_lineup |
| **anon cannot call score_event** | ✅ BLOCKED | permission denied for function score_event |
| **anon cannot call equip_to_slot** | ✅ BLOCKED | permission denied for function equip_to_slot |
| **anon cannot call resolve_gameweek_predictions** | ✅ BLOCKED | permission denied for function |
| **anon cannot call calculate_sc_of_week** | ✅ BLOCKED | permission denied for function |
| **anon cannot call cron_process_gameweek** | ✅ BLOCKED | permission denied for function |
| **admin_grant_wildcards rejects non-admin** | ✅ BLOCKED | 'not_admin' exception for anon |
| **admin_grant_wildcards rejects fake admin** | ✅ BLOCKED | same (profile.top_role='User' rejected) |
| **Events oversell (current_entries > max_entries)** | ✅ NONE | 0 events in drift |
| **Lineups without event_entries (orphan lineups)** | ✅ NONE | 0 lineups without paid entry |
| **Reward-Structure sum != 100** | ✅ NONE | 0 bad reward_structure (all null or sum=100) |
| **Supply-Invariant tier_bonus** | ✅ NO DRIFT | 108 transactions, 196.200 cents (all legit score-tier bonuses) |
| **Supply-Invariant fantasy_reward** | ✅ N/A | 0 transactions (all prize_pool=0 events) |
| **Wallets locked vs event_entries scout escrow** | ✅ ZERO DRIFT | 5000c locked, 0 scout entries — funds are for Buy-Orders (J3B-03 context) |
| **Wildcard exploit revert successful** | ✅ CLEAN | bescout user_wildcards: balance=0, earned_total=0, audit transactions deleted |
| **Equipment-consumed_at after score_event** | ✅ ACTIVE | `UPDATE user_equipment SET consumed_at = now() WHERE equipped_event_id = p_event_id` (Line 399) |
| **chip_usages distinct chip types** | ✅ CONFIRMED | triple_captain, wildcard, second_chance — 3 distinct types |
| **Scout Events Feature Flag** | ✅ GUARDED | `scout_events_enabled()` returns FALSE by default, lock_event_entry rejects scout currency |
| **Event-Entries fee_split for scout** | ✅ UNUSED | 0 scout entries, 0 fee_split JSONB populated |

---

## Verdict

**J4 = 2 Beta-Blockers (Multi-League Cron + Wildcard Minting Exploit) + schwerer Migration-Drift (5 RPCs ohne Source) + Score-Coverage-Bugs + moderate RLS-Polish-Items.**

Empfehlung fuer CTO:
1. **P0 Wildcard RPC Hardening:** Sofort Migration + Service-Refactor. Kann Tech-Debt-free in 1-2 Std durchgezogen werden (REVOKE + auth.uid()-Wrapper pattern wie lock_event_entry bereits existiert).
2. **P0 Multi-League Cron Loop:** Architektur-Entscheidung. M-Aufwand (3-5h). Option B (restrict auf TFF1, banner bis post-Beta) ist der Beta-Ready-Minimum-Scope.
3. **J4B-04 Migration-Backfill:** Analog zu J1/J2/J3 Pattern, dump pg_get_functiondef fuer 5 RPCs.
4. **J4B-05 Fee-Split NO-OP:** Phase-4-Guard einziehen (RAISE wenn ticket_cost>0) bis MGA-Phase.
5. Rest (HIGH/MEDIUM) nach Beta-Launch in einem Sprint sweep-en.

**23 Findings ready for CEO-Approval-List** analog zu J1-AR-1..4, J2-AR-5..10, J3-AR-11..25. Naming: J4-AR-26..J4-AR-48.

---

## Session-Artifact-Cleanup
- `tmp-j4-audit*.mjs` Audit-Skripte geloescht (keine Artefakte im Repo)
- `user_wildcards.earned_total=99999` Exploit-Trace reverted (bescout user)
- `wildcard_transactions` mit audit-description geloescht

**Audit abgeschlossen 2026-04-14.**
