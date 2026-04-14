# Cortex Index

> Routing-Tabelle. Sagt WO Wissen liegt, nicht WAS es ist.
> Jarvis laedt relevante Files on-demand basierend auf dem aktuellen Task.

## Immer aktiv (bei JEDEM Session-Start lesen)
- `memory/semantisch/sprint/current.md` — Sprint-Status
- `memory/semantisch/personen/anil.md` — Founder Arbeitsweise
- `memory/session-handoff.md` — Uebergabe letzte Session
- `.claude/rules/common-errors.md` — Top-Fehler (auto-loaded)

## Produkt-Wissen (bei Produkt-Entscheidungen, neuen Features, Prioritaeten)
| Ressource | Pfad |
|-----------|------|
| Product Map (WAS ist beScout) | `memory/semantisch/produkt/bescout-product-map.md` |
| Vision & Strategie (WARUM + WOHIN) | `memory/semantisch/produkt/bescout-vision.md` |
| Feature Dependencies (WIE haengt alles zusammen) | `memory/semantisch/produkt/bescout-feature-dependencies.md` |
| Mogul Mutationsplan (18-Monats-Fahrplan, VERTRAULICH) | `memory/semantisch/produkt/mogul-mutationsplan.md` |

## Nach Domain laden
| Wenn Task betrifft... | Dann lade... |
|----------------------|--------------|
| Produkt-Entscheidung / Priorisierung / Neues Feature | `memory/semantisch/produkt/` (alle 3 Seiten) |
| Fantasy | `memory/features/fantasy.md` + `memory/deps/cross-domain-map.md` |
| Trading / Wallet / IPO | `memory/patterns.md` (Trading-Sektion) |
| UI / Components | CLAUDE.md Component Registry (bereits geladen) |
| DB / Migration / RPC | `.claude/rules/database.md` (auto-loaded by path) |
| Neues Feature | `memory/patterns.md` + Business-Regeln |
| Bug-Fix | `memory/errors.md` + `memory/senses/morning-briefing.md` |
| Agent / Workflow | `memory/semantisch/projekt/agent-research.md` |
| Feature / Redesign / Refactoring (3+ Files) | `.claude/skills/spec/SKILL.md` (PFLICHT: Migration-First) |
| Performance | `memory/patterns.md` (Performance-Sektion) |
| Realtime / Live-Feed / Subscriptions | `memory/patterns.md` (Pattern #21) + `memory/semantisch/projekt/equipment-realtime.md` |
| Equipment / Inventory / Mystery Box | `memory/semantisch/projekt/equipment-realtime.md` |
| Polish Sweep / Visual QA / Page Polish | `memory/polish-sweep.md` (SSOT Status) + `memory/semantisch/projekt/home-polish-sweep.md` |
| Home Page / LastGameweekWidget / ScoutCardStats | `memory/semantisch/projekt/home-polish-sweep.md` |
| BeScout Liga / Rankings Hub / Saison-System | `memory/semantisch/projekt/bescout-liga.md` (DONE 2026-04-10) + `memory/project_bescout_liga.md` (Original-Spec) |
| /rankings Page / Liga Scoring / is_liga_event | `memory/semantisch/projekt/bescout-liga.md` |
| Mystery Box Daily-Cap / open_mystery_box_v2 | `memory/semantisch/projekt/bescout-liga.md` (Scope-Creep-Fixes Sektion) |
| 7d Price Changes / get_player_price_changes_7d | `memory/semantisch/projekt/bescout-liga.md` (Scope-Creep-Fixes Sektion) |
| Operation Beta Ready / Beta-Launch Checkliste | `memory/operation-beta-ready.md` (SSOT) + `memory/semantisch/projekt/operation-beta-ready-phase0-1.md` |
| Feature Map / Frontend-Inventar / alle Pages + Components | `memory/feature-map.md` (SSOT, 221 Zeilen) |
| Service Map / Backend-Inventar / alle Services + RPCs | `memory/service-map.md` (SSOT, 266 Zeilen) |
| RPC-Rename / Alias-Pattern / Null-Downtime Migration | `memory/patterns.md` (Pattern #22) + `memory/semantisch/projekt/operation-beta-ready-phase0-1.md` |
| Bulk-Sanitize RPC / regex_replace / pg_get_functiondef | `memory/patterns.md` (Pattern #23) + `memory/semantisch/projekt/operation-beta-ready-phase0-1.md` |
| Phase 1.3 Impact-Map / buy_player_sc / calculate_sc_of_week | `memory/phase-1.3-impact-map.md` (Caller-Details) |
| Fantasy Services Tests / fixtures / lineups / predictions | `memory/semantisch/projekt/operation-beta-ready-phase0-1.md` + Journal `memory/episodisch/journals/fantasy-services-tests-journal.md` |

## On-Demand (nur wenn explizit gebraucht)
| Ressource | Pfad |
|-----------|------|
| Wiki-Index (Suchindex aller Files) | `memory/wiki-index.md` |
| Wiki-Log (Aenderungshistorie) | `memory/wiki-log.md` |
| Entscheidungen (ADRs) | `memory/episodisch/entscheidungen/` |
| Feature-Specs | `memory/features/` |
| System-Status | `memory/senses/morning-briefing.md` |
| 3-Hub Architektur (Inventory, Profile, Missions, Home) | `memory/semantisch/projekt/architecture-3hub.md` |
| Migration Registry Drift Diagnose | `~/.claude/projects/C--bescout-app/memory/reference_migration_workflow.md` |
