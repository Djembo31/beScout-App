# Quality-First Workflow — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the tier-gated workflow with a single Quality-First standard that makes every output trustworthy without manual review.

**Architecture:** Rewrite workflow.md as the single source of truth for the 3-phase system (BEFORE/DURING/AFTER). Update agent definitions to enforce the same standard. Consolidate 6+ scattered quality feedback memories into one authoritative reference.

**Tech Stack:** Markdown (workflow rules, agent definitions, memory files)

---

### Task 1: Rewrite workflow.md — Core 3-Phase System

**Files:**
- Modify: `.claude/rules/workflow.md`

**Step 1: Read current file**

Read `.claude/rules/workflow.md` to understand current structure (106 lines).

**Step 2: Rewrite with Quality-First system**

Replace the entire content after the Jarvis intro with the approved design. Structure:

```markdown
---
description: CTO Workflow — Quality-First, 3-Phase System
globs: "**/*"
---

## Jarvis — CTO & Co-Founder, BeScout
[Keep existing intro — Jarvis role, autonomous decisions]

---

## Quality-First Standard (KEIN Tier-System fuer Quality)

Jeder Task, egal wie klein, durchlaeuft 3 Phasen.
Der Umfang skaliert mit der Aufgabe, die Schritte selbst sind NIE optional.

**Speed-Override:** Nur wenn Anil explizit "schnell" sagt → Fix → tsc → done.
Jarvis nimmt Speed-Mode NIE selbst an.

### Phase 1: BEFORE (VOR dem ersten Buchstaben Code)

| Schritt | Was | Ergebnis |
|---------|-----|----------|
| **DEFINE** | Was genau aendern? | 1 Satz (Hotfix) bis 1 Seite (Feature) |
| **SCOPE** | Alle betroffenen Files + Consumers auflisten | Explizite File-Liste |
| **CRITERIA** | Woran messe ich "fertig"? | Binaere Ja/Nein Kriterien |

Kein Code ohne alle 3.

### Phase 2: DURING (Waehrend der Implementation)

- NUR was im DEFINE steht umsetzen. Nichts extra.
- Neues Problem entdeckt → notieren, separater Task. NICHT sofort fixen.
- Bei Unsicherheit: Code lesen, nicht raten.

### Phase 3: AFTER (NACH dem letzten Buchstaben Code)

| Schritt | Was | Beweis |
|---------|-----|--------|
| **SELF-REVIEW** | JEDE geaenderte Datei nochmal komplett lesen | — |
| **CHECKLIST** | 8-Punkt Checkliste (siehe unten) | Jeder Punkt explizit geprueft |
| **VERIFY** | tsc + betroffene Tests ausfuehren | Output zeigen |
| **EVIDENCE** | Beweis-Artefakt je Aenderungstyp | Ablegen/zeigen |

Kein "done" ohne AFTER komplett durchlaufen.

---

## Self-Review Checkliste (8 Punkte — JEDER PUNKT PFLICHT)

| # | Check | Wie pruefen |
|---|-------|------------|
| 1 | Types propagiert? | Type → Service → Hook → Component → Props aktualisiert? |
| 2 | i18n komplett? | DE + TR vorhanden? node -e "require('./messages/de.json').ns.key" |
| 3 | Column-Names korrekt? | Gegen common-errors.md pruefen |
| 4 | Alle Consumers aktualisiert? | Grep nach Identifier, JEDEN Treffer pruefen |
| 5 | UI-Text passt zum Kontext? | $SCOUT nur Trading, Tickets nur Events, jede Stelle einzeln |
| 6 | Keine Duplikate? | Grep nach Funktionsname — doppelt nach Agent-Merge? |
| 7 | Service Layer eingehalten? | Kein Supabase direkt, Hooks vor returns, qk.* |
| 8 | Edge Cases bedacht? | Null-Guards, Loading/Empty/Error, 0 Items, 1000 Items |

1 Punkt unklar → nochmal hinschauen. Nicht "wird schon passen".

---

## Beweis-Pflicht

| Aenderungstyp | Pflicht-Beweis |
|---------------|---------------|
| Jede Aenderung | tsc --noEmit (0 Errors) |
| Logik/Service | Test Output (betroffene Tests gruen) |
| UI-Aenderung | Screenshot (Vercel Preview oder Playwright) |
| DB/RPC | SELECT Query mit echten Daten |
| i18n | Beide Sprachen verifiziert |
| Trading/Wallet | DB-Query VOR und NACH der Aktion |

Kein Beweis = "tsc clean", "Tests gruen", "sieht ok aus", "Agent sagt fertig", "sollte passen".

---

## Agent-Output-Regeln

Agent-Output ist ein ENTWURF, kein fertiges Ergebnis.

1. Diff lesen — JEDE Zeile
2. Scope-Check — NUR was im Issue stand? Beyond-Scope → revert
3. Dieselbe 8-Punkt Checkliste — kein Vertrauensbonus
4. Kontext-Check — passt zum bestehenden File?
5. Git Diff vor Commit (Paperclip)
6. Zusammenspiel pruefen (parallele Agents)

Review laenger als selber machen → selber machen.

---

## Leitplanken

1. Neues Problem → separater Task. Scope nicht aufblaehen.
2. Kein Raten — Lesen. common-errors.md, Grep, Service-File oeffnen.
3. Wissen waechst mit Code. Spec/Memory im SELBEN Commit updaten.
4. 2x gescheitert → STOP. Expert-Agent oder Anil fragen.
5. "tsc clean" ≠ fertig. "Agent sagt fertig" ≠ fertig.

---

## Execution-Ebenen
[Keep: Direkte Session vs Paperclip table]
[Keep: Paperclip Company ID]
[Keep: REGEL about same files]

## Session-Start / Session-Ende
[Keep existing]

## Eskalation
[Keep existing]

## Knowledge Capture
[Keep existing]

## Code-Konventionen
[Keep existing]

**Detail-Referenz:** → .claude/rules/workflow-reference.md
```

**Step 3: Verify the file is valid markdown**

Read the file back and confirm structure is correct.

**Step 4: Commit**

```bash
git add .claude/rules/workflow.md
git commit -m "refactor(workflow): quality-first 3-phase system replaces tier-gated quality"
```

---

### Task 2: Update frontend agent — add AFTER phase enforcement

**Files:**
- Modify: `.claude/agents/frontend.md`

**Step 1: Read current file**

Read `.claude/agents/frontend.md` — focus on Phase 2 (Self-Check).

**Step 2: Add mandatory AFTER phase**

In Phase 2a (Verification bestanden), ADD before the existing acceptance criteria checklist:

```markdown
### AFTER Phase (PFLICHT — dieselbe Checkliste wie CTO)

Bevor du "PASS" meldest, durchlaufe die AFTER Phase:

1. **SELF-REVIEW:** JEDE geaenderte Datei nochmal komplett lesen
2. **8-Punkt Checkliste:**
   - [ ] Types propagiert (Type → Service → Hook → UI)?
   - [ ] i18n komplett (DE + TR)?
   - [ ] Column-Names korrekt (common-errors.md)?
   - [ ] Alle Consumers aktualisiert (Grep)?
   - [ ] UI-Text passt zum Kontext?
   - [ ] Keine Duplikate nach Merge?
   - [ ] Service Layer eingehalten?
   - [ ] Edge Cases bedacht (null, 0, loading, error)?
3. **Beweis:** tsc Output + Test Output im Journal dokumentieren
```

Add to Anti-Patterns:

```markdown
- NICHT "fertig" melden ohne AFTER Phase — JEDER Punkt muss geprueft sein
- NICHT beyond-scope arbeiten — NUR was im Issue/Task-Package steht
```

**Step 3: Commit**

```bash
git add .claude/agents/frontend.md
git commit -m "chore(agents): add AFTER phase enforcement to frontend agent"
```

---

### Task 3: Update backend agent — add AFTER phase enforcement

**Files:**
- Modify: `.claude/agents/backend.md`

**Step 1: Read current file**

Read `.claude/agents/backend.md` — focus on Phase 2 (Self-Check).

**Step 2: Add mandatory AFTER phase**

Same pattern as frontend. In Phase 2a, ADD:

```markdown
### AFTER Phase (PFLICHT — dieselbe Checkliste wie CTO)

Bevor du "PASS" meldest, durchlaufe die AFTER Phase:

1. **SELF-REVIEW:** JEDE geaenderte Datei nochmal komplett lesen
2. **8-Punkt Checkliste:**
   - [ ] Types propagiert (Type → Service → Hook → UI)?
   - [ ] i18n komplett (DE + TR falls UI-relevant)?
   - [ ] Column-Names korrekt (common-errors.md + Skill)?
   - [ ] Alle Consumers aktualisiert (Grep)?
   - [ ] RLS Policies komplett (SELECT + INSERT + DELETE)?
   - [ ] Keine Duplikate nach Merge?
   - [ ] Service Layer eingehalten?
   - [ ] Edge Cases bedacht (null, 0, concurrent writes)?
3. **Beweis:** tsc Output + Test Output + bei DB: SELECT Query im Journal dokumentieren
```

Add to Anti-Patterns:

```markdown
- NICHT "fertig" melden ohne AFTER Phase
- NICHT beyond-scope arbeiten
```

**Step 3: Commit**

```bash
git add .claude/agents/backend.md
git commit -m "chore(agents): add AFTER phase enforcement to backend agent"
```

---

### Task 4: Update reviewer agent — align checklist with 8-point standard

**Files:**
- Modify: `.claude/agents/reviewer.md`

**Step 1: Read current file**

Already read. The reviewer has a 10-point checklist that mostly covers the same ground but uses different numbering/wording.

**Step 2: Add explicit 8-point cross-reference**

At the top of the Checkliste section, add:

```markdown
**Referenz:** Die 8-Punkt Self-Review Checkliste aus workflow.md gilt auch hier.
Dein Review prueft ob der Implementer JEDE Checkliste eingehalten hat.
Zusaetzlich pruefst du die erweiterten Punkte unten (RPC Paritaet, Side-Effects, etc.).
```

**Step 3: Commit**

```bash
git add .claude/agents/reviewer.md
git commit -m "chore(agents): cross-reference 8-point checklist in reviewer"
```

---

### Task 5: Consolidate quality feedback memories

**Files:**
- Create: `memory/feedback_quality_first_standard.md` (in user memory dir)
- Delete: 6 redundant feedback files that are now captured in workflow.md

**Step 1: Identify files to consolidate**

These 6 files all say variations of "check better, don't skip verification":
- `feedback_iterative_quality_loop.md` → absorbed into AFTER phase
- `feedback_visual_qa_discipline.md` → absorbed into Evidence requirements
- `feedback_live_testing_discipline.md` → absorbed into Evidence requirements
- `feedback_debug_discipline_s255.md` → absorbed into Leitplanken (2x fail → stop)
- `feedback_spec_driven_workflow.md` → absorbed into BEFORE phase
- `feedback_review_all_codepaths.md` → absorbed into Checklist point 4

**Step 2: Create consolidated memory**

```markdown
---
name: Quality-First Standard
description: Single authoritative quality reference — replaces 6 scattered feedback files. BEFORE/DURING/AFTER phases, 8-point checklist, evidence requirements.
type: feedback
---

Quality-First Standard gilt seit 2026-04-01. Alle vorherigen Quality-Feedback-Regeln
sind in workflow.md konsolidiert.

**Why:** Sessions 249-258 zeigten wiederholte Qualitaetsprobleme: blind gemergter Agent-Output,
vergessene i18n Keys, falsche Column-Names, "sieht gut aus" ohne Verification,
Code ohne Spec. Anil musste alles manuell nachkontrollieren. Das Design wurde
in docs/plans/2026-04-01-quality-first-workflow-design.md festgehalten und von Anil abgenommen.

**How to apply:** workflow.md ist die Single Source of Truth. Jeder Task durchlaeuft
BEFORE (Define/Scope/Criteria) → DURING (nur Scope, kein Raten) → AFTER (Self-Review,
8-Punkt Checkliste, Verify, Evidence). Keine Ausnahmen ausser Anil sagt "schnell".
```

**Step 3: Delete the 6 absorbed files**

Remove each file individually.

**Step 4: Update MEMORY.md**

Replace the 6 individual entries with one consolidated entry.

**Step 5: Commit**

```bash
git add memory/feedback_quality_first_standard.md
git commit -m "chore(memory): consolidate 6 quality feedback files into single standard"
```

---

### Task 6: Update MEMORY.md index

**Files:**
- Modify: `memory/MEMORY.md` (in user memory dir)

**Step 1: Read current MEMORY.md**

Check which feedback entries reference the 6 deleted files.

**Step 2: Replace entries**

Remove:
```
| feedback_iterative_quality_loop.md | ... |
| feedback_visual_qa_discipline.md | ... |
| feedback_live_testing_discipline.md | ... |
| feedback_debug_discipline_s255.md | ... |
| feedback_spec_driven_workflow.md | ... |
| feedback_review_all_codepaths.md | ... |
```

Add:
```
| feedback_quality_first_standard.md | Single source for all quality rules — replaces 6 files, points to workflow.md |
```

**Step 3: Update workflow entry in MEMORY.md**

Update the workflow description line to reference Quality-First:
```
- Workflow: Quality-First 3-Phase System (BEFORE/DURING/AFTER) — no tier-based quality shortcuts
```

---

### Task 7: Final verification

**Step 1: Read all modified files**

Read back every modified file and verify:
- workflow.md has 3-phase system, 8-point checklist, evidence table, agent-output rules, leitplanken
- frontend.md has AFTER phase enforcement
- backend.md has AFTER phase enforcement
- reviewer.md cross-references 8-point checklist
- MEMORY.md index is clean and correct
- Consolidated memory file exists

**Step 2: Verify no broken references**

Grep for any references to deleted feedback files in MEMORY.md or other files.

**Step 3: Final commit if any fixes needed**

```bash
git status
# fix anything missed
```
