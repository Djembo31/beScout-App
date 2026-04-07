# Cortex Index

> Routing-Tabelle. Sagt WO Wissen liegt, nicht WAS es ist.
> Jarvis laedt relevante Files on-demand basierend auf dem aktuellen Task.

## Immer aktiv (bei JEDEM Session-Start lesen)
- `memory/semantisch/sprint/current.md` — Sprint-Status
- `memory/semantisch/personen/anil.md` — Founder Arbeitsweise
- `memory/session-handoff.md` — Uebergabe letzte Session
- `.claude/rules/common-errors.md` — Top-Fehler (auto-loaded)

## Nach Domain laden
| Wenn Task betrifft... | Dann lade... |
|----------------------|--------------|
| Fantasy | `memory/features/fantasy.md` + `memory/deps/cross-domain-map.md` |
| Trading / Wallet / IPO | `memory/patterns.md` (Trading-Sektion) |
| UI / Components | CLAUDE.md Component Registry (bereits geladen) |
| DB / Migration / RPC | `.claude/rules/database.md` (auto-loaded by path) |
| Neues Feature | `memory/patterns.md` + Business-Regeln |
| Bug-Fix | `memory/errors.md` + `memory/senses/morning-briefing.md` |
| Agent / Workflow | `memory/semantisch/projekt/agent-research.md` |
| Feature / Redesign / Refactoring (3+ Files) | `.claude/skills/spec/SKILL.md` (PFLICHT: Migration-First) |
| Performance | `memory/patterns.md` (Performance-Sektion) |

## On-Demand (nur wenn explizit gebraucht)
| Ressource | Pfad |
|-----------|------|
| Wiki-Index (Suchindex aller Files) | `memory/wiki-index.md` |
| Wiki-Log (Aenderungshistorie) | `memory/wiki-log.md` |
| Entscheidungen (ADRs) | `memory/episodisch/entscheidungen/` |
| Feature-Specs | `memory/features/` |
| System-Status | `memory/senses/morning-briefing.md` |
| 3-Hub Architektur (Inventory, Profile, Missions, Home) | `memory/semantisch/projekt/architecture-3hub.md` |
