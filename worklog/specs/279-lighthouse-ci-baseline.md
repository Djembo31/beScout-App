# Slice 279 — Lighthouse-CI Baseline + GHA-Gate (Cold-Start-Track Foundation)

**Status:** SPEC · **Größe:** M · **Slice-Type:** GHA · **Scope:** CTO (Performance-Discipline, kein Money/Wording-Change) · **Datum:** 2026-05-06

> **Track-Approval-Pflicht (D70):** VOR BUILD muss Anil OK geben fuer den 4-Slice-Multi-Slice-Track (279-282). Spec wird zuerst geliefert, Anil approved oder verschiebt.

---

## 1. Problem Statement

**Anil-Quote 2026-05-06 ~15:35:** „ich bin weiterhin mit dem laden der App total unzufrieden! warum bekommen wir es nicht endlich mal alles reibungslos, abgestimmt wie ein fluss hinzubekommen? was machen die anderen anders wie wir?"

Cold-Start auf `bescout.net` Mobile dauert geschaetzt 4-5s LCP. Web-Vital "good" ist <2.5s. Sorare/Linear/Socios liefern <2s LCP auf gleichem Mobile-Profile. Status-quo:
- Bundle-Budget existiert (Slice 185b) — Größen-Drift ist gegated, ABER LCP-Drift ist nicht sichtbar.
- Slice 109 hat gezeigt: Query-Konsolidierung allein bringt -1.3% LCP (innerhalb Mess-Rauschen) wenn Queries sowieso parallel laufen. Optimierung ohne Lighthouse-Mess-Wahrheit produziert „Optimize-Theater".
- Slice 121 hat gezeigt: `dynamic()` lazy-import bringt 0 wenn andere Code-Pfade eager importieren. Bundle-Splitting blind ist Zeitverschwendung.

**Wer ist betroffen, wie oft?** ALLE Beta-Tester die `/` zum ersten Mal laden. 50 Tester-Pipeline laut `feedback_imperium_vision.md`. Tester die 4s Cold-Start sehen, kommen nicht wieder — Web-Vital-LCP <2.5s ist Mindeststandard fuer Retention 2026.

**Severity:** P1 (Strategic-Track-Foundation, ohne Slice 279 ist Slice 280-282 nicht messbar).

## 2. Lösungs-Design (Architektur)

**Was aendert sich:** Eine neue GitHub Actions-Workflow-Datei `.github/workflows/lighthouse.yml` die nach jedem erfolgreichen Vercel-Deploy auf `main` (gleicher Trigger wie `post-deploy-smoke.yml`) ein Lighthouse-Audit gegen die echte Vercel-Live-URL laeuft. Audit nutzt `treosh/lighthouse-ci-action@v12` mit Mobile-Preset + simulated Slow 4G Throttling. Reports werden als Workflow-Artifacts archiviert + im Job-Summary inline angezeigt.

**Datenfluss:**

```
Vercel Deploy SUCCESS
   ↓ (deployment_status webhook)
GitHub Actions trigger lighthouse.yml
   ↓
Job: lighthouse
   1. checkout @v6 + setup-node @v6
   2. npx @lhci/cli@0.14.x autorun --config=./lighthouserc.json
      - URLs: /, /market, /player/[id] (Top-3-FLJS-Pages laut bundle-budget.json)
      - 3 runs per URL (median wird genommen — verringert Mess-Rauschen)
      - Mobile-Preset, Slow 4G throttling, headless Chrome
   3. Upload .lighthouseci/ als Artifact (retention: 30 days)
   4. Job-Summary: Tabelle LCP/FID/CLS/TBT/Score per URL
   5. WARN-only Phase 1 (kein hard-fail) — sammelt 3-5 Baseline-Runs
```

**Phase-Plan (im selben Slice):**
- **Phase 1 (heute, in Slice 279 BUILD enthalten):** Workflow live, 3-5 Runs nach Approval um Baseline-Rauschen zu messen, kein Gate.
- **Phase 2 (Slice 279 LOG, nach 3-5 Runs):** `worklog/audits/<date>/lighthouse-baseline.md` mit Mean ± StdDev pro Metric. Gate-Schwellen werden DARAUS abgeleitet (z.B. baseline + 1.5 × StdDev als hard-fail).
- **Phase 3 (Slice 279 LOG abschluss):** `lighthouserc.json` `assertions`-Block aktivieren mit den Baseline-Schwellen → ab dann hard-fail bei Drift.

**Neue Types/Interfaces:** keine (config-driven).

**Neue DB-Objects:** keine.

**Trade-offs erwogen:**
- A) Lighthouse-CI auf JEDEN Push (PR + main) → verworfen: testet Vercel-Preview-URLs (Auth-Wall, andere Caching-Profile als Prod). PR-Lighthouse waere unzuverlaessig.
- B) Selbst-gehostetes WebPageTest → verworfen: zu viel Infra-Aufwand fuer Solo-Dev.
- C) **Lighthouse-CI auf deployment_status: success → gewaehlt: misst echte Prod, gleicher Trigger wie post-deploy-smoke (proven-Pattern).**
- D) Synthetic-Monitoring via Vercel Speed Insights → verworfen: Vercel Speed Insights ist Real-User-Monitoring (RUM) ohne deterministische Throttling, nicht reproduzierbar fuer CI-Gate. Gut als Ergaenzung post-Beta, nicht Ersatz.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `.github/workflows/lighthouse.yml` | NEU | Workflow-Datei, Trigger: deployment_status |
| `lighthouserc.json` | NEU | LHCI-Config: URLs, Throttling, Assertions (anfangs leer) |
| `package.json` | EDIT | Script `lighthouse:local` fuer lokalen Run gegen bescout.net |
| `worklog/audits/2026-05-06/lighthouse-baseline.md` | NEU (post-Phase-2) | Baseline-Mess-Wahrheit (Slice-LOG-Output, kein BUILD-Output) |
| `worklog/specs/279-lighthouse-ci-baseline.md` | NEU (dieses File) | Spec selbst |
| `worklog/proofs/279-lhci-first-run.txt` | NEU (post-BUILD) | Beweis dass Workflow live + erster Run gruen |

**Vor diesem Slice greppt man:**
- `grep -rn "deployment_status" .github/workflows/` → bestaetigt `post-deploy-smoke.yml` als Vorbild
- `grep -rn "@lhci/cli" .` → 0 results (neue Dependency)
- `grep -rn "lighthouse" package.json` → 0 results

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `.github/workflows/post-deploy-smoke.yml` | Trigger-Pattern Vorbild | Wie wird `deployment_status: success` gefiltert? Welche Permissions? Wie wird die deploy-URL extrahiert? |
| `.github/workflows/nightly-audit.yml` | Auto-Issue-Pattern Vorbild | Wie funktioniert Master-Tracker-Pre-Check (errors-infra.md "Master-Tracker-Pre-Check Code-Pattern")? Brauche ich das hier? |
| `.github/workflows/ci.yml` | Bundle-Budget-Job Vorbild | Wie laeuft `scripts/check-bundle-size.ts` als Gate? |
| `bundle-budget.json` | Performance-Budget-Wahrheit | Welche 3 Routes haben hoechsten FLJS-Wert? Das sind die LHCI-Test-Targets |
| `worklog/log.md` Slice 109 | Anti-Pattern „Optimize ohne Baseline" | Was war LCP-Win behauptet vs gemessen? -1.3% war innerhalb Mess-Rauschen |
| `worklog/log.md` Slice 121 | Anti-Pattern „Splitting blind" | Warum brachte `dynamic()` 0? Eager-Imports im anderen Code-Pfad |
| `worklog/log.md` Slice 185b | Bundle-Budget-Gate-Pattern | Wie wird CI-Gate ohne Branch-Protection-enforce_admins=true durchgesetzt? (Pattern-Familie zu D45) |
| `.claude/rules/errors-infra.md` „Vercel Hobby-Tier Silent-Build-Fail" | GHA-Limit-Falle | Vercel-Plan-Limit fuer Crons gilt nicht fuer GHA, aber: gibt es GHA-monthly-Minutes-Limit? Lighthouse-Run dauert ~2 min, ~3-5 deploys/Tag = 30 min/Monat (gut innerhalb 2000 free) |
| `node_modules/.../@lhci/cli/README.md` (oder context7-MCP) | LHCI-Library-Doku | Welche Version aktuell stable? Wie ist `lighthouserc.json`-Schema? |

**Mindest-Items: 9 (M-Slice braucht ≥ 6) ✓**

## 5. Pattern-References (relevant für DIESEN Slice)

- `decisions.md` D70 — Cold-Start-Track Definition, Anti-Patterns, Track-Approval-Pflicht. Begruendung: dieser Slice IST D70-Phase-1.
- `decisions.md` D45 — Hooks > Text-Regeln. Begruendung: GHA-Gate ist die Hook-Variante fuer Performance-Discipline (analog wie `audit:type-truth` fuer Type-Drift).
- `decisions.md` D54 — Build-without-Wire (Slice 233). Begruendung: Lighthouse-CI gebaut + nicht in GHA registriert = orphan-Tool. Daher gleicher Slice = workflow-yaml live.
- `errors-infra.md` „Master-Tracker-Pre-Check Code-Pattern" (Slice SO-4). Begruendung: WENN ich Auto-Issue fuer LCP-Regression baue, MUSS Master-Tracker-Pattern verwendet werden.
- `errors-infra.md` „GitHub Actions: Default GITHUB_TOKEN hat KEINE issues: write". Begruendung: lighthouse.yml braucht `permissions:` Block fuer issue-creation.
- `errors-infra.md` „Cold-Start-Warm-Up vor Smoke-Suite" (Slice SO-4). Begruendung: Lighthouse-Run trifft Vercel-Cold-Lambda — gleicher Warm-Up-Pattern wie post-deploy-smoke.
- `workflow.md` Section 3a Type-DoD-Tabelle. Begruendung: GHA-Slice-DoD = YAML-Lint + permissions explizit + Live-Run nach push verifiziert + Failure-Path erprobt.

## 6. Acceptance Criteria (Executable, nicht Prosa)

```
AC-01: [HAPPY] Workflow triggert nach erfolgreichem Vercel-Deploy auf main
  VERIFY: git push origin main mit trivial-Change → Vercel-Deploy → GHA Actions-Tab zeigt "Lighthouse Audit" Run
  EXPECTED: Run startet binnen 2 min nach Vercel-READY-Status
  FAIL IF: Run nicht angestoßen / nur manuell / triggert auf falschem Event

AC-02: [HAPPY] LHCI laeuft 3 URLs (/ + /market + /community) mit 3 Iterations je
  VERIFY: Workflow-Job-Logs enthalten "Run 1 of 3" bis "Run 3 of 3" pro URL
  EXPECTED: 9 Lighthouse-Runs pro Workflow-Aufruf, alle erfolgreich
  FAIL IF: <9 Runs / runs failen / falsche URLs
  HINWEIS (Slice 279 BUILD-Drift, Reviewer F-02): Original-Spec listete `/player/[id]`. Dynamic-id-drift-Risk (Player könnte inactive werden) → ersetzt durch `/community` (auch Top-3-FLJS, 400KB vs. 415KB). Begruendung im `_comment`-Field der lighthouserc.json.

AC-03: [HAPPY] Mobile-Preset + Slow 4G Throttling aktiv
  VERIFY: lighthouserc.json zeigt "preset": "perf" + "throttlingMethod": "simulate" + "throttling.cpuSlowdownMultiplier": 4 + "throttling.rttMs": 150 + "throttling.throughputKbps": 1638.4
  EXPECTED: Config matcht Lighthouse-Mobile-Slow-4G-Standard
  FAIL IF: Desktop-Preset / kein Throttling / Localhost-Run statt bescout.net

AC-04: [HAPPY] Job-Summary zeigt LCP/FID/CLS/TBT/Score-Tabelle pro URL
  VERIFY: GHA Actions-UI Job-Summary nach Run abrufen
  EXPECTED: Markdown-Tabelle mit 3 Zeilen (URL × Metric), median-Werte aus 3 Iterations
  FAIL IF: keine Tabelle / nur Logs / unleserliches Format

AC-05: [HAPPY] LHCI-Artifact upload retention 30d
  VERIFY: GHA Actions-UI „Artifacts" Sektion am Workflow-Run
  EXPECTED: `.lighthouseci.zip` herunterladbar, enthaelt JSON-Reports + HTML-Reports
  FAIL IF: kein Artifact / leeres Artifact / retention < 7d

AC-06: [WARN-PHASE-1] Erste 3-5 Runs sind WARN-only (kein hard-fail)
  VERIFY: lighthouserc.json `assert: { assertions: {} }` (leerer Block) in Phase-1
  EXPECTED: workflow-exit-code 0 selbst bei „schlechten" LCP-Werten
  FAIL IF: workflow rot weil Assertions-Block schon Schwellen hat → blockiert push (D70 Anti-Pattern „Optimize ohne Baseline")

AC-07: [WARN-PHASE-1→2 TRANSITION] Nach 3-5 Runs: Baseline-Markdown geschrieben
  VERIFY: `worklog/audits/2026-05-06/lighthouse-baseline.md` existiert + enthaelt Mean ± StdDev pro Metric pro URL
  EXPECTED: Tabelle mit „LCP-Mean: <X>ms / StdDev: <Y>ms / Schwelle vorgeschlagen: <X+1.5Y>ms" pro URL
  FAIL IF: Schwellen geraten statt aus echten Runs abgeleitet

AC-08: [GATE-PHASE-3] Hard-fail Gate live nach Baseline-Approval
  VERIFY: lighthouserc.json `assertions` ergaenzt mit „largest-contentful-paint": [„error", { „maxNumericValue": <Schwelle> }]
  EXPECTED: workflow rot wenn LCP > Schwelle, gruen sonst
  FAIL IF: Gate nicht aktiv post-Baseline / Schwelle willkuerlich

AC-09: [LOCAL-SCRIPT] `pnpm run lighthouse:local` laeuft gegen bescout.net und produziert HTML-Report
  VERIFY: pnpm run lighthouse:local
  EXPECTED: Exit 0, Output-Pfad zu `.lighthouseci/<timestamp>.report.html`, gemessene URLs = `/`, `/market`, `/community` (siehe AC-02 Drift-Notiz)
  FAIL IF: Script fehlt / failed / produziert keine HTML

AC-10: [PERMISSIONS] Workflow `permissions:` Block explizit gesetzt
  VERIFY: grep -A3 "^permissions:" .github/workflows/lighthouse.yml | head -5
  EXPECTED: `permissions: { contents: read, actions: read }` (2 keys explicit)
  FAIL IF: kein permissions-Block (default = read-all, ist OK aber nicht best-practice)
  HINWEIS (Slice 279 BUILD-Drift, Reviewer F-01): Original-Spec listete 3 Permissions inkl. `pull-requests: write`. YAGNI — Slice 279 baut keinen PR-Comment, daher 2 Permissions reichen. `pull-requests: write` deferred bis Slice 280 wenn PR-Comment-Feature wirklich gebaut wird.
```

**Coverage-Mapping:**
- HAPPY: AC-01, 02, 03, 04, 05, 09 ✓
- WARN-PHASE: AC-06, 07 ✓
- GATE-PHASE: AC-08 ✓
- SECURITY/PERMISSIONS: AC-10 ✓
- MOBILE: AC-03 (Mobile-Preset) ✓
- 10 ACs (M-Slice braucht ≥ 6) ✓

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Trigger | Vercel-Deploy schlaegt fehl | deployment_status: failure | Workflow triggert NICHT | `if: github.event.deployment_status.state == 'success'` Filter |
| 2 | Trigger | Vercel-Deploy auf Preview-Branch (nicht main) | deployment für PR-Branch | Workflow triggert NICHT | `if:` filter prueft `github.event.deployment.environment == 'production'` |
| 3 | Trigger | Vercel-URL = unique-preview statt bescout.net | target_url enthaelt random-hash | Workflow nutzt EXPLICIT bescout.net statt target_url | Hardcode `LIGHTHOUSE_URL=https://bescout.net` (analog post-deploy-smoke pattern aus errors-infra.md) |
| 4 | Cold-Start | Lambda braucht 10-25s Warm-Boot, 1. LHCI-Run trifft cold | LCP-Wert grossly inflated | Warm-Up via curl-retry-loop VOR LHCI (errors-infra.md Slice SO-4 Pattern) | curl-retry 6× max, sleep 5s nach 200 |
| 5 | Network | LHCI kann bescout.net nicht erreichen | network-fail / DNS / 503 | Workflow rot mit klarer Error-Message | LHCI-default 60s timeout pro URL, exit non-zero |
| 6 | Mess-Rauschen | LCP variiert 200-500ms zwischen Runs | hohe StdDev | LHCI median-of-3 pro URL minimiert das | `lighthouserc.json: numberOfRuns: 3` |
| 7 | Quota | GHA-monthly-minutes ueberschritten | Workflow-Run wird abgebrochen | Free-Tier 2000 min/Monat, Lighthouse ~2 min × ~5 deploys/Tag = ~300 min/Monat | innerhalb Quota; Monitoring optional |
| 8 | Quota | Lighthouse Web-Service kostet Geld? | none — LHCI laeuft headless im GHA-Runner, kein external Service | $0 | LHCI ist OSS, keine API-Keys |
| 9 | Race | 2 Pushes in 1 min → 2 parallele Lighthouse-Runs | beide laufen, beide produzieren Reports | OK, neuere ueberschreibt Job-Summary | GHA concurrency-Group optional: `concurrency: lighthouse-${{ github.ref }}` cancel-in-progress |
| 10 | False-Positive | LHCI failt sporadisch wegen Vercel-CDN-Cache-Miss | hard-fail rot trotz „normalem" LCP | Phase-1 ist WARN-only um genau das zu lernen, Phase-3-Schwelle wird daraus konservativ abgeleitet |
| 11 | Auth-Wall | bescout.net `/` redirected zu `/login` wenn unauth | LHCI misst /login nicht / | URL muss public-zugaenglich sein, oder LHCI mit Auth-Token | `/` ist public-page (Welcome Hero), `/market` + `/player/[id]` sind public-readable, daher OK ohne Auth |
| 12 | i18n | Lighthouse misst DE oder TR? | Cookie-state | Headless Chrome ohne Cookie → DE (default-locale) | OK, DE ist primary; TR in Slice 282+ gemessen |

**12 Edge-Cases (M-Slice braucht ≥ 8) ✓**

## 8. Self-Verification Commands

```bash
# Pflicht jeder Slice:
npx tsc --noEmit                    # tsc clean (auch wenn nur YAML/JSON, kein TS-Code)
pnpm run lint                       # YAML-Lint via existing pipeline

# Slice-spezifisch (PHASE 1 — direkt nach BUILD):
# 1. YAML-Sanity:
yq eval '.jobs.lighthouse.steps[].run' .github/workflows/lighthouse.yml
# 2. LHCI-Config-Sanity:
cat lighthouserc.json | jq '.ci.collect.url'  # Erwartung: ["https://bescout.net/", "https://bescout.net/market", ...]
# 3. Lokaler Test des LHCI-Scripts:
pnpm run lighthouse:local           # erwartet exit 0 + HTML-Report-Pfad

# Slice-spezifisch (PHASE 1 — nach erstem Live-Run auf main):
# 4. GH-API: letzte Lighthouse-Workflow-Runs:
gh run list --workflow=lighthouse.yml --limit=5
# 5. Artifact-Download:
gh run download --name lhci-results <run-id>

# Slice-spezifisch (POST-BASELINE — Phase 2):
# 6. Aggregation der ersten 3-5 Runs:
node scripts/aggregate-lhci-baseline.mjs > worklog/audits/2026-05-06/lighthouse-baseline.md
```

**Bei Money-Path zusätzlich:** kein Money-Path beruehrt, skipped.

## 9. Open-Questions (klären VOR Code)

**Pflicht-Klärung (an Anil zurueck):**
1. **Track-Approval (D70-Pflicht):** OK fuer Slice 279-282 als Multi-Slice-Track, oder verschieben/verkleinern?
2. **3 Test-URLs:** `/` + `/market` + `/player/[id]` (Top-3-FLJS laut bundle-budget.json) korrekt? Alternative: 5 URLs (+`/community` + `/club/[slug]`) — kostet +60s pro Run, mehr Datenpunkte. **Empfehlung:** 3 URLs reichen fuer Phase 1.
3. **Phase-3-Gate-Strategie:** Hard-fail bei LCP > baseline + 1.5×StdDev (statistisch sauber, akzeptiert ~7% false-positive) ODER LCP > target=2.5s (Web-Vital-good, bisschen aggressiver wenn Baseline >2.5s)? **Empfehlung:** baseline + 1.5×StdDev fuer Phase 3 Start, dann progressively tighten in Slice 280+.

**Autonom-Zone (CTO entscheidet):**
- LHCI-Version (latest stable, aktuell 0.14.x)
- Workflow-Naming-Konvention
- Lighthouse-Categories die nicht „Performance" sind (a11y, best-practices, SEO) — mit-laufen (kosten 0 extra, geben kostenlose insights)
- Concurrency-Group (cancel-in-progress fuer 2 schnelle pushes)
- Job-Summary-Markdown-Format-Detail

**Nicht-Autonom-Zone (Anil-CEO-pflicht):**
- Track-Approval gesamt (siehe Pflicht-Klärung 1)
- Phase-3-Gate-Aktivierung (separater Anil-Approval nach Baseline-Phase 2)

## 10. Proof-Plan

| Phase | Proof-Artefakt | Wer schreibt? |
|-------|----------------|---------------|
| BUILD-complete | `worklog/proofs/279-yaml-lint.txt` — yq + actionlint Output (YAML-Sanity) | Agent |
| BUILD-complete | `worklog/proofs/279-lhci-local.txt` — `pnpm run lighthouse:local` Output (Sanity-Run) | Agent |
| Phase-1 First-Live-Run | `worklog/proofs/279-lhci-first-run.md` — GHA Workflow-Run-URL + Job-Summary-Screenshot + Artifact-Link | Mensch (nach git push origin main) |
| Phase-1 Baseline-Sammlung | `worklog/proofs/279-lhci-baseline-runs.md` — 3-5 Run-IDs + LCP-Werte tabelliert | Mensch (nach 3-5 Tagen) |
| Phase-2 Baseline-Markdown | `worklog/audits/2026-05-06/lighthouse-baseline.md` — Mean ± StdDev pro Metric pro URL | Mensch (nach 3-5 Runs) |
| Phase-3 Gate-Aktivierung | `worklog/proofs/279-gate-activation.md` — diff lighthouserc.json + erster gruener Workflow-Run mit Assertions live | Mensch |

**Verboten als Proof:** „Workflow-File existiert" allein, „yq parsed" allein, „Pattern wie post-deploy-smoke".

## 11. Scope-Out

- **Bundle-Analysis-Refactoring** (Slice 280) — separater Slice nach Baseline-Mess-Wahrheit, weil ohne 279 nicht messbar.
- **Initial-Query-Konsolidierung `useHomeData`** (Slice 281) — separater Slice, beruht auf 280-Insights.
- **Vercel Edge-Caching + ISR** (Slice 282) — separater Slice, beruht auf 281-Insights.
- **TR-Locale-Lighthouse-Run** — Phase-2-Backlog, weil Cookie-Setup im LHCI-Headless extra Aufwand.
- **PR-Lighthouse-Comment** (analog `treosh/lighthouse-ci-action` PR-comment-Feature) — Slice 280+ wenn Phase-1 stable.
- **Vercel Speed Insights RUM** — post-Beta wenn echte User existieren.
- **Service-Worker / PWA-Caching** — post-Beta-Backlog (gross & invasive).

## 12. Stage-Chain (geplant)

```
SPEC (DONE)
  → IMPACT (skipped — neue Workflow-Datei + Config-File, keine Service/RPC/DB beruehrt)
  → BUILD (CTO, Agent-Dispatch optional — Workflow-yml + Config + package.json-Script)
  → REVIEW (reviewer-Agent — pruefen gegen errors-infra.md GHA-Patterns + D45 + D54)
  → PROVE (Phase 1: yaml-lint + local-LHCI-run; Phase-1-Live: GHA-Run nach push)
  → LOG
```

**Skip-Begruendung IMPACT:** Slice beruehrt KEINE Service/RPC/DB-Pfade. Workflow-Datei + Config-File + package.json-Script sind isoliert. Side-Effects nur GHA-Minutes-Quota (siehe Edge-Case 7), kein Code-Side-Effect.

## 13. Pre-Mortem (5+ Szenarien — bei M-Slice optional, hier gemacht weil Strategic-Track-Foundation)

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | LHCI-Action-Version (treosh@v12) wird unmaintained, breaking-change | LOW | HIGH (Workflow rot) | `@v12` pin nicht `@latest` — kontrollierter Update bei Major-Bump | GHA-Run-Logs |
| 2 | Vercel-Cold-Lambda-Boot inflated LCP-Werte → false-Baseline | MED | HIGH (alle Phase-3-Gates falsch) | Warm-Up via curl-retry vor LHCI (Slice SO-4 Pattern), 3 Iterations median | Phase-1 WARN-only erkennt Inflation |
| 3 | bescout.net Auth-Wall blockiert LHCI auf `/market` | MED | MED (Test-URL ungueltig) | `/market` ist public-readable laut Slice 081 Architektur, verifiziert vor BUILD | Erste Workflow-Run zeigt Audit-Pfad |
| 4 | LCP-Schwelle in Phase 3 zu eng → false-positive Drift-Alarm | MED | MED (Workflow flaky rot) | baseline + 1.5×StdDev (7% false-positive) statt strict 2.5s | Phase-3 erste Wochen monitor |
| 5 | GHA-Quota ueberschritten bei viel Push-Aktivitaet | LOW | LOW (Workflow-skip nach Quota-Erreichen) | concurrency-Group cancel-in-progress, ~300min/Monat innerhalb 2000-Free | GitHub-Billing-UI monatlich |
| 6 | LHCI-Lokal-Run klappt, GHA-Run schlaegt fehl wegen anderer Chrome-Version | LOW | MED (env-drift) | `treosh/lighthouse-ci-action@v12` packaged Chrome — gleicher binary ueberall | Erster Push zeigt's |
| 7 | Slice 280-282 brauchen Phase-3-Gate aktiv, aber Baseline-Sammlung dauert 1+ Wochen | MED | MED (Track-Velocity) | Slice 279-Phase 1+2 koennen zusammen mit Slice 280 Bundle-Analysis parallel laufen — Bundle-Wins messbar in Phase-1-Reports auch ohne Gate-Aktivierung | Anil-Decision |

---

## Compliance-Check (Pflicht bei Money-Path / User-facing Wording)

- $SCOUT-Wording-Drift? **N/A** — kein User-facing Text geaendert.
- IPO-Begriff user-facing? **N/A**.
- TR-Glücksspiel-Vokabel? **N/A**.
- Asset-Klasse-Framing? **N/A**.
- Disclaimer auf Page mit $SCOUT/DPC? **N/A**.

## TR-Wording-Vorab (bei i18n-Strings)

**N/A** — keine i18n-Strings beruehrt.

## Open Risiko (kurz, ehrlich)

**Realistic risk:** Phase-1-Baseline ueberzeichnet das Mess-Rauschen, weil Vercel-CDN-Cache-Hits zwischen Runs variieren (cold-Lambda-Boot vs warm-Lambda). Mitigation = Warm-Up-Curl + numberOfRuns: 3 + median-Aggregation. Wenn Baseline-StdDev > 30% des Mean, Slice 279-Phase 2 wird unbrauchbar — dann Plan B: 10 Iterations statt 3, oder externe RUM-Quelle (Vercel Speed Insights).

**Alternative-Trigger statt deployment_status:** Wenn Vercel-Deploy-Webhook unzuverlaessig (Slice 187-Lehre — Hobby-Tier-Fail), Fallback-Trigger auf `workflow_dispatch` (manuell) oder `schedule` (cron daily 03:00 UTC) waere. Phase-1-Stresstest verifiziert das.
