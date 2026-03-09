---
description: Kern-Workflow, Knowledge Lifecycle und Session-Protokoll
---

## Session-Start (ERSTE AKTION jeder Session)
1. MEMORY.md ist auto-loaded → Projekt-Kontext da
2. `current-sprint.md` lesen → Stand, Aktive Features, Blocker
3. Wenn aktives Feature: Feature-File lesen → Kontext, Requirements, offene Fragen
4. Wenn unterbrochene Session: letzten Stand aus Feature-File + current-sprint.md rekonstruieren
5. Anil sagt was ansteht → los

## Workflow
- Features (>10 Zeilen): **Spec schreiben → Anil Review → Tests schreiben → Code → Build → Verify**
- Bugfixes (<10 Zeilen): Direkt fixen, kurz erklaeren
- Rollback-Regel: Nicht flicken. Git zuruecksetzen, Plan anpassen, sauber neu
- DB-first: Migration → Service → Query Hook → UI → Build
- Test-first: Tests aus Spec ableiten → Implementation bis Tests gruen → Anil reviewed Tests (=Verhalten), nicht Code

## Skills (gezielt einsetzen)
### Feature-Arbeit
1. Spec schreiben → `memory/features/[name].md` (ICH schreibe, Anil reviewed)
2. Anil sagt "passt" → Code implementieren
3. `npx next build` → gruener Build
4. `/baseline-ui` → UI-Qualitaet pruefen
5. `/fixing-accessibility` → a11y pruefen
6. `/fixing-motion-performance` → Animationen pruefen
7. `/simplify` → Reuse + Code-Qualitaet pruefen

### Bug-Fixing
1. `/systematic-debugging` → Root Cause finden, nicht raten
2. Fix → Build → Verify

### MCP Server nutzen
- **context7:** Library-Docs nachschlagen wenn unsicher (React Query, next-intl, Supabase)
- **supabase:** SQL, Migrations, Schema-Abfragen
- **playwright:** Screenshots nach UI-Aenderungen zur visuellen Kontrolle

## Feature-Lifecycle (VERBINDLICH — Spec-Driven)

### 1. Spec (ICH schreibe, Anil reviewed)
1. Anil beschreibt Feature (1-3 Saetze reichen)
2. Ich schreibe vollstaendige Spec → `memory/features/[name].md`
3. Ich recherchiere Codebase: bestehende Services, Tables, Components
4. `current-sprint.md` → Aktive Features updaten
5. **STOP — Anil muss "passt" sagen bevor Code geschrieben wird**
6. Status: **Spec Review**

### 2. Tests (ICH schreibe, Anil reviewed Tests = Verhalten)
7. Tests aus Spec ableiten (Unit fuer Services, E2E fuer Critical Paths)
8. Anil reviewed Tests — "das Verhalten stimmt" ist das Gate, nicht der Code
9. Status: **Tests Written**

### 3. Implementation
10. Code nach Spec, Spec als Single Source of Truth
11. Implementation bis alle Tests gruen
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

## Knowledge Capture (waehrend Arbeit)

| Ereignis | Ziel | Promotion |
|----------|------|-----------|
| Neuer Fehler | `errors.md` | 2x gleicher Fehler → `common-errors.md` |
| Neues Pattern | `patterns.md` | In 3+ Files benutzt → Domain-Rule |
| Architektur-Entscheidung | `decisions.md` | Betrifft alle Domains → MEMORY.md |
| Feature-Wissen | Feature-File | Feature fertig → relevante Rules updaten |
| Cross-Domain Abhaengigkeit | Betroffene Rule → Cross-Domain Sektion | Sofort wenn bemerkt |
| Neue Domain/Rule erstellt | Cross-Domain in ALLEN verwandten Rules ergaenzen | Sofort |
| Zukunfts-Idee | `current-sprint.md` Backlog | — |

Feedback: "pattern notiert: X" oder "error dokumentiert: Y"

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

## Session-Ende (PFLICHT — auch wenn Anil nicht fragt)
1. `current-sprint.md` — Letzter Stand + Aktive Features updaten
2. Feature-File — **Aktueller Stand** Sektion updaten (wo stehen wir, was kommt als naechstes)
3. `sessions.md` — Session #, Datum, Thema, Ergebnis
4. Betroffene Topic-Files — errors.md, patterns.md, decisions.md wenn relevant

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
