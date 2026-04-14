---
paths:
  - "src/lib/services/**"
  - "src/lib/queries/**"
  - "src/app/api/**"
  - "src/types/**"
---

## Supabase Patterns
- NIE in Components → immer Service Layer (`lib/services/`)
- Explicit `.select()` mit FK-Join → TS inferred als Array → Cast noetig
- `.maybeSingle()` fuer optionale Lookups (nicht `.single()` — 406 bei 0 Rows)
- NIEMALS `Promise.resolve(supabase...)` → immer `await`
- PostgREST `nested.field` unzuverlaessig → separate Query + `.in()`
- `getWallet()` NICHT cachen (RLS Race Condition)
- Realtime: Tabelle braucht `REPLICA IDENTITY FULL`
- RLS `.update()` stumm blockiert → IMMER RPC fuer geschuetzte Tabellen
- FK Join Cast: `row.clubs as unknown as DbClub` (PostgREST Workaround)
- Count: `.select('*', { count: 'exact', head: true })` fuer Effizienz
- Batch: `.in('id', ids)` statt Individual-Queries

## RLS Pflicht-Checkliste (Session 255 — holding_locks war komplett kaputt)
- Neue Tabelle mit RLS: ALLE Client-Ops brauchen Policy (SELECT + INSERT + DELETE + UPDATE)
- SELECT-only = INSERT/DELETE STILL blockiert → schlimmster Bug-Typ
- NACH Migration pruefen: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'X'`
- NACH erstem Deploy: `SELECT COUNT(*) FROM table` → muessen Rows existieren
- NIEMALS `console.error` ohne `throw` bei DB-Writes → silent failure = unsichtbarer Bug
- Wenn Service `.from('table').insert/delete()` macht UND Tabelle RLS hat → Policy MUSS existieren

## RPC Regeln
- Parameter IMMER aus DB verifizieren (`pg_get_functiondef`)
- `::TEXT` auf UUID: NIEMALS beim INSERT (5x gleicher Bug in Session 93)
- ALLE Geld-RPCs: `IF p_quantity < 1 THEN RETURN error`
- REVOKE: Von `PUBLIC, authenticated, anon` (alle 3!)
- `auth.uid()` ist NULL in SECURITY DEFINER → NULL-safe Guards
- Gamification: 13 DB-Triggers — Client ruft NICHT direkt auf
- E2E Test PFLICHT: (1) Daten VOR Call, (2) RPC ausfuehren, (3) NACH Call verifizieren, (4) Zero-Sum pruefen

## Column Quick-Reference
- `players`: `first_name`/`last_name` (NICHT `name`), `shirt_number` (NICHT `ticket_number`)
- `wallets`: PK=`user_id` (KEIN `id`, KEIN `currency`)
- `orders`: `side` (NICHT `type`), KEIN `updated_at` (nur `created_at` + `expires_at`)
- `post_votes`: `vote_type` = SMALLINT 1/-1 (NICHT boolean/TEXT)
- `profiles`: `top_role` (NICHT `role`), Wert `'Admin'` mit grossem A
- `notifications`: `read` (NICHT `is_read`)
- `activity_log`: `action` (NICHT `action_type`)
- `user_follows`: `following_id` (NICHT `followed_id`)
- `trades`: `executed_at` (NICHT `created_at`)
- `research_ratings`: `rating` (NICHT `score`)
- `user_achievements`: `achievement_key` (NICHT `achievement_id`)
- `offers`: `price` (NICHT `price_cents`)
- `research_posts`: hat KEINE upvotes/downvotes Spalten

## CHECK Constraints
- `club_subscriptions.tier`: 'bronze'/'silber'/'gold' (silber, NICHT silver!)
- `user_stats.tier`: 'Rookie'/'Amateur'/'Profi'/'Elite'/'Legende'/'Ikone'
- `research_posts.call`: 'Bullish'/'Bearish'/'Neutral' (Capitalized)
- `research_posts.category`: 'Spieler-Analyse'/'Transfer-Empfehlung'/'Taktik'/'Saisonvorschau'/'Scouting-Report'
- `lineups.captain_slot`: 'gk'/'def1' etc. (KEIN 'slot_' Prefix)

## Schema
- Neue DB-Tabellen: FK auf `profiles` (nicht `auth.users`)
- Types zentral in `src/types/index.ts`
- `entry.rank` in Airdrop-Queries ist nullable → IMMER `?? 999` / `?? 0`
- `options` in Polls/Votes = JSONB Array: `{label: string; votes: number}[]`

## Migration Workflow (KRITISCH — Registry-Drift vermeiden)
- **IMMER** `mcp__supabase__apply_migration` nutzen fuer neue Migrations
- **NIE** `supabase db push` — die remote `schema_migrations` Registry ist drifted (Diagnose 2026-04-09):
  - Bug 1: `apply_migration` stempelt remote Version mit Aufruf-Zeitpunkt, nicht File-Name → 7 Mismatches bei heutigen Migrations (z.B. lokal `20260408220000_activity_log_realtime.sql` vs remote `20260408214045`). `db push` wuerde diese als "neu" sehen und Re-Apply versuchen → Crash.
  - Bug 2: 7 "Ghost" Rows in `schema_migrations` mit `name=null, statements=null` (Versions `20260401124653`, `20260404190000`, `20260406180000` etc.)
  - Legacy: ~17 lokale Files mit 8-stelligem Datum-Prefix (`20260330_*.sql`) wurden nie in der Registry registriert weil Supabase CLI pro Datum nur einen File nimmt
- **Workflow fuer neue Migrations:**
  1. Migration File lokal schreiben unter `supabase/migrations/YYYYMMDDHHMMSS_name.sql`
  2. Via `mcp__supabase__apply_migration` ausfuehren (project_id, name, query)
  3. Verifizieren mit `mcp__supabase__execute_sql` gegen `schema_migrations` oder direkt gegen die Zieltabelle
  4. File committen — Registry-Mismatch ist erwartet und harmlos solange `db push` nie genutzt wird
- **Verifikation nach Apply:**
  - Fuer RLS: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'X'`
  - Fuer Tabelle: `SELECT relreplident FROM pg_class WHERE relname = 'X'` (Realtime-Tabellen = 'f')
  - Fuer Publication: `SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime'`
- **Falls `db push` irgendwann wirklich gebraucht wird** (CI-Migration, neues Team-Mitglied): erst die Registry via `schema_migrations` UPDATE/INSERT glattziehen — sonst Crash beim Re-Apply.

## Migration-Template-Pflichten (AR-44, 2026-04-15)

Jede Migration die `CREATE OR REPLACE FUNCTION` enthaelt MUSS am Ende dieser 3-Zeilen-Block:
```sql
REVOKE EXECUTE ON FUNCTION public.fn_name(arg_types) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_name(arg_types) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_name(arg_types) TO authenticated;
```
**Grund:** `CREATE OR REPLACE` resettet Privilegien auf Default (PUBLIC grant). Ohne explizit REVOKE+GRANT kann anon zugreifen — J4 `earn_wildcards` war genau dieses Pattern (Live-Exploit).

**Audit-Command vor jedem Commit:**
```bash
# Findet Migrations mit CREATE FUNCTION ohne REVOKE-Block
for f in supabase/migrations/*.sql; do
  if grep -q "CREATE OR REPLACE FUNCTION\|CREATE FUNCTION" "$f" && ! grep -q "REVOKE EXECUTE" "$f"; then
    echo "MISSING REVOKE: $f"
  fi
done
```

**Ausnahme:** Trigger-Funktionen (`LANGUAGE plpgsql` + `RETURNS trigger`) brauchen kein REVOKE (werden nur via TRIGGER aufgerufen, nie direkt).

## Stub-Migration-Verbot (AR-43, 2026-04-15)

Stubs (Comment-only Migration ohne SQL) sind **verboten**. Jede `apply_migration`-Call MUSS vollstaendige SQL enthalten — auch wenn sie bereits live sind (Greenfield-db-reset soll funktionieren).

Audit: `for f in supabase/migrations/*.sql; do [ $(wc -l <$f) -lt 10 ] && echo "SHORT: $f"; done` — Files unter 10 Zeilen pruefen, oft Stubs.
