# Slice 215 — Phase-C Re-Run mit Bash-First-Write Briefing (Persona-K + FM-Mechanics)

**Status:** SPEC · **Größe:** S · **Scope:** CTO (Phase-C-Continuation, kein Code) · **Datum:** 2026-04-26

## 1. Problem Statement

Slice 214 dispatched 7 Background-Audit-Agents. **2 davon haben unvollständig geendet:**
- Persona-K (Casual): "BuyConfirmModal — first-buy experience for casual" — Walk endete mid-investigation.
- FM-Mechanics-Expert: "i18n is complete in both locales. Now I have everything to write the audit. Let me write the report." — **Bericht NIE geschrieben.**

Plus: alle 7 Agents haben Output-Files NICHT in `worklog/audits/2026-04-26/` persistiert. Findings nur in Transcripts (kontext-incompatible). Aggregate manuell erstellt aus Final-Notifications.

**Root-Cause:** Briefing-Pattern verlangte "schreib direkt nach <path>" am Ende, aber Agents priorisierten Investigation > File-Write und liefen aus dem Token-Budget bevor sie schrieben.

## 2. Lösungs-Design

**Briefing-Pattern v2 (für Slice 215+ verbindlich):**
1. **FIRST:** Skeleton-File schreiben mit `cat > <path>` — leeres Schema, dann iterativ befüllen.
2. **THEN:** Investigation mit Read/Grep/Glob.
3. **AT EVERY MILESTONE:** Append-Update zur File via `cat >> <path>` (idempotent).
4. **AT END:** Final-Aggregate-Section + Final-Message als Aggregate-Zeile.

**Architektur:**
- 2 Agents background dispatched mit verbessertem Briefing
- Agents schreiben **inkrementell** in `worklog/audits/2026-04-26/<persona|domain>.md`
- Auch wenn Agent mid-investigation crashed: File ist persistent
- Aggregate-Update + Pipeline-Re-Run nach Completion

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `worklog/audits/2026-04-26/persona-k-casual.md` | NEU (durch Agent) | Re-Run Casual-Walk |
| `worklog/audits/2026-04-26/fm-mechanics.md` | NEU (durch Agent) | Re-Run FM-Mechanics-Voll-Audit |
| `worklog/audits/2026-04-26/aggregate.md` | EDIT | Update mit neuen Findings |
| `worklog/beta-phase.md` | EDIT | findings_open Counts aktualisieren |
| `worklog/specs/214-derived-*.md` | regen via Pipeline | Falls neue Findings: neue/erweiterte Stubs |

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `worklog/audits/2026-04-26/aggregate.md` | Was schon da ist | Duplicate-Catcher |
| `.claude/skills/auto-beta-ready/SKILL.md` Briefing-Pattern-Block | Verbessertes Pattern | "FIRST write file, THEN summarize" |
| `.claude/agents/tester-persona-walker.md` | Agent-Tool-Set | Bash + Read + Grep + Glob |

## 5. Pattern-References

- **decisions.md D50** (Slice 211 Spec-Standard) — Briefings müssen Code-Reading-Liste haben
- **patterns.md #38** (Anonymized Aggregate-RPC-Series) — irrelevant, nur Audit
- **Slice 214 Workflow-Learning** — Background-Agent-Output-Persistenz-Pattern

## 6. Acceptance Criteria

**AC-01:** [PERSISTENCE] persona-k-casual.md existiert + ist non-empty
- VERIFY: `wc -l worklog/audits/2026-04-26/persona-k-casual.md`
- EXPECTED: ≥ 20 Zeilen (Schema + mindestens 1 Finding)
- FAIL IF: File leer oder fehlt (Briefing-Pattern v2 versagt)

**AC-02:** [PERSISTENCE] fm-mechanics.md existiert + ist non-empty
- VERIFY: `wc -l worklog/audits/2026-04-26/fm-mechanics.md`
- EXPECTED: ≥ 20 Zeilen
- FAIL IF: File leer oder fehlt

**AC-03:** [SCHEMA] Beide Files haben Findings-Tabelle parsed-fähig
- VERIFY: `npx tsx scripts/findings-to-slices.ts --audit-dir=worklog/audits/2026-04-26 --dry-run`
- EXPECTED: Pipeline parsed beide Files ohne Fehler
- FAIL IF: 0 Findings extracted aus den 2 Files (Format-Drift)

**AC-04:** [AGGREGATE] aggregate.md updated mit neuen Findings
- VERIFY: post-run grep für neue Findings-IDs
- EXPECTED: Aggregate enthält FM-Mechanics + Casual-Findings
- FAIL IF: Aggregate veraltet

**AC-05:** [PHASE-TRACKER] beta-phase.md findings_open updated
- VERIFY: `cat worklog/beta-phase.md | grep findings_open -A 5`
- EXPECTED: incomplete_reruns: 0 (oder reduziert)
- FAIL IF: Counter unverändert

## 7. Edge Cases

| # | Flow | Case | Expected | Mitigation |
|---|------|------|----------|------------|
| 1 | Agent crashed mid-walk | partial-Output | persistent File mit "INCOMPLETE — re-dispatch" Note | Briefing v2 Skeleton-First |
| 2 | Agent findet 0 Findings | no findings | File mit "## No findings — domain healthy" + 0-count Aggregate | Briefing erlaubt explicit |
| 3 | Briefing-v2-Pattern wird ignoriert | Agent schreibt nichts | re-Detection nach Run, neuer Slice 216 | Stop-Hook check post-completion |
| 4 | Format-Drift | Findings-Tabelle ohne Pipe-Header | Pipeline silent skip | try/catch in Pipeline (Slice 214) |

## 8. Self-Verification Commands

```bash
# AC-01 + AC-02:
ls -la worklog/audits/2026-04-26/persona-k-casual.md worklog/audits/2026-04-26/fm-mechanics.md
wc -l worklog/audits/2026-04-26/persona-k-casual.md worklog/audits/2026-04-26/fm-mechanics.md

# AC-03:
npx tsx scripts/findings-to-slices.ts --audit-dir=worklog/audits/2026-04-26 --dry-run

# AC-04:
grep -c "^| " worklog/audits/2026-04-26/aggregate.md

# AC-05:
grep -A 6 "findings_open:" worklog/beta-phase.md
```

## 9. Open-Questions

**Pflicht-Klärung:**
1. Briefing-Pattern v2 — Skeleton-First mit `cat > <path>` heredoc oder via Edit-Tool? → **Antwort:** Bash heredoc, weil Edit benötigt Read first und Skeleton existiert noch nicht.
2. Was wenn Agent KEINE Findings findet? → **Antwort:** File mit `## No findings — <domain> healthy` schreiben. Pipeline skipped (0-row table).

**Autonom-Zone:** Agent entscheidet Investigation-Tiefe + Severity-Klassifikation.

**Nicht-Autonom:** File-Pfad-Convention (`worklog/audits/2026-04-26/<persona|domain>.md`) ist hard.

## 10. Proof-Plan

1. AC-Audit-Block laufen lassen
2. Aggregate updaten + Pipeline re-runnen
3. Output: `worklog/proofs/215-rerun-audit.txt`

## 11. Scope-Out

- Heal der gefundenen Findings (kommt in Slice 216+)
- Schema-Validator für Audit-Files (Wave 3)
- Auto-Briefing-Generator (Wave 3)

## 12. Stage-Chain

SPEC (jetzt) → IMPACT (skipped) → BUILD (parallel-Agent-Dispatch + Wait) → REVIEW (self-review per D35 — pure Re-Run, kein Code-Change) → PROVE → LOG.

## 13. Pre-Mortem

Bei S-Slice optional, hier weggelassen weil Slice 215 keinen Code ändert. Risiken in Edge Cases #1-4 abgedeckt.
