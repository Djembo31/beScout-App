---
name: spec
description: Use BEFORE any feature work, redesign, or refactoring. Replaces brainstorming + writing-plans with a migration-first 3-phase process (SPEC → PLAN → EXECUTE). Enforces current-state analysis, blast radius mapping, pre-mortem, wave delivery. Mandatory for Jarvis and all agents. Trigger on any task that changes user-visible behavior or moves/renames code.
---

# /spec — Engineering Specification

You are writing a spec that PREVENTS mistakes, not just DESCRIBES what to build.
A spec without a current-state analysis is a wish list.
A plan without a migration map is a recipe for duplicates.

## When to Use

- Any feature that changes user-visible behavior
- Any redesign, refactoring, or migration
- Any task touching 3+ files
- Before dispatching agents for implementation
- When Anil says "mach das besser" / "das muss anders"

## The 3 Phases

```
SPEC (understand before you build)
  ↓
PLAN (translate to safe, shippable waves)
  ↓
EXECUTE (one wave at a time, verify between)
```

Each phase has a gate. You cannot enter the next phase until the gate passes.

---

## PHASE 1: SPEC

Write the spec in `docs/plans/YYYY-MM-DD-<topic>-spec.md`.
Every section is mandatory. Skip nothing.

### 1.1 Current State (PFLICHT — immer zuerst)

Before you think about what to build, understand what EXISTS.

- **Feature Inventory:** List every user-visible feature in the affected area. Not code — FEATURES. What can the user SEE and DO? Number each one.
- **File Inventory:** List every file involved, with line counts.
- **Data Flow:** Which hooks, services, stores, queries are used?
- **External Links:** Grep for every URL/route that links TO the affected area. List each one with file + line number.
- **Shared State:** Which Zustand stores, React Query keys, Context providers touch this area?

This is not optional. This is the foundation. If you skip this, you will build the wrong thing.

### 1.2 Goals + Non-Goals + Anti-Requirements

| Section | Purpose | Example |
|---------|---------|---------|
| **Goals** | What this change achieves (3-5, measurable) | "Squad Builder has its own page at /manager" |
| **Non-Goals** | Things that COULD be goals but explicitly ARE NOT | "Redesign the trading flow" |
| **Anti-Requirements** | Things explicitly FORBIDDEN during this work | "Do NOT create new components where existing ones work" |

Non-Goals and Anti-Requirements prevent scope creep during execution. They are as important as Goals.

### 1.3 Feature Migration Map

For EVERY feature from the inventory (1.1), decide:

| # | Feature | Current Location | Target | Action |
|---|---------|-----------------|--------|--------|
| 1 | Squad Builder | /market Portfolio→Team | /manager | MOVE |
| 2 | Holdings | /market Portfolio→Bestand | /market (stays) | NONE |
| 3 | ... | ... | ... | ... |

Actions: MOVE, STAYS, REMOVE, MERGE, SPLIT, ENHANCE.

**Rule:** Every feature must appear in this table. No feature may be left unaccounted.
**Rule:** If a feature MOVES, the old location must be cleaned up in the SAME wave.

### 1.4 Blast Radius Map

For every change in the migration map, run the 3-Grep:

1. **Direct consumers:** `grep -r "ImportedName"` — who imports this?
2. **Indirect consumers:** For each direct consumer, what does IT export? Who imports THAT?
3. **Runtime consumers:** `grep -r "queryKey"` / `grep -r "storeName"` — who subscribes to the same data?

Document every result. This is your dependency map.

### 1.5 Pre-Mortem

"Es ist 2 Wochen spaeter. Das Redesign ist gescheitert. Was ist passiert?"

Write 5 failure scenarios and a mitigation for each:

| # | Failure Scenario | Mitigation |
|---|-----------------|------------|
| 1 | Doppelte Funktionalitaet (Feature an zwei Orten) | Migration Map erzwingt: Move = Delete old in same wave |
| 2 | Externe Links brechen | Blast Radius Map listet alle Links VOR dem Code |
| 3 | Leere Seite deployed | Self-Test Gate: interagiere mit der Seite vor Push |
| 4 | Agent baut isolierte Komponente die nicht passt | Agents nur fuer klar definierte, reviewbare Tasks |
| 5 | Store-Default zeigt auf geloeschten Tab | Store-Aenderung in derselben Wave wie Tab-Entfernung |

Pull from `common-errors.md` and `memory/errors.md` for known traps.

### 1.6 Invarianten + Constraints

**Invarianten** — Dinge die sich NICHT aendern duerfen:
- "Floor Price Berechnung muss identische Ergebnisse liefern"
- "Alle 18 externen /market Links muessen weiterhin funktionieren"
- "Tab-Reihenfolge in bestehenden Seiten aendert sich nicht"

**Constraints** — Harte Grenzen fuer die Implementation:
- "Max 10 Files pro Wave"
- "Keine neuen Komponenten wo bestehende reichen"
- "Move und Change NIE im selben Schritt"
- "Kein Push ohne Self-Test (interagieren, nicht nur Screenshot)"

### 1.7 Akzeptanzkriterien (Regressions-aware)

Fuer jede veraenderte User-Flow:

```
GIVEN: [bestehender Zustand]
WHEN: [Aktion die VOR dem Redesign existierte]
THEN: [Verhalten ist IDENTISCH zu vorher]
  AND: [spezifische Messung]
  AND NOT: [bekannte Regression]
```

Beispiel:
```
GIVEN: User hat 5 Holdings
WHEN: User oeffnet /market, Portfolio Tab
THEN: 5 Holdings angezeigt in gleicher Reihenfolge wie vorher
  AND: Floor Prices korrekt (nicht null, nicht 0)
  AND NOT: Flash of Empty State vor Datenladung
  AND NOT: Team-Tab noch sichtbar (wurde entfernt)
```

### SPEC GATE

Bevor du zum Plan uebergehst:
- [ ] Current State komplett (jedes Feature nummeriert)?
- [ ] Migration Map fuer JEDES Feature ausgefuellt?
- [ ] Blast Radius fuer jede Aenderung gegreppt?
- [ ] Pre-Mortem mit 5 Szenarien?
- [ ] Invarianten + Constraints definiert?
- [ ] Akzeptanzkriterien fuer jede betroffene User-Flow?
- [ ] Anil hat die Spec reviewed und abgenommen?

Erst wenn ALLE Punkte erfuellt → weiter zum Plan.

---

## PHASE 2: PLAN

Translate spec to implementation tasks in Wellen (Waves).

### 2.1 Wave Design

Aufteilen in Wellen. Jede Welle ist eigenstaendig shippbar.

| Wave | Zweck | Regel |
|------|-------|-------|
| Wave 1: Infra | Types, Stores, Queries, Barrel Exports | Kein UI-Change |
| Wave 2: Move | Files bewegen, Bridge Re-Exports | Kein Behavior-Change |
| Wave 3: Wire | Neue Orchestrierung, Layout-Changes | Behavior identisch, Struktur neu |
| Wave 4: Enhance | Neue Features, Verbesserungen | Erst wenn Wave 1-3 verified |
| Wave 5: Cleanup | Alte Files loeschen, Bridges entfernen | Nur wenn Grep 0 Treffer |

**Regeln:**
- Move und Change NIE im selben Schritt
- Max 10 Files pro Wave
- Jede Wave hat eigene Akzeptanzkriterien
- Jede Wave endet mit: `tsc --noEmit` + Tests + Smoke Test
- Nach jeder Wave: "Kann ich das shippen?" — wenn ja: Commit

### 2.2 Task-Struktur

Pro Task:

```markdown
### Task N: [Beschreibung]

**Wave:** [1-5]
**Files:** [exakte Pfade — Create/Modify/Delete]
**Blast Radius:** [welche anderen Files sind betroffen]

**Steps:**
1. [Aktion]
2. [Aktion]
3. Verify: `npx tsc --noEmit`
4. Verify: `npx vitest run [betroffene Tests]`

**DONE means:**
- [ ] [Binaeres Kriterium]
- [ ] [Binaeres Kriterium]
- [ ] tsc 0 errors
- [ ] Betroffene Tests gruen
```

### 2.3 Agent-Dispatch Regeln

Agents bekommen NUR Tasks die:
- Exakt 1 Datei erstellen oder aendern
- Ein klar definiertes Props-Interface haben
- Gegen bestehende Types kompilieren muessen
- Keine Architektur-Entscheidungen erfordern
- In der Spec VOLLSTAENDIG beschrieben sind (kein "figure it out")

Agents bekommen NICHT:
- Integration-Tasks (Verdrahtung mehrerer Komponenten)
- Migration-Tasks (Files bewegen + alte loeschen)
- Tasks die Store/Query/Route Aenderungen beinhalten
- Tasks wo das erwartete Ergebnis unklar ist

### PLAN GATE

- [ ] Jede Wave ist eigenstaendig shippbar?
- [ ] Max 10 Files pro Wave?
- [ ] Move und Change in getrennten Waves?
- [ ] Jeder Task hat "DONE means" Checkliste?
- [ ] Agent-Tasks sind vollstaendig spezifiziert?
- [ ] Anil hat den Plan reviewed?

---

## PHASE 3: EXECUTE

### 3.1 Pro Wave

1. Tasks der Wave ausfuehren
2. Nach JEDEM Task: `tsc --noEmit`
3. Nach der gesamten Wave:
   - `npx vitest run` (betroffene Suites)
   - Smoke Test: 3 kritischste User-Flows manuell pruefen
   - "Kann ich das shippen?" — wenn ja: Commit + Tag
4. Wave-Akzeptanzkriterien pruefen (aus der Spec)
5. Erst wenn Wave N verified → Wave N+1

### 3.2 Self-Test Gate (vor jedem Push)

INTERAGIERE mit der Seite. Nicht nur Screenshot — KLICKEN, NAVIGIEREN, TESTEN.

- Jeden geaenderten Screen einmal durchklicken
- Jeden externen Link einmal testen
- Jeden Edge Case aus den Akzeptanzkriterien pruefen
- "Wenn Anil das jetzt oeffnet — wuerde er etwas Kaputtes sehen?"

### 3.3 Restarbeiten + Erkenntnisse

Waehrend der Execution entstehen neue Erkenntnisse:

| Typ | Behandlung |
|-----|-----------|
| Bug gefunden | Separater Task, NICHT in aktuelle Wave einbauen |
| Feature-Idee | In `docs/plans/backlog.md` notieren |
| Verbesserungsvorschlag | In Spec als "Future Enhancement" Sektion |
| Uebersehene Abhaengigkeit | STOP. Zurueck zur Spec, Blast Radius aktualisieren |
| Constraint verletzt | STOP. Wave nicht committen bis Constraint erfuellt |

### EXECUTE GATE (vor "fertig")

- [ ] Alle Waves committed und verified?
- [ ] Alle Akzeptanzkriterien aus der Spec erfuellt?
- [ ] Alle Invarianten geprueft (Grep + manuell)?
- [ ] Self-Test bestanden (interagiert, nicht nur geschaut)?
- [ ] Keine doppelte Funktionalitaet (Feature an genau einem Ort)?
- [ ] `tsc --noEmit` 0 errors?
- [ ] Betroffene Tests gruen?

---

## Zusammenfassung

```
/spec startet den Prozess.

1. SPEC: Verstehe was existiert. Plane die Migration. Denke voraus was schiefgehen kann.
2. PLAN: Uebersetze in sichere Wellen. Jede Welle eigenstaendig shippbar.
3. EXECUTE: Eine Welle nach der anderen. Verify zwischen jeder. Self-Test vor Push.

Der Skill ist erfolgreich wenn:
- Kein Feature vergessen wurde
- Keine doppelte Funktionalitaet entsteht
- Kein externer Link bricht
- Jede Wave eigenstaendig funktioniert
- Das Ergebnis bei Anil VERTRAUEN aufbaut, nicht zerstoert
```
