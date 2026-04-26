# Slice 211 — Spec-Foundation-Uplift (Agent-Context-Building + Pattern-Codify)

**Status:** SPEC · **Größe:** L (Meta-Process-Slice) · **Scope:** CEO-approved (Anil-Direktive 2026-04-26 "wir machen erstmal einige optimierungen in unseren fähigkeiten und workflow") · **Datum:** 2026-04-26

## 1. Problem Statement

Phase-A-Audit-Drift (Slice 209: 12 stale row-marker), Worktree-Agent-Isolation-Escape (Slice 207), Type-Truth-Latent-Bugs (D43 Slice 192/193, D49 Slice 200), und Reviewer-Agent-Fund-Pattern (CONCERNS-Findings die mit besserer Spec vorne weg gemeldet hätten werden können) zeigen ein systemisches Problem: **Agents werden ohne ausreichenden Kontext-Kompass losgeschickt.**

`/spec` Skill existiert bereits sehr detailliert (319 Zeilen, 9 Pflicht-Sektionen mit Discovery-Probes, AC-Categories, Pre-Mortem). Aber die echte Lücke: das Skill wird bei XS/S-Slices ignoriert, und keine Sektion adressiert das **Meta-Briefing**: was muss der Agent VOR Code lesen? Welche Patterns sind relevant? Welche Self-Verification-Commands kann er laufen lassen?

**Anils Direktive:** "mit der SPEC steht und fällt alles … der agent soll nicht blind sein, er muss sich seinen context bei bedarf auf bauen, ihr seid doch alle intelligent, dann nutzt es auch aus".

**Übersetzung:** Spec liefert nicht alles vorgekaut, sondern **Pointer + Pflichten**: "Lies File X bevor du Code schreibst", "Pattern Y aus errors-frontend.md gilt hier", "Verifiziere via grep Z". Agent ist intelligent genug zum Lookup — aber er braucht den Kompass.

## 2. Lösungs-Design (Architektur)

Drei orthogonale Achsen:

**Achse 1: Spec-Inhalt** — `/spec` Skill wird um 4 neue Pflicht-Sektionen erweitert:
- **Code-Reading-Liste:** Files die Agent VOR Implementation MUSS lesen (mit Begründung)
- **Pattern-References:** common-errors / patterns / decisions die für DIESEN Slice relevant sind
- **Self-Verification-Commands:** Audit-Commands die Agent selbst laufen lassen kann (grep, tsc, vitest, supabase-mcp)
- **Open-Questions:** Was MUSS der Agent klären bevor er Code schreibt (vs. was darf er autonom entscheiden)

**Achse 2: Spec-Größen-Standard** — workflow.md erweitert um Slice-Größen-spezifische Mindest-Anforderungen:
- XS Mini-Spec → mindestens 5 Sektionen pflicht (Ziel, Files, ACs ≥ 3, Code-Reading-Liste ≥ 3 Items, Self-Verification ≥ 1 Command)
- S/M Voll-Spec → 9 Sektionen pflicht (siehe /spec Skill) + 4 neue Sektionen
- L Voll-Spec → wie S/M + Pre-Mortem ≥ 5 Szenarien + Wave-Plan

**Achse 3: Hook-Enforcement** — `ship-cto-review-gate.sh` erweitert um Reviewer-Verdict-Schema-Enforcement (regex-prüft `**Verdict:** (PASS|REWORK|FAIL|CONCERNS)`).

Plus 3 Pattern-Promotions (Drafts aus Slice 207 in Rules) und 1 Decision (D50).

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `worklog/specs/_TEMPLATE.md` | NEU | Master-Spec-Template, referenziert vom Workflow + /ship new |
| `.claude/rules/workflow.md` | EDIT | SPEC-Stage erweitert um 4 neue Pflicht-Sektionen + Slice-Größen-Standard + Pre-Review-Memo Pattern |
| `.claude/skills/spec/SKILL.md` | EDIT | 4 neue Sektionen ergänzt (1.10 Code-Reading, 1.11 Pattern-References, 1.12 Self-Verification, 1.13 Open-Questions) |
| `.claude/skills/parallel-dispatch/SKILL.md` | EDIT | 3 Briefing-Blöcke ergänzt: Absolute-Paths-Pflicht, Pre-Review-Memo Pattern, Service-Schnittstelle vorab |
| `.claude/skills/ship/SKILL.md` | (Wave 2 Slice 212) | `/ship new` Auto-Copy von _TEMPLATE.md → in Slice 211 NICHT editiert (siehe Open-Question 1 + Scope-Out) |
| `.claude/hooks/ship-cto-review-gate.sh` | EDIT | Verdict-Schema-Enforcement via regex |
| `.claude/rules/common-errors.md` | EDIT | Cross-Cutting: Worktree-Isolation-Escape Pattern (Draft 1 promoted) |
| `.claude/rules/errors-db.md` | EDIT | Migration-Heal v1→v2 Same-Session Pattern (Draft 3 promoted) |
| `memory/decisions.md` | EDIT | D50: Spec-Standard-Pflicht für Agent-Context-Building (PROCESS) |
| `memory/patterns.md` | EDIT | Pattern #39: Pre-Review-Memo (Draft 2 promoted) |

**Total:** 7 EDITs + 2 NEW Files (ship/SKILL.md ist Wave 2, korrigiert post-Reviewer).

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

Diese Sektion ist die Demo der neuen Pflicht-Sektion in /spec.

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `.claude/skills/spec/SKILL.md` | Existing /spec Skill — keine Doppelung | Sind 9 Sektionen schon da? Was fehlt? |
| `.claude/rules/workflow.md` | Existing SPEC-Stage Beschreibung | Welche Slice-Größen-Definitionen existieren? |
| `.claude/skills/parallel-dispatch/SKILL.md` | Existing Briefing-Template | Welche Briefing-Blöcke existieren bereits? |
| `.claude/hooks/ship-cto-review-gate.sh` | Existing Hook-Logik | Wo greift der File-Existence-Check? Wo füge ich Schema-Enforcement ein? |
| `worklog/specs/208-trend-sparkline-mini-chart.md` | Reference für gut-gemachte Slice-Spec | Welche Sektionen waren ausreichend, welche fehlten? |
| `worklog/reviews/208-review.md` | Reference für Reviewer-Verdict-Schema | Format das ich enforce muss |
| `memory/session-handoff.md` | 3 Drafts aus Slice 207 — exakte Texte | Welche Pattern-Texte promoten? |
| `.claude/rules/errors-db.md` | Existing Pattern-Sammlung | Wo füge ich Migration-Heal-Pattern ein? Naming-Konvention? |
| `memory/patterns.md` | Existing #1-#38 Pattern-Liste | Was ist Pattern #39? Naming-Konvention prüfen |

## 5. Pattern-References (Relevant für Slice 211)

Aus existing rules-Sammlung:

- `workflow.md` D35 (Self-Review per trivial-pattern-Wiederholung) — wird durch neue Sektionen ergänzt, nicht ersetzt.
- `decisions.md` D45 (Worktree-Awareness-Briefing Pflicht-Block) — direkt verbunden mit Achse-3-Pattern-Promotion.
- `decisions.md` D46 (Service-Schnittstelle vorab spezifizieren bei BE+FE-Dispatch) — wird in /parallel-dispatch konkretisiert.
- `decisions.md` D48 (Reviewer-Agent als Audit-Stale-Catcher) — wird durch Hook-Enforcement (Verdict-Schema) automatisiert.
- `errors-db.md` "CREATE OR REPLACE FUNCTION — PATCH-AUDIT PFLICHT" (Slice 156) — Migration-Heal-Pattern ist Variante davon.
- `patterns.md` #29 (Trigger+GUC-Invariant-Enforcement-Template) — formatives Vorbild für Pattern-Naming.

## 6. Acceptance Criteria (Executable)

**AC-01:** [PROCESS] Spec-Template-File existiert
- VERIFY: `cat worklog/specs/_TEMPLATE.md`
- EXPECTED: 13+ Sektionen ausgefüllt mit Beispiel-Platzhaltern
- FAIL IF: File fehlt oder hat <10 Sektionen

**AC-02:** [PROCESS] workflow.md SPEC-Stage hat neue Pflicht-Sektionen
- VERIFY: `grep -E "Code-Reading-Liste|Pattern-References|Self-Verification|Open-Questions" .claude/rules/workflow.md | wc -l`
- EXPECTED: ≥ 4 Treffer
- FAIL IF: <4 Treffer

**AC-03:** [PROCESS] /spec Skill hat 4 neue Sektionen 1.10-1.13
- VERIFY: `grep -E "^### 1\\.(10|11|12|13)" .claude/skills/spec/SKILL.md`
- EXPECTED: 4 Treffer (1.10, 1.11, 1.12, 1.13)
- FAIL IF: <4 Treffer

**AC-04:** [HOOK] ship-cto-review-gate enforced Verdict-Schema
- VERIFY: `grep -E "Verdict.*PASS\\|REWORK\\|FAIL\\|CONCERNS" .claude/hooks/ship-cto-review-gate.sh`
- EXPECTED: 1+ Treffer (regex pattern)
- FAIL IF: 0 Treffer

**AC-05:** [PROCESS] /parallel-dispatch hat 3 neue Briefing-Blöcke
- VERIFY: `grep -E "ABSOLUT.*Path|Pre-Review-Memo|Service-Schnittstelle.*vorab" .claude/skills/parallel-dispatch/SKILL.md`
- EXPECTED: 3 Treffer
- FAIL IF: <3 Treffer

**AC-06:** [PATTERN-PROMOTION] 3 Drafts in Rules
- VERIFY: `grep -E "Worktree-Isolation-Escape|Migration-Heal v1→v2|Pre-Review-Memo" .claude/rules/common-errors.md .claude/rules/errors-db.md .claude/rules/workflow.md memory/patterns.md`
- EXPECTED: ≥ 3 distincte Treffer-Files
- FAIL IF: <3 Treffer

**AC-07:** [DECISION] D50 dokumentiert
- VERIFY: `grep -E "^## D50" memory/decisions.md`
- EXPECTED: 1 Treffer
- FAIL IF: 0 Treffer

**AC-08:** [STRUCTURAL] tsc clean (kein Code-Bug eingeführt)
- VERIFY: `npx tsc --noEmit`
- EXPECTED: keine Output-Zeilen (clean)
- FAIL IF: Type-Errors

**AC-09:** [REGRESSION] Existing /ship Skill funktioniert weiter
- VERIFY: `bash .claude/hooks/ship-cto-review-gate.sh < /dev/null` (legacy mode test)
- EXPECTED: exit 0 (no input → no block)
- FAIL IF: false-trigger

**AC-10:** [REGRESSION] Existing Specs nicht invalidiert
- VERIFY: Slice 208 Spec (worklog/specs/208-trend-sparkline-mini-chart.md) wird NICHT als invalid markiert
- EXPECTED: keine retro-active Strafmaßnahmen für pre-Slice-211 Specs
- FAIL IF: pre-211 Specs werden retroactively als nicht-konform markiert

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Hook-Bypass | Reviewer-File leer (`touch` Notfall-Bypass) | empty file | Hook passes (no Verdict-Check da File-only-Existence-Check primär) | Verdict-Schema ist WARNING bei empty file, nicht BLOCK |
| 2 | Hook-False-Trigger | Reviewer-File enthält "Verdict: PASS" ohne Bold-Markdown | `Verdict: PASS` (no `**`) | Hook passes (regex tolerant gegen Bold-Variation) | Regex `\\**Verdict:\\**` |
| 3 | Spec-Größen-Drift | XS-Slice mit nur 3 Sektionen (kein Code-Reading) | minimal spec | Hook warnt, blockt aber nicht (XS-Toleranz) | workflow.md erlaubt explicit XS-Reduzierung |
| 4 | Pre-Review-Memo missing | Agent dispatched ohne pre-review.md | implicit | Reviewer-Agent muss damit umgehen können | Pre-Review-Memo ist OPT-IN nicht Pflicht |
| 5 | Pattern-Reference-Drift | Slice referenziert Pattern #X aus patterns.md, X existiert nicht | broken link | Reviewer-Agent flag MEDIUM-Finding | Reviewer-Briefing erweitert um Pattern-Validity-Check |
| 6 | Code-Reading-Liste falsch | Spec sagt "lies File Y", File Y existiert nicht | typo/drift | Agent spricht Frage zurück | Agent-Dispatch-Pattern: "Falls File X nicht existiert, frag zurück" |
| 7 | Self-Verification fail | Audit-Command in Spec funktioniert nicht (typo, falsche Pfade) | broken cmd | Agent flag in Pre-Review-Memo | Spec-Quality-Self-Check vor Dispatch |
| 8 | Hook-Performance | ship-cto-review-gate parsed jeden git-commit | every commit | <100ms perf-budget | regex statt full file-parse |

## 8. Self-Verification (Commands)

Was ich (oder Reviewer-Agent) selbst laufen lassen kann post-Implementation:

```bash
# AC-Checks alle in einem Schritt
cd C:/bescout-app
echo "=== AC-01 Template ===" && ls -la worklog/specs/_TEMPLATE.md
echo "=== AC-02 workflow.md ===" && grep -cE "Code-Reading-Liste|Pattern-References|Self-Verification|Open-Questions" .claude/rules/workflow.md
echo "=== AC-03 /spec sections ===" && grep -cE "^### 1\.(10|11|12|13)" .claude/skills/spec/SKILL.md
echo "=== AC-04 Hook regex ===" && grep -cE "Verdict.*PASS" .claude/hooks/ship-cto-review-gate.sh
echo "=== AC-05 parallel-dispatch ===" && grep -cE "ABSOLUT|Pre-Review-Memo|Service-Schnittstelle.*vorab" .claude/skills/parallel-dispatch/SKILL.md
echo "=== AC-06 Pattern-Promotions ===" && grep -lE "Worktree-Isolation-Escape|Migration-Heal v1→v2|Pre-Review-Memo" .claude/rules/common-errors.md .claude/rules/errors-db.md .claude/rules/workflow.md memory/patterns.md
echo "=== AC-07 D50 ===" && grep -cE "^## D50" memory/decisions.md
echo "=== AC-08 tsc ===" && npx tsc --noEmit && echo "OK"
echo "=== AC-09 Hook smoke ===" && echo '{}' | bash .claude/hooks/ship-cto-review-gate.sh && echo "Exit-OK"
```

Reviewer-Agent kann das auch selbst laufen lassen (hat Bash-Tool).

## 9. Open-Questions (vor Implementation klären)

1. **Soll _TEMPLATE.md Foundation für /ship new sein?** Ja — `/ship new` referenziert die Datei + auto-kopiert als Start-Spec. Aber: das ist Wave 2 (eigener Hook-Slice), nicht Slice 211. Slice 211 erstellt nur die _TEMPLATE.md.
2. **Verdict-Schema-Enforcement: BLOCK oder WARN bei missing Verdict?** WARN (echo warning + exit 0) — sonst breakt der Hook bei jedem Reviewer-Output der das Format leicht abweicht. Bei BLOCK riskiert man false-positives die produktive commits stoppen. Sicherer: WARN log + maintain File-Existence-BLOCK.
3. **D50: Wie hart wird Spec-Standard?** Soft-Pflicht (workflow.md beschreibt Standard). Kein neuer Hook der spec-quality enforced (das ist Wave 2 Slice 212). Erstmal Documentation-First.
4. **Pattern-Promotion: alle 3 Drafts in dieser Session?** Ja, alle 3 in Slice 211 — sonst akkumulieren sie zu Pending-Backlog wie schon einmal.
5. **Sollen XS-Slices auch Code-Reading-Liste haben?** Ja, mindestens 3 Items. Slice 210 (UX 17) hatte z.B. inline-Spec mit "Pattern aus inventory CosmeticsSection.tsx:78-80" — das IST eine 1-Item-Code-Reading-Liste. Standardisieren als Mindest-Pflicht.

## 10. Proof-Plan

1. `npx tsc --noEmit` → clean (Pflicht).
2. AC-Audit-Block aus Sektion 8 oben → alle AC-01 bis AC-09 grün.
3. Output speichern als `worklog/proofs/211-ac-audit.txt`.
4. Reviewer-Agent dispatcht: prüft Pattern-Promotions inhaltlich (nicht nur grep) + verifiziert workflow.md / SKILL.md sind kohärent.

## 11. Scope-Out (Wave 2)

Folgendes ist explizit NICHT in Slice 211 (geht in Slice 212+):
- `ship-spec-quality-gate.sh` Hook (enforced Spec-Pflicht-Sektionen pre-BUILD)
- `.claude/skills/ship/SKILL.md` Edit: `/ship new` Auto-Copy von _TEMPLATE.md (post-Reviewer-Heal: explicit als Wave 2 markiert)
- `scripts/audit-stale-check.ts` (D48-Pattern automatisiert)
- `scripts/type-truth-audit.ts` (D43/D49-Pattern automatisiert)
- GitHub-Issue-First-Workflow (G3 — Migration der Punch-List)
- gtm-writer-Aktivierung (G5)
- Daily-Standup-Email-Bot (G7)
- Bot-Account-Pool für Persona-Walking (G1)

Begründung: Slice 211 ist Documentation-First-Foundation. Tooling-Automation in Wave 2 baut darauf auf, ohne Foundation würden Tools auf Sand stehen.

## 12. Stage-Chain (geplant)

SPEC (diese Datei) → IMPACT (skipped: nur workflow/skill/rules-Files, keine DB/RPC/Service) → BUILD → REVIEW (Reviewer-Agent: prüft inhaltliche Kohärenz, nicht nur Existence) → PROVE → LOG.

## 13. Pre-Mortem (5+ Szenarien)

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | Verdict-Hook false-trigger blockt legitime Reviewer-Outputs | MED | hoch (Commit-Block) | WARN nicht BLOCK + 7-Tage-Beobachtung | Anil-Feedback / Hook-Logs |
| 2 | _TEMPLATE.md wird nicht referenziert/genutzt — Drift | MED | mittel (Standard nur on paper) | /ship new Skill-Update als Wave 2 + Anil-Reminder bei nächstem Slice-Start | Spec-Quality-Audit Quartal 2026-Q3 |
| 3 | Pattern-Promotions kollidieren mit anderen Pattern-Edits | LOW | mittel (Merge-Konflikt) | Atomare Slice-Wave, einer File-Edit pro Pattern | git diff vor commit |
| 4 | Spec-Größen-Standard wird ignoriert weiter (wie /spec Skill auch) | HIGH | niedrig (Process-Drift) | Wave 2 ship-spec-quality-gate.sh Hook → architektonisch enforced | Periodic Spec-Audit |
| 5 | workflow.md wird zu lang, niemand liest es mehr | MED | mittel (Skill-Decay) | Section-Index am Top, klare Hierarchie, Slice-Größen-Tabelle als Quick-Ref | Anil-Feedback nach 2-3 Slices |
| 6 | XS-Slice-Pflicht (Code-Reading ≥ 3 Items) bremst Trivial-Slices | LOW | niedrig (Friction) | XS-Toleranz: 1 Item OK wenn Pattern-Wiederholung | Slice-Velocity-Trend |
| 7 | Reviewer-Agent ignoriert Verdict-Schema-Format | MED | niedrig (kein Effekt nur Warnung) | Briefing-Update in /ship review Block | Hook-Log warning-counts |

---

## Compliance-Check

- Kein Money-Path (Documentation + Hook-Edit + Skill-Edit, kein Service-Code, kein DB)
- Kein i18n-Key-Leak-Risk (keine User-Strings)
- workflow.md / decisions.md sind PROCESS-Decisions → CEO-Scope, aber Anil hat direkt-direktiv approved ("erstelle jetzt den optimierten workflow")
- Pattern-Promotions ändern keine Code-Semantik, nur Documentation

## Open Risiko

Ich verändere Foundation-Dokumente (workflow.md, /spec Skill, /parallel-dispatch Skill, ship-cto-review-gate.sh, errors-db.md, common-errors.md, patterns.md, decisions.md). Wenn ein einziger dieser Edits einen Bug einführt, ist die nächste Session betroffen. Mitigation:
- Reviewer-Agent prüft inhaltlich
- AC-Audit-Block laufen-lassen vor Commit
- Pattern-Promotions sind additive (kein delete), Rückwärts-Kompat erhalten
- Hook-Edit ist additive Regex (kein Logic-Reorder)
