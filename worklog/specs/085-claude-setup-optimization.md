# Slice 085 — Claude-Setup Optimization

## Ziel (1 Satz)
Meta-Upgrade des Arbeitssystems: Parallel-Agents als Default, AutoResearch-Loop, Role-Stack-Skills, Silent-Fail-Audit, Obsidian-Vault für memory/, erweiterte Notion-Integration mit Slice-Database.

## Betroffene Files

| Path | Zweck |
|------|-------|
| `.claude/skills/optimize/SKILL.md` | AutoResearch-Loop (Karpathy-Pattern) |
| `.claude/skills/plan-ceo-review/SKILL.md` | CEO-Hat Review |
| `.claude/skills/plan-qa-review/SKILL.md` | QA-Hat Review |
| `.claude/skills/plan-legal-review/SKILL.md` | Legal/Compliance-Review |
| `.claude/skills/silent-fail-audit/SKILL.md` | Stille-Fehler-Scan |
| `.claude/skills/parallel-dispatch/SKILL.md` | Agent-Team Playbook |
| `.claude/hooks/ship-context7-gate.sh` | context7-Reminder bei Library-Keywords |
| `.claude/hooks/ship-cto-review-gate.sh` | Warn-Gate vor feat/fix-Commits |
| `.claude/hooks/ship-kanban-sync.sh` | Kanban-Sync-Reminder bei Slice-Transitions |
| `.claude/settings.json` | Register neue Hooks |
| `memory/.obsidian/app.json` + `core-plugins.json` | Obsidian-Vault Config |
| `memory/tags.md` | Tag-Glossar |
| `memory/MEMORY.md` | [[wiki-links]] ergänzen |
| `memory/reference_claude_setup_2026_04_21.md` | Setup-Doku |
| `scripts/silent-fail-audit.ts` | Automatisierter Scan |
| `CLAUDE.md` | Neue Defaults (Parallel, context7, CTO-Review) |
| `.claude/rules/workflow.md` | Integration der neuen Skills |
| `.claude/rules/common-errors.md` | Silent-Fail-Scan als Pattern |
| Notion: Slice-DB (neu) | Mit Relations zu Kanban |
| Notion: Timeline-View auf Kanban | CEO-Dashboard |
| Notion: Slice-Template | Einklick-Slice-Erstellung |

## Acceptance Criteria

1. 6 neue Skills laden per Skill-Tool (Name im frontmatter matched)
2. 3 neue Hooks registered in settings.json + syntaktisch valide (bash -n)
3. memory/.obsidian/ vorhanden → Obsidian kann Vault öffnen
4. Notion Slice-DB erstellt + Relations zu Kanban-DB
5. scripts/silent-fail-audit.ts führt aus und findet min 1 bekannten Pattern
6. CLAUDE.md + rules/ updated ohne Längen-Explosion
7. MEMORY.md hat [[wiki-links]] zusätzlich zu markdown-links (nicht ersetzend)

## Proof-Plan

- `ls .claude/skills/ | wc -l` → 22 (vorher 16)
- `ls .claude/hooks/ | wc -l` → 28 (vorher 25)
- `jq .hooks .claude/settings.json | grep kanban-sync` → match
- `ls memory/.obsidian/` → app.json + core-plugins.json
- `npx tsx scripts/silent-fail-audit.ts` → Output-Report mit Zählungen
- Notion-Slice-DB sichtbar via notion-fetch

## Scope-Out

- Memory-MCP volle Aktivierung (konfiguriert, Entity-Bootstrap bleibt separat)
- Firecrawl-Ersatz für TM-Parser (Experiment, nicht jetzt)
- Sentry-MCP Workflow-Integration (Referenz-Dokumentation only)
- `/improve` Cron-Schedule (nächste Session)
- Memory-MCP Populate mit historischen Entities (separater Task)
