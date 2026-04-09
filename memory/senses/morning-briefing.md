# System-Status (auto-generated 2026-04-09 18:54)

## Git (seit letzter Session)
- 10 Commits:
  f2f6da0 docs(memory): mark all 3 follow-ups resolved in current-sprint
  800acc5 fix(providers): demote expected RPC slowness from error to warn
  c88b782 test(flows): raise FLOW-11 timeout to 30s for CI latency headroom
  5be429d test(bounties): add trackMissionProgress stub to missions mock
  ee421cf docs(memory): track 3 follow-up items + QA sweep 2026-04-09
  66b8935 fix(fantasy): lineup quick-add + fantasy_league_members RLS recursion
  0c5cd82 chore: housekeeping sweep — stale retros, auto-briefing, mcp tools
  fbee1f9 docs(memory): autodream run #6 — equipment v2 + realtime feed consolidation
  8757b1b docs(memory): refresh current-sprint.md for session end 2026-04-09
  60ff354 docs(memory): session-handoff for 2026-04-08 evening → 2026-04-09 night

## Uncommitted: 10 Files
```
 M memory/episodisch/metriken/sessions.jsonl
 D memory/episodisch/sessions/retro-20260409-004908.md
 D memory/episodisch/sessions/retro-20260409-005958.md
 D memory/episodisch/sessions/retro-20260409-010005.md
 D memory/episodisch/sessions/retro-20260409-153419.md
 D memory/episodisch/sessions/retro-20260409-153734.md
 M memory/senses/morning-briefing.md
?? .claude/session-files.txt
?? memory/episodisch/sessions/retro-20260409-161523.md
?? memory/episodisch/sessions/retro-20260409-163005.md
```

## Build
- tsc: CLEAN

## Supabase
- Migrations: 51, letzte: 20260409150000_fix_fantasy_league_members_rls_recursion.sql

## Sprint
## Naechste Prioritaet (fuer naechste Session)
1. **B2 Following Feed E2E** — selbes Pattern wie B1 (Discovery → Audit → Fix → Live-Test)
2. **B3 Transactions History E2E** — selbes Pattern
3. Onboarding ohne Club-Bezug (project_onboarding_multi_club.md)

## Recent Error Patterns
- ## Supabase Client
- - `.single()` wenn 0 Rows moeglich → HTTP 406 Error → `.maybeSingle()` nutzen
- - Regel: Wenn "existiert dieser Datensatz garantiert?" → NEIN → `.maybeSingle()`
- - Audit-Signal: HTTP 406 Fehler in Logs/QA → systematisch alle Service-Calls pruefen
- 
- ## DB Columns + CHECK Constraints
- → Single Source: `database.md` (Column Quick-Reference + CHECK Constraints)
- ## Data Contract Changes (NICHT als UI-Change behandeln)
- - required → optional (Feld, Prop, DB Column) = Contract Change → ERST alle Consumer greppen
- - optional → required = Breaking Change → Migration + Backfill noetig

## Wiki
- Index: 81 Eintraege (Stand: 2026-04-09, Run #6)
- Letzter Log: ## [2026-04-09] AutoDream Run #6 (Equipment v2 + Realtime Feed + Migration-Doku — 7 Commits)

