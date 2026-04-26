# Slice 214 — Auto-Beta-Ready Self-Healing-Loop (Phase-Tracker + Master-Skill + Hook + Pipeline)

**Status:** SPEC · **Größe:** L (Meta-Process-Slice, Wave 2 Foundation-Operationalisierung) · **Scope:** CEO-approved (Anil-Direktive 2026-04-26 "ich höre fertig aber dem ist nicht so ... das System soll sich selbst heilen autonom") · **Datum:** 2026-04-26

## 1. Problem Statement

**Anil-Quote:** "ich höre jedesmal fertig, aber dem ist nicht so". 

**Evidence (Faktenlage post-Slice-213):**
1. Phase A `audit-beta-readiness` lief Slice ~198 (Wochen alt). Phase B Polish-Sweeps liefen bis ~202.
2. **Phase C `persona-walk` lief NIE in dieser Session** — letzter Output pre-Slice-198. `/persona-walk` Skill existiert seit Slice 085, ungenutzt.
3. **Phase D `/sign-off` Skill ist seit Definition NIE gelaufen.**
4. Punch-List 89/98 closed wurde fälschlich als "App fertig" interpretiert — sie ist Phase-A-Audit-Findings, kein End-to-End-Click-Through.
5. 11 Journey-Files (`memory/journey-1` bis `journey-11`) existieren als Plan, aber kein systematischer Re-Walk.
6. Slice 209 hat 12 audit-stale-marker korrigiert — symptomatisch für **reaktives Disziplin-Versagen**, kein prospektiver Schutz.

**Wer ist betroffen:** Anil (CEO-Frust seit Wochen), die Beta-Tester-Pipeline (3 Tester nicht organisiert weil Stand unklar), ich selbst (verkaufe Halb-fertiges als fertig).

## 2. Lösungs-Design (Architektur)

**Vier-Layer-Self-Healing-System:**

**Layer 1: Phase-Tracker** (`worklog/beta-phase.md`)
- Single-Source-of-Truth für aktuelle Beta-Phase (A | B | C | D | READY)
- Hält: last_phase_run (timestamp), last_signoff (PASS|FAIL|never), findings_open (counts P0/P1/P2/P3)
- Hook + Skill lesen davon, sind nicht in active.md verstreut

**Layer 2: ship-phase-gate Hook** (`.claude/hooks/ship-phase-gate.sh`)
- UserPromptSubmit-Hook
- Wenn Anil/ich "fertig" / "ready" / "beta-launch" / "go-live" sagen UND `last_signoff != PASS` → WARN-Output mit echtem Stand
- WARN-only initially (false-positive bei legitimen Diskussionen), kann später auf BLOCK upgegradet werden

**Layer 3: findings-to-slices Pipeline** (`scripts/findings-to-slices.ts`)
- TypeScript-Script: parsed alle `worklog/audits/<date>/*.md` Findings-Tabellen
- Aggregiert nach Severity (P0 → eigener Slice, P1 → eigener Slice, P2/P3 → Bündel-Slices)
- Generiert Slice-Stub-Files in `worklog/specs/` basierend auf `_TEMPLATE.md`
- Skip wenn audit-stale (Finding bereits gefixt → markiere "stale" + skip)

**Layer 4: auto-beta-ready Master-Skill** (`.claude/skills/auto-beta-ready/SKILL.md`)
- Orchestriert Phase A → B → C → D als Self-Healing-Loop
- 3 Sub-Commands:
  - `/auto-beta-ready start` → läuft Phase A (audit) + B (sweep) + C (persona-walk) + ruft Pipeline + zeigt Slice-Backlog
  - `/auto-beta-ready status` → liest Phase-Tracker, zeigt aktuellen Stand
  - `/auto-beta-ready signoff` → ruft Phase D /sign-off + updated Phase-Tracker

**Plus 2 Doku-Updates:**
- `CLAUDE.md` "Top Rules" — neue Regel: '"Fertig" = Phase-Tracker last_signoff == PASS, sonst kein "fertig" sagen.'
- `.claude/rules/workflow.md` — neue Stage "PHASE-D Sign-Off" als Pflicht vor Beta-READY-Claim.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `worklog/beta-phase.md` | NEU | Phase-Tracker SoT |
| `.claude/hooks/ship-phase-gate.sh` | NEU | UserPromptSubmit-Hook für "fertig"-Catcher |
| `.claude/settings.json` | EDIT | Hook-Registration in UserPromptSubmit-Block |
| `scripts/findings-to-slices.ts` | NEU | Audit-Findings → Slice-Stubs Pipeline |
| `.claude/skills/auto-beta-ready/SKILL.md` | NEU | Master-Orchestrator-Skill |
| `CLAUDE.md` | EDIT | "Top Rules" — Fertig-Definition + Phase-D-Pflicht |
| `.claude/rules/workflow.md` | EDIT | SHIP-Loop-Stage "PHASE-D Sign-Off" als Pflicht-Stage vor Beta-READY |

**Total:** 5 NEU + 2 EDIT.

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `.claude/hooks/ship-cto-review-gate.sh` | Slice 211 WARN-Hook-Pattern | UserPromptSubmit vs PreToolUse Trigger? Bash-pattern-Konvention? |
| `.claude/hooks/ship-spec-quality-gate.sh` | Slice 212 Reviewer-WARN-Pattern | Wie liest er active.md + greppt? Skip-Liste-Pattern |
| `.claude/hooks/ship-status-gate.sh` | Existing Status-Inject-Hook | Triggert auf "fertig\|status\|stand" — Vorlage für phase-gate |
| `.claude/skills/persona-walk/SKILL.md` | Phase-C-Skill-Definition | Sub-Commands Pattern? Wie ruft er tester-persona-walker? |
| `.claude/skills/sign-off/SKILL.md` | Phase-D-Skill-Definition | Welche Verifications-Checks macht er? Output-Schema? |
| `.claude/skills/audit-beta-readiness/SKILL.md` | Phase-A-Skill | Wie dispatcht er die 8 Audit-Agents parallel? |
| `.claude/skills/sweep-page/SKILL.md` | Phase-B-Skill | 6-Linsen-Sweep-Pattern |
| `.claude/skills/ship/SKILL.md` | Master-Skill-Vorbild | Sub-Command-Pattern, active.md-Update |
| `worklog/specs/_TEMPLATE.md` | Master-Spec-Template | Welches Schema soll Pipeline-Script generieren? |
| `worklog/audits/2026-04-25/brand.md` | Audit-Output-Format-Reference | Findings-Tabelle-Struktur — Pipeline muss das parsen |
| `worklog/punch-list-2026-04-25.md` | SoT für was schon done/wont-fix | Pipeline muss Duplicate-Skipping können |
| `memory/decisions.md` D48 | Audit-Stale-Catcher-Pattern | Pipeline muss stale-marker erkennen |

## 5. Pattern-References

- **decisions.md D50** (Slice 211) — Spec-Standard-Pflicht für Agent-Context-Building. Slice 214 ist Wave-2-Operationalisierung.
- **decisions.md D48** (Reviewer-Agent als Audit-Stale-Catcher) — Slice 214 automatisiert was D48 manuell macht.
- **patterns.md #29** (Trigger+GUC-Invariant-Enforcement-Template) — Vorbild für strukturierte Hook-Implementation.
- **patterns.md #36** (Polish-Audit Pre-Existing-Code-Grep) — Pipeline soll das automatisieren.
- **patterns.md #38** (Anonymized RLS-Bypass Aggregate-RPC Series) — orthogonal, nur als Pattern-Vorbild für Doku.
- **errors-infra.md** "Shell case-statement wildcard promiskuös" — Hook-Bash-Pattern-Sicherheit.
- **CLAUDE.md** "premature abstraction" — Pipeline-Script soll nicht over-engineered sein, einfache TS-File reicht.

## 6. Acceptance Criteria

**AC-01:** [STRUCTURE] Phase-Tracker existiert
- VERIFY: `cat worklog/beta-phase.md`
- EXPECTED: enthält `phase:`, `last_phase_run:`, `last_signoff:`, `findings_open:` Felder
- FAIL IF: File fehlt oder Schema unvollständig

**AC-02:** [HOOK] ship-phase-gate.sh existiert + executable
- VERIFY: `bash -n .claude/hooks/ship-phase-gate.sh && ls -la .claude/hooks/ship-phase-gate.sh`
- EXPECTED: Syntax-Check passed
- FAIL IF: Syntax-Error

**AC-03:** [HOOK-LOGIC] WARN bei "fertig"-Claim ohne Sign-Off-PASS
- VERIFY: Test-Run: `echo '{"prompt":"sind wir fertig?"}' | bash .claude/hooks/ship-phase-gate.sh 2>&1`
- EXPECTED: stderr enthält "PHASE-GATE-WARN" wenn last_signoff != PASS
- FAIL IF: kein WARN bei "fertig"-Trigger

**AC-04:** [HOOK-SAFETY] silent bei legitimen Prompts
- VERIFY: `echo '{"prompt":"weiter mit Slice 214"}' | bash .claude/hooks/ship-phase-gate.sh`
- EXPECTED: kein WARN, exit 0
- FAIL IF: false-positive

**AC-05:** [SETTINGS] Hook in UserPromptSubmit-Block registriert
- VERIFY: `grep "ship-phase-gate" .claude/settings.json`
- EXPECTED: 1 Treffer
- FAIL IF: 0

**AC-06:** [PIPELINE-SCRIPT] findings-to-slices.ts existiert + tsc-clean
- VERIFY: `npx tsc --noEmit scripts/findings-to-slices.ts` ODER vollständig `npx tsc --noEmit`
- EXPECTED: keine Output-Zeilen
- FAIL IF: Type-Error

**AC-07:** [PIPELINE-LOGIC] Pipeline parsed Audit-Findings + generiert Slice-Stubs
- VERIFY: `npx tsx scripts/findings-to-slices.ts --audit-dir=worklog/audits/2026-04-26 --dry-run`
- EXPECTED: stdout listet erkannte Findings + geplante Slice-Stub-Filenames
- FAIL IF: 0 Findings erkannt obwohl Audit-Files existieren

**AC-08:** [SKILL] auto-beta-ready Skill existiert
- VERIFY: `ls .claude/skills/auto-beta-ready/SKILL.md`
- EXPECTED: File existiert + frontmatter mit `name: auto-beta-ready` + Sub-Commands `start | status | signoff`
- FAIL IF: File fehlt

**AC-09:** [DOCS] CLAUDE.md hat Fertig-Definition
- VERIFY: `grep -E "Fertig.*last_signoff|beta.?ready.*PASS" CLAUDE.md`
- EXPECTED: ≥1 Treffer
- FAIL IF: 0 Treffer

**AC-10:** [DOCS] workflow.md hat PHASE-D Pflicht-Stage
- VERIFY: `grep -E "PHASE.?D|Phase D Sign-Off" .claude/rules/workflow.md`
- EXPECTED: ≥1 Treffer in MASTER-Prozess-Sektion
- FAIL IF: 0 Treffer

**AC-11:** [INTEGRATION] Pipeline gegen heutige Audit-Outputs (7 Background-Agents)
- VERIFY: nach Pipeline-Run: `ls worklog/specs/214-derived-*.md` (oder ähnliches Naming)
- EXPECTED: ≥1 Slice-Stub generiert (wenn Findings vorhanden), 0 generiert wenn keine Findings (Best-Case)
- FAIL IF: Pipeline crashed bei real Input

**AC-12:** [REGRESSION] Existing Hooks unverändert funktional
- VERIFY: `echo '{"file_path":"src/foo.ts"}' | bash .claude/hooks/ship-spec-gate.sh; echo "Exit: $?"`
- EXPECTED: Exit 0 oder 2 je Slice-State
- FAIL IF: neuer Hook bricht alten

## 7. Edge Cases

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Phase-Tracker missing | first-run, no beta-phase.md | File fehlt | Hook silent + Skill initialisiert | `[ ! -f "$TRACKER" ] && exit 0` plus skill-init |
| 2 | "fertig" in Code-Comment | User editiert File mit `// fertig` | nicht Anil-Prompt | Hook silent (UserPromptSubmit nur, nicht PostToolUse) | trigger-Filter |
| 3 | Pipeline ohne Findings | Audit-Dir leer | leere Tabelle | Pipeline meldet 0 Findings, exit 0 | early-exit + log |
| 4 | Audit-File mit Format-Drift | Markdown-Tabelle leicht anders | parsed-fail | warn + skip File, weiter mit anderen | try/catch per File |
| 5 | Slice-Stub-Naming-Collision | findings-to-slices generiert 214-derived-FM-001.md aber existiert bereits | name-clash | Append `-2`, `-3` Suffix | check-existing |
| 6 | Sign-Off während Findings open | User ruft `/auto-beta-ready signoff` mit P0 open | NO-GO | Skill returnt NO-GO mit Liste | gate-check vor signoff |
| 7 | Hook-Performance | Hook bei jedem Prompt parsed Phase-Tracker | scaled? | <50ms-Budget | early-exit-Filter + minimal sed |
| 8 | Multi-Audit-Date | Pipeline läuft 2026-04-26 + 2026-04-27 | beide Dirs vorhanden | Pipeline auf neuesten Date default | `--audit-dir`-Flag oder ls-sort |
| 9 | Audit-Stale-Catcher | Pipeline parses already-fixed Finding (markiert "stale" in Audit-File) | skip | skipped, kein Slice generiert | regex `audit.?stale\|already.?fixed` |
| 10 | Hook-Trigger-Phrasen | "Beta ist ready" vs "ich teste readiness" | overlap | beide WARN (bewusst, false-positive akzeptabel WARN-only) | regex `\b(fertig\|ready\|launch)\b` |

## 8. Self-Verification Commands

```bash
# AC-01 + AC-02 + AC-08 (file-existence + syntax)
ls -la worklog/beta-phase.md
ls -la .claude/hooks/ship-phase-gate.sh
ls -la scripts/findings-to-slices.ts
ls -la .claude/skills/auto-beta-ready/SKILL.md
bash -n .claude/hooks/ship-phase-gate.sh

# AC-03 (Hook WARN bei "fertig")
echo '{"prompt":"sind wir fertig mit beta?"}' | bash .claude/hooks/ship-phase-gate.sh 2>&1
# expected: WARN-Output

# AC-04 (Hook silent bei legitim)
echo '{"prompt":"weiter mit Slice 215"}' | bash .claude/hooks/ship-phase-gate.sh 2>&1
# expected: silent

# AC-05 (settings.json)
grep "ship-phase-gate" .claude/settings.json

# AC-06 (Pipeline tsc)
npx tsc --noEmit

# AC-07 (Pipeline dry-run)
npx tsx scripts/findings-to-slices.ts --audit-dir=worklog/audits/2026-04-26 --dry-run

# AC-09 (CLAUDE.md)
grep -E "Fertig.*last_signoff|beta.?ready.*PASS" CLAUDE.md

# AC-10 (workflow.md)
grep -iE "PHASE.?D|Phase D Sign-Off" .claude/rules/workflow.md

# AC-11 (real-Pipeline-Run)
npx tsx scripts/findings-to-slices.ts --audit-dir=worklog/audits/2026-04-26 --apply
ls worklog/specs/214-derived-* 2>&1 | head -5

# AC-12 (Regression)
echo '{"file_path":"src/foo.ts"}' | bash .claude/hooks/ship-spec-gate.sh; echo "Exit: $?"
```

## 9. Open-Questions

**Pflicht-Klärung (vor Implementation):**

1. **Slice-Stub-Naming-Convention:** Generiere `214-derived-<domain>-<id>.md` (z.B. `214-derived-fm-mechanics-001.md`)? Oder neue ID-Range (215, 216, 217...)? → **Antwort:** `214-derived-<domain>-<id>.md` als Pre-Stage. Anil approved → manuell renamed zu echter ID. Vermeidet ID-Verschwendung.

2. **Hook-Trigger-Strenge:** "fertig" matchen vs `\b(fertig|ready|launch|go-live|beta.?ready)\b`? → **Antwort:** Word-boundary-Liste. False-positive akzeptiert weil WARN-only.

3. **Pipeline läuft wo?** Standalone via `npx tsx` (Wave 2, manueller Trigger via Skill) ODER als Cron (Wave 3, autonom)? → **Antwort:** Wave 2 manueller Trigger über `/auto-beta-ready start`. Cron in Slice 215+.

**Autonom-Zone:**
- Phase-Tracker-Schema-Details (welche Felder genau)
- Hook-Output-Format
- Pipeline-Helper-Functions

**Nicht-Autonom-Zone:**
- "Fertig"-Definition (CLAUDE.md-Update) — Wording braucht Anil-Sign-Off
- Phase-D-Sign-Off-Bedingungen — was zählt als PASS

## 10. Proof-Plan

1. AC-Audit-Block aus Sektion 8 → alle 12 ACs grün
2. **Live-Integration-Test:** Wenn 7 Background-Agents fertig + Pipeline-Script läuft → reale Slice-Stubs generiert. Anzahl + Severity-Breakdown als Beweis dass System funktioniert.
3. Output speichern: `worklog/proofs/214-loop-audit.txt`
4. Reviewer-Agent dispatcht: prüft Hook-Logic + Pipeline-Korrektheit + Skill-Kohärenz mit Slice 211/212.

## 11. Scope-Out

NICHT in Slice 214 (Wave 3+ Slice 215+):
- **Cron-basierter autonomer Loop** (täglich 03:00 Persona-Walk)
- **GitHub-Issue-First-Migration** (G3 Game-Changer aus Bewertung)
- **Auto-Sentry → Slice-Generation** (G2)
- **Bot-Account-Pool für 24/7 Live-UI-Walks** (G1, Money-Path-Risk)
- **Daily-Email-Standup-Bot** (G7)
- **Hook auf BLOCK-Mode upgraden** (erstmal WARN, ändern wenn Bypass-Vektor missbraucht)

## 12. Stage-Chain (geplant)

SPEC (diese Datei) → IMPACT (skipped: Hook + Skill + Script + 2 Doku-Updates, kein DB/RPC/Service) → BUILD (parallel zu 7 Background-Audit-Agents) → REVIEW (reviewer-Agent prüft Slice 214 + Aggregate der 7 Agents) → PROVE (AC-Audit-Block + Live-Pipeline-Run gegen heutige Audits) → LOG.

## 13. Pre-Mortem (L-Pflicht ≥ 5)

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | Hook false-positive WARN bei jedem zweiten Prompt — User-Frust steigt | MED | mittel (Workflow-Friction) | WARN-only + tolerantere Trigger-Phrasen | Anil-Feedback nach 5 Prompts |
| 2 | Pipeline crashed bei Audit-File-Format-Drift (Custom-Markdown statt Standard-Tabelle) | HIGH | mittel (kein auto-Slice-Generation) | try/catch per File + Format-Validator + Fallback `--strict=false` | Pipeline-Test gegen pre-existing audits/2026-04-25 |
| 3 | Phase-Tracker veraltet (manuell zu pflegen → drifted) | HIGH | hoch (Hook lügt User an) | Skill `/auto-beta-ready status` aktualisiert Tracker on-demand + Stop-Hook updated nach jedem Slice | Periodischer manueller Vergleich |
| 4 | "Fertig"-Definition zu strikt → Anil kann nie sagen "fertig für heute" | MED | niedrig (Communication-Friction) | Definition betrifft nur "beta ready"-Aussagen, nicht "Slice fertig" | Anil-Feedback |
| 5 | findings-to-slices generiert zu viele Stubs → Anil ertrinkt in Backlog | MED | mittel (Demoralisierung) | Severity-Filter Default P0+P1, P2/P3 in Bündel-Slices, max 5 Slice-Stubs pro Run | Pipeline-Output-Check vor Anil-Show |
| 6 | auto-beta-ready Skill collidiert mit existing /persona-walk + /sign-off + /audit-beta-readiness | LOW | mittel (Skill-Verwirrung) | Master-Skill ruft die existing Skills auf, ersetzt sie nicht. Klare Separation: Master orchestriert, Sub-Skills ausführen | Skill-Doc Cross-Reference |
| 7 | "Fertig"-Hook fängt mein eigenes Status-Update ab ("X Slices fertig committed") | MED | niedrig (Selbst-Friction) | Trigger-Phrasen-Liste differenziert: "Slice fertig" vs "Beta fertig" | Hook-Logic test |

---

## Compliance-Check

- Kein Money-Path
- Kein i18n-Risk
- Hook-Edits sind PROCESS-Decisions, vorgeplant durch Slice 211 D50 + Anil-Direktive heute
- Bash-Pattern-Sicherheit: command-token-anchor, JSON-escape-aware regex (errors-infra.md Lehren)

## TR-Wording

Nicht relevant — pure Tooling.

## Open Risiko

System-Layer-Komplexität nimmt zu: 4 neue Files + 2 Doku-Updates + Integration mit 4 existing Skills (persona-walk, sign-off, audit-beta-readiness, sweep-page). **Mitigation:** Master-Skill ruft existing Skills, ersetzt nicht. Foundation-First, Tooling-Layer auf solider Basis (Slice 211/212/213 hat Foundation gelegt).

**Wichtigster Test:** Slice 214 selbst ist nicht "fertig" bevor `/auto-beta-ready signoff` PASS gibt. Self-walking-the-talk.
