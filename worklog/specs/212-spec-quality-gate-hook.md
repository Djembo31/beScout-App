# Slice 212 — Spec-Quality-Gate-Hook + /ship new Template-Reference

**Status:** SPEC · **Größe:** S · **Scope:** CTO (Slice 211 D50 Wave 2 — operationalisiert Foundation) · **Datum:** 2026-04-26

## 1. Problem Statement

Slice 211 hat 13 Pflicht-Sektionen + Slice-Größen-Mindest-Items in workflow.md / _TEMPLATE.md / /spec Skill dokumentiert. **Das ist Documentation-First**, kein Enforcement. Risiko: bei nächstem XS/S-Slice wird inline-Spec ohne Code-Reading-Liste / Pattern-References geschrieben (wie Slice 209/210), und der Standard verstaubt wie das pre-existing /spec Skill (319 Zeilen detailliert, oft ignoriert).

**Evidence:** Slice 211 Reviewer LOW-Finding (`workflow.md:48-51`) — XS-Pflicht-Sektionen 1, 3, 4, 6, 8, 10 sind im Standard, aber nichts erzwingt sie. Sektion 5 (Pattern-References) und 9 (Open-Questions) sind bei XS NICHT pflicht laut workflow.md — Reviewer hat das als Klärungs-LOW markiert.

**Anils Direktive (Slice 211):** "ihr seid doch alle intelligent, dann nutzt es auch aus". Intelligenz braucht Mechanik um nicht zu erodieren.

## 2. Lösungs-Design (Architektur)

**Drei-Layer-Approach:**

**Layer 1: WARN-Hook** `ship-spec-quality-gate.sh`
- Trigger: PreToolUse auf Edit/Write
- Wann: bei Edit/Write auf Code-Files (`src/`, `supabase/migrations/`, `messages/`) bei **active.md.stage in {BUILD, REVIEW, PROVE}** — also wenn der Slice am Code arbeitet
- Aktion: liest Spec-File, greppt nach Pflicht-Sektion-Headers je Slice-Größe, zählt Items in Code-Reading-Liste / Edge-Cases / ACs
- Output: WARN bei missing Pflicht-Sektionen, **kein BLOCK** (Friction-Mitigation analog Slice 211 Verdict-Hook)

**Layer 2: `/ship new` Template-Reference**
- /ship Skill SKILL.md ergänzt um expliziten Verweis auf `worklog/specs/_TEMPLATE.md` als Start-Punkt
- Workflow-Doku-Update: bei /ship new manuell Template kopieren als Slice-Spec-Boilerplate

**Layer 3: settings.json-Registration**
- Hook in PreToolUse-Edit|Write-Block registrieren

**Anti-Pattern-Sicherheit:**
- WARN-only: false-positive bei legitimen Quick-Fixes (typo, comment, .gitignore) blockt nicht
- Slice-Größen-spezifisch: XS hat lockere Pflicht (6 Sektionen), L hat strikte (13 + Pre-Mortem)
- Skip bei stage `SPEC` (Spec wird erst geschrieben), `LOG` (Slice fertig), `idle` (kein aktiver Slice)
- Skip bei kleinen File-Edits (worklog/ + memory/ + .claude/ — meta-Files sind separater Workflow)

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `.claude/hooks/ship-spec-quality-gate.sh` | NEU | WARN-Hook prüft Spec-Pflicht-Sektionen je Slice-Größe |
| `.claude/settings.json` | EDIT | Hook-Registration in PreToolUse-Edit|Write-Block |
| `.claude/skills/ship/SKILL.md` | EDIT | `/ship new` referenziert _TEMPLATE.md explizit |

**Keine Code-Aenderungen, keine DB, kein RPC.** Pure Workflow-Tooling.

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `.claude/hooks/ship-spec-gate.sh` | Bestehender Hook-Pattern | Wie liest er JSON-Stdin? Wie greppt er active.md? Welche Pfad-Normalisierung? |
| `.claude/hooks/ship-cto-review-gate.sh` | Slice 211 Verdict-Schema-Hook | Wie macht er WARN-only? Wie tolerantes Regex? Wie Notfall-Bypass? |
| `.claude/hooks/ship-proof-gate.sh` | Bestehender Pre-Commit-Hook | Wie unterscheidet er Slice-Größen / Spec-Pfade? |
| `.claude/rules/workflow.md` | Slice 211 SPEC-Stage Definitionen | Slice-Größen-Tabelle (XS 6 Sektionen, S/M 13, L 13 + Pre-Mortem) |
| `.claude/skills/spec/SKILL.md` | Slice 211 4 neue Sektionen 1.10-1.13 | Welche Section-Header soll Hook greppen? |
| `worklog/specs/_TEMPLATE.md` | Master-Template | Welche Section-Header sind authoritative? |
| `worklog/specs/211-spec-foundation-uplift.md` | Reference-Spec L-Slice (alle 13 Sektionen) | Smoke-Test des Hook-Outputs gegen real-existierende konforme Spec |
| `worklog/specs/210-...` | Reference-Spec XS-Slice (inline-spec) | Smoke-Test gegen non-konforme (vor Slice 211 Standard) Spec — soll WARN feuern |
| `.claude/settings.json` | Bestehende Hook-Registration | Welche Stelle in PreToolUse-Edit|Write-Block? |
| `.claude/skills/ship/SKILL.md` | /ship Skill (alle 6 Sub-Commands) | Wo `/ship new` editiert? |

## 5. Pattern-References (relevant für Slice 212)

- **decisions.md D50** (Slice 211) — Spec-Standard-Pflicht für Agent-Context-Building. Slice 212 operationalisiert D50.
- **decisions.md D48** (Reviewer-Agent als Audit-Stale-Catcher) — Hook ist proaktive Layer-0-Schutz vor D48-Pattern-Wiederholung.
- **patterns.md #29** (Trigger+GUC-Invariant-Enforcement-Template) — Vorbild für strukturierte Hook-Implementation mit klarer Bypass-Mechanik.
- **errors-infra.md** "Shell case-statement wildcard promiskuös" (Slice 145+146) — Hook-Bash-Pattern: command-token-anchor, JSON-escape-aware regex.
- **workflow.md** Slice-Größen-Tabelle — definiert XS/S/M/L Mindest-Items.

## 6. Acceptance Criteria

**AC-01:** [HOOK] ship-spec-quality-gate.sh existiert und ist executable
- VERIFY: `ls -la .claude/hooks/ship-spec-quality-gate.sh && bash -n .claude/hooks/ship-spec-quality-gate.sh`
- EXPECTED: File existiert + Bash-Syntax-Check passed
- FAIL IF: File fehlt oder Syntax-Error

**AC-02:** [HOOK-LOGIC] WARN bei XS-Spec ohne Mindest-6-Sektionen
- VERIFY: Test-Spec mit nur 3 Sektionen + active.md slice=test → Hook output WARN
- EXPECTED: stderr enthält "Spec-Quality-WARN" + section-count, exit 0 (nicht 2)
- FAIL IF: BLOCK (exit 2) oder kein WARN-Output

**AC-03:** [HOOK-LOGIC] No-output bei konformer Spec
- VERIFY: Slice-211-Spec (alle 13 Sektionen) + active.md slice=211 → Hook silent
- EXPECTED: kein stderr, exit 0
- FAIL IF: false-positive WARN

**AC-04:** [HOOK-SAFETY] Skip bei active.md idle / stage=SPEC / stage=LOG
- VERIFY: 3× separater Test mit jeweiligem Stage → Hook silent
- EXPECTED: kein stderr, exit 0 (Hook macht nichts)
- FAIL IF: false-positive WARN bei legitimen Stages

**AC-05:** [HOOK-SAFETY] Skip bei meta-File-Edits (worklog/, memory/, .claude/)
- VERIFY: Edit auf `worklog/active.md` während Slice mit non-konformer Spec → Hook silent
- EXPECTED: kein stderr, exit 0
- FAIL IF: false-positive WARN

**AC-06:** [SETTINGS] Hook in settings.json registriert
- VERIFY: `grep "ship-spec-quality-gate" .claude/settings.json`
- EXPECTED: 1 Treffer in PreToolUse-Edit|Write-Block
- FAIL IF: 0 Treffer

**AC-07:** [SKILL] /ship new referenziert _TEMPLATE.md
- VERIFY: `grep -E "_TEMPLATE\.md|specs/_TEMPLATE" .claude/skills/ship/SKILL.md`
- EXPECTED: ≥1 Treffer im /ship new Sub-Command-Block
- FAIL IF: 0 Treffer

**AC-08:** [REGRESSION] Existing Hooks funktionieren weiter
- VERIFY: `echo '{"file_path":"src/lib/services/players.ts"}' | bash .claude/hooks/ship-spec-gate.sh; echo "Exit: $?"`
- EXPECTED: Exit 0 (idle Slice = allow) ODER 2 (active Slice ohne emergency = block, je nach State)
- FAIL IF: Hook-Output verwirrend, neuer Hook bricht alten

**AC-09:** [STRUCTURAL] Bash-Syntax + tsc-irrelevant
- VERIFY: `bash -n .claude/hooks/ship-spec-quality-gate.sh && npx tsc --noEmit`
- EXPECTED: kein Syntax-Error, tsc clean
- FAIL IF: Syntax-Bug oder Type-Error

**AC-10:** [DOCS] workflow.md Selbstcheck-Hinweis ergänzt
- VERIFY: `grep "ship-spec-quality-gate" .claude/rules/workflow.md`
- EXPECTED: ≥1 Treffer (Hook-Verweis im Spec-Quality-Selbstcheck-Block)
- FAIL IF: 0 Treffer (Hook ist tool-only ohne Doku)

## 7. Edge Cases

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | active.md missing | first-run, no slice | active.md fehlt | exit 0, kein WARN | `[ ! -f "$ACTIVE" ] && exit 0` |
| 2 | active.md idle | `slice: —` | idle state | exit 0, kein WARN | `case "$SLICE" in ""|"—"|"-") exit 0 ;;` |
| 3 | active.md emergency | `slice: emergency-<ts>` | Notfall-Slice | exit 0, kein WARN (analog Verdict-Hook) | `case "$SLICE" in emergency-*) exit 0 ;;` |
| 4 | Spec-File missing | active.md zeigt slice=212, aber 212-spec nicht existiert | spec-Datei missing | WARN "Spec-File missing" | `[ ! -f "$SPEC_FILE" ] && warn + exit 0` |
| 5 | XS-Spec konform | slice=210 mit 6+ Sektionen | konform | exit 0 silent | section-count ≥ 6, kein WARN |
| 6 | XS-Spec non-konform | slice=205 mit 3 Sektionen (inline) | non-konform | WARN | section-count < 6, output WARN |
| 7 | L-Spec konform | slice=211 mit 13 Sektionen + Pre-Mortem | konform | exit 0 silent | section-count ≥ 13 + Pre-Mortem-grep, kein WARN |
| 8 | meta-File-Edit | Edit auf worklog/active.md | meta-File | exit 0 silent | path-skip-list `worklog/`, `memory/`, `.claude/` |
| 9 | Slice-Size-Detection | active.md hat keine `## Größe:` Zeile | unbekannt | default zu S-Strenge | fallback to S-Pflicht-Items |
| 10 | Section-Header-Drift | Spec hat `## 1) Problem` statt `## 1. Problem Statement` | falsche Nummerierung | Tolerant-Regex `^## ?[0-9]+\.` matcht beides | regex `^## ?[0-9]+\.?` |

## 8. Self-Verification Commands

```bash
# AC-01 + AC-09: Bash-Syntax + Existence
ls -la .claude/hooks/ship-spec-quality-gate.sh
bash -n .claude/hooks/ship-spec-quality-gate.sh

# AC-02: WARN bei non-konformer XS-Spec (smoke gegen Slice 210)
echo '{"file_path":"src/test.ts"}' | bash .claude/hooks/ship-spec-quality-gate.sh
# (Mit künstlich gesetztem active.md slice=210 → WARN expected)

# AC-03: silent bei konformer L-Spec (smoke gegen Slice 211)
# (Mit active.md slice=211 → silent expected)

# AC-04: skip bei stage=SPEC, idle, emergency
# (3× separater Smoke-Test)

# AC-05: skip bei meta-Files
echo '{"file_path":"worklog/active.md"}' | bash .claude/hooks/ship-spec-quality-gate.sh
# expected: silent

# AC-06: settings.json
grep "ship-spec-quality-gate" .claude/settings.json

# AC-07: /ship Skill
grep -E "_TEMPLATE\.md|specs/_TEMPLATE" .claude/skills/ship/SKILL.md

# AC-10: workflow.md
grep "ship-spec-quality-gate" .claude/rules/workflow.md

# Integration:
npx tsc --noEmit
```

## 9. Open-Questions

**Pflicht-Klärung (vor Implementation):**
1. **Section-Header-Format:** _TEMPLATE.md nutzt `## 1. Problem Statement`, `## 2. Lösungs-Design`. Slice 208 Spec nutzt `## Ziel`, `## Betroffene Files` (ohne Nummerierung). Hook muss tolerant sein gegen beide Stile. → **Antwort:** Hook greppt für **bekannte Section-Keywords** (Problem|Ziel, Files|Betroffen, Code-Reading, ACs|Acceptance, Edge|Cases, Self-Verif|Verification, Open-Questions|Klärung, Proof, Scope-Out, Pre-Mortem). Nicht-strikte Section-Number-Regex.
2. **Slice-Größen-Detection-Source:** Header zeigt `**Größe:** XS|S|M|L`. Wenn fehlt → fallback zu welcher Strenge? → **Antwort:** Default S (mittlere Strenge — XS-Toleranz nur bei expliziter `XS`-Markierung).

**Autonom-Zone:**
- Hook-Output-Format (Markdown vs. plain stderr) — pragmatic, lesbar
- Path-Skip-Patterns (welche Pfade ignoriert werden) — workflow.md + Test-Files + node_modules
- Bypass-Notfall-Mechanik — analog Verdict-Hook (emergency-Slice exempt)

**Nicht-Autonom-Zone:** Keine — Slice 212 ist pure Tooling, kein Money/Security.

## 10. Proof-Plan

1. `bash -n .claude/hooks/ship-spec-quality-gate.sh` — Syntax-Check ✓
2. AC-Audit-Block aus Sektion 8 → alle 10 ACs grün
3. **Real-World-Smoke:** Hook gegen Slice-211-Spec laufen lassen (sollte silent sein) und gegen Slice-210-Spec (sollte WARN feuern weil inline-spec ohne Code-Reading-Liste)
4. Output speichern als `worklog/proofs/212-hook-audit.txt`
5. Reviewer-Agent dispatcht: prüft Hook-Logic + Edge-Cases (besonders #4, #8, #10) + integration mit existing Hook-Stack

## 11. Scope-Out

Folgendes ist explizit NICHT in Slice 212 (geht in Slice 213+):
- **Hard-BLOCK statt WARN** für nicht-konforme Specs — erstmal WARN-Daten sammeln, dann entscheiden ob hard-block sinnvoll
- **Auto-Spec-Generation** (Hook erzeugt Spec-Skeleton) — komplex, verschlechtert Reproduzierbarkeit
- **Auto-Copy von _TEMPLATE.md beim /ship new** als Bash-Script — manuelle Kopie reicht für Wave 2; vollautomatisch wäre Wave 3
- **scripts/audit-stale-check.ts** (D48 automation) — eigener Slice 213
- **scripts/type-truth-audit.ts** (D43/D49 automation) — eigener Slice 214
- **CI-Gate gegen Spec-Quality** (GitHub Actions) — post-Beta, Hobby-CI-Limit

## 12. Stage-Chain (geplant)

SPEC (diese Datei) → IMPACT (skipped: Hook + Skill + Settings, kein Cross-Domain) → BUILD → REVIEW (reviewer-Agent: prüft Hook-Logik + Edge-Cases) → PROVE → LOG.

## 13. Pre-Mortem

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | Hook false-positive WARN bei jedem Code-Edit (zu strikt) | MED | mittel (Friction) | Skip-Liste für meta-Files + stage-Filter | Eigenes-Empfinden bei nächsten 3 Slices |
| 2 | Hook silent failure (Bash-Syntax-Bug) | LOW | hoch (Hook macht nichts) | `bash -n` Pre-Commit + Smoke-Tests | AC-01 + AC-09 |
| 3 | Section-Detection bricht bei alternativen Markdown-Stilen | MED | mittel (false-positive WARN) | Tolerant-Regex + bekannte-Keywords-Liste | Edge-Case #10 |
| 4 | Slice-Größen-Detection broken bei missing Header | LOW | niedrig (default S-Strenge) | Fallback-Logic | Edge-Case #9 |
| 5 | Hook performance — parsed jeden Edit | LOW | niedrig (<50ms) | Path-Skip-Filter early exit | Manueller Edit-Latenz-Check |
| 6 | Hook bricht andere Hooks im PreToolUse-Stack | LOW | hoch (kaskadiert auf alle Edits) | exit 0 statt exit 1 bei Fehler im Hook-Body | AC-08 |

---

## Compliance-Check

- Kein Money-Path
- Kein i18n-Risk (keine User-Strings)
- Hook-Edits sind PROCESS-Decisions, von Slice 211 D50 vorgeplant (Wave 2)
- Bash-Pattern-Sicherheit: command-token-anchor, JSON-escape-aware regex (errors-infra.md Lehren)

## TR-Wording

Nicht relevant — pure Tooling, keine User-facing Strings.

## Open Risiko

Hook ist erstes Tooling-Layer auf Slice 211 Foundation. Wenn Hook false-positive WARN bei legitimen Quick-Fixes spamt, untergräbt es das Vertrauen in Workflow-System. **Mitigation:** WARN-only nicht BLOCK, Skip-Liste großzügig. Bei Friction-Beschwerden in nächsten 3 Slices: lockern.
