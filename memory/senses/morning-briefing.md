# System-Status (auto-generated 2026-04-07 00:41)

## Git (seit letzter Session)
- 6 Commits:
  f7fba3b docs: session handoff + premium roadmap for next sessions
  c71d1df refactor: remove legacy chip system — replaced by Equipment
  e2e0e13 feat: Equipment Lineup Integration — equip items to players + scoring multiplier
  4444212 fix: prevent negative radius in particle glow (Canvas createRadialGradient)
  289ee3f fix: remove GOTO from open_mystery_box_v2 RPC (Postgres compatibility)
  58d4eee feat: Mystery Box Premium — Equipment System + Star Drops Animation

## Uncommitted: 10 Files
```
 M .claude/agents/SHARED-PREFIX.md
 M .claude/agents/autodream.md
 M .claude/agents/backend.md
 M .claude/agents/frontend.md
 M .claude/agents/healer.md
 M .claude/agents/reviewer.md
 M .claude/agents/test-writer.md
 M .claude/hooks/inject-learnings.sh
 M .claude/hooks/morning-briefing.sh
 M .claude/rules/common-errors.md
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
- ## Data Contract Changes (NICHT als UI-Change behandeln)
- - required → optional (Feld, Prop, DB Column) = Contract Change → ERST alle Consumer greppen
- - optional → required = Breaking Change → Migration + Backfill noetig
- - Form-Validierung aendern (disabled, required entfernen) → Pruefen: Was passiert downstream wenn der Wert null/leer ist?
- - REGEL: Jede Aenderung die beeinflusst WELCHE Werte in die DB geschrieben werden → `/impact` oder manueller Grep BEVOR Code geschrieben wird
- 
- ## Shell / Hooks (Windows Git Bash)
- - `grep -oP` mit `\K` scheitert SILENT auf Windows (Locale-Bug: "supports only unibyte and UTF-8 locales")
- - Fix: `sed -n 's/.*"key"\s*:\s*"\([^"]*\)".*/\1/p'` statt `grep -oP`
- - Worktree-Agents haben KEINEN Zugriff auf `.claude/skills/` — Fallback auf Main-Repo-Path oder Task gut verpacken

## Wiki
- Index: 77 Eintraege (Stand: 2026-04-07)
- Letzter Log: ## [2026-04-07] Initial Migration (Karpathy Wiki Pattern)

