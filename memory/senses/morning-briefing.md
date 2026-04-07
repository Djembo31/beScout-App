# System-Status (auto-generated 2026-04-07 12:06)

## Git (seit letzter Session)
- 10 Commits:
  7adc7d2 fix: Equipment badge larger + glow on pitch, md badge with dark bg
  a2ba96d fix: Equipment local-first flow + TR wording compliance + test fixes
  c61b615 feat: Mystery Box always visible + Product Wiki (18 pages)
  bc65e9f docs: session handoff + wiki + memory updates
  40ca325 fix: update test mocks for BottomNav, KaderTab, PlayerIPOCard
  5f53291 refactor: Knowledge Wiki — final dedup + session handoff
  f7ae49c chore: housekeeping — config, memory consolidation, specs, QA snapshots
  32144af feat: Equipment planning on Manager Pitch — Wave 5
  52b211b feat: Manager Command Center — 4-zone layout with IntelPanel, SquadStrip, StatusBar
  f7fba3b docs: session handoff + premium roadmap for next sessions

## Uncommitted: 10 Files
```
 M memory/episodisch/metriken/sessions.jsonl
 D memory/episodisch/sessions/retro-20260407-023026.md
 D memory/episodisch/sessions/retro-20260407-023357.md
 D memory/episodisch/sessions/retro-20260407-023437.md
 D memory/episodisch/sessions/retro-20260407-023525.md
 D memory/episodisch/sessions/retro-20260407-023608.md
 M memory/senses/morning-briefing.md
 M memory/session-handoff.md
?? memory/episodisch/sessions/retro-20260407-040641.md
?? memory/episodisch/sessions/retro-20260407-040956.md
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

