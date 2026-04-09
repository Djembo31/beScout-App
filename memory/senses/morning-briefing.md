# System-Status (auto-generated 2026-04-09 15:31)

## Git (seit letzter Session)
- 10 Commits:
  8757b1b docs(memory): refresh current-sprint.md for session end 2026-04-09
  60ff354 docs(memory): session-handoff for 2026-04-08 evening → 2026-04-09 night
  66dda23 docs(database): document migration workflow + registry drift
  32c4248 docs(memory): realtime + react query pattern + close session handoff
  41c0218 test(e2e): QA script for realtime following feed
  7ddac0b feat(social): live scout activity feed via supabase realtime
  6ee9629 fix(manager): show EquipmentShortcut in Aufstellen empty states
  76003b1 docs(memory): mystery box drop rates v1 confirmed final
  d71975a feat(inventory): equipment pokedex + stats + consumed history + manager shortcuts
  20c1864 docs(memory): session close + memory hygiene sweep

## Uncommitted: 10 Files
```
 D .claude/session-files.txt
 M .claude/settings.local.json
 M memory/episodisch/metriken/sessions.jsonl
 D memory/episodisch/sessions/retro-20260408-205616.md
 D memory/episodisch/sessions/retro-20260408-210113.md
 D memory/episodisch/sessions/retro-20260408-212746.md
 D memory/episodisch/sessions/retro-20260408-214056.md
 D memory/episodisch/sessions/retro-20260408-214621.md
 M memory/senses/morning-briefing.md
?? .next-old/
```

## Build
- tsc: CLEAN

## Supabase
- Migrations: 50, letzte: 20260408220000_activity_log_realtime.sql

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
- Index: 80 Eintraege (Stand: 2026-04-08, Run #5)
- Letzter Log: ## [2026-04-08] AutoDream Run #4 (5 Retros, B2 Following Feed Abend-Session)

