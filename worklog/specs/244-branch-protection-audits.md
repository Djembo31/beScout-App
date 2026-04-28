# Slice 244 — Branch-Protection erweitern um Audit-required-status-check

**Größe:** XS
**Slice-Type:** GHA
**Datum:** 2026-04-28
**Bezug:** docs/test.rtf #9 (Branch-Protection main hat nur 3 required status checks (lint/build/test) — die neuen Audits sind nicht required) — strukturell offen seit Slice 233/234.

## 1.1 Problem-Statement

`gh api repos/Djembo31/beScout-App/branches/main/protection` zeigt aktuell:
```yaml
required_status_checks:
  contexts: ["lint", "build", "test"]
```

`nightly-audit.yml` läuft täglich 03:00 UTC, ist aber `on: schedule` only → kein Status-Check pro Push. CI-Layer für Audits fehlt vollständig auf der Push-Seite. Slice 243 hat den Pre-commit-Layer geschlossen — Slice 244 schließt den Push-Layer.

**Evidenz aus Repo:**
- `cat .github/workflows/ci.yml` → 3 jobs: lint, build, test. Lint hat zwar `audit:silent-fail:check` + `cron:audit`, aber type-truth/stale/wiring fehlen.
- `gh api ... branches/main/protection` → contexts: 3.
- Anil-Quote: *"Die neuen Audits (orphan/stale/type-truth) sind nicht required, also würden sie auch in CI nicht blockieren falls verkabelt."*

## 1.2 Lösungs-Design

**Zwei Änderungen:**

1. **ci.yml** — NEUER `audit` job mit 3 schnellen Audits (analog pre-commit Slice 243 für Konsistenz):
   - `pnpm run audit:type-truth`
   - `pnpm run audit:stale`
   - `pnpm run audit:wiring:check`

2. **Branch-Protection** — `gh api PUT` mit erweitertem contexts-array:
   - alt: `["lint", "build", "test"]`
   - neu: `["lint", "build", "test", "audit"]`

**Bewusst ausgeschlossen:**
- `audit:orphan` — aktuell exit 1 (9 echte unused warten auf Slice 239). Würde CI permanent rot färben. Bleibt in `nightly-audit.yml` mit `continue-on-error: true`.
- `audit:silent-fail:check` — bereits in lint-job → Doppellayer wäre Noise.
- `audit:mutation-race:check` — analog.

**Sequenz** (kritisch — Branch-Protection nicht VOR erstem grünen Run):
1. ci.yml ändern + commit + push
2. Erste CI-Run mit neuem `audit` job laufen lassen → muss grün sein
3. `gh api PUT` Branch-Protection mit `["lint","build","test","audit"]`
4. Verify via `gh api GET`

## 1.3 Betroffene Files

- `.github/workflows/ci.yml` — NEU `audit` job

## 1.4 Code-Reading-Liste (VOR Implementation)

| File | Zweck | Frage |
|------|-------|-------|
| `.github/workflows/ci.yml` | Source-of-Truth jobs | Pattern für pnpm-setup + checkout? |
| `.github/workflows/nightly-audit.yml` | Audit-Run-Pattern | Wie sind audit-Steps strukturiert? |

## 1.5 Pattern-References

- **D54** (Slice 234) — Build-without-Wire-Verbot. Branch-Protection-Wiring schliesst den letzten offenen CI-Layer.
- **D45** (Hooks > Text-Regeln) — Architektonische Enforcement.
- **Slice 233 D53** — nightly-audit hat audit-jobs-Pattern, das ich übernehmen kann.
- **Slice 243** — gleiche 3 Audits in pre-commit für Layer-Konsistenz.

## 1.6 Acceptance Criteria

```
AC-01: ci.yml hat neuen Job `audit` mit pnpm-setup analog lint/build/test (gleiche Boilerplate).
AC-02: audit-Job hat 3 Steps: audit:type-truth, audit:stale, audit:wiring:check (in dieser Reihenfolge).
AC-03: ci.yml YAML-Lint-clean (`actionlint` oder gh workflow run --validate).
AC-04: Erste Live-Run nach Push: `audit` job exit 0, alle 3 Steps grün.
AC-05: Branch-Protection contexts erweitert auf ["lint","build","test","audit"] via `gh api PUT`.
AC-06: Verify via `gh api GET` — contexts-Array enthält alle 4 Werte.
```

## 1.7 Edge Cases

| Case | Verhalten |
|------|-----------|
| audit-Job failed nach Branch-Protection-Update | Push BLOCKED → muss gefixt werden, Branch-Protection NICHT zurückrollen |
| pnpm-Cache-Miss | langsam aber kein Failure |
| Audit-Tool exit 1 (echte Drift in Future) | Push BLOCKED → Discipline correctly enforced |
| Reihenfolge-Race (Branch-Protection VOR CI grün) | Push für die Branch-Protection-Änderung selbst BLOCKED → muss `--admin` oder workflow_dispatch nutzen |

## 1.8 Self-Verification Commands

```bash
# Pre-Push: lokale Validation der ci.yml
npx prettier --check .github/workflows/ci.yml

# Post-Push: Status-Check
gh run list --branch main --workflow CI --limit 3

# Post-CI-Green: Branch-Protection update
gh api -X PUT /repos/Djembo31/beScout-App/branches/main/protection \
  --input scripts/branch-protection-payload.json

# Verify
gh api /repos/Djembo31/beScout-App/branches/main/protection \
  | grep -A5 'required_status_checks'
```

## 1.9 Open-Questions / Autonom-Zone

**Pflicht-Klärung:** keine — XS GHA-Refinement ohne CEO-Scope.

**Autonom-Zone (CTO):**
- Job-Name `audit` (gewählt — kurz, semantisch, kein Konflikt mit existing jobs)
- Reihenfolge der 3 Steps innerhalb des Jobs
- Continue-on-error: **NEIN** für required-status-check (default fail-fast)

## 1.10 Proof-Plan

- `worklog/proofs/244-ci-yml-diff.txt` — `git diff .github/workflows/ci.yml`
- `worklog/proofs/244-ci-run-success.txt` — `gh run view <id>` Output mit audit-job grün
- `worklog/proofs/244-branch-protection-after.json` — `gh api GET` mit allen 4 contexts

## 1.11 Scope-Out

- **`audit:orphan` als required** → Slice 239+ (wenn 9 echte unused gefixt sind)
- **pre-push-hook** → Backlog
- **deferred-Re-Eval-Hook** → Slice 245

## 1.12 Stage-Chain (geplant)

SPEC → IMPACT (skipped: GHA-only, kein Cross-Domain) → BUILD → REVIEW (self-review D35: Pattern-Wiederholung Slice 233 D53 + 243) → PROVE → LOG

## 1.13 Pre-Mortem (XS optional)

- **Risiko:** ci.yml YAML-Syntax-Bug → CI failt sofort. Mitigation: Pre-Push lokales `prettier --check`.
- **Risiko:** Branch-Protection-Update VOR erster grüner CI-Run → eigener Push für ci.yml-Änderung könnte blockiert werden. Mitigation: Sequenz strikt einhalten (1→2→3 wie 1.2).
- **Risiko:** GitHub-API-Token-Berechtigung fehlt für Branch-Protection-PUT. Mitigation: Vorher mit `gh auth status` verifizieren; bei Fehler Anil informieren (er hat repo-admin).
