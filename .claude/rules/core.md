---
description: Kern-Workflow, Knowledge Lifecycle und Session-Protokoll
---

## Session-Start (ERSTE AKTION jeder Session)
1. `session-handoff.md` lesen → WAS ZULETZT PASSIERT IST (50 Zeilen, schnell)
2. MEMORY.md ist auto-loaded → Projekt-Kontext da
3. `current-sprint.md` lesen → Stand, Aktive Features, Blocker
4. Wenn aktives Feature: Feature-File lesen
5. Anil sagt was ansteht → los

## Feature-Pipeline (PFLICHT — KEINE Abkuerzung)

Jedes Feature, jede UI-Aenderung, jeder nicht-triviale Change durchlaeuft diese Kette.
**Kein Schritt darf uebersprungen werden.** Jeder Schritt ruft den naechsten Skill auf.

```
┌─────────────────────────────────────────────────────────┐
│  1. brainstorming          (Superpowers Skill)          │
│     → Intent + Requirements klaeren                     │
│     → Anils Antworten WOERTLICH in Design Doc           │
│     → Design Doc speichern + committen                  │
│     → TERMINAL STATE: writing-plans aufrufen            │
│                                                         │
│  2. writing-plans          (Superpowers Skill)          │
│     → Bite-sized Tasks (2-5 min pro Step)               │
│     → Exakte File-Pfade + Code im Plan                  │
│     → Plan GEGEN Design Doc pruefen (Widersprueche?)    │
│     → Plan speichern + committen                        │
│     → Ausfuehrung anbieten: Subagent oder Parallel      │
│                                                         │
│  3. executing-plans        (Superpowers Skill)          │
│     → Plan laden + KRITISCH reviewen VOR Start          │
│     → Tasks in Batches (3 Tasks pro Batch)              │
│     → Nach jedem Batch: "Ready for feedback"            │
│     → Anil gibt OK oder korrigiert                      │
│                                                         │
│  4. Verification           (Nach JEDER Code-Aenderung)  │
│     → tsc --noEmit                                      │
│     → vitest run [betroffene Tests]                     │
│     → reviewer Agent (PFLICHT, nicht optional)           │
│     → Bei UI: /baseline-ui + /fixing-accessibility      │
│     → Bei UI: Visual QA mit VOLLSTAENDIGEN Daten        │
│                                                         │
│  5. finishing-branch       (Superpowers Skill)           │
│     → Tests gruen, Review PASS                          │
│     → Commit + Knowledge Capture                        │
│     → Feature-File → archive                            │
└─────────────────────────────────────────────────────────┘
```

### Quick Fix Ausnahme (EINZIGE Abkuerzung)
NUR fuer Bug Fixes die 1-2 Files betreffen und < 10 Zeilen aendern:
- Direkt fixen, tsc + test, committen
- Kein Brainstorming/Plan noetig
- ABER: trotzdem Reviewer-Agent bei Unsicherheit

### VERBOTEN
- `/deliver` als Allzweck-Skill benutzen (ENTFERNT)
- Skills in der Kette ueberspringen
- Anils Antworten "interpretieren" statt woertlich umsetzen
- "Sieht gut aus" sagen ohne JEDEN sichtbaren Wert geprueft zu haben
- Visual QA mit Spielern ohne vollstaendige Daten

## Skills (gezielt einsetzen)

| Skill | Wann | PFLICHT? |
|-------|------|----------|
| `brainstorming` | Jedes Feature, jede UI-Aenderung | JA |
| `writing-plans` | Nach Brainstorming, VOR Code | JA |
| `executing-plans` | Plan ausfuehren mit Checkpoints | JA |
| `finishing-branch` | Nach allen Tasks | JA |
| `/impact` | VOR Aenderungen an RPCs, DB, Services, Trading | JA |
| `/cto-review` | NACH Implementation, VOR Merge | Bei Bedarf |
| `/baseline-ui` | Nach UI-Aenderungen | JA |
| `/fixing-accessibility` | Nach UI-Aenderungen | JA |
| `/simplify` | Bei groesseren Changes | Bei Bedarf |
| `/systematic-debugging` | Bei Bugs — Root Cause finden | Bei Bedarf |

## Visual QA Regel (PFLICHT bei UI)

VOR jedem "sieht gut aus" oder Screenshot-Freigabe:
1. DB-Query: Spieler mit ALLEN Feldern (age, image_url, shirt_number, nationality)
2. JEDEN sichtbaren Wert einzeln pruefen (nicht ueberfliegen)
3. Fehlende Daten EXPLIZIT benennen ("Dieser Spieler hat kein X in der DB")

## Context Management (1M Optimiert)

### Was laden (1M erlaubt ALLES)
- Projekt-DNA (CLAUDE.md + MEMORY.md + Rules): ~30K
- errors.md KOMPLETT bei Bedarf: ~15K
- patterns.md KOMPLETT bei Bedarf: ~10K
- Alle betroffenen Source-Files: ~50K
- Feature-Spec + Conversation: ~50K
- **FREI fuer Iteration: ~845K**

### Compaction (was ueberleben MUSS)
- Alle geaenderten File-Pfade
- Feature-Spec Status + offene Requirements
- Build/Test Ergebnisse
- Ungeloeste Fehler/Blocker
- Aktive Entscheidungen

## Knowledge Capture (PFLICHT — waehrend Arbeit)

| Trigger | Aktion | Ziel-File |
|---------|--------|-----------|
| Anil trifft Entscheidung | WOERTLICH festhalten | Feature-File + decisions.md |
| Neuer Fehler | Dokumentieren | errors.md |
| 2x gleicher Fehler | Rule Promotion | common-errors.md |
| Neues Pattern | Notieren | patterns.md |
| Architektur-Entscheidung | ADR | decisions.md |
| Feature fertig | Erkenntnisse | Rule-Files |

### Self-Check (nach JEDER Aktion)
- "Hat Anil etwas entschieden?" → WOERTLICH in Feature-File
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

## Session-Lektion (IMMER praesent)

Geschwindigkeit kommt aus VERSTAENDNIS, nicht aus Parallelismus.
Zuhoeren und nicht umsetzen ist schlimmer als langsam sein.
Die Skill-Chain existiert damit ich nicht abkuerze.
10 Minuten Plan lesen spart 1 Stunde debuggen.
