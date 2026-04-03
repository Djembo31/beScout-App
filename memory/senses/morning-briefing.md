# System-Status (auto-generated 2026-04-03 17:58)

## Git (seit letzter Session)
- 10 Commits:
  8a44a32 chore(session-282): final handoff — 25 commits, /spec skill, 6 workflow gaps filled
  18a1ad6 fix(workflow): fill 6 gaps exposed by Session 282 failure
  087d418 chore: remove 12 orphaned components from failed redesign attempt
  cae8e90 feat(skill): add /spec — migration-first engineering specification process
  393e351 feat: split Manager from Market — KaderTab moves to /manager, no duplicates
  99f5ab9 revert: restore original Market page + nav (redesign not ready for production)
  3aa4017 feat: wire Manager <-> Market deep-link bridges
  7855a1e feat(market): new MarketContentV2 — side-by-side Portfolio + Marktplatz
  aa7d508 chore(session-282): update handoff + sprint — Manager redesign Phase 0-1 done
  ea8d825 feat(market): add PortfolioCard with sparkline, P&L, quick actions

## Uncommitted: 3 Files
```
 M memory/senses/morning-briefing.md
?? .claude/session-files.txt
?? memory/working-memory.md
```

## Build
- tsc: CLEAN

## Supabase
- Migrations: 38, letzte: 20260401193000_rpc_get_most_watched_players.sql

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

