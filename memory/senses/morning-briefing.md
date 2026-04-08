# System-Status (auto-generated 2026-04-08 18:22)

## Git (seit letzter Session)
- 10 Commits:
  bb84846 chore(memory): final stop-hook artifacts (session close)
  d653cb5 docs(handoff): B2 Following Feed done, B3 Transactions History kickoff block
  c8190a8 chore(memory): auto retro from stop hook (181031)
  5b5dcb1 docs(memory): autodream run #4 — B2 + CI lessons + following-feed wiki
  5511640 chore(memory): session retros + morning briefing refresh
  85474dd feat(home): scout activity feed widget (B2 following feed)
  07cfbba refactor(social): parametrize useFollowingFeed + move labels to i18n
  e61be4a fix(db): allow users to read activity_log of followed users for feed
  c8b94cf docs(handoff): session close + B2 Following Feed kickoff block
  0ffb81a docs(handoff): B1 Missions E2E audit + polish complete

## Uncommitted: 5 Files
```
 D .claude/session-files.txt
 M memory/episodisch/metriken/sessions.jsonl
 D memory/episodisch/sessions/retro-20260408-172328.md
 M memory/senses/morning-briefing.md
?? memory/episodisch/sessions/retro-20260408-182125.md
```

## Build
- tsc: CLEAN

## Supabase
- Migrations: 48, letzte: 20260408180000_activity_log_feed_rls.sql

## Sprint
## Naechste Prioritaet (fuer naechste Session)
1. **Onboarding ohne Club-Bezug** — `project_onboarding_multi_club.md` (Freundeskreis-Feedback)
2. **Chip/Equipment System** — `project_chip_equipment_system.md` (Ideen gesammelt, eigene Session)
3. Neue Features nach Anils Entscheidung

## E2E Features Status (aus project_e2e_features.md)
- B1 Missions E2E: DONE (2026-04-07)
- B2 Following Feed E2E: DONE (2026-04-08 Mittag, 4 Commits)
- B3 Transactions History E2E: DONE (2026-04-08 Abend, 6 Commits, QA verifiziert)

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
- Index: 79 Eintraege (Stand: 2026-04-08)
- Letzter Log: ## [2026-04-08] AutoDream Run #4 (5 Retros, B2 Following Feed Abend-Session)

