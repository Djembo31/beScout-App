---
description: Kern-Workflow, Knowledge Lifecycle und Session-Protokoll
---

## Session-Start (ERSTE AKTION jeder Session)
1. `session-handoff.md` lesen → WAS ZULETZT PASSIERT IST (50 Zeilen, schnell)
2. MEMORY.md ist auto-loaded → Projekt-Kontext da
3. `current-sprint.md` lesen → Stand, Aktive Features, Blocker
4. Wenn aktives Feature: Feature-File lesen → Kontext, Requirements, offene Fragen
5. Anil sagt was ansteht → los

## Workflow
- **Mode 0-1** (Bugfix/Klein): Direkt fixen oder 1 Research-Agent → selbst implementieren
- **Mode 2-3** (Feature/Architektur): Orchestrator-Modus → siehe `orchestrator.md`
- Mode-Auswahl: ICH entscheide automatisch. Anil kann ueberschreiben.
- Rollback-Regel: Nicht flicken. Git zuruecksetzen, Plan anpassen, sauber neu
- DB-first: Migration → Service → Query Hook → UI → Build
- Test-first: Tests aus Spec → Implementation bis Tests gruen

## Skills (gezielt einsetzen)
### Feature-Arbeit (Mode 2-3: Agents machen das)
1. Research Pipeline → `.claude/research/` (Agents explorieren, ICH bleibe sauber)
2. Spec schreiben → `memory/features/[name].md` mit Contracts (ICH schreibe)
3. Anil sagt "passt" → Implementation-Agents dispatchen (Worktrees)
4. Verification-Agents: Build + Review + QA (parallel)
5. Quality Pipeline: `/baseline-ui` → `/fixing-accessibility` → `/simplify`

### Feature-Arbeit (Mode 0-1: ICH mache das)
1. Spec schreiben (kurz) → Code → Build → Verify
2. Quality Pipeline wenn UI geaendert

### Bug-Fixing
1. `/systematic-debugging` → Root Cause finden, nicht raten
2. Fix → Build → Verify

### MCP Server nutzen
- **gemini-knowledge:** Projekt-Kontext abfragen + Agent-Briefings generieren (PFLICHT vor Agent-Dispatch)
- **context7:** Library-Docs nachschlagen
- **supabase:** SQL, Migrations, Schema-Abfragen
- **playwright:** Screenshots nach UI-Aenderungen

## Feature-Lifecycle (VERBINDLICH — Spec-Driven)

### 1. Spec (ICH schreibe, Anil reviewed)
1. Anil beschreibt Feature (1-3 Saetze reichen)
2. **Research Pipeline** starten (1-3 Passes je nach Komplexitaet) → `.claude/research/`
3. Ich schreibe Spec basierend auf VERIFIZIERTEM Research → `memory/features/[name].md`
4. Spec enthaelt TypeScript Contracts (Interfaces, Signatures) → Agent-Koordination
5. `current-sprint.md` → Aktive Features updaten
6. **STOP — Anil muss "passt" sagen bevor Code geschrieben wird**
7. Status: **Spec Review**

### 2. Tests (ICH schreibe, Anil reviewed Tests = Verhalten)
7. Tests aus Spec ableiten (Unit fuer Services, E2E fuer Critical Paths)
8. Anil reviewed Tests — "das Verhalten stimmt" ist das Gate, nicht der Code
9. Status: **Tests Written**

### 3. Implementation
10. **Mode 2-3:** Agents implementieren in Worktrees. ICH orchestriere + merge.
11. **Mode 0-1:** ICH implementiere direkt. Spec bleibt Single Source of Truth.
12. Feature-File laufend updaten: Requirements abhaken, Entscheidungen, Files
13. Bei Unterbrechung: Feature-File + `current-sprint.md` updaten
14. Status: **In Progress**

### 4. Abschluss
15. Build gruen, alle Tests gruen, Feature komplett
16. Feature-File → `features/archive/` verschieben
17. `current-sprint.md` → Feature aus Aktive-Tabelle entfernen
18. Erkenntnisse → relevante Rules/Topic-Files updaten
19. Status: **Done**

## Spec Template (`memory/features/`)
```markdown
# Feature: [Name]
## Status: Spec Review | In Progress | Done
## Gestartet: [Datum]

## Was (Ziel in 2-3 Saetzen)
...

## Verhalten
- [ ] Happy Path (Schritt fuer Schritt)
- [ ] Edge Cases
- [ ] Error States

## Daten (DB-Aenderungen)
- Tables/Columns (exakt mit Types)
- Neue RPCs (Input → Output)
- RLS Rules

## Betroffene Services/Components
- Bestehend: [was wiederverwendet wird]
- Neu: [was gebaut werden muss]

## Contracts (PFLICHT fuer Mode 2-3 — Agents implementieren gegen diese)
- DB: Migration SQL
- Types: TypeScript Interfaces
- Services: Function Signatures mit Input/Output Types
- Hooks: Hook Signatures mit Return Types
- Components: Component Props Interface

## Context Manifest (was muss waehrend Implementation geladen werden)
- Rules: [welche .claude/rules/ Files]
- Services: [welche lib/services/ Files lesen]
- Components: [welche bestehenden Components lesen]
- Types: [welche Types/Interfaces relevant]
- DB Tables: [welche Tabellen betroffen]

## UI States
Loading | Empty | Error | Success | Disabled

## Nicht im Scope
- ...

## Abnahme (AUSFUEHRBAR — keine Prosa, nur Commands)
- [ ] `npx next build` → 0 errors
- [ ] `npx vitest run [betroffene test files]` → all pass
- [ ] `npx playwright test [betroffene e2e spec]` → all pass (wenn UI)
- [ ] Screenshot: [was visuell geprueft werden muss] (wenn UI)
- [ ] [Weitere feature-spezifische Checks]

## Tests (VOR Implementation schreiben lassen)
- Unit Tests: [welche Service-Funktionen testen]
- E2E Tests: [welche User-Flows abdecken]
- Edge Cases: [was explizit getestet werden muss]

## Aktueller Stand (bei Unterbrechung updaten!)
...

## Geaenderte Files
- ...
```

## Knowledge Capture (PFLICHT — waehrend Arbeit, nicht erst am Ende)

### Trigger → Aktion (SOFORT ausfuehren, nicht aufschieben)

| Trigger | Aktion | Ziel-File | Gemini Refresh? |
|---------|--------|-----------|-----------------|
| Anil trifft Entscheidung | Sofort festhalten | Feature-File + decisions.md | Ja, nach Batch |
| Neuer Fehler entdeckt | Dokumentieren mit Ursache + Fix | `errors.md` | Ja |
| 2x gleicher Fehler | In Rule promoten | `common-errors.md` | Ja |
| Neues Pattern erkannt | Mit Beispiel notieren | `patterns.md` | Ja |
| Pattern in 3+ Files | In Domain-Rule promoten | `.claude/rules/{domain}.md` | Ja |
| Architektur-Entscheidung | ADR schreiben | `decisions.md` | Ja |
| Globale Entscheidung | Zusaetzlich in MEMORY.md | `MEMORY.md` | Ja |
| Feature-Wissen | Ins Feature-File | `memory/features/{name}.md` | Nein |
| Feature fertig | Erkenntnisse in Rules | Relevante Rule-Files | Ja |
| Zukunfts-Idee | Backlog-Eintrag | `current-sprint.md` | Nein |

### Self-Check (nach JEDER abgeschlossenen Aktion)
Bevor ich zur naechsten Aufgabe gehe, frage ich mich:
- "Hat Anil etwas entschieden das ich festhalten muss?" → Decision Capture
- "Habe ich einen Fehler gefunden den ich dokumentieren muss?" → errors.md
- "Habe ich ein Pattern gesehen das wiederverwendbar ist?" → patterns.md
- Wenn JA auf irgendwas: ERST schreiben, DANN weiterarbeiten

### Feedback an Anil (damit er weiss dass Wissen waechst)
"Pattern notiert: X" / "Error dokumentiert: Y" / "Entscheidung festgehalten: Z"

## Context-Budget (VERBINDLICH)

| Tier | Was | Budget | Wann |
|------|-----|--------|------|
| **T1 Auto** | CLAUDE.md, MEMORY.md, always-on Rules | ~15% | Immer geladen |
| **T2 Spec** | Feature-Spec + Context Manifest Files | ~10% | Nach Spec-Review |
| **T3 On-Demand** | Topic-Files (patterns, errors, decisions) | NUR bei Bedarf | Wenn stuck |

- **75% Kontext reserviert** fuer Code lesen + Implementation + Chat
- **NIEMALS** patterns.md (768Z) oder errors.md (58KB) komplett laden → Grep statt Full-Read
- **Spec-Phase** (breite Recherche): Alles lesen erlaubt, Ergebnisse IN die Spec schreiben
- **Implementation-Phase** (fokussiert): NUR Context Manifest laden, nichts Extra

## Knowledge Limits

| Schicht | Max | Wenn ueber Limit |
|---------|-----|------------------|
| CLAUDE.md | ~100 Zeilen | Weniger Kritisches in MEMORY.md verschieben |
| MEMORY.md | ~150 Zeilen | Detail in Topic-Files auslagern |
| Jedes Rule-File | ~80 Zeilen | Detail in Topic-File verschieben, Rule nur Essenz |
| Topic-Files | kein Limit | Quartals-Review: Stale Eintraege archivieren |
| Feature-Files | — | Archivieren wenn Done |
| Sessions | letzte 3 | Rest in sessions-archive.md |

**Duplikat-Regel:** Jede Info an EINER Stelle. Rules duerfen auf Topic-Files verweisen, nicht duplizieren.

### Knowledge Hygiene (monatlich, Session-Start)
Wenn >30 Tage seit letzter Hygiene:
1. `check_staleness(30)` → Liste veralteter Files
2. Fuer jedes stale File entscheiden:
   - Noch relevant → Inhalt pruefen, ggf. updaten → Timestamp aktualisiert
   - Teilweise obsolet → Stale Eintraege entfernen/archivieren
   - Komplett obsolet → Archivieren oder loeschen
3. errors.md: Eintraege die seit 3+ Monaten nicht mehr aufgetreten → archivieren
4. patterns.md: Patterns die im Code nicht mehr vorkommen → entfernen
5. Gemini `refresh_cache()` nach Cleanup
6. Notiz in sessions.md: "Knowledge Hygiene durchgefuehrt: [was geaendert]"

## Session-Ende (PFLICHT — auch wenn Anil nicht fragt)
1. `session-handoff.md` schreiben/updaten (MAX 50 Zeilen):
   ```
   # Session Handoff
   ## Letzte Session: #N (Datum)
   ## Was wurde gemacht
   - [1 Zeile pro Ergebnis]
   ## Offene Arbeit
   - [was angefangen aber nicht fertig ist, mit File-Pfaden]
   ## Naechste Aktion
   - [exakt was als erstes getan werden muss]
   ## Aktive Entscheidungen
   - [Entscheidungen die noch nicht umgesetzt sind]
   ## Blocker
   - [was blockiert ist und warum]
   ```
2. `current-sprint.md` — Letzter Stand + Aktive Features updaten
3. Feature-File — **Aktueller Stand** Sektion updaten (wo stehen wir, was kommt als naechstes)
4. `sessions.md` — Session #, Datum, Thema, Ergebnis
5. Betroffene Topic-Files — errors.md, patterns.md, decisions.md wenn relevant
6. **Gemini `refresh_cache()`** — wenn irgendein memory/ oder rules/ File geaendert wurde
7. **Knowledge-Check:** "Gibt es Entscheidungen/Fehler/Patterns die ich noch nicht festgehalten habe?"

## Session-Hygiene
- /compact bei Themenwechsel
- Bestehende Components/Services IMMER pruefen bevor neu gebaut wird

## Compaction (was ueberleben MUSS)
Wenn Kontext komprimiert wird, IMMER bewahren:
- Liste aller geaenderten Files in dieser Session
- Aktueller Feature-Spec Status + offene Requirements
- Alle ausgefuehrten Build/Test Commands + deren Ergebnisse
- Ungeloeste Fehler oder Blocker
- Aktive Entscheidungen die noch nicht umgesetzt sind

## Parallele Sessions (Worktrees)
Fuer unabhaengige Tasks: Anil kann 2-3 Claude Code Instanzen parallel starten.
- Jede Instanz arbeitet in eigenem Git Worktree (isolierter Branch)
- Worktree erstellen: `git worktree add ../bescout-[feature] -b feature/[name]`
- Nach Abschluss: Branch mergen + Worktree entfernen: `git worktree remove ../bescout-[feature]`
- Ideal fuer: Feature A + Bug B + Tests C gleichzeitig
- NICHT ideal fuer: Tasks die gleiche Files aendern (Merge Conflicts)

## Code-Konventionen
- `'use client'` auf allen Pages (Client Components)
- Types zentral in `src/types/index.ts`
- Shared UI in `src/components/ui/index.tsx`
- `cn()` fuer classNames, `fmtScout()` fuer Zahlen (deutsch: 1.000)
- Cache-Invalidation nach Writes via `invalidateTradeData()` / `invalidate(prefix)`
- Deutsche UI-Labels, englische Code-Variablen/Kommentare
