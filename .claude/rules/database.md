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

## RPC Regeln
- Parameter IMMER aus DB verifizieren (`pg_get_functiondef`)
- `::TEXT` auf UUID: NIEMALS beim INSERT
- ALLE Geld-RPCs: `IF p_quantity < 1 THEN RETURN error`
- REVOKE: Von `PUBLIC, authenticated, anon` (alle 3!)
- `auth.uid()` ist NULL in SECURITY DEFINER → NULL-safe Guards
- Gamification: 13 DB-Triggers — Client ruft NICHT direkt auf

## Schema
- Neue DB-Tabellen: FK auf `profiles` (nicht `auth.users`)
- Types zentral in `src/types/index.ts`
- `players` hat `first_name`/`last_name`, NICHT `name`
- `wallets` PK=user_id (kein `id`, kein `currency`)
- `orders.side` (nicht type), `post_votes.vote_type` = SMALLINT
