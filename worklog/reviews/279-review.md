# Slice 279 Review

**Verdict:** PASS
**Datum:** 2026-05-06
**Reviewer:** reviewer-agent (cold-context)
**Time-spent:** 25 minutes

## Findings

### F-01 [SEV-LOW] AC-10 Permissions-Drift: pull-requests:write fehlt
- **Location:** `.github/workflows/lighthouse.yml:6-8`
- **Issue:** Spec AC-10 listet `permissions: { contents: read, actions: read, pull-requests: write }`. Workflow hat nur `contents: read, actions: read`. Begründung in Spec: "pull-requests fuer optional PR-Comment Slice 280+". Da Slice 279 keinen PR-Comment baut, ist `pull-requests: write` aktuell ungenutzt — YAGNI-konform. Aber Code matcht NICHT die Spec-AC-10.
- **Fix:** Spec AC-10 herabstufen auf 2 Permissions mit deferred-Notiz "pull-requests:write deferred bis Slice 280". Kein "Permissions on Speculation" als YAGNI-Pattern.

### F-02 [SEV-LOW] URL-Tausch /player/[id] → /community: Spec-Drift dokumentiert, aber AC-02 nicht aktualisiert
- **Location:** `lighthouserc.json:8` + Spec AC-02 + AC-09
- **Issue:** Spec AC-02 sagt `URLs: / + /market + /player/[id]`. Workflow + lighthouserc nutzen `/community`. Begründung in `_comment`-Field korrekt dokumentiert (dynamic-id-drift-Risk), aber AC-02 nicht synchronisiert. workflow.md Anti-Pattern „Stale-Status uebernehmen" verletzt.
- **Fix:** Spec AC-02 + AC-09 aktualisieren auf `/community` mit Drift-Notiz. Bundle-Budget-Check: `/community` = 400KB FLJS, `/player/[id]` = 415KB — beide Top-3-FLJS-Pages, Tausch legitim.

### F-03 [SEV-INFO] continue-on-error: false vs. WARN-only Assertions — by-design OK
- **Location:** `.github/workflows/lighthouse.yml:74`
- **Issue:** `continue-on-error: false`. LHCI-CLI exit-Semantik: `warn`-level → exit 0; `error`-level → exit 1. Da alle Phase-1-Assertions auf `warn` sind, hard-failt Workflow nicht. Phase-3-Switch wird konsistent funktionieren.
- **Fix:** keine Änderung nötig. INFO-only Hinweis fuer Phase-3-Aktivierung.

### F-04 [SEV-INFO] Job-Summary parse-error fallback ist robust aber silent
- **Location:** `.github/workflows/lighthouse.yml:109`
- **Issue:** Bei silent-Parse-Error fehlt explizite `::warning::`-Annotation. Phase 1 will explicit jeden parse-fail im run-log sehen.
- **Fix:** Nach Phase 1 Live-Run beobachten — wenn Parse-Errors auftreten, hier `echo "::warning::Job-Summary parse-error — see logs"` ergaenzen. Aktuell nicht-blocking, INFO-only.

## AC-Coverage Verifikation

| AC | Spec sagt | Workflow/Config | Status | Bemerkung |
|----|-----------|-----------------|--------|-----------|
| AC-01 | trigger deployment_status | `if: deployment_status.state == 'success' && deployment.environment == 'Production'` | ✅ wired | Filter identisch zu post-deploy-smoke.yml proven-Pattern |
| AC-02 | 3 URLs × 3 iterations | urls.length=3, numberOfRuns=3 | ✅ wired | URL-Set abweicht (siehe F-02) |
| AC-03 | Mobile + Slow 4G simulated | preset:perf, throttlingMethod:simulate, rttMs:150, throughputKbps:1638.4, cpuSlowdownMultiplier:4, formFactor:mobile | ✅ wired | Lighthouse-Mobile-Slow-4G exact match. screenEmulation 393×852 = iPhone 16 |
| AC-04 | Job-Summary LCP/CLS/TBT/Score | Markdown-Tabelle via $GITHUB_STEP_SUMMARY + node-Parse manifest.json | ✅ wired | Speed-Index als Bonus |
| AC-05 | Artifact retention 30d | actions/upload-artifact@v4, retention-days: 30 | ✅ wired | name-Pattern robust gegen workflow_dispatch |
| AC-06 | Phase-1 WARN-only | Alle assertions level "warn" | ✅ wired | Korrekt — kein hard-fail in Phase 1 |
| AC-07 | Baseline-Markdown nach 3-5 Runs | (Phase 2-Task) | 🕐 deferred | by-design |
| AC-08 | Hard-fail Gate post-Baseline | (Phase 3-Task) | 🕐 deferred | by-design |
| AC-09 | pnpm run lighthouse:local | `"lighthouse:local": "lhci autorun --config=./lighthouserc.json"` | ✅ wired | Script vorhanden, Config-Path korrekt; @lhci/cli ^0.15.1 als devDep installiert |
| AC-10 | permissions explizit (3 keys inkl pull-requests:write) | contents:read, actions:read (2 keys) | ⚠️ drift | pull-requests:write fehlt vs. Spec (siehe F-01) |

**Phase-1 BUILD-Status:** 8/10 directly verifiable, 2 by-design deferred. F-01 + F-02 sind Spec-Update-Pflicht (non-blocking, im LOG-Step erledigen).

## Pattern-Compliance

- **errors-infra.md "Master-Tracker-Pre-Check Code-Pattern" (Slice SO-4):** N/A — Phase 1 ohne hard-fail, kein Auto-Issue. **Risk-Item Phase-3-LOG:** wenn Phase 3 hard-fail aktiviert wird UND Auto-Issue gewuenscht, MUSS Master-Tracker-Pattern angewandt werden.
- **errors-infra.md "Cold-Start-Warm-Up vor Smoke-Suite" (Slice SO-4):** ✅ correctly applied. Workflow Z.49-66 ist 1:1-Kopie aus `post-deploy-smoke.yml`. Comment referenziert Slice SO-4 explicit.
- **errors-infra.md "GitHub Actions: Default GITHUB_TOKEN hat KEINE issues: write":** ✅ correct — Phase 1 ohne Auto-Issue, daher `issues: write` nicht angefordert. YAGNI-konform.
- **errors-infra.md "Vercel Hobby-Tier Silent-Build-Fail bei hourly Crons":** N/A — Trigger ist `deployment_status` + `workflow_dispatch`, kein cron-schedule.
- **D45 (Hooks > Text-Regeln):** ✅ fits. Lighthouse-CI-Gate ist die GHA-Hook-Variante fuer Performance-Discipline (analog `audit:type-truth`, `audit:wiring`).
- **D54 (Build-without-Wire) Recovery:** ✅ fits. `lighthouserc.json` war pre-existing orphan (commit 8aad8428 vom 2026-04-19). Slice 279 verkabelt in 2 Trigger-Pfade: `lighthouse:local` npm-Script + `lighthouse.yml` GHA-Job. Korrektes D54-Recovery in 1 Slice.
- **workflow.md Section 3a GHA-Type DoD:**
  - ✅ YAML-Lint-clean (15/15 sanity passed)
  - ✅ permissions explizit (auch wenn Spec-Drift in F-01, ist explicit)
  - 🕐 Live-Run nach push verifiziert — pending Anil-Action
  - 🕐 Failure-Path erprobt — Phase 1 hat keinen Failure-Path-Auslöser; Phase 3 task
  - **Verdict: Phase 1 BUILD ist "done" akzeptabel** — die zwei deferred-Items sind by-design.

## Spec-Drift?

Zwei Spec-Drift-Punkte detektiert, beide rationale-justified:

1. **URL-Set:** Spec sagt `/player/[id]`, Implementation `/community`. Begründung im `_comment` korrekt dokumentiert. Spec-AC-02 sollte aktualisiert werden (siehe F-02). Beide URLs public-readable, beide Top-FLJS-Pages.
2. **AC-10 Permissions:** Spec sagt 3 Permissions inkl. `pull-requests: write`. Implementation 2 Permissions. YAGNI-konform. Spec-Update Pflicht (siehe F-01).

Ansonsten konsistent: Section 3 "Betroffene Files" matched, Stage-Chain sauber dokumentiert mit IMPACT-skipped-Begründung, Pre-Mortem deckt 7 Risk-Szenarien ab (M-Slice-Mindest 5+ erfüllt).

## Empfehlung

**READY FOR COMMIT — PASS mit zwei minor Spec-Updates pflicht VOR LOG-Stage:**

1. Spec AC-02 + AC-09 aktualisieren auf `/community` statt `/player/[id]` mit Drift-Notiz.
2. Spec AC-10 herabstufen auf 2 Permissions mit deferred-Notiz "pull-requests:write deferred bis Slice 280".

**Code-Quality der Workflow-Datei:** Hoch.
- Cold-Start-Warm-Up Pattern 1:1 aus errors-infra.md Slice SO-4 uebernommen.
- Concurrency-Group cancel-in-progress korrekt für Quota-Schutz.
- manifest.json-Parse mit 3 Layern Defensive (`-d .lighthouseci`, `-f manifest.json`, `2>&1 || echo`).
- timeout-minutes:15 ausreichend für 9 Lighthouse-Runs.
- Artifact-Naming `deployment.sha || github.sha` Fallback robust.
- Slice-IDs in Comments → Knowledge-Trace via grep.
- `if-no-files-found: warn` auf upload-artifact verhindert silent-fail-Kette.

**Code-Quality lighthouserc.json:** Hoch.
- `_comment`-Field als first-class Documentation (analog bundle-budget.json).
- Throttling-Werte exact-match Lighthouse-Mobile-Slow-4G-Standard.
- screenEmulation 393×852 = iPhone 16 = CLAUDE.md Mobile-First-Default.
- chromeFlags `--no-sandbox --headless=new` korrekt für GHA-Container.
- Phase-1 alle Assertions auf `warn` mit `_comment_phase1` Phase-3-Migration-Bedingung dokumentiert.

**Knowledge-Capture-Kandidaten (für Slice-LOG):**

1. **Pattern: "Phase-Plan in 1 Slice (BUILD-now + LOG-tasks-deferred)"** — neu. Kandidat für Pattern-Promotion in `memory/patterns.md` post-Phase-3-Erfolg.
2. **Pattern: "GHA-Workflow im D54-Recovery-Modus verkabelt orphan Config"** — bestätigt D54-Pattern auch für GHA-Achse. Eintrag in `errors-infra.md` als Beispiel post-Phase-3.

**Reviewer-Final-Verdict:** **PASS**. Implementation sauber, Pattern-konform, defensiv. Die zwei Spec-Drifts sind Dokumentations-Updates, nicht Code-Bugs. Cold-Start-Track-Foundation solide gelegt.
