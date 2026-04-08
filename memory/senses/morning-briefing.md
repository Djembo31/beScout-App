# System-Status (auto-generated 2026-04-08 17:25)

## Git (seit letzter Session)
- 10 Commits:
  c8b94cf docs(handoff): session close + B2 Following Feed kickoff block
  0ffb81a docs(handoff): B1 Missions E2E audit + polish complete
  be63858 fix(notifications): allow reference_type='mission' (CHECK constraint)
  701c071 chore(db): deactivate 5 dead mission definitions
  929eeca feat(missions): add missing triggers + roll MissionHintList into Market/Manager/Home
  3c23199 fix(missions): align trigger keys with DB + differentiate buy/sell
  66fd63b chore(lint): silence 8 pre-existing warnings with explicit disables + reasons
  1038729 ci(workflows): upgrade Node 20 → 24 + actions checkout/setup-node v4 → v6
  ae66b8f docs(handoff): integration tests now run in CI (SERVICE_ROLE_KEY set)
  d1e2feb ci(workflows): wire Supabase env vars into test job so integration tests run

## Uncommitted: 10 Files
```
 M memory/episodisch/metriken/sessions.jsonl
 D memory/episodisch/sessions/retro-20260407-140546.md
 D memory/episodisch/sessions/retro-20260407-140958.md
 D memory/episodisch/sessions/retro-20260407-150554.md
 D memory/episodisch/sessions/retro-20260407-183450.md
 D memory/episodisch/sessions/retro-20260407-184536.md
 M memory/senses/morning-briefing.md
?? memory/episodisch/sessions/retro-20260408-164812.md
?? memory/episodisch/sessions/retro-20260408-165349.md
?? memory/episodisch/sessions/retro-20260408-171724.md
```

## Build
- tsc: CLEAN

## Supabase
- Migrations: 47, letzte: 20260408170000_notifications_allow_mission_reference.sql

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
- Index: 78 Eintraege (Stand: 2026-04-08)
- Letzter Log: ## [2026-04-08] AutoDream Run #3 (Session 42, Counter 38)

