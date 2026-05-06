# Slice 281 — Synthetic-User-Suite Daily-GHA-Verkabelung (D54-Recovery)

**Status:** ACTIVE · **Größe:** XS · **Slice-Type:** GHA-Workflow · **Scope:** CTO · **Datum:** 2026-05-06

## 1. Problem-Statement

`e2e/synthetic-users.spec.ts` (3 Profile: Discovery 12 Pages, Power Buy-Flow, TR-Locale 12 Pages + String-Dump) existiert seit Phase-A Beta-Setup. `pnpm run test:synthetic` Script verkabelt. **Aber: nie in GHA-Schedule verkabelt** → klassisches D54-Build-without-Wire. Während aktueller Live-Beta-Phase mit Taki/Nail Mo (siehe `memory/project_beta_live.md`) liefert Synthetic-Daily-Run **Tester-Surrogate-Coverage** die Smoke-Suite (10 Flows) nicht abdeckt: 3-Personas-Deep-Walk inkl. TR-String-Audit.

**Evidence:** `grep schedule .github/workflows/*.yml` → nur `nightly-audit.yml`. `e2e/synthetic-users.spec.ts` 270 Zeilen, 3 test.describe-Blöcke, alle Production-ready aber 0 GHA-Trigger.

## 2. Lösungs-Design

Neuer GHA-Workflow `.github/workflows/synthetic-users.yml`. 1:1 Pattern aus `post-deploy-smoke.yml`:
- **Trigger:** `schedule: '0 5 * * *'` UTC (07:00 Berlin Sommerzeit, 1h Headroom nach nightly-audit 03:00+04:00) + `workflow_dispatch`
- **Permissions:** `contents:read, issues:write, actions:read` (analog post-deploy-smoke)
- **Steps:** checkout + pnpm + node + install + playwright-install + Warm-Up (Slice SO-4) + run synthetic + Artifacts + Master-Tracker-Issue-on-Failure
- **Failure-Behavior:** Master-Tracker-Issue mit `synthetic-fail` + `beta-blocker` Labels (analog Slice SO-4 für smoke-fail)
- **Artifacts:** `qa-screenshots/synthetic/` Folder (Screenshots + tr-strings.txt) 14-day-Retention bei Failure, 7-day bei Success für TR-String-Audit-Verlauf

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `.github/workflows/synthetic-users.yml` | NEU | Daily-GHA-Cron + Master-Tracker-Pattern |

Optional (nicht in Slice 281):
- `e2e/synthetic-users.spec.ts` — keine Änderung, Suite ist Production-ready
- `playwright.config.ts` — keine Änderung, `synthetic`-Project bereits konfiguriert

## 4. Code-Reading-Liste (Pflicht VOR Implementation, XS-Slice ≥ 3 Items)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `.github/workflows/post-deploy-smoke.yml` | Master-Tracker-Pattern Source | 1:1 Adapter — Cold-Start-Warm-Up + Master-Tracker-Issue-Logic übernehmen |
| `.github/workflows/nightly-audit.yml` | Schedule-Cron-Pattern + Multi-Schedule-If-Filter | Schedule-Format `0 5 * * *` + permissions Block |
| `e2e/synthetic-users.spec.ts` | Test-Suite-Struktur | Dauer (3 Profile × ~30s = ~2 Min), Auth-Pattern (SMOKE_EMAIL+SMOKE_PASSWORD), Output-Pfad qa-screenshots/synthetic/ |
| `errors-infra.md` Slice SO-4 „Master-Tracker-Pre-Check Code-Pattern" | Pre-Check-Implementation | Labels-AND-Match (`synthetic-fail,beta-blocker`), Title-Heuristik, Closing-Strategy-Hint |

**Mindest 3 Items: ✓ (4 Items)**

## 5. Pattern-References

- **D54** Build-without-Wire — Slice 281 ist Recovery-Slice für orphan synthetic-Suite (Tool gebaut + Phase-A-Doku-erwähnt, nie GHA-verkabelt)
- **Slice SO-4** errors-infra.md „Master-Tracker-Pre-Check Code-Pattern" — Issue-Spam-Prevention bei recurring Failures
- **Slice SO-4** errors-infra.md „Cold-Start-Warm-Up vor Smoke-Suite" — Vercel-Lambda Warm-Boot-Window (60s) vor Playwright-First-Goto
- **project_beta_live.md** — Live-Beta-Status mit Taki/Nail Mo, Synthetic ist Tester-Surrogate-Coverage

## 6. Acceptance Criteria

```
AC-01: [HAPPY] .github/workflows/synthetic-users.yml existiert + valid YAML + permissions Block
AC-02: [HAPPY] Schedule-Cron `0 5 * * *` UTC + workflow_dispatch konfiguriert
AC-03: [HAPPY] Cold-Start-Warm-Up Step VOR Synthetic-Run (Slice SO-4 Pattern)
AC-04: [HAPPY] Master-Tracker-Issue-Pattern für Failure (Pre-Check listForRepo + createComment-OR-create-Master)
AC-05: [REGRESSION] Manueller workflow_dispatch in GHA-UI funktioniert (Anil-verifizierbar nach Push)
AC-06: [REGRESSION] On Success: TR-String-Dump als Artifact uploaded (für Anil's TR-Audit-Verlauf)
```

**Mindest 3 ACs (XS): ✓ (6 ACs)**

## 7. Edge Cases

| # | Case | Mitigation |
|---|------|------------|
| 1 | Synthetic-Suite-Bruch durch UI-Refactor | Master-Tracker-Issue verhindert Spam, Anil sieht 1× Issue + Comments-Liste |
| 2 | Vercel-Cold-Lambda zur Cron-Zeit (05:00 UTC = niedriger Traffic) | Warm-Up-Step 6× retry × 30s curl |
| 3 | False-Positive durch flaky synthetic test | continue-on-error nicht setzen — Failure ist Failure, Anil triagt via Issue. Synthetic hat `retries: 1` configured (Slice 268b) für Flake-Tolerance. |

**Mindest 3 (XS): ✓ (3 Cases)**

## 8. Self-Verification Commands

```bash
# Pre-Implementation
ls .github/workflows/synthetic-users.yml 2>&1   # → "No such file" expected
grep "synthetic" package.json                    # → test:synthetic script existiert

# Post-Implementation Local
yamllint .github/workflows/synthetic-users.yml 2>&1 || echo "yamllint not installed — skip"

# Post-Push (Live-Verify)
gh workflow list | grep -i synthetic
gh workflow run synthetic-users.yml             # manueller Dispatch
gh run list --workflow=synthetic-users.yml --limit=3
gh run view <run-id> --log
```

## 9. Open-Questions

Keine — Pattern ist gut etabliert (post-deploy-smoke.yml Template), Anil-Approval implizit via „erstverkabeln".

## 10. Proof-Plan

| Phase | Proof |
|-------|-------|
| Pre-Push | `worklog/proofs/281-workflow-yaml.txt` — Workflow-File-Content + yamllint-pass |
| Post-Push | `worklog/proofs/281-live-run.txt` — `gh run view` Output des ersten manual-Dispatch-Runs |

## 11. Scope-Out

- Schedule-Frequenz-Change (täglich vs. mehrmals täglich) — kann nach 1 Woche Live-Daten reviewt werden, nicht in 281
- Synthetic-Suite-Erweiterung um neue Pages — separate Slice 281b wenn Coverage-Lücke gefunden
- Per-Profile-Triggering (Discovery only, Power only, TR only) — defer bis Use-Case auftaucht
- Discord/Slack-Notification statt Issue — defer post-Beta

## 12. Stage-Chain (geplant)

```
SPEC (this) → IMPACT (skipped — neue Workflow-Datei, keine Service/RPC/DB) → BUILD → REVIEW (self-review für XS-Pattern-Wiederholung — Workflow ist 1:1 Template-Anpassung) → PROVE (yaml-syntax + manual workflow_dispatch verify) → LOG
```

## 13. Pre-Mortem

Skipped (XS-Slice). Bekannte Risiken:
- Workflow-YAML-Syntax-Fehler → yamllint pre-commit
- Falsche secret-Namen → Smoke nutzt SMOKE_EMAIL+SMOKE_PASSWORD die schon konfiguriert sind
- Schedule-Cron-Format-Bug → 1:1 aus nightly-audit.yml übernehmen
