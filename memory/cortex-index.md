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
| Fantasy | `memory/features/fantasy.md` + `memory/semantisch/projekt/cross-domain-map.md` |
| Trading / Wallet / IPO | `memory/semantisch/projekt/patterns.md` (Trading-Sektion) |
| UI / Components | CLAUDE.md Component Registry (bereits geladen) |
| DB / Migration / RPC | `.claude/rules/database.md` (auto-loaded by path) |
| Neues Feature | `memory/semantisch/projekt/patterns.md` + Business-Regeln |
| Bug-Fix | `memory/episodisch/fehler/errors.md` + `memory/senses/morning-briefing.md` |
| Agent / Workflow | `memory/semantisch/projekt/agent-research.md` |
| Feature / Redesign / Refactoring (3+ Files) | `.claude/skills/spec/SKILL.md` (PFLICHT: Migration-First) |
| Performance | `memory/semantisch/projekt/patterns.md` (Performance-Sektion) |

## On-Demand (nur wenn explizit gebraucht)
| Ressource | Pfad |
|-----------|------|
| Entscheidungen (ADRs) | `memory/episodisch/entscheidungen/` |
| Feature-Specs | `memory/features/` |
| System-Status | `memory/senses/morning-briefing.md` |
