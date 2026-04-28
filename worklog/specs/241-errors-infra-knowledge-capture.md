# Slice 241 — errors-infra.md Knowledge-Capture (4 Lehren aus Slice 234)

**Status:** SPEC · **Größe:** XS · **Slice-Type:** Doc · **Scope:** CTO · **Datum:** 2026-04-28

> Slice 234 Reviewer-File lieferte 4 Knowledge-Capture-Lehren als Backlog: (1) Spec-Drift im Drift-Heal-Slice ist Anti-Pattern, (2) MSYS Git Bash `tr` UTF-8-Bug, (3) Issue-Closing != Bug-Resolved, (4) settings.json-Edit > 3 Hooks → IMPACT-Stage-Pflicht. Slice 241 promoted alle 4 in `.claude/rules/errors-infra.md` per Knowledge-Flywheel-Pflicht (`workflow.md` Section 5 nach Bug-Fix).

---

## 1. Problem Statement

Slice 234 (System-Wiring Recovery, L-Slice mit Reviewer-Heal-Wave) generierte 4 explizite Knowledge-Lehren im Reviewer-File `worklog/reviews/234-review.md:91-95`. Diese sind 1 Tag in der Review-Datei eingefroren ohne in `.claude/rules/errors-infra.md` zu landen → Knowledge-Flywheel-Drift.

**Konkrete Lehren (aus 234-review.md):**
1. Spec-Drift im Drift-Heal-Slice (D54 selbst hatte F-01/F-07)
2. MSYS Git Bash `tr '[:upper:]' '[:lower:]'` ist nicht UTF-8-aware → dual-Pattern oder `LC_ALL=C.UTF-8`
3. Issue-Closing != Bug-Resolved → Master-Tracker-Issue für recurring Failure-Klassen
4. settings.json-Edit > 3 Hooks sollte künftig IMPACT-Stage triggern

**Wer ist betroffen:** Future-Slices die ähnliche Patterns triggern. Lehre #2 trifft alle Hook-Autoren mit deutschen-Umlauten in Korrekturen. Lehre #3 trifft alle Beta-Blocker-Triage-Workflows. Lehre #4 trifft jeden L/M-Slice mit Hook-Architektur-Updates.

**Wie oft:** Lehren wiederholen sich in Pattern-Familien. Slice 234 hatte F-01/F-07 (Spec-Drift) selbst — exakt das Anti-Pattern aus Lehre #1. Ohne Capture wiederholen wir den Bug bei nächsten L-Slices.

## 2. Lösungs-Design

Pure Markdown-Edit in `.claude/rules/errors-infra.md`:
- **Lehre #2** → erweitere existing `### Shell / Hooks (Windows Git Bash)` Section um UTF-8-tr-Bug (gleicher Locale-Bug-Klasse wie das `\K`-Pattern)
- **Lehre #1** → neue Sub-Section in `## Cross-Cutting / Operational` als Anti-Pattern
- **Lehre #3** → neue Sub-Section in `## Cross-Cutting / Operational`
- **Lehre #4** → neue Sub-Section in `## Cross-Cutting / Operational`

Jede neue Section folgt Convention: `### <Title> (Slice <N>)` + bullet-Liste mit Symptom + Fix + Regel.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `.claude/rules/errors-infra.md` | EDIT | 4 Lehren aufnehmen |
| `worklog/specs/241-errors-infra-knowledge-capture.md` | NEU | Diese Spec |
| `worklog/active.md` + `worklog/log.md` | EDIT | Stage-Updates + Slice-Eintrag |

**Vor diesem Slice greppen:**
```bash
grep -n "^###" .claude/rules/errors-infra.md | head -25
grep -n "Slice 234\|capture-correction\|UTF-8\|MSYS" .claude/rules/errors-infra.md  # 0 matches expected
```

## 4. Code-Reading-Liste

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `worklog/reviews/234-review.md:91-95` | Lehren-Source | Wortlaut aller 4 Lehren |
| `worklog/proofs/234-wiring-recovery-smoke.txt` | F-04 Beweis-Detail | Welche tr-Pattern + LC_ALL-Fix? |
| `.claude/rules/errors-infra.md:90-110` | Existing Shell/Hooks Section | Wo Lehre #2 anschließen? |
| `.claude/rules/workflow.md` Section 5 | Knowledge-Flywheel-Regel | "Bug gefixt → Pattern in errors-* SOFORT" |

## 5. Pattern-References

- `workflow.md` "After Bug-Fix: Knowledge Compilation (Karpathy-Pattern)" — Pflicht-Capture
- `decisions.md` D45 (Hooks > Text-Regeln) — Lehre #4 ist Erweiterung von D45
- `errors-infra.md` "Shell case-statement wildcard promiskuoes" — Stil-Vorlage für Lehre-Sections (Symptom + Fix + Regel)

## 6. Acceptance Criteria

```
AC-01: [LEHRE-2] UTF-8-tr-Bug in Shell/Hooks-Section dokumentiert
  VERIFY: grep -A3 "tr.*upper.*lower\|LC_ALL=C.UTF-8\|UTF-8-aware" .claude/rules/errors-infra.md
  EXPECTED: ≥ 1 Block mit dual-Pattern + LC_ALL-Fix-Beispiel

AC-02: [LEHRE-1] Spec-Drift-im-Drift-Heal als Anti-Pattern
  VERIFY: grep -n "Spec-Drift im\|Drift-Heal-Anti-Pattern" .claude/rules/errors-infra.md
  EXPECTED: ≥ 1 Match

AC-03: [LEHRE-3] Issue-Closing-vs-Bug-Resolved
  VERIFY: grep -n "Issue-Closing\|Master-Tracker.*recurring\|recurring.*Failure-Klasse" .claude/rules/errors-infra.md
  EXPECTED: ≥ 1 Match

AC-04: [LEHRE-4] settings.json-Edit > 3 Hooks → IMPACT
  VERIFY: grep -n "settings.json.*[Ii]mpact\|3.*Hook.*IMPACT" .claude/rules/errors-infra.md
  EXPECTED: ≥ 1 Match

AC-05: [REFERENZ] Alle 4 Sections referenzieren Slice 234
  VERIFY: grep -c "Slice 234" .claude/rules/errors-infra.md
  EXPECTED: ≥ 4

AC-06: [STIL] Sections folgen Convention "### Title (Slice N)"
  VERIFY: grep -E "^### .*\(Slice 234\)" .claude/rules/errors-infra.md
  EXPECTED: ≥ 3 (3 neue Sections, Lehre #2 ist Erweiterung-existing nicht NEU-section)
```

## 7. Edge Cases

| # | Flow | Case | Mitigation |
|---|------|------|------------|
| 1 | Section-Reihenfolge | Wo platzieren? | Nach existing "Shell / Hooks" + vor "Beta-Launch-Ops" Section in Cross-Cutting (chronologisch) |
| 2 | Cross-Reference D45 | Lehre #4 erweitert D45 | Inline-Verweis "(siehe decisions.md D45)" |
| 3 | Code-Block-Examples | Brauchen alle Lehren Code? | Lehre #2: ja (UTF-8-fix), Lehre #1/3/4: optional, Regel-Statement reicht |
| 4 | Anti-Pattern-Markup | Wie in errors-infra.md konsistent? | Existing Section nutzt "Anti-Pattern: ..." prefix → übernehmen |

## 8. Self-Verification Commands

```bash
# Pre-Edit-State:
grep -c "Slice 234" .claude/rules/errors-infra.md  # 0
grep -c "UTF-8-aware\|tr.*upper" .claude/rules/errors-infra.md  # 0

# Post-Edit:
grep -c "Slice 234" .claude/rules/errors-infra.md  # ≥ 4
grep -c "UTF-8-aware\|LC_ALL=C.UTF-8" .claude/rules/errors-infra.md  # ≥ 1
grep -E "^### .*\(Slice 234\)" .claude/rules/errors-infra.md | wc -l  # ≥ 3

# Cross-validate AC1-4:
grep -A3 "tr.*upper.*lower" .claude/rules/errors-infra.md
grep -B1 -A3 "Drift-Heal-Anti-Pattern" .claude/rules/errors-infra.md
grep -B1 -A3 "Issue-Closing" .claude/rules/errors-infra.md
grep -B1 -A3 "settings.json.*Impact\|3 Hook" .claude/rules/errors-infra.md
```

## 9. Open-Questions

**Pflicht-Klärung:** Keine — Lehren stehen wörtlich in Slice 234 review.md.

**Autonom-Zone:** Section-Titel-Wording, Reihenfolge in Cross-Cutting, Code-Block-Granularität.

**Nicht-Autonom:** Keine Money/RPC/UI. Pure Doc.

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| Doc-Update | Pre/Post-Grep + AC-Verify-Output → `worklog/proofs/241-errors-infra-knowledge-capture.txt` |

## 11. Scope-Out

- **patterns.md** Update parallel — out-of-scope, nur errors-infra.md (Lehren sind Bug-Patterns nicht Architektur-Patterns)
- **common-errors.md Section §0** Update — Lehren sind Infra/Process, nicht cross-cutting bug-Klasse
- **decisions.md D-Eintrag** für Lehren — out-of-scope, sie sind Sub-Patterns von D45/D54, kein eigener D-Status

## 12. Stage-Chain

```
SPEC → IMPACT (skipped: Doc-only)
     → BUILD (errors-infra.md edit)
     → REVIEW (self-review D35 — XS Doc-Slice, Pattern-Wiederholung Slice 209/186)
     → PROVE (Pre/Post-grep + AC-Verify)
     → LOG
```

## Open Risiko

**Risk:** Section-Wording driftet von Reviewer-Original. **Mitigation:** Direktes Zitat aus 234-review.md:91-95 als Source-of-Truth.
