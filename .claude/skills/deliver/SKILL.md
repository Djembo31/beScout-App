---
name: deliver
description: "Self-healing implementation loop. Takes a task, implements it, and iterates until ALL quality gates pass. Only returns finished work or escalates. Use when Anil says 'mach das', describes a feature, or asks for a fix."
argument-hint: "<task description or spec file path>"
user-invocable: true
---

# /deliver — Autonomous Implementation Loop

Takes a task from description to committed code. Iterates automatically until ALL quality gates pass.
Anil sees ONLY the finished result or an escalation.

## Level System

| Level | Anil's Involvement | Default |
|-------|-------------------|---------|
| **A** | Visuelles QA only | YES |
| **B** | "ship it" or "Richtung falsch" (inkl. Screenshots) | No |
| **C** | Daily summaries + Eskalationen only | No |

Anil gibt Level an. Ohne Angabe = **Level A**.

## Process

### Phase 1: Impact Analysis
- Spawn `impact-analyst` agent with the task description
- Read Impact Manifest output
- If HIGH risk: brief Anil (1-2 Saetze), continue unless he says stop

### Phase 2: Spec (scaled to complexity)
- **Mode 0 (Bugfix, <10 Zeilen):** Mental spec, direkt fixen
- **Mode 1 (Klein, 1-3 Files):** Kurze inline Spec, selbst implementieren
- **Mode 2-3 (Feature, 3+ Files):** Volle Spec mit Contracts in `memory/features/`

### Phase 3: Implementation
- **Mode 0-1:** Selbst implementieren
- **Mode 2-3:** Spawn `implementer` agent(s) in worktrees
  - Bei unabhaengigen Tasks: Mehrere Agents parallel
  - Bei abhaengigen Tasks: Sequentiell (DB first → Service → UI)

### Phase 4: Verification Loop (max 5 Iterationen)

```
REPEAT max 5x:
  1. npx tsc --noEmit          → Type Check
  2. npx next build            → Build Check
  3. npx vitest run [affected] → Test Check
  4. ESLint Check              → Lint (auto via hook)
  5. Spawn reviewer agent      → Pattern/Convention Check

  IF all PASS → BREAK (go to Phase 5)
  IF failures → Spawn healer agent with:
    - Structured error output
    - List of changed files
    - What the change was supposed to do
    → healer fixes → restart loop
```

### Phase 5: Visual QA (nur wenn UI geaendert)
- Spawn `qa-visual` agent
- If ISSUES found → healer agent fixen lassen → re-screenshot

### Phase 6: Finalize
1. Git commit (descriptive message)
2. Update `session-handoff.md` mit was gemacht wurde
3. Update `current-sprint.md` wenn Feature-Status sich aendert

### Phase 7: Report to Anil
```
## Delivered: [Task Title]

### Was gemacht wurde
- [1 Zeile pro Aenderung]

### Geaenderte Files
- [file:lines-changed]

### Verification
- Types: PASS
- Build: PASS
- Tests: [N] passed
- Review: PASS
- Visual QA: PASS (wenn UI)

### Screenshots (Level B)
[wenn UI geaendert]

### Decisions Made
- [Entscheidungen die Jarvis autonom getroffen hat]
```

## Escalation Rules

Eskaliere an Anil NUR wenn:
1. **5 Iterationen** exhausted ohne Resolution
2. **Architektur-Entscheidung** noetig (nicht in Spec/Rules abgedeckt)
3. **Business-Rule Ambiguitaet** (Wording, Compliance, Fees)
4. **DB Schema-Aenderung** die nicht in der Spec steht
5. **Breaking Change** zu public API/bestehendem Verhalten
6. **UX-Richtungsentscheidung** (wie soll es aussehen/sich anfuehlen)

Escalation Format:
```
## Eskalation: [Thema]
### Problem
[Was blockiert]
### Optionen
A) [Option mit Trade-off]
B) [Option mit Trade-off]
### Meine Empfehlung
[Was ich machen wuerde und warum]
```

## Circuit Breaker

| Limit | Wert | Aktion |
|-------|------|--------|
| Fix-Iterationen | 5 | Eskalation |
| Agent-Turns gesamt | 100 | Eskalation |
| Gleicher Fehler 3x | 3 | Root Cause Analyse, anderer Ansatz |

## Knowledge Capture (nach Abschluss)

- Neuer Fehler entdeckt → `errors.md`
- Neues Pattern → `patterns.md`
- Entscheidung getroffen → `decisions.md`
- Gemini `refresh_cache()` wenn memory/rules Files geaendert

## NICHT

- NICHT "fast fertig" liefern — nur FERTIG oder ESKALATION
- NICHT Anil fragen ob der Code passt — dafuer ist der Reviewer Agent da
- NICHT Tests skippen oder anpassen damit sie passen
- NICHT `@ts-ignore` oder `as any` als Fix nutzen
- NICHT unrelated Code aendern
