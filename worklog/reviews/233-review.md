# Slice 233 Review (Reviewer-Agent + Heal)

**Datum:** 2026-04-27
**Reviewer:** reviewer-Agent (cold-context, S-Slice + neue Wiring-Klasse)
**Verdict:** CONCERNS → PASS (nach Heal-Wave)

---

## Verdict-Trail

- **Initial:** CONCERNS — 2 echte Findings (1 MEDIUM Bug + 1 LOW Spec-Drift)
- **Post-Heal:** PASS — beide Findings inline gefixt vor Commit

---

## Findings

### F-01 [MEDIUM] PIPESTATUS-Bug — Exit-Code-Reporting falsch

**Location:** `.github/workflows/nightly-audit.yml` 8× (jeder Audit-Step)

**Problem:**
```yaml
pnpm run audit:silent-fail:check 2>&1 | tee /tmp/silent-fail.log
echo "Exit-Code: $?" >> $GITHUB_STEP_SUMMARY  # liest tee's exit, NICHT pnpm's
```

`tee` exitet immer mit 0 (es kann nur File-Schreib-Errors haben, was selten ist). `$?` nach dem Pipe liefert tee's Exit-Code, nicht pnpm's. Resultat: `$GITHUB_STEP_SUMMARY` zeigt IMMER `Exit-Code: 0` — selbst wenn der Audit failed.

**Funktional kein Blocker** weil `continue-on-error: true` + `steps.X.outcome` von GHA selbst getrackt wird (Step ist als failed markiert wenn pnpm exit ≠ 0). Aber die **Summary-Anzeige ist misleading** und Aggregate-Logic via `steps.X.outcome` hängt unverändert.

**Fix angewandt:**
```yaml
shell: bash  # explicit für PIPESTATUS-Support
run: |
  pnpm run audit:silent-fail:check 2>&1 | tee /tmp/silent-fail.log
  EXIT=${PIPESTATUS[0]}
  echo "## audit:silent-fail:check (exit: $EXIT)" >> $GITHUB_STEP_SUMMARY
  tail -50 /tmp/silent-fail.log >> $GITHUB_STEP_SUMMARY
  exit $EXIT
```

`${PIPESTATUS[0]}` extrahiert den Exit-Code des ERSTEN Pipe-Elements (= pnpm). `exit $EXIT` propagiert ihn an `continue-on-error` (Step wird korrekt failed-markiert). Plus: Summary zeigt echten Exit-Code.

**Status:** ✅ Heal-Wave appliziert auf alle 8 Audit-Steps. Re-YAML-Parse PARSE OK.

### F-02 [LOW] Spec-Drift: "7 Audit-Scripts" vs. Workflow-8

**Location:** `worklog/specs/233-nightly-audit-self-improvement-loop.md` Zeile 5 + Section 1

**Problem:** Spec sagt "Verkabelt 7 vorhandene Audit-Scripts" (excludes silent-fail das schon in CI ist). Workflow `nightly-audit.yml` ruft alle 8 (inkl. silent-fail).

Reviewer-Empfehlung: "Running it AGAIN nightly is redundant but not harmful" — silent-fail läuft tagsüber via CI bei jedem push, plus nightly als belt-and-suspenders. Sauber.

**Fix angewandt:** Spec-Wording von "7 vorhandene" auf "8 Audit-Scripts (7 bisher nirgendwo aufgerufen, silent-fail:check als belt-and-suspenders)" geändert.

**Status:** ✅ Spec-Doc-Update.

---

## Pattern-Reference-Check (gegen common-errors / patterns / business)

| Source | Relevant? | Verifiziert |
|--------|-----------|-------------|
| `errors-infra.md` "GitHub Actions: Default GITHUB_TOKEN hat KEINE issues: write" (Slice 220) | Direkt | ✅ `permissions: { issues: write }` explizit gesetzt + AC-04 erzwingt das |
| `errors-infra.md` "Two-lockfile drift" (Slice 118-123) | Direkt | ✅ pnpm@10.29.2 + frozen-lockfile, Setup matcht ci.yml + post-deploy-smoke.yml |
| `errors-infra.md` "Vercel `deployment_status.target_url` Auth-Wall" (Slice 220) | Indirekt | ✅ `PLAYWRIGHT_BASE_URL: https://bescout.net` hardcoded, kein Vercel-Preview-URL |
| `decisions.md` D45 "Hooks > Text-Regeln" | Direkt | ✅ D53 codifiziert das Build-without-Wire-Verbot architektonisch |
| `decisions.md` D52 "Wave-3-Tooling Standard-API" | Direkt | ✅ Slice 233 ist Loop-Variante: Tools mit Markdown-Report + Exit-Code via PIPESTATUS |
| `errors-infra.md` "Cron-Guard API-Response-Count vs DB-Count" | Indirekt | ✅ Audit-Loop nutzt nicht response-count als Completion-Signal |

---

## Spezifische Risiken (vom Reviewer geprüft)

### R1: Issue-Spam in den ersten 1-2 Tagen
**Reviewer-Befund:** Workflow erstellt Sammel-Issue bei jedem Audit-Run mit Findings. Slice 234 Dedupe ist Scope-Out. **Mitigation:** Slice 234 muss direkt nach Slice 233 folgen — Anil-Inbox-Risk max 1 Tag. Spec dokumentiert das in Section 11 Scope-Out.

### R2: continue-on-error verschleiert Failures?
**Reviewer-Befund:** NEIN — `steps.X.outcome` wird von GHA korrekt auf "failure" gesetzt selbst bei `continue-on-error: true`. Aggregate-Step pickt das via `steps.silent_fail.outcome` korrekt auf. Plus PIPESTATUS-Fix macht Summary jetzt wahrhaftig.

### R3: `steps.aggregate.outputs.failures` Aggregation
**Reviewer-Befund:** Korrekt — alle 8 Audit-Step-Outcomes werden sequenziell geprüft. Siehe Aggregation-Step im Workflow.

### R4: Smoke-Job conditional `if: github.event.schedule == '0 4 * * *'`
**Reviewer-Befund:** ✅ GitHub-Actions setzt `github.event.schedule` auf den auslösenden Cron-String bei multi-cron Workflows. Korrektes Pattern.

### R5: Wiring-Audit — fehlt was?
**Reviewer-Befund:**
- 8 Audit-Scripts in `package.json` ✅ alle 8 verkabelt
- Plus `audit:compliance` (bash-Script): NICHT verkabelt. Spec listet das nicht. **Decision:** lass es vorerst raus — Slice 233 deckt die TS-Audit-Tools. `audit:compliance` als Backlog (Slice 234 oder later).
- `pnpm run cron:audit` (in ci.yml): NICHT in nightly-audit.yml. **Decision:** läuft schon in ci.yml bei jedem push, kein nightly-Bedarf.

### R6: Definition-of-Done-Tabelle widerspricht existing Slice-Pattern?
**Reviewer-Befund:** Tabelle ist neu, aber retrofittet historische Slice-Pattern korrekt. Beispiele:
- Slice 213 (QuickActionPills) — UI-Component, in page.tsx importiert ✅
- Slice 230 (Phase-Tracker-Reminder) — Hook, in settings.json registriert ✅
- Slice 223 (audit-stale) — Tool, NICHT in CI verkabelt ❌ (das ist genau der Build-without-Wire-Failure den D53 codifiziert)

### R7: D53-Begründung empirisch oder dogmatisch?
**Reviewer-Befund:** Empirisch. D53 zitiert konkrete Slices (223, 228, 229) + Anil-Quote. Re-Visit-Trigger definiert.

---

## Live-Aufgetauchte Bugs während BUILD (Reviewer-Output)

Beide F-01 + F-02 wurden vom Reviewer entdeckt und inline gefixt vor Commit.

---

## Test-Coverage (Spec Section 6 ACs)

| AC | Status | Evidence |
|----|--------|----------|
| AC-01 YAML-Parse | ✅ PASS | `node -e 'yaml.load(...)'` PARSE OK |
| AC-02 7+ Audit-Calls | ✅ PASS | grep -c = 8 (≥7) |
| AC-03 Smoke-Wiring | ✅ PASS | 1 match `playwright test --project=smoke` |
| AC-04 issues: write | ✅ PASS | grep match |
| AC-05 2 Cron-Schedules | ✅ PASS | grep `cron:` = 2 |
| AC-06 workflow_dispatch | ✅ PASS | 1 Event + 2 Job-Conditionals |
| AC-07 LIVE-Run | ⏳ PENDING | wird nach `git push` + `gh workflow run` verifiziert. Proof-File-Update nach Run-Completion. |

6/7 ACs PRE-PUSH grün. AC-07 nach Push verifizierbar.

---

## Verdict

**PASS** — Slice 233 ist Production-Ready post-Heal. F-01 PIPESTATUS-Fix zwingend, F-02 Spec-Drift kosmetisch, beide gefixt.

**Wichtig:** Slice 233 erfüllt seinen eigenen Standard:
- Tool gebaut (`nightly-audit.yml`) ✅
- Verkabelt (cron + workflow_dispatch) ✅
- Definition-of-Done-Tabelle in `workflow.md` codifiziert ✅
- D53 Build-without-Wire-Verbot dokumentiert ✅

Slice 233 ist die Antwort auf Anil-Frustration ("warum nicht zu Ende programmieren") — und der Slice selbst macht sich nicht schuldig am gleichen Pattern.

**Slice 234 + 235 (Spec Section 11 Scope-Out):**
- Slice 234: Issue-Dedupe via Title-Hash (Spam-Mitigation)
- Slice 235: `scripts/wiring-check.ts` Detection-Tool (Prevention)
- Slice 236: `ship-tool-wiring-gate.sh` BLOCK-Hook (Architektur-Enforcement)

Beide P1-Backlog. Anil-Direktive folgt.
