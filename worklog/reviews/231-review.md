# Slice 231 Self-Review (D35 trivial-Pattern)

**Datum:** 2026-04-27
**Reviewer:** CTO Self-Review
**Begründung Self-Review:** XS-Slice, Pattern-Wiederholung von Slice 212 (gleicher Hook), gleiche WARN-only Architektur wie Slice 223 audit-stale-check.ts (Wave-3-Tooling-API).

---

## Verdict: PASS

Slice 231 hebt die Spec-Quality-Gate von Sektion-Existenz-Detection auf Item-Count-Detection. Live verifiziert mit eigener konformer Spec (silent) und Mock-sparse-Spec (WARN mit 1/3 Item-Counts).

---

## Pattern-Reference-Check

| Source | Relevant? | Verifiziert |
|--------|-----------|-------------|
| `decisions.md` D50 | Ja — Mindest-Counts pro Größe sind D50-kanonisch | ✅ Counts in Hook matchen workflow.md SPEC-Stage Tabelle exakt |
| `decisions.md` D52 | Ja — Wave-3-Tooling-API: WARN-only + Negative-Test-Pflicht | ✅ Hook ist WARN-only, Negative-Test im Proof |
| `errors-infra.md` "Shell case-statement wildcard" (Slice 145+146) | Indirekt — keine wildcard-Matches auf User-Input | ✅ awk-Pattern sind alle anchored, kein wildcard |
| `errors-infra.md` "grep `\b` Word-Boundary" (Slice 146) | Direkt anwendbar — UTF-8-`ö` brach den `\b`-Anchor | ✅ Live aufgetreten + gefixt via 2-Step-Detection |

---

## Code-Quality-Check

### Robustheit
- ✅ `bash -n` Syntax-Check passed
- ✅ `[ "${VAR:-0}" -lt N ]`-Pattern für unset/empty defense
- ✅ awk `print count+0` erzwingt Integer-Output
- ✅ `2>/dev/null` auf grep-Calls — Hook bricht nie andere Hooks
- ✅ exit 0 als Default — WARN-only-Architektur erhalten

### Backward-Compatibility
- ✅ Layer 1 (Sektion-Existenz) unverändert. Existing Hook-Skip-Cases bleiben (meta-Files, idle, emergency, stage-filter).
- ✅ MISSING-Block exitiert weiterhin nach WARN-Output (kein doppelter WARN bei fehlender + leerer Sektion).
- ✅ Größe-Default `S` bei nicht-detektierter Annotation bleibt.

### Edge-Case-Coverage (Spec Section 7)
- ✅ Tabellen-Trenner `|---|` skipped via `[[:space:]:|=-]+`-Class
- ✅ Verschachtelte Bullets gezählt (KISS: jede `^[ \t]*[-*+] ` zählt)
- ✅ Sektion-am-Datei-Ende: awk EOF-Stop ohne next-Header — verifiziert in Live-Spec
- ✅ UTF-8-Größe-Header: 2-Step-Detection umgeht `\b`-Bug

---

## Live-Aufgetauchte Bugs während BUILD (alle gefixt)

1. **UTF-8 `\b`-Bug bei `Größe`**
   - Symptom: Hook detektierte `size: S` statt `XS` aus Header `**Größe:** XS · ...`
   - Root: `grep -oiE "...(Größe|...)...\b"` — multi-byte `ö` brach Pattern-Boundary in MSYS Git Bash
   - Fix: 2-Step-Detection: erst Header-Line greppen (`-im1`), dann auf der Line `(XS|S|M|L)\b` extrahieren mit `head -1`
   - Lehre: bekanntes Pattern aus `errors-infra.md` (Slice 146 grep-`\b`-broken). Eingang in den Hook-Header-Comment.

2. **Tabellen-Header-Inflation**
   - Symptom: Edge-Cases-Tabelle 5/3 statt 4/3 (Header `| # | Flow | ... |` zählt mit)
   - Root: Trenner-Detection skippte nur den Trenner, nicht den vorhergehenden Header
   - Fix: `last_was_table_row`-State + `count--`-Rollback bei Trenner-Sicht
   - Lehre: Markdown-Tabellen-Header hat keine Markdown-Syntax-Differenz zu Daten — nur strukturell (followed by trenner)

3. **AC-Code-Block-Skip**
   - Symptom: ACs zeigten 0/3 obwohl 3 ACs in Spec
   - Root: `_TEMPLATE.md` formatiert ACs als ` ``` `-Code-Block. Mein count_items skippte alle Code-Blocks.
   - Fix: in_code-Branch zählt `^[A-Z][A-Z0-9]*[-_][0-9]+:`-Pattern (AC-01/EC-NN/UC-NN)
   - Lehre: Skip-Heuristik darf nicht Standard-Format-Konvention brechen.

---

## Risiken nicht-blockierend

- **R1:** Item-Count-Inflation bei verschachtelten Bullets (sub-bullets zählen mit). **Mitigation:** Bei XS-Mindest-3 ist 1-2 Inflation tolerierbar (alle Specs liegen ≥ 3). Sub-Bullets bringen echten Wert, also bewusste Entscheidung.
- **R2:** AC-Pattern `[A-Z][A-Z0-9]*[-_][0-9]+:` kann False-Positives in Code-Blocks fangen (z.B. SQL `JOIN_FK_2:`). **Probability:** LOW — sehr ungewöhnliches Naming.
- **R3:** Größe-Detection findet erste Match-Line. Wenn Spec mehrere `**Größe:**`-Mentions hat (z.B. in Pre-Mortem-Tabelle), nimmt sie die erste — was korrekt ist (Header-Line ist immer Zeile 3).

---

## Compliance-Check

Nicht relevant — Hook-Refinement, kein User-facing Text, kein Money-Path.

---

## Test-Coverage (Spec Section 6 ACs)

| AC | Status | Evidence |
|----|--------|----------|
| AC-01 HAPPY | ✅ PASS | `worklog/proofs/231-hook-smoke.txt` Zeile 9-13 |
| AC-02 REGRESSION | ✅ PASS | `worklog/proofs/231-hook-smoke.txt` Zeile 17-26 (Mock + Isolated) |
| AC-03 HAPPY (D50-Counts) | ✅ PASS | Sparse 1/3 (alle WARN) vs. Live 5/4/3 (alle silent) |

3/3 ACs grün.

---

## Verdict

**PASS** — Slice 231 ist Production-Ready. Wave-3-Tooling Standard-API erfüllt:
- WARN-only ✅
- Negative-Test-Pflicht ✅
- Heuristik-Refinement-Lehren dokumentiert ✅
- Backward-Compat ✅

**Slice 232 (spec:inline Hard-BLOCK) folgt direkt im Anschluss.**
