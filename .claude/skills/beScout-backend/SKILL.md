---
name: beScout-backend
description: DB migrations, RPCs, services, Supabase operations — column names, CHECK constraints, RPC patterns, fee-split
---

# beScout-backend Skill

Backend implementation for BeScout. Service Layer pattern. Supabase PostgreSQL + Auth + Realtime.

## Pflicht-Lektuere VOR Arbeit
→ `.claude/rules/common-errors.md` (DB Columns, CHECK Constraints, RPC Anti-Patterns)
→ `.claude/rules/database.md` (Schema, RLS, Migration Patterns)
→ `.claude/rules/trading.md` (Fee-Split, Order Logic, Liquidation)
→ `LEARNINGS.md` in diesem Ordner

## Backend-spezifische Regeln (NUR was nicht in Rules steht)

### Service Layer (einziger Datenzugriff)
```
Component → Service Function → Supabase RPC/Query
Write → Service → invalidateQueries → Toast
```
- NIEMALS Supabase direkt in Components
- RLS-Queries NICHT cachen: getWallet(), getHoldings()

### Geld
- IMMER als BIGINT cents (1,000,000 = 10,000 $SCOUT)
- `floor_price ?? 0` — IMMER Null-Guard
- `entry.rank ?? 999` — Airdrop rank nullable

### RLS Policy Pflicht (nach JEDER neuen Tabelle)
```sql
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'X';
```
- MUSS Policies fuer SELECT + INSERT + DELETE haben
- SELECT-only = silent write failure

### Turkish Unicode (bei Spieler-Suche)
- SQL: `translate(lower(name), 'şçğıöüİŞÇĞÖÜ', 'scgiouISCGOU')`

## Learnings
→ Lies `LEARNINGS.md` VOR Task-Start
→ Schreibe Drafts in `memory/learnings/drafts/`
