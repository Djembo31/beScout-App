# Slice 282b — LHCI-Auth-Fix: Lighthouse misst die App, nicht /login

**Größe:** M
**Slice-Type:** GHA | Tool (Config + Script, kein src/-Produktionscode)
**Datum:** 2026-06-12
**CEO-Scope:** Nein (Mess-Infrastruktur)

## 1. Problem-Statement

**Evidence (worklog/audits/2026-06-11/lighthouse-baseline.md, Slice-282-Discovery):**
1. Alle 3 LHCI-URLs (`/`, `/market`, `/community`) sind auth-gated und redirecten auf `/login`. **Jeder Lighthouse-Run seit Slice 279 (8 GHA-Runs + lokal) hat 3× die Login-Page gemessen.** Slice-279-Annahme „public-readable" war falsch. Phase-3-Gates auf dieser Basis würden die falsche Page gaten; der −4,2-MB-Win aus Slice 282 ist mit der aktuellen Config nicht messbar.
2. **GHA-Artifact-Upload liefert 0 Artifacts** — Run 27360734770 Log: `##[warning]No files were found with the provided path: .lighthouseci/`. Root-Cause: upload-artifact@v4 default `include-hidden-files: false` schließt das Dot-Verzeichnis `.lighthouseci/` aus.

## 2. Lösungs-Design

**Track A — Authenticated LHCI** (offizieller Weg per LHCI-Docs, context7-verifiziert):
- `collect.puppeteerScript` (`e2e/lhci-login.cjs`): loggt jarvis-qa via /login-Form ein. Browser-Instanz bleibt über alle URLs offen (Cookies persistieren) → Script ist idempotent (skip wenn Session aktiv). Credentials via env `SMOKE_EMAIL`/`SMOKE_PASSWORD` (GHA-Secrets existieren, synthetic nutzt sie).
- `settings.disableStorageReset: true` — Lighthouse cleart sonst Origin-Storage pro Run und killt die Session (LHCI-Docs-Empfehlung für authed pages). Trade-off dokumentieren: warm-cache zwischen den 3 Runs pro URL → Median leicht optimistisch, aber konsistent.
- **Dependency-Falle:** `puppeteer` als devDep nötig, ABER default-Postinstall lädt ~130 MB Chrome — würde JEDEN `pnpm install` in ALLEN Workflows (ci/smoke/synthetic/lighthouse) verlangsamen. Fix: `.puppeteerrc.cjs` mit `skipDownload: true` + `puppeteerLaunchOptions.executablePath` auf System-Chrome (GHA ubuntu: `/usr/bin/google-chrome`; lokal Windows: Standard-Pfad-Fallback-Kette).
- `lighthouserc.json` → **`lighthouserc.cjs`** (JS-Config) — executablePath/env sind in statischem JSON nicht ausdrückbar. npm-Script + Workflow-Referenz umstellen.
- URLs auf `https://www.bescout.net/...` direkt (Root redirected 307→www; Redirect-Hop verfälscht Metriken + Cookie-Domain ist www).

**Track B — Artifact-Fix:** `include-hidden-files: true` auf dem Upload-Step.

**Track C — Baseline-Reset:** Nach Live-Verify neue Baseline-Sektion in `worklog/audits/2026-06-12/lighthouse-baseline-authed.md` (die /login-Baseline bleibt als historisches Dokument). Phase-3-Schwellen weiterhin NICHT scharf (braucht 3-5 authed Runs).

## 3. Betroffene Files

| File | Track | Änderung |
|------|-------|----------|
| `e2e/lhci-login.cjs` | A | NEU — Puppeteer-Login-Script (idempotent) |
| `lighthouserc.json` → `lighthouserc.cjs` | A | JS-Config: puppeteerScript + launchOptions + disableStorageReset + www-URLs |
| `.puppeteerrc.cjs` | A | NEU — skipDownload |
| `package.json` | A | + puppeteer devDep, `lighthouse:local` auf .cjs |
| `.github/workflows/lighthouse.yml` | A+B | env-Secrets + CHROME_PATH + include-hidden-files + Config-Pfad |
| `worklog/audits/2026-06-12/lighthouse-baseline-authed.md` | C | NEU nach Verify |

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Frage |
|------|-------|
| `.github/workflows/lighthouse.yml` | ✅ gelesen — Upload-Step, Job-Summary-Parsing (bleibt kompatibel?), Trigger |
| `lighthouserc.json` | ✅ gelesen — alle Settings 1:1 in .cjs übernehmen (Throttling, screenEmulation, assertions) |
| `e2e/synthetic-users.spec.ts:29-47` | ✅ gelesen — Login-Selektoren (Placeholder „E-Mail Adresse"/„Passwort", Button „Anmelden", Cookie-Banner „Akzeptieren") |
| LHCI-Docs via context7 | ✅ — puppeteerScript-Signatur `(browser, {url, options})`, Browser persistiert über URLs, disableStorageReset-Empfehlung, puppeteer-Peer-Dep |
| `package.json` scripts | lighthouse:local Referenz + ob andere Scripts lighthouserc.json referenzieren |
| `.github/workflows/lighthouse.yml` Summary-Step | parst `.lighthouseci/manifest.json` — Format ändert sich durch Auth nicht |
| puppeteer skipDownload-Mechanik | `.puppeteerrc.cjs` im Repo-Root wird von puppeteer-Postinstall gelesen (Docs) |

## 5. Pattern-References

- D54 (Build-without-Wire) — Slice 279 hat gemessen, aber das FALSCHE; Messinstrument-Validity ist Teil von „verkabelt"
- errors-infra.md „Cold-Start-Warm-Up vor Smoke-Suite (SO-4)" — Warm-Up-Step bleibt
- errors-infra.md „Vercel deployment_status target_url = Preview-URL" — wir messen bewusst bescout.net (www) direkt
- D70 „Optimieren ohne Baseline" — authed Baseline VOR Phase-3-Gates
- Slice 282a testing.md Click-Pattern — Login-Flow nutzt fill+click auf /login (stabile Form, kein live-re-rendernder first()-Locator)

## 6. Acceptance Criteria

- AC-01 [HAPPY]: Lokaler `pnpm run lighthouse:local` → manifest.json `finalUrl`/requestedUrl der Reports ist `www.bescout.net/{,market,community}` und NICHT `/login`. VERIFY: jq über `.lighthouseci/*.json` `.finalDisplayedUrl`. FAIL-IF: irgendein Report zeigt /login.
- AC-02 [HAPPY]: GHA-Run (workflow_dispatch) SUCCESS mit denselben finalUrls. VERIFY: Job-Summary-Tabelle zeigt 3 App-URLs.
- AC-03 [HAPPY]: GHA-Artifact `lhci-results-<sha>` existiert und ist downloadbar. VERIFY: `gh api .../artifacts` total_count ≥ 1. FAIL-IF: 0.
- AC-04 [GUARD]: `pnpm install` lädt KEIN puppeteer-Chrome (CI-Zeit-Schutz). VERIFY: frische Install-Log-Prüfung auf „Downloading Chrome" / `du` auf ~/.cache/puppeteer im GHA-Log. FAIL-IF: Download im Install-Step.
- AC-05 [GUARD]: Login-Fail (falsche Creds) → Script wirft, LHCI-Run failt LAUT statt /login zu messen (kein silent-wrong-measurement-Regress). VERIFY: lokaler Negativ-Test mit dummy-Creds → exit ≠ 0.
- AC-06 [GUARD]: Secrets erscheinen nicht in Logs. VERIFY: GHA-Log-Grep auf Passwort-Echo (Secrets sind auto-masked, Script loggt keine Credentials).
- AC-07 [HAPPY]: Neue authed-Baseline-Doc mit Median-of-3 für 3 URLs existiert.

## 7. Edge Cases

| # | Case | Handling |
|---|------|----------|
| 1 | Session läuft mid-Collection ab (9 Runs ≈ 4 min) | Supabase-Token 1h gültig — kein Risiko; Script läuft eh pro URL und re-checkt |
| 2 | Cookie-Banner erscheint im Audit-Run und drückt Score | Login-Script akzeptiert Banner VOR Collection (Cookie persistiert) |
| 3 | puppeteerScript-Throw bei Login-DOM-Änderung | LHCI-Run failt laut (gewollt, AC-05) — Lighthouse-GHA ist non-blocking für Deploys |
| 4 | System-Chrome-Pfad existiert nicht (lokal) | Fallback-Kette Windows-Standardpfade + env CHROME_PATH Override; klare Fehlermeldung |
| 5 | disableStorageReset → Run 2/3 mit warm cache | Dokumentiert; Median konsistent-optimistisch, Vergleichbarkeit über Zeit bleibt |
| 6 | /login-Page selbst soll weiter beobachtbar sein | NICHT in URL-Set (App-Pages sind das Ziel); /login-Baseline-Doc bleibt historisch |
| 7 | jarvis-qa-Account-State ändert Metriken (Holdings etc.) | Akzeptiert — gleicher Account wie Smoke/Synthetic = konsistente Mess-Persona |
| 8 | concurrency cancel-in-progress killt Verify-Run | workflow_dispatch nutzt gleiche Group — bei Verify keinen parallelen Push machen |

## 8. Self-Verification Commands

```bash
pnpm install 2>&1 | grep -i "chrom" || echo "kein Chrome-Download ✓"
pnpm run lighthouse:local 2>&1 | tail -5
node -e "const m=require('./.lighthouseci/manifest.json'); m.forEach(e=>console.log(e.url))"
gh workflow run lighthouse.yml && gh run watch
gh api repos/Djembo31/beScout-App/actions/runs/<id>/artifacts -q '.total_count'
```

## 9. Open-Questions

- **Autonom-Zone:** Script-Struktur, Selector-Strategie, Chrome-Pfad-Fallbacks, .cjs-Config-Aufbau.
- **Pflicht-Klärung:** keine — Anil-Approval „Weiter mit 282b".
- **CEO-Zone:** keine.

## 10. Proof-Plan

`worklog/proofs/282b-lhci-auth.md`: (1) lokaler Run mit finalUrls ≠ /login, (2) GHA-Run-Link + Summary-Tabelle, (3) Artifact-Count ≥ 1, (4) Negativ-Test-Output, (5) authed-Baseline-Tabelle.

## 11. Scope-Out

- Phase-3-Error-Gates scharf schalten (braucht 3-5 authed Runs → Folge-Aufgabe)
- LHCI-Server/Storage (filesystem-Upload reicht)
- /player/[id]-URL ins Set (dynamic-id-Drift, bewusst seit 279 draußen)

## 12. Stage-Chain (geplant)

SPEC → IMPACT: skipped (kein src/, keine Services/RPC/Queries — Config + e2e-Script + Workflow) → BUILD → REVIEW: Self-Review geplant (kein Produktionscode; Patterns 1:1 aus LHCI-Docs + bestehendem Login-Flow; bei Komplikationen Cold-Context) → PROVE → LOG

## 13. Pre-Mortem

1. puppeteer-Install verlangsamt alle CI-Workflows → .puppeteerrc skipDownload VOR package.json-Commit testen (AC-04).
2. LHCI 0.15 puppeteerScript-API weicht von Docs ab → lokal verifizieren BEVOR Workflow-Push.
3. Login-Selektoren brechen still → AC-05-Throw-Design: lieber lauter Fail als stilles /login-Messen (das war der 279-Fehler).
4. Secrets leaken in lighthouserc.cjs-Logs → Script liest env, loggt nie Werte; GHA maskt Secrets.
5. Job-Summary-Parser bricht weil finalUrl jetzt www enthält → Parser nutzt lhr.finalUrl generisch, kein Hardcode — verifizieren.
