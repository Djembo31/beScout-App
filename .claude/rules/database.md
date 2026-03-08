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
