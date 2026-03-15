---
name: deliver
description: "Ultra Instinct implementation loop. 4 Quality Gates prevent bugs BEFORE they exist. Takes a task, implements it with mandatory impact check, flow test, and behavior verification. Only returns finished work or escalates."
argument-hint: "<task description or spec file path>"
user-invocable: true
---

# /deliver — Ultra Instinct Implementation Loop

Takes a task from description to committed code. 4 Quality Gates prevent bugs
BEFORE they exist. Anil sees ONLY the finished result or an escalation.

## Core Principle: PREVENT, don't FIND.

Every bug we found in review was preventable:
- Push Auth broke cross-user push → Impact Check would have found all callers
- BuyOrderModal 100x wrong price → Flow Test would have traced the data
- Expire race condition → "What if two processes run simultaneously?" question
- Missing i18n → "What does a Turkish user see?" question

## Level System

| Level | Anil's Involvement | Default |
|-------|-------------------|---------|
| **A** | Visuelles QA only | YES |
| **B** | "ship it" or "Richtung falsch" (inkl. Screenshots) | No |
| **C** | Daily summaries + Eskalationen only | No |

## Scope Limit (Gate 4 — BEFORE starting)

PRO SESSION maximal:
- 5 Features ODER 10 Fixes ODER 1 Architektur-Change
- JEDE Aenderung wird SOFORT nach Gates committed (nicht gesammelt)
- Wenn ein Fix einen neuen Bug erzeugt: STOP, Impact Check, dann weiter

---

## Phase 1: Impact Check (Gate 1 — PFLICHT)

BEVOR ein einziger Buchstabe Code geschrieben wird:

1. **Callsite Search:** Wer ruft die Funktion auf die ich aendere?
   ```bash
   grep -rn "functionName" src/ --include="*.ts" --include="*.tsx"
   ```
2. **Dependency Search:** Was ruft die Funktion auf?
3. **Side-Effect Map:** Notifications? Missions? Wallet? Cache?
4. **Parallele Pfade:** Gibt es andere Code-Pfade die dasselbe tun?
5. **Concurrent Access:** Kann das gleichzeitig von 2 Usern/Prozessen aufgerufen werden?

Output: Kurzes Impact Manifest (3-5 Zeilen).
Wenn Impact > 3 Files: `/impact` Skill.

**STOP-Kriterium:** Wenn ich nicht ALLE Callsites kenne, schreibe ich KEINEN Code.

---

## Phase 2: Implementation

- **Mode 0 (Bugfix, <10 Zeilen):** Direkt fixen
- **Mode 1 (Klein, 1-3 Files):** Inline Spec, selbst implementieren
- **Mode 2-3 (Feature, 3+ Files):** Spec mit Contracts, Agents in Worktrees

Bei Agents: JEDER Agent bekommt das Impact Manifest im Prompt.

---

## Phase 3: Flow Test (Gate 2 — PFLICHT)

NACH Implementation, VOR Build:

Fuer JEDE Aenderung diese 6 Fragen beantworten:

1. **Was passiert wenn zwei User gleichzeitig handeln?**
   → Race Conditions, Advisory Locks, FOR UPDATE
2. **Was passiert wenn die DB null zurueckgibt?**
   → Null Guards, Error Handling, Fallback Values
3. **Was passiert wenn der User mittendrin refreshed?**
   → State Recovery, Optimistic Update Revert
4. **Was sieht ein tuerkischer User?**
   → i18n Keys vorhanden? DB-Texte lokalisiert?
5. **Was hoert ein Screen Reader?**
   → aria-labels, role, focus management
6. **Was passiert bei 1000 gleichzeitigen Usern?**
   → Query Limits, Trigger Performance, Batch Operations

Wenn EINE Frage nicht beantwortet werden kann: Code nochmal lesen.

---

## Phase 4: Verification (Gate 3 — PFLICHT)

```
1. npx tsc --noEmit              → Type Check
2. npx next build                → Build Check
3. npx vitest run [affected]     → Behavior Test (PFLICHT — nicht optional!)
4. Flow Walkthrough (1 Szenario) → Mental Trace durch den ganzen Flow
5. Wenn UI: Playwright Screenshot (360px + 1280px)
```

Wenn Tests fehlen: ERST Test schreiben, DANN committen.
Kein Commit ohne mindestens 1 Verhaltenstest fuer die Aenderung.

---

## Phase 5: Review (1 tiefer Reviewer, nicht 4 flache)

STATT 4 parallele Reviewer die jeweils 5 Files scannen:
1 Reviewer der den GANZEN FLOW liest und SZENARIEN durchspielt.

Der Reviewer bekommt:
- Die Aenderung (git diff)
- Das Impact Manifest
- Die 6 Flow-Test Fragen mit Antworten
- Auftrag: "Spiel 3 Szenarien durch, finde was schiefgehen kann"

**Reviewer darf NUR "PASS" oder "REWORK" sagen.**
Kein "CONCERNS" — entweder es ist gut oder es muss gefixt werden.

---

## Phase 6: Finalize + Commit

1. Git commit (descriptive message)
2. Knowledge Capture (errors.md wenn neuer Fehler gefunden)

---

## Phase 7: Report

```
## Delivered: [Task Title]

### Impact Check
- Betroffene Files: [Liste]
- Parallele Pfade: [ja/nein, welche]
- Side-Effects: [welche]

### Flow Test
- Race Condition: [geprueft, Ergebnis]
- Null Guards: [geprueft]
- i18n: [geprueft]
- A11y: [geprueft]
- Performance: [geprueft]

### Verification
- Types: PASS
- Build: PASS
- Tests: [welche Tests, Ergebnis]
- Review: PASS (1 tiefer Review, [N] Szenarien)

### Geaenderte Files
- [file:lines-changed]
```

## Escalation Rules

Eskaliere an Anil NUR wenn:
1. Impact Check zeigt > 10 betroffene Files
2. Architektur-Entscheidung noetig
3. Business-Rule Ambiguitaet
4. DB Schema-Aenderung ausserhalb Spec
5. Review sagt REWORK aber Fix wuerde > 3 Files aendern

## Anti-Patterns (VERBOTEN)

1. **Code schreiben OHNE Impact Check** → Bug-Fabrik
2. **"Build ist gruen also passt's"** → C2 Bug (100x falsche Preise) hat gebaut
3. **4 flache Reviewer statt 1 tiefer** → findet Checklisten-Items, nicht Logik-Bugs
4. **35 Tasks in einer Session** → niemand hat den Ueberblick
5. **Fix ohne "was nutzt diese Funktion noch?"** → N1 Bug (Push kaputt durch Auth Fix)
6. **Commit ohne Verhaltenstest** → "es kompiliert" ≠ "es funktioniert"
