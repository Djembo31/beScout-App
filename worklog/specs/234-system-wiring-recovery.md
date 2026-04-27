# Slice 234 — System-Wiring Recovery + Drift-Prevention

**Status:** SPEC · **Größe:** L · **Slice-Type:** Hook · **Scope:** CTO · **Datum:** 2026-04-27

> L-Slice. Adressiert systemische Drift (10 orphan Hooks, 4 orphan Pipelines, 9 untriagetes Issues, fehlendes Wiring-Tooling). Plan-File: `C:\Users\Anil\.claude\plans\linear-wibbling-crane.md` (genehmigt 2026-04-27 ultrathink).

---

## 1. Problem Statement

Slice 233 verkabelte 8 Audit-Tools ins Nightly-Audit. **Wiring-Audit zeigte: viel größere Drift.**

**Evidence:**
- Initial-Audit zählte 11 Hook-Files in `.claude/hooks/` als "nicht registriert". Klassifizierung: 1 false-positive (`ship-context7-gate.sh` ist registriert, Audit-Bug bei grep-Match), 10 echte orphan Drift. Aktion-Verteilung: 8 REGISTER + 1 ARCHIVE (`quality-gate.sh`) + 1 DELETE (`inject-learnings.sh` selbstidentifiziert redundant)
- **Kritisch:** `capture-correction.sh` orphan → `.claude/learnings-queue.jsonl` 0 bytes seit 19 Tagen → /reflect-Skill greift auf leere Queue → Knowledge-Flywheel ist tot
- 4 orphan Pipelines: `findings-to-slices.ts`, `audit:compliance`, `test:synthetic`, `test:e2e`
- 9 OPEN GitHub-Issues #14-#23 (Smoke-Failures seit 2026-04-26) — niemand triagiert
- Slice 233 Live-Run hatte 2 GHA-Setup-Fehler (rpc-security env, tr-strings braucht Pre-Step)
- D53 Definition-of-Done in workflow.md codifiziert, aber kein Hook erzwingt es
- Spec hat keinen "Slice-Type"-Header → DoD-Tabelle nicht maschinell prüfbar

**Wer betroffen, wie oft:** CTO + Anil + Beta-Tester. Jeder neue Slice produziert potentielle Drift, ohne Detection. Knowledge-Flywheel-Drift kostet jedes Bug-Pattern das nicht in common-errors.md landet.

## 2. Lösungs-Design

L-Slice mit 6 Phasen. Vollständige Arbeit, kein "halb fertig":

1. **HEAL** — Drift bezahlen (Hooks/Pipelines/GHA/Smoke)
2. **PREVENT** — Wiring-Detection-Tool + Pre-Commit-Gate
3. **ARCHITEKTUR** — Slice-Type-Header + Layer-3 DoD-Hook
4. **KNOWLEDGE-RESTORE** — capture-correction live + /reflect E2E
5. **LIVE-VERIFY** — gh workflow + 5 Smoke-Tests
6. **CLOSE** — Reviewer + D54 + LOG + Push

Detail siehe Plan-File. Architekturelle Inspiration: GSD Phase-Separation.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `.claude/settings.json` | EDIT | 8 Hooks registrieren (4 Events) |
| `.claude/hooks/quality-gate.sh` | MOVE | → `.claude/hooks/archived/` (von v2 ersetzt) |
| `.claude/hooks/inject-learnings.sh` | DELETE | selbstidentifiziert redundant |
| `.claude/hooks/ship-spec-quality-gate.sh` | EDIT | Layer 3 (Slice-Type + Type-DoD) |
| `.claude/hooks/ship-tool-wiring-gate.sh` | NEU | Pre-Commit BLOCK orphan-Tool |
| `.github/workflows/nightly-audit.yml` | EDIT | env + pre-step + Issue-Dedupe + audit:compliance + audit:wiring + findings-to-slices |
| `package.json` | EDIT | audit:wiring + audit:wiring:check |
| `scripts/wiring-check.ts` | NEU | Detection-Tool |
| `worklog/specs/_TEMPLATE.md` | EDIT | Slice-Type-Header pflicht |
| `.claude/rules/workflow.md` | EDIT | Slice-Type in SPEC-Stage |
| `memory/decisions.md` | EDIT | D54 PROCESS |
| `worklog/active.md` + `worklog/log.md` | EDIT | Stage-Updates + Slice-Eintrag |
| `worklog/proofs/234-wiring-recovery-smoke.txt` | NEU | Multi-AC-Proof |
| `worklog/reviews/234-review.md` | NEU | Reviewer-Output |

**Vor dem Slice greppen:**
```bash
ls .claude/hooks/*.sh | wc -l   # 34 Files vorhanden
grep -c "command.*\.sh" .claude/settings.json   # 25 registriert
# Diff: 9 orphans (1 archive + 1 delete + 8 register = 10 Aktionen, 1 false-positive)
```

## 4. Code-Reading-Liste

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `.claude/hooks/capture-correction.sh` | Knowledge-Flywheel-Hook | Trigger UserPromptSubmit, schreibt nach `.claude/learnings-queue.jsonl` |
| `.claude/hooks/morning-briefing.sh` | SessionStart-Inject | Liest welche memory/-Files? Subsumed by ship-session-start.sh? |
| `.claude/hooks/quality-gate-v2.sh` | Stop-Counter | Welche Datei wird counter'd? `.claude/.session-counter`? |
| `.claude/hooks/run_tests_on_change.sh` | PreToolUse-Test | Was triggert vitest? Wie ist Exit-Code-Handling? |
| `.claude/hooks/ship-cto-review-gate.sh` | Pre-Commit-Pattern | Vorbild für ship-tool-wiring-gate.sh |
| `scripts/orphan-component-detector.ts` | Detection-Pattern | Vorbild für wiring-check.ts |
| `scripts/audit-stale-check.ts` | Markdown-Report-Pattern | CLI-Args + report-write |
| `.github/workflows/nightly-audit.yml` (Slice 233) | GHA-Heal-Stelle | Wo env-block, wo pre-step, wo Issue-Dedupe einfügen |
| `e2e/beta-smoke.spec.ts` | Smoke-Test-Logic | Welcher Locator failed? Welcher Test (37:7)? |
| `worklog/specs/_TEMPLATE.md` | Slice-Type-Header | Wo Header einfügen? |

**10 Items, L-Slice-Mindest erfüllt.**

## 5. Pattern-References

- `decisions.md` D45 — "Hooks > Text-Regeln" — Slice 234 erweitert auf "Wiring > Text-Regeln"
- `decisions.md` D52 — Wave-3-Tooling Standard-API — wiring-check.ts ist 5. Tool der Familie
- `decisions.md` D53 (Slice 233) — Build-without-Wire-Verbot codifiziert. Slice 234 erzwingt es architektonisch.
- `errors-infra.md` "Shell case-statement wildcard promiskuoes" (Slice 145+146) — Detection-Patterns sauber anchorn
- `errors-infra.md` "GitHub Actions: Default GITHUB_TOKEN hat KEINE issues: write" — Issue-Dedupe braucht permissions
- Slice 228 `orphan-component-detector.ts` — Pattern-Vorbild
- Slice 233 `nightly-audit.yml` — GHA-Loop-Vorbild
- Slice 232 `spec: inline` Hard-BLOCK — Pre-Commit-Hook Pattern für ship-tool-wiring-gate

## 6. Acceptance Criteria

```
AC-01: [HOOK-WIRING] 8 orphan-Hooks in settings.json registriert
  VERIFY: for h in capture-correction inject-context-on-compact morning-briefing pattern-check quality-gate-v2 run_tests_on_change session-retro track-file-changes; do
    grep -c "$h.sh" .claude/settings.json
  done
  EXPECTED: alle ≥ 1
  FAIL IF: einer = 0

AC-02: [HOOK-CLEANUP] quality-gate.sh archived, inject-learnings.sh deleted
  VERIFY: ls .claude/hooks/archived/quality-gate.sh && ! ls .claude/hooks/inject-learnings.sh 2>/dev/null
  EXPECTED: archived exists, inject-learnings absent

AC-03: [WIRING-TOOL] scripts/wiring-check.ts existiert + npm-Script
  VERIFY: pnpm run audit:wiring
  EXPECTED: exit 0 (alle Tools verkabelt nach Slice 234) ODER ≥ 1 known-orphan in allowlist

AC-04: [WIRING-GATE] ship-tool-wiring-gate.sh registriert
  VERIFY: grep "ship-tool-wiring-gate.sh" .claude/settings.json
  EXPECTED: 1 match unter PreToolUse Bash

AC-05: [GHA-HEAL] nightly-audit.yml hat alle Heal-Steps
  VERIFY: grep -E "audit:compliance|audit:wiring|findings-to-slices|SUPABASE_SERVICE_ROLE_KEY|tr-strings.txt|listForRepo" .github/workflows/nightly-audit.yml | wc -l
  EXPECTED: ≥ 5 (alle 6 Patterns existieren tatsächlich; Issue-Dedupe nutzt REST API listForRepo, nicht gh-CLI search)

AC-06: [LAYER-3-SPEC] ship-spec-quality-gate.sh prüft Slice-Type
  VERIFY: grep -E "Slice.?Type|slice_type" .claude/hooks/ship-spec-quality-gate.sh
  EXPECTED: ≥ 1 match

AC-07: [TEMPLATE] _TEMPLATE.md hat Slice-Type-Header
  VERIFY: grep "Slice-Type" worklog/specs/_TEMPLATE.md
  EXPECTED: ≥ 1 match

AC-08: [KNOWLEDGE-FLYWHEEL] capture-correction live-test schreibt nach queue
  VERIFY: bash .claude/hooks/capture-correction.sh < <(echo '{"prompt":"test korrektur xyz"}'); cat .claude/learnings-queue.jsonl | wc -l
  EXPECTED: ≥ 1 line

AC-09: [LIVE-RUN] gh workflow run nightly-audit.yml + alle 11 Audit-Steps verkabelt
  VERIFY: gh run watch <run-id>; gh run view <run-id> --json jobs | jq '.jobs[0].steps | length'
  EXPECTED: ≥ 12 (8 audits + 3 NEU + setup-steps)

AC-10: [ISSUE-TRIAGE] Smoke-Issues #14-#23 closed
  VERIFY: gh issue list --label smoke-fail --state open --json number | jq length
  EXPECTED: ≤ 1 (max ein aktiver, alle alten closed)

AC-11: [REVIEWER] worklog/reviews/234-review.md existiert mit Verdict
  VERIFY: grep -E "Verdict.*PASS|Verdict.*CONCERNS|Verdict.*REWORK" worklog/reviews/234-review.md
  EXPECTED: 1 match

AC-12: [D54] decisions.md D54 PROCESS dokumentiert
  VERIFY: grep "^## D54" memory/decisions.md
  EXPECTED: 1 match
```

## 7. Edge Cases

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Hook-Registration | settings.json invalid JSON nach Edit | typo | bash + Claude-Restart fail | Schritt-für-Schritt-Edit + jsonlint zwischen jeder Sektion |
| 2 | capture-correction | UserPromptSubmit-Event-Schema unbekannt | hook gets stdin? env? | hook silent oder error | Read existing hook capture-correction.sh - es liest bereits stdin via `cat` (Pattern in capture-correction.sh) |
| 3 | wiring-check.ts | False-Positive Once-Off-Tool (z.B. tm-rescrape-stale.ts) | tm-* scripts | nicht als orphan markieren | KNOWN_ORPHANS allowlist mit Begründung |
| 4 | ship-tool-wiring-gate | False-Positive bei legit feat-Slice | Anil schreibt feat() für UI-Slice | NICHT blocken | Detection nur bei `scripts/audit-*.ts` und `.claude/hooks/*.sh` |
| 5 | Layer-3 Spec | Existing Specs ohne Slice-Type | Slice 233 Spec | nicht WARN bei Stage=LOG | Skip wenn Stage in [LOG, idle] |
| 6 | Issue-Dedupe | gh issue list timeout | network slow | failover: create new issue trotzdem | try/catch in github-script |
| 7 | Smoke-Triage | Echter Beta-Blocker entdeckt | echte Code-Bug | Slice 235 split | Phase 1.4 30min-budget; bei Bug → Issue, weiter mit Phase 2+ |
| 8 | findings-to-slices | RPC zu external Service nicht ready | API-key fehlt | skip-graceful | env-check pre-step |
| 9 | morning-briefing | Doppel-Output mit ship-session-start | beide registriert | redundant aber nicht broken | Acceptable: morning-briefing umfassender, ship-session-start kompakter — beide bleiben |
| 10 | track-file-changes | Performance-Hit bei vielen Edits | hook feuert oft | <100ms pro Call OK | timeout-cap in settings.json |

**10 Items, L-Slice-Mindest erfüllt.**

## 8. Self-Verification Commands

```bash
# Pre-Commit (lokal):
node -e 'require("fs").readFileSync(".claude/settings.json"); console.log("JSON OK")'  # JSON valid
bash -n .claude/hooks/ship-tool-wiring-gate.sh
bash -n .claude/hooks/ship-spec-quality-gate.sh
node -e 'const yaml=require("js-yaml"); yaml.load(require("fs").readFileSync(".github/workflows/nightly-audit.yml")); console.log("YAML OK")'
pnpm run audit:wiring
echo "---"
echo "Hook-Wiring-Check:"
for h in capture-correction inject-context-on-compact morning-briefing pattern-check quality-gate-v2 run_tests_on_change session-retro track-file-changes ship-tool-wiring-gate; do
  r=$(grep -c "$h.sh" .claude/settings.json)
  echo "$h.sh: registered=$r"
done

# Live (Post-Push):
git push origin main
gh workflow run nightly-audit.yml --ref main
gh run watch <run-id>
gh issue list --label nightly-audit --state open
```

## 9. Open-Questions

**Pflicht-Klärung (Plan-Mode-Phase erledigt):**
- Slice-Type für DoD-Hook: ✅ entschieden — Hook-Type weil Cross-Cutting in `.claude/hooks/` + `.github/workflows/`
- Hard-BLOCK vs WARN für Layer-3: ✅ WARN-only initial (D52 Wave-3-API + Slice 232 Pattern)
- Issue-Dedupe via Title-Hash: ✅ exakter Title-Match `Nightly Audit YYYY-MM-DD`

**Autonom-Zone:**
- Allowlist-Inhalt von wiring-check.ts (welche TM-Scripts known-orphan)
- Pre-Mortem #4 Mitigation-Wahl
- Hook-Registration-Reihenfolge in settings.json

**Nicht-Autonom:** keine Money-Path. Alle Hook/Workflow-Edits sind CTO-scope.

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| Hook-Wiring | AC-01..04 grep-Block in `worklog/proofs/234-wiring-recovery-smoke.txt` |
| GHA-Heal | AC-05 + AC-09 Live-Run-Output |
| Knowledge-Flywheel | AC-08 Live capture-correction-Test |
| Drift-Prevention | AC-03 audit:wiring 0 orphans + AC-06 Layer-3 |
| Issue-Triage | AC-10 GitHub-API count |
| Reviewer | AC-11 Review-File |

## 11. Scope-Out

- **Slice 235** Smoke-Failure-Code-Fix → falls Phase 1.4 echten Bug zeigt
- **Slice 236** memory/feedback_*.md restore → falls Phase 4.3 fehlende Files zeigt
- **Slice 237** TM-Once-Off-Scripts cleanup → 13 orphan TM-Scripts klassifizieren
- **GSD-Skill-Adoption** als externer Skill → würde SHIP-Loop ersetzen, riesiger Scope
- **Plan-Agent Phase 2** architektonische Validierung → Plan klar, Skip

## 12. Stage-Chain

```
SPEC → IMPACT (skipped: Cross-Cutting in Workflow/Hook/Script-Schicht, kein Service/RPC/DB)
     → BUILD (Phasen 1-4)
     → REVIEW (Reviewer-Agent — Pflicht für L-Slice)
     → PROVE (Phase 5 Live-Verify)
     → LOG (Phase 6)
```

## 13. Pre-Mortem (5 Risiken)

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | settings.json invalid JSON nach 8 Edits | LOW | HOCH (Claude restart broken) | Sequential-Edit + jsonlint nach jedem Hook | post-Edit `node -e 'JSON.parse(...)'` |
| 2 | capture-correction.sh feuert nicht (Event-Schema-Drift) | MED | hoch (Knowledge-Flywheel bleibt tot) | Live-Test in Phase 4.1 + Hook-stdin debuggen | queue.jsonl wachsen oder nicht |
| 3 | wiring-check.ts False-Positive bei TM-Scripts | HIGH | mittel (Tool meldet zu viel) | KNOWN_ORPHANS allowlist | Negative-Test fängt erwartete Orphans, Positive-Test 0 |
| 4 | Smoke-Failure echter Beta-Blocker | MED | hoch (verzögert Beta) | Phase 1.4 30min-budget; bei Bug → Slice 235 split | Phase 1.4 abbrechen + dokumentieren |
| 5 | ship-tool-wiring-gate False-Positive bei legit Slice | MED | hoch (Disziplin-Frust) | Detection nur bei `scripts/audit-*.ts` + `.claude/hooks/*.sh`, plus emergency-skip | Negative-Test simuliert orphan + legit-feat |
| 6 | Layer-3 Spec-Quality-Gate WARN-Spam bei pre-Slice-234-Specs | LOW | niedrig | Skip-when-Stage=LOG/idle, kein BLOCK | Existing Specs nicht angefasst |

---

## Compliance-Check

Nicht relevant — Infra-Slice, kein User-facing-Text, kein Money-Path.

## TR-Wording

Nicht relevant.

## Open Risiko

**Risk:** L-Slice-Marathon (geschätzt 4-6h). Kontext-Akkumulation steigt. **Mitigation:** Phase-Boundaries klar definiert, jede Phase eigene Verify-Checkpoints. Bei Context-Limit: phasen-getrennt commitbar (Phase 1+2 als feat, Phase 3 als feat, Phase 4 als chore, Phase 5+6 als chore+merge). Aber: vollständige Arbeit ist Anil-Direktive — wir gehen durch.
