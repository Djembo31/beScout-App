# Impact 024 — B5 Event Scoring Automation

**Scope:** Neue pg_cron-Job + Wrapper-RPC. Kein Code-Change, kein Service-Change, kein UI-Change.

## DB-State (Live, 2026-04-17)

### Extensions
- `pg_cron 1.6.4` ✓ aktiv
- `pg_net 0.19.5` ✓ aktiv (fuer HTTP-Cron wie `gameweek-sync-trigger`)

### Existing Cron-Jobs
| jobname | schedule | command (zusammengefasst) |
|---------|----------|---------------------------|
| `daily-mastery-hold-days` | `0 3 * * *` | `SELECT increment_mastery_hold_days()` |
| `daily-analyst-decay` | `0 4 * * *` | `SELECT check_all_analyst_decay()` |
| `gameweek-sync-trigger` | `*/30 * * * *` | `pg_net` HTTP-GET → `/api/cron/gameweek-sync` (api-football data pull) |
| `event-status-sync` | `*/15 * * * *` | `upcoming/registering/late-reg → running (start)`; `running → ended (end)` — **aber KEIN scoring** |

### Event Status CHECK-Values
`'upcoming', 'registering', 'late-reg', 'running', 'scoring', 'ended'`.

**Wichtig:** Kein `'scored'` status. `'ended'` ist der Terminal-Zustand. Idempotency-Marker ist `scored_at TIMESTAMPTZ` (NULL = noch nicht gescored).

### Fixture Status CHECK-Values
`'scheduled', 'simulated', 'live', 'finished'`.

## Existing score_event RPC (aus `get_rpc_source`)

**IDEMPOTENT.** Bestehende Guards im Body:
1. `auth.uid() IS NOT NULL` → Admin-Permission-Check (bypass if service-role / cron → auth.uid()=NULL)
2. `IF v_event.scored_at IS NOT NULL → 'Event bereits ausgewertet'` (idempotency)
3. `IF v_event.gameweek IS NULL → 'Event hat keinen Gameweek'`
4. `IF COUNT(player_gameweek_scores WHERE gameweek=...) = 0 → 'no_player_game_stats'`

Finale-Aktion: `UPDATE events SET status='ended', scored_at=NOW() WHERE id=p_event_id`.

→ **score_event erfordert KEINE Aenderung** — idempotent + graceful wenn stats fehlen. B5-Cron kann naiv alle scorbaren events auswaehlen und score_event aufrufen; interne Guards lehnen Retries selbst ab.

## cron_process_gameweek (Referenz-Muster)

Existierende Cron-RPC: `pg_net.http_get('/api/cron/gameweek-sync')` triggered `cron_process_gameweek(p_gameweek, p_fixture_results, p_player_stats)` via Edge-API. Verarbeitet Fixtures + Player-Stats, written to `player_gameweek_scores` via UPSERT (idempotent).

→ Referenz: pg_net + service-role Pattern ist etabliert. Mein Cron wird **nicht pg_net** sondern **direkt SELECT wrapper-RPC** (kein HTTP-Roundtrip noetig, alles im DB-Layer).

## Neue Wrapper-RPC — `cron_score_pending_events()`

```sql
CREATE OR REPLACE FUNCTION public.cron_score_pending_events()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_event RECORD;
  v_result JSONB;
  v_scored INT := 0;
  v_skipped INT := 0;
  v_errored INT := 0;
  v_errors JSONB := '[]'::jsonb;
BEGIN
  FOR v_event IN
    SELECT id, name, ends_at, gameweek
    FROM events
    WHERE (status = 'ended' OR (status = 'running' AND ends_at <= NOW()))
      AND scored_at IS NULL
      AND gameweek IS NOT NULL
    ORDER BY ends_at ASC
    LIMIT 50  -- safety-bound
  LOOP
    BEGIN
      v_result := public.score_event(v_event.id);
      IF (v_result->>'success')::BOOLEAN = true THEN
        v_scored := v_scored + 1;
      ELSE
        v_skipped := v_skipped + 1;
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
          'event_id', v_event.id, 'name', v_event.name,
          'reason', v_result->>'error'
        ));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errored := v_errored + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'event_id', v_event.id, 'name', v_event.name,
        'reason', 'EXCEPTION: ' || SQLERRM
      ));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'scored', v_scored,
    'skipped', v_skipped,
    'errored', v_errored,
    'errors', v_errors,
    'ran_at', NOW()
  );
END;
$function$;
```

**Selektion:**
- `status='ended'` (schon per event-status-sync transitioniert) **ODER** `status='running' AND ends_at <= NOW()` (race mit 15-min event-status-sync)
- `scored_at IS NULL` (idempotent fuer already-scored events)
- `gameweek IS NOT NULL` (score_event braucht's)
- `ORDER BY ends_at ASC` — aeltestes zuerst
- `LIMIT 50` — safety-bound (normalerweise 0-3 events pro Lauf)

**Fail-Isolation:** `BEGIN...EXCEPTION WHEN OTHERS...END` pro event — ein Crash blockt nicht den Rest.

**score_event-Return-Type:** "success" key (boolean), nicht "ok" wie rpc_save_lineup. Konsistent mit bestehendem Pattern.

**Auth:** SECURITY DEFINER + cron laeuft als postgres → auth.uid() = NULL → passiert Admin-Check in score_event (nur active bei authenticated users).

## Cron-Schedule

```sql
SELECT cron.schedule(
  'score-pending-events',
  '*/5 * * * *',
  'SELECT public.cron_score_pending_events();'
);
```

Interaktion mit `event-status-sync` (15min):
- t=0: event.ends_at passiert
- t+0..5min: `cron_score_pending_events` laeuft erst → findet event status='running' + ends_at passed → score_event → status='ended', scored_at=NOW()
- t+0..15min: `event-status-sync` laeuft → kein Effekt weil status schon 'ended' (seiner UPDATE-Filter: status='running' → no match)
- Alternative: event-status-sync laeuft zuerst → status='ended' → score-pending-events findet es im naechsten 5-min-lauf

Keine Race-Condition: score_event intern idempotent via `scored_at IS NOT NULL` Branch.

## Wechselwirkungen & Side-Effects

### Wallet + Transactions
- `score_event` schreibt Rewards: `UPDATE wallets SET balance += tier_bonus + fantasy_reward` + `INSERT INTO transactions`. Cron triggert diese Rewards — **keine User-Authentication, keine Approval-Workflow**.
- CEO-Scope: Ja (Geld), aber approval schon erteilt (c pg_cron).

### Realtime
- `lineups`, `events`, `wallets`, `transactions` sind Realtime-Tabellen. Cron-Updates triggern broadcasts → User-Clients sehen Score + Reward live ohne Page-Reload.

### Fantasy/Leaderboard
- `player_gameweek_scores` muss gefuellt sein BEVOR cron_score_pending_events laeuft. Abhaengigkeit: `gameweek-sync-trigger` (30min Schedule) muss zuerst Player-Stats importiert haben.
- Worst-case delay: 30min sync + 5min score = 35min nach Event-Ende bis User Reward sieht. Akzeptabel fuer Pilot.

### RLS
- Cron-RPC ist SECURITY DEFINER → umgeht RLS (service-role / postgres kontext).
- Keine RLS-Aenderungen auf `events` / `lineups` / `wallets` / `transactions` noetig.

## Migration-Plan

1. **Migration 1 — Wrapper-RPC:**
   - `supabase/migrations/20260417130000_cron_score_pending_events.sql`
   - Contains: `CREATE OR REPLACE FUNCTION public.cron_score_pending_events()` + AR-44 REVOKE/GRANT
   - **AR-44:** `REVOKE ... FROM PUBLIC, anon; GRANT ... TO service_role;` (nicht authenticated — kein Client soll das direkt aufrufen)

2. **Migration 2 — Schedule Cron:**
   - `supabase/migrations/20260417140000_cron_schedule_score_pending.sql`
   - Contains: Conditional `cron.schedule(...)` nur wenn nicht bereits vorhanden (idempotent re-apply)

## Test-Strategie

### INV-28 — `src/lib/__tests__/db-invariants.test.ts`

```ts
it('INV-28: cron_score_pending_events exists and is scheduled (B5 Slice 024)', async () => {
  // 1. Wrapper-RPC-Body contains expected checks
  const { data: body } = await sb.rpc('get_rpc_source', { p_rpc_name: 'cron_score_pending_events' });
  expect(body).toBeTruthy();
  const s = String(body);
  expect(s).toContain('scored_at IS NULL');
  expect(s).toContain('score_event');
  expect(s).toContain('WHEN OTHERS'); // fail-isolation
  expect(s).toContain('LIMIT 50');

  // 2. Cron-Job is scheduled
  const { data: jobRow, error } = await sb.from('cron' as any).select('jobname, schedule, active');
  // (sb.from doesn't work for cron schema — use rpc helper instead)
});
```

Problem: `sb.from('cron.job')` geht nicht via PostgREST (cron-Schema nicht exposed). Loesung: Zweite Helper-RPC `get_cron_job(p_jobname text) RETURNS jsonb` oder direkter SQL via existing Helper.

**Pragmatisch:** `get_rpc_source` ist bereits service_role-only. Ich erweitere den INV-28-Test um einen Body-Scan + einen dedizierten `get_cron_job_schedule(p_jobname text)` Helper. Oder ich erstelle einen breiter nutzbaren `audit_admin_query(p_key text)` — aber scope-creep.

**Minimal:** Dritte Helper-RPC `get_cron_job_schedule(p_jobname text) RETURNS jsonb` mit SECURITY DEFINER + REVOKE/GRANT service_role. Gibt `jobname, schedule, command, active` zurueck.

### Test-File Additions
- **db-invariants.test.ts** INV-28: 2 Assertions — RPC-Body-Content + Cron-Job-Existenz.

## Proof-Plan (refined)

| Artefakt | Inhalt |
|----------|--------|
| `024-cron-before.txt` | `SELECT * FROM cron.job` listing vor apply (4 jobs) |
| `024-cron-after.txt` | Post-apply: 5 jobs inkl. `score-pending-events` |
| `024-rpc-body.txt` | `get_rpc_source('cron_score_pending_events')` |
| `024-dry-run.txt` | `SELECT cron_score_pending_events()` manuell — zeigt scored/skipped/errored counts |
| `024-tsc.txt` | clean |
| `024-tests.txt` | db-invariants 26/26 inkl. INV-28 |

## Rollback

```sql
-- Unschedule cron (safe)
SELECT cron.unschedule('score-pending-events');

-- Wrapper-RPC darf bleiben (keine Seiteneffekte ohne cron-call)
-- DROP FUNCTION public.cron_score_pending_events();  -- nur bei voller Entfernung
```

Keine Daten-Migration noetig → kein fwd/bwd issue.

## Open Items nach IMPACT

- **Keine blockierenden.** Alle Design-Fragen beantwortet.
- **Minor:** Zusaetzliches Helper-RPC `get_cron_job_schedule(text)` noetig fuer INV-28 (analog zu `get_rpc_source`). In BUILD.

## Ready fuer BUILD

Ja. 2 Migrations (Wrapper + Schedule) + 1 Helper-RPC + INV-28 + 6 Proof-Artefakte.
