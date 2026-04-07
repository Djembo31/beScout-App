# System-Status (auto-generated 2026-04-07 01:57)

## Git (seit letzter Session)
- 10 Commits:
  bc65e9f docs: session handoff + wiki + memory updates
  40ca325 fix: update test mocks for BottomNav, KaderTab, PlayerIPOCard
  5f53291 refactor: Knowledge Wiki — final dedup + session handoff
  f7ae49c chore: housekeeping — config, memory consolidation, specs, QA snapshots
  32144af feat: Equipment planning on Manager Pitch — Wave 5
  52b211b feat: Manager Command Center — 4-zone layout with IntelPanel, SquadStrip, StatusBar
  f7fba3b docs: session handoff + premium roadmap for next sessions
  c71d1df refactor: remove legacy chip system — replaced by Equipment
  e2e0e13 feat: Equipment Lineup Integration — equip items to players + scoring multiplier
  4444212 fix: prevent negative radius in particle glow (Canvas createRadialGradient)

## Uncommitted: 10 Files
```
 M .claude/session-files.txt
 M memory/episodisch/metriken/sessions.jsonl
 D memory/episodisch/sessions/retro-20260407-014213.md
 M memory/senses/morning-briefing.md
 M wiki/index.md
 M wiki/log.md
?? memory/episodisch/sessions/retro-20260407-015305.md
?? wiki/compliance.md
?? wiki/equipment-system.md
?? wiki/fantasy-tournaments.md
```

## Build
- tsc: CLEAN

## Supabase
- Migrations: 43, letzte: 20260406190000_equipment_lineup_integration.sql

## Sprint
## Naechste Prioritaet
1. Vercel Deploy verifizieren (bescout.net)
2. Visual QA: Nav Mobile (7 Items)
3. Manager Command Center mit /spec Skill (richtig diesmal)

## Pending Learnings: 2 Drafts
- 2026-04-02-smoke-test-hooks-grep.md
- 2026-04-02-smoke-test-worktree-skills.md

## Recent Error Patterns
- ## DB Columns + CHECK Constraints
- → Single Source: `database.md` (Column Quick-Reference + CHECK Constraints)
- ## Data Contract Changes (NICHT als UI-Change behandeln)
- - required → optional (Feld, Prop, DB Column) = Contract Change → ERST alle Consumer greppen
- - optional → required = Breaking Change → Migration + Backfill noetig
- - Form-Validierung aendern (disabled, required entfernen) → Pruefen: Was passiert downstream wenn der Wert null/leer ist?
- - REGEL: Jede Aenderung die beeinflusst WELCHE Werte in die DB geschrieben werden → `/impact` oder manueller Grep BEVOR Code geschrieben wird
- 
- ## Shell / Hooks (Windows Git Bash)
- - `grep -oP` mit `\K` scheitert SILENT auf Windows (Locale-Bug: "supports only unibyte and UTF-8 locales")

## Wiki
- Index: 77 Eintraege (Stand: 2026-04-07)
- Letzter Log: ## [2026-04-07] Initial Migration (Karpathy Wiki Pattern)

