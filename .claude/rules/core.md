---
description: Kern-Workflow, Knowledge Lifecycle und Session-Protokoll
---

## Session-Start (ERSTE AKTION jeder Session)
1. `session-handoff.md` lesen → WAS ZULETZT PASSIERT IST (50 Zeilen, schnell)
2. MEMORY.md ist auto-loaded → Projekt-Kontext da
3. `current-sprint.md` lesen → Stand, Aktive Features, Blocker
4. Wenn aktives Feature: Feature-File lesen
5. Anil sagt was ansteht → los

## Workflow
- **Mode 0-1** (Bugfix/Klein): `/deliver` nutzen → Self-Healing Loop
- **Mode 2-3** (Feature/Architektur): Orchestrator-Modus → siehe `orchestrator.md`
- Mode-Auswahl: ICH entscheide automatisch. Anil kann ueberschreiben.
- Rollback-Regel: Nicht flicken. Git zuruecksetzen, Plan anpassen, sauber neu
- DB-first: Migration → Service → Query Hook → UI → Build

## Level System (Anils Involvement)
- **Level A** (default): Jarvis liefert fertige Features, Anil macht visuelles QA
- **Level B**: Jarvis liefert inkl. Screenshots, Anil sagt "ship it" oder "Richtung falsch"
- **Level C**: Jarvis managed Sprint autonom, taegliche Summaries + Eskalationen
- Anil gibt Level an. Ohne Angabe = **A**

## Skills (gezielt einsetzen)
| Skill | Wann |
|-------|------|
| `/deliver` | JEDE Implementation (das Kern-Skill) |
| `/impact` | VOR Aenderungen an RPCs, DB, Services, Trading |
| `/cto-review` | NACH Implementation, VOR Merge |
| `/baseline-ui` | Nach UI-Aenderungen |
| `/fixing-accessibility` | Nach UI-Aenderungen |
| `/simplify` | Bei groesseren Changes |
| `/systematic-debugging` | Bei Bugs — Root Cause finden |

## Feature-Lifecycle (Spec-Driven)

### 1. Spec (ICH schreibe, Anil approved bei Mode 2-3)
1. Anil beschreibt Feature (1-3 Saetze reichen)
2. `/impact` fuer Cross-Cutting Analysis
3. Spec schreiben → `memory/features/[name].md` mit Contracts
4. `current-sprint.md` updaten
5. **Level A:** Weiter ohne Stop. **Level B/C:** Summary zeigen.

### 2. Implementation
6. `/deliver` ausfuehren → Self-Healing Loop bis ALLES gruen
7. Feature-File laufend updaten

### 3. Abschluss
8. Build gruen, Tests gruen, Review PASS → Feature komplett
9. Feature-File → `features/archive/`
10. Knowledge Capture (Fehler, Patterns, Entscheidungen)

## Context Management (1M Optimiert)

### Was laden (1M erlaubt ALLES)
- Projekt-DNA (CLAUDE.md + MEMORY.md + Rules): ~30K
- errors.md KOMPLETT bei Bedarf: ~15K
- patterns.md KOMPLETT bei Bedarf: ~10K
- Alle betroffenen Source-Files: ~50K
- Feature-Spec + Conversation: ~50K
- **FREI fuer Iteration: ~845K**

### Was Agents bekommen
- VOLLE errors.md (keine Kompression)
- VOLLE patterns.md (keine Kompression)
- Alle relevanten Source-Files
- Impact Manifest (wenn vorhanden)
- Kein Agent hat eine Ausrede fuer bekannte Fehler

### Compaction (was ueberleben MUSS)
- Alle geaenderten File-Pfade
- Feature-Spec Status + offene Requirements
- Build/Test Ergebnisse
- Ungeloeste Fehler/Blocker
- Aktive Entscheidungen

## Knowledge Capture (PFLICHT — waehrend Arbeit)

| Trigger | Aktion | Ziel-File |
|---------|--------|-----------|
| Anil trifft Entscheidung | Sofort festhalten | Feature-File + decisions.md |
| Neuer Fehler | Dokumentieren | errors.md |
| 2x gleicher Fehler | Rule Promotion | common-errors.md |
| Neues Pattern | Notieren | patterns.md |
| Architektur-Entscheidung | ADR | decisions.md |
| Feature fertig | Erkenntnisse | Rule-Files |

### Self-Check (nach JEDER Aktion)
- "Hat Anil etwas entschieden?" → Decision Capture
- "Neuer Fehler?" → errors.md
- "Wiederverwendbares Pattern?" → patterns.md

## Session-Ende (automatisiert via Hooks)

### Stop Hook macht automatisch:
- Warnung bei uncommitted changes

### ICH mache (PFLICHT):
1. `session-handoff.md` updaten (MAX 50 Zeilen)
2. `current-sprint.md` updaten
3. Feature-File updaten (wenn aktiv)
4. `sessions.md` updaten
5. Gemini `refresh_cache()` wenn memory/rules geaendert

## Hooks (aktiv)
- **PostToolUse:** Auto ESLint nach Edit/Write
- **PostToolUse:** Gemini Sync Reminder nach memory/rules Writes
- **PreToolUse:** Safety Guard (destructive Commands)
- **PreToolUse:** Agent Dispatch Guard (Projekt-Wissen Pflicht)
- **PreCompact:** Git Diff Backup (automatisch)
- **Stop:** Uncommitted Changes Warnung + UI Component Check

## Code-Konventionen
- `'use client'` auf allen Pages
- Types zentral in `src/types/index.ts`
- Shared UI in `src/components/ui/index.tsx`
- `cn()` classNames, `fmtScout()` Zahlen
- Component → Service → Supabase (NIE direkt)
- Deutsche UI-Labels, englische Code-Variablen
- Cache-Invalidation nach Writes

## Parallele Sessions (Worktrees)
- Native `isolation: worktree` in Agent Definitions
- Kein manuelles `git worktree add` mehr noetig
- Ideal fuer unabhaengige Tasks
