---
name: beScout-backend
description: DB migrations, RPCs, services, Supabase operations — column names, CHECK constraints, RPC patterns, fee-split
---

# beScout-backend Skill

Backend implementation for BeScout. Service Layer pattern. Supabase PostgreSQL + Auth + Realtime.

## DB Column Names (Top Fehlerquelle)
- `players`: `first_name`/`last_name` (NICHT `name`)
- `wallets`: PK=`user_id` (KEIN `id`, KEIN `currency`)
- `orders`: `side` (NICHT `type`), KEIN `updated_at`
- `post_votes.vote_type` = SMALLINT 1/-1 (NICHT boolean)
- `profiles.top_role` (NICHT `role`), Wert `'Admin'` mit grossem A
- `notifications.read` (NICHT `is_read`)
- `activity_log.action` (NICHT `action_type`)
- `user_follows.following_id` (NICHT `followed_id`)
- `trades.executed_at` (NICHT `created_at`)
- `offers.price` (NICHT `price_cents`)
- `research_posts`: hat KEINE upvotes/downvotes Spalten

## CHECK Constraints (DB wirft Error bei falschem Wert)
- `club_subscriptions.tier`: 'bronze'/'silber'/'gold' (silber, NICHT silver!)
- `user_stats.tier`: 'Rookie'/'Amateur'/'Profi'/'Elite'/'Legende'/'Ikone'
- `research_posts.call`: 'Bullish'/'Bearish'/'Neutral' (Capitalized)
- `lineups.captain_slot`: 'gk'/'def1' etc. (KEIN 'slot_' Prefix)

## RPC Anti-Patterns (Top 5 Bugs)
- `::TEXT` auf UUID beim INSERT — 5x gleicher Bug
- Record nicht initialisiert vor Zugriff in falscher Branch
- FK-Reihenfolge falsch (Child INSERT vor Parent)
- NOT NULL Spalte fehlt im INSERT
- Guards fehlen (Liquidation-Check in allen Trading-RPCs)

## RLS Policy Pflicht
- Neue Tabelle mit RLS MUSS Policies fuer ALLE Client-Ops (SELECT + INSERT + DELETE)
- SELECT-only = Client kann lesen aber NICHT schreiben → silent failure
- NIEMALS `console.error` ohne `throw` bei kritischen DB-Writes
- Nach Migration pruefen: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'X'`

## Service Layer Pattern
```
Component → Service Function → Supabase RPC/Query
Write → Service → Supabase RPC → invalidateQueries → Toast
```
- NIEMALS Supabase direkt in Components
- IMMER `qk.*` Factory fuer Query Keys
- `invalidateQueries` nach Writes, NICHT `staleTime: 0`
- RLS-Queries NICHT cachen: getWallet(), getHoldings()

## Fee-Split
| Quelle | Platform | PBT | Club | Creator |
|--------|----------|-----|------|---------|
| Trading | 3.5% | 1.5% | 1% | — |
| IPO | 10% | 5% | 85% | — |
| Research | 20% | — | — | 80% |
| Bounty | 5% | — | — | 95% |

## Geld
- IMMER als BIGINT cents (1,000,000 = 10,000 $SCOUT)
- `floor_price ?? 0` — IMMER Null-Guard auf optionale Zahlen
- `entry.rank ?? 999` — Airdrop rank ist nullable

## Turkish Unicode
- `I`.toLowerCase() = `i̇` (NICHT `i`) → NFD + strip diacritics + `ı→i`
- SQL: `translate(lower(name), 'şçğıöüİŞÇĞÖÜ', 'scgiouISCGOU')`

## Learnings
→ Lies `LEARNINGS.md` VOR Task-Start
→ Schreibe neue Erkenntnisse als DRAFT in `memory/learnings/drafts/`
