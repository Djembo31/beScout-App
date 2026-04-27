# Slice 233 — Nightly Audit Self-Improvement-Loop

**Status:** SPEC · **Größe:** S · **Scope:** CTO · **Datum:** 2026-04-27

> Erste echte autonome Self-Improvement-Schleife. Verkabelt 8 Audit-Scripts (silent-fail:check + stale, orphan, type-truth, mutation-race:check, tr-strings, i18n, rpc-security) + bescout.net-Smoke-Test in einen GHA-Cron-Workflow mit Auto-Issue-Pipeline. Adressiert Anil-Frustration "Build-without-Wire-Pattern" — 7 von 8 Tools waren bisher nirgendwo aufgerufen. silent-fail:check bleibt belt-and-suspenders im Nightly (war bereits in `ci.yml` bei jedem push).

---

## 1. Problem Statement

Wir haben 8 Audit-Scripts in `package.json`, NUR 1 (`audit:silent-fail:check`) ist in CI verkabelt. Slice 223 (audit:stale) + Slice 228 (audit:orphan) + Slice 229 (audit:type-truth) wurden gebaut aber nirgendwo aufgerufen. Sie laufen NUR wenn ich `pnpm run audit:X` lokal tippe — was ich vergesse.

**Evidence (`scripts/wiring-check`):**
```
audit:silent-fail: ci=1 hook=0 cron=0  ← einziger verkabelter
audit:stale:       ci=0 hook=0 cron=0
audit:orphan:      ci=0 hook=0 cron=0
audit:type-truth:  ci=0 hook=0 cron=0
audit:mutation-race ci=0 hook=0 cron=0
```

**Anil-Frustration (2026-04-27):** "ich verstehe nicht, warum wir nicht mal was zu ende programmmieren können... ich hatte tests gemacht und sollte laufen, wundert mich dass die verkabelung fehlt?"

**Wer ist betroffen, wie oft?** Anil + ich + alle Beta-Tester. Detection-Latenz für neue Drift-Klassen (Slice 212→231 = 19 Slices = ~10 Tage). Nach Slice 233: 24h.

## 2. Lösungs-Design (Architektur)

Neue GHA-Workflow `nightly-audit.yml` mit 2 Jobs:

### Job 1: `audit` (cron 03:00 UTC daily + workflow_dispatch)
Sequenzielles Run aller 7 Audit-Scripts mit Exit-Code-Tracking. Jedes Tool gibt:
- exit 0 + leerer Output → kein Finding
- exit 0 + Report-File-Write → Findings dokumentiert (kein Failure-Flag)
- exit ≠ 0 → :check-Variante hat HIGH/MEDIUM-Increase entdeckt

Bei ANY exit ≠ 0 ODER beliebigem Audit das Findings produziert → Auto-Issue mit Label `audit-finding`.

### Job 2: `smoke` (cron 04:00 UTC daily + workflow_dispatch)
`pnpm run test:smoke` gegen bescout.net (10-Flow Playwright-Suite). Bei Failure → Auto-Issue mit Label `beta-blocker`.

### Failure-Modi
- **Strict-Mode** (`audit:silent-fail:check`, `audit:mutation-race:check`): exit-code-Switch → CI-Fail
- **Report-Mode** (audit:stale, orphan, type-truth, tr-strings, i18n, rpc-security): kein exit-Switch, aber Report-File-Diff → "neue Findings"-Detection via `git diff --quiet worklog/audits/`

### Auto-Issue-Pipeline
Vorbild: `post-deploy-smoke.yml` Pattern (Slice 220 Beta-Smoke). `actions/github-script@v7` + `gh issue create` mit Label-System.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `.github/workflows/nightly-audit.yml` | NEU | Cron-Workflow + 2 Jobs |
| `worklog/specs/233-nightly-audit-self-improvement-loop.md` | NEU | Diese Spec |
| `worklog/active.md` | EDIT | Stage-Updates |
| `worklog/log.md` | EDIT | Slice-Eintrag |
| `worklog/proofs/233-nightly-audit-smoke.txt` | NEU | YAML-Lint + Manual-Dispatch-Verify |
| `worklog/reviews/233-review.md` | NEU | Reviewer-Agent (S-Slice + neue Wiring-Klasse, kein D35-Pattern-Wiederholung) |
| `.claude/rules/workflow.md` | EDIT | Neue "Definition-of-Done"-Sektion: Tool-Slice = Tool + Wiring |
| `memory/decisions.md` | EDIT | Neue D53 PROCESS — "Build-without-Wire ist verboten" |

**Vor diesem Slice greppt man:**
```bash
grep -rn "pnpm run audit:" .github/workflows/  # Wer benutzt was?
ls scripts/*.ts | wc -l                        # 20 Scripts total
grep -E "^\s+\"audit:" package.json | wc -l    # 8 Audit-Scripts
```

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `.github/workflows/post-deploy-smoke.yml` | Vorbild für Auto-Issue-Pipeline (Slice 220) | Wie wird `gh issue create` mit Label aufgerufen? `actions/github-script@v7`-Pattern? |
| `.github/workflows/ci.yml` | Existing Setup-Steps (pnpm + Node22) wiederverwenden | Welche Setup-Schritte sind Standard? Wie sind Secrets gemounted? |
| `package.json` `audit:*` Scripts | Welche Audits gibt es, was returnen sie? | Strict-Mode (:check) vs Report-Mode? Wer schreibt nach `worklog/audits/`? |
| `scripts/silent-fail-audit.ts` | Vorbild für CI-Compatible Tool | Wie funktioniert `--check`-Mode + `.audit-baseline.json`? |
| `scripts/audit-stale-check.ts` (Slice 223) | Wie schreibt audit:stale Reports? | Wo landet Output? `worklog/audits/audit-stale-YYYY-MM-DD.md`? |
| `scripts/orphan-component-detector.ts` (Slice 228) | Pattern + Output-Format | Verzeichnis + Filename? |
| `vercel.json` Crons-Section | Negation-Vorbild — wo Crons NICHT hingehoeren | Audit darf NICHT in Vercel-Crons (App-Code-Kontext irrelevant) |

**6 Items, S-Slice-Mindest erfuellt.**

## 5. Pattern-References (relevant)

- `decisions.md` D45 — "Hooks > Text-Regeln" — Slice 233 macht Verkabelung zur Hook-Regel (nicht Text)
- `decisions.md` D52 — Wave-3-Tooling Standard-API — Slice 233 ist die Loop-Variante davon
- `errors-infra.md` "Vercel Hobby-Tier Silent-Build-Fail" (Slice 187 D36) — Begründung warum GHA + nicht Vercel-Cron für Audit
- `errors-infra.md` "GitHub Actions: Default GITHUB_TOKEN hat KEINE issues: write" — `permissions: { issues: write }` Pflicht
- `errors-infra.md` "Two-lockfile drift" (Slice 118-123) — pnpm@10.29.2 + frozen-lockfile = Standard
- `decisions.md` D36 — Post-Push-Health-Check-Protokoll. Slice 233 ergaenzt um Daily-Audit-Loop.
- `decisions.md` D48 — Audit-Stale-Catcher operationalisiert. Slice 233 verkabelt das Tool aus Slice 223.
- `decisions.md` D46 — Orphan-Component. Slice 233 verkabelt Slice 228.
- `decisions.md` D43 — Type-Truth-Audit. Slice 233 verkabelt Slice 229.

## 6. Acceptance Criteria

```
AC-01: [HAPPY] Workflow-File existiert, valid YAML
  VERIFY: cat .github/workflows/nightly-audit.yml | python -c 'import yaml,sys; yaml.safe_load(sys.stdin)'
  EXPECTED: kein Parse-Error
  FAIL IF: yaml.YAMLError

AC-02: [WIRING] 7 Audit-Scripts werden aufgerufen
  VERIFY: grep -c "pnpm run audit:" .github/workflows/nightly-audit.yml
  EXPECTED: >= 7
  FAIL IF: < 7

AC-03: [WIRING] Smoke-Test wird aufgerufen
  VERIFY: grep "pnpm run test:smoke\|playwright test --project=smoke" .github/workflows/nightly-audit.yml
  EXPECTED: 1 match (nicht beide — entweder `pnpm run test:smoke` ODER inline-playwright-call)
  FAIL IF: 0 matches

AC-04: [PERMISSIONS] issues: write ist gesetzt
  VERIFY: grep "issues: write" .github/workflows/nightly-audit.yml
  EXPECTED: 1 match
  FAIL IF: 0 (Auto-Issue-Creation würde 403en, siehe errors-infra.md)

AC-05: [SCHEDULE] Cron 03:00 UTC daily für audit, 04:00 UTC für smoke
  VERIFY: grep "cron:" .github/workflows/nightly-audit.yml
  EXPECTED: 2 cron-Eintraege (audit + smoke)

AC-06: [DISPATCH] workflow_dispatch verfügbar (Manual-Trigger ohne Wait-für-Cron)
  VERIFY: grep "workflow_dispatch" .github/workflows/nightly-audit.yml
  EXPECTED: 1 match
  FAIL IF: 0 (sonst kann Anil nicht manuell ausloesen)

AC-07: [LIVE-RUN] Manual-Dispatch nach Push triggert Workflow erfolgreich
  VERIFY: gh workflow run nightly-audit.yml; gh run list --workflow=nightly-audit.yml --limit 1
  EXPECTED: status: completed, conclusion: success ODER failure-with-Issue-Created
  FAIL IF: workflow nicht aufgelistet
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Audit-Run | Audit-Script crashed (exit 137 OOM) | OOM in node | Job-Step weiter trotzdem, andere Audits laufen | `continue-on-error: true` per step + Sammel-Issue am Ende |
| 2 | Smoke-Run | bescout.net 503 | Vercel-Outage | Smoke fail, Issue mit "Outage suspected" Label | Standard Playwright-Retry + 2-Retry policy |
| 3 | Issue-Spam | Same Finding 7 Tage hintereinander | Nightly fires 7 Issues | Dedupe via Issue-Title-Hash | `gh issue list --search "title:..."` vor create |
| 4 | New-Audit-Drop | Slice 234 fügt audit:X — wird er auto-getriggered? | New Tool added | Nicht automatisch — Slice 234 muss workflow.yml erweitern | Slice 234 Definition-of-Done erzwingt das via Hook (Slice 234) |
| 5 | Secrets-fehlend | SMOKE_EMAIL nicht gesetzt | Secret undefined | Smoke fail mit klarer Message | `env`-Block + actionlint-warning |
| 6 | Workflow-Loop | Workflow committed → CI feuert → endless | infinite loop | Workflow ist scheduled-only nicht push-triggered | `on: schedule + workflow_dispatch` (kein push) |

**6 Items, S-Slice-Mindest erfuellt.**

## 8. Self-Verification Commands

```bash
# YAML-Syntax-Check
cat .github/workflows/nightly-audit.yml | python -c 'import yaml,sys; yaml.safe_load(sys.stdin)'

# Wiring-Verifikation
grep -c "pnpm run audit:" .github/workflows/nightly-audit.yml  # >= 7

# Permission-Check (errors-infra.md GHA-issues:write Pattern)
grep "issues: write" .github/workflows/nightly-audit.yml

# Cron-Schedule-Check (workflow_dispatch + cron)
grep "cron:" .github/workflows/nightly-audit.yml

# Manual-Trigger nach push
git push origin main
gh workflow run nightly-audit.yml
gh run list --workflow=nightly-audit.yml --limit 1
gh run view <run-id>
```

## 9. Open-Questions

**Pflicht-Klärung:**
1. **Issue-Spam-Strategie:** Bei 7 Findings im Audit erstellen wir 1 Sammel-Issue oder 7 separate? **Antwort:** 1 Sammel-Issue. Bei 7 separaten wuerde Anil's Inbox fluten. Sammel-Issue mit Markdown-Sub-Sections pro Audit-Tool.
2. **Issue-Dedupe:** Wenn gleiches Finding 7 Tage hintereinander, was tun? **Antwort:** Title-Hash-basierter Search vor create — wenn open Issue mit gleichem Hash existiert, Body-Update statt new-Issue. Slice 234 für Detail.

**Autonom-Zone (CTO entscheidet):**
- Workflow-Job-Naming
- Order der Audit-Calls
- Continue-on-error pro Step

**Nicht-Autonom:**
- Vercel-Plan-Frage (Hobby-Limit) — kein Money-Path, aber wenn Pro nötig: Anil entscheidet. **Antwort:** GHA hat KEIN Hobby-Limit fuer scheduled workflows. Slice 187 D36 betrifft Vercel-Crons, nicht GHA.

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| Workflow / GHA | YAML-Lint + Wiring-Audit + Live-Run-Verify nach Push → `worklog/proofs/233-nightly-audit-smoke.txt` |

**Pflicht-Sektionen im Proof-File:**
1. AC-01 YAML-Parse-OK
2. AC-02 Wiring-Count
3. AC-03/04/05/06 Static-Greps
4. AC-07 LIVE-Run via `gh run list`+`gh run view` Output

## 11. Scope-Out

- **Issue-Dedupe via Title-Hash** → Slice 234 (folgt direkt). Slice 233 erstellt erst-mal jedes Mal Sammel-Issue, Spam-Mitigation kommt nach.
- **Wiring-Audit-Tool** (`scripts/wiring-check.ts`) → Slice 235 (M-Slice). Detection-Tool fuer Build-without-Wire-Pattern. Slice 233 ist die direkte Recovery, Slice 235 die Prevention.
- **`workflow.md` Definition-of-Done-Update** → Teil von Slice 233 (geht in den Slice rein, NICHT als Future-Slice).
- **Hook `ship-tool-wiring-gate.sh`** → Slice 236 (XS, depends auf Slice 235 fuer Detection-Logic).

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (skipped: GHA-only, kein Cross-Cutting zu src/)
     → BUILD (.github/workflows/nightly-audit.yml schreiben + workflow.md/decisions.md erweitern)
     → REVIEW (Reviewer-Agent — neue Wiring-Klasse, kein D35-Pattern-Wiederholung)
     → PROVE (YAML-Lint + Wiring-Audit + Live-Run nach push)
     → LOG
```

## 13. Pre-Mortem

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | YAML-Syntax-Error in workflow.yml | LOW | hoch (Workflow nie ausgeführt) | Pre-Push YAML-Lint via Python | actionlint vor commit, Live-Run-Verify Pflicht |
| 2 | `gh issue create` 403 wegen permissions | MED | hoch (Findings unsichtbar) | `permissions: { issues: write }` explizit | AC-04 erzwingt das |
| 3 | Audit-Script lokal grün, in GHA-Ubuntu rot (Locale/Pfad-Drift) | MED | mittel (False-Failures) | Negative-Test in GHA-Run vor Auto-Issue | Slice 234 dedup verhindert Issue-Spam |
| 4 | Issue-Spam (7 Tage gleiches Finding) | HIGH | mittel (Anil's Inbox flutet) | Slice 234 Title-Hash-Dedupe | Manual Issue-close-Strategie bis Slice 234 |
| 5 | Cron läuft nicht (GitHub-Actions-Quirk: scheduled workflows skippen wenn 60d inaktiv) | MED | niedrig | Nutzung > 60d garantiert via Daily-Cron | gh API workflows-list checken nach 1 Woche |
| 6 | bescout.net Down → Smoke schlägt fehl, Beta-Blocker-Spam | LOW | mittel | Retry-Logik + 503-Specific-Message | actions/github-script Conditional |

---

## Compliance-Check

Nicht relevant — Infra-Slice, kein User-facing-Text.

## TR-Wording

Nicht relevant.

## Open Risiko

**Risk 1:** Issue-Spam in den ersten 1-2 Tagen bevor Slice 234 (Dedupe) lebt. **Mitigation:** Slice 233 + Slice 234 nacheinander an gleichem Tag — Anil-Inbox-Pain max 24h.

**Risk 2:** Audit-Scripts haben unterschiedliches Verhalten (exit-code vs report-only). **Mitigation:** Workflow-Step nutzt `continue-on-error: true` pro Audit, sammelt am Ende alle Outputs in einem Sammel-Issue.

**Risk 3:** Erste echte Self-Improvement-Loop — wir lernen erst LIVE was es findet. **Mitigation:** Akzeptiert. Das ist der Wert des Slices: was 19 Slices versteckt war, wird in 24h sichtbar.
