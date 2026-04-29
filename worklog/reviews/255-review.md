# Slice 255 Review — Workflow-Hardening (5-Item-Plan, 4 implementiert + 1 defered)

**Reviewer:** reviewer-Agent (cold context)
**Date:** 2026-04-29
**Verdict:** **CONCERNS** (mergeable; 1 P1 + 3 P2 + 4 P3)
**Heal-Status:** 1 P1 + 2 von 3 P2 in Slice 255 selbst geheilt, 1 P2 + 4 P3 als Slice 256+ Backlog

## Spec-Coverage

| Item | Status |
|------|--------|
| 1. D60 PROCESS in `memory/decisions.md` | ✅ vollständig (Begründung + Alternativen + Re-Visit + Pattern-Familie) |
| 2. `vitest.config.ts` integrationGlobs +6 Files | ✅ Scope grep-verifiziert (alle 6 Files mit createClient + dotenv) |
| 3. `scripts/cron-health-check.ts` (NEU) | ✅ D52-Pattern (npm-Script + Markdown-Report + Exit-Code-Switch) |
| 4. `scripts/rotate-secret.ts` (NEU) | ✅ 3 Modi (prompt/sync-from=local/verify) + 3 Locations |
| 5. `.github/workflows/nightly-audit.yml` cron-health step | ✅ WARN-only mit env-block |
| 6. `package.json` scripts | ✅ audit:cron-health + :check + rotate-secret |
| 7. Stale-Pipeline-Indicator-Banner | ⏳ defered Slice 256 (legitim, in active.md gelogged) |

## Findings

### P1 (Sicherheit, in Slice 255 geheilt)

| # | File:Line | Issue | Heal |
|---|-----------|-------|------|
| F-1 | `scripts/rotate-secret.ts:93` | **Shell-Injection-Risk** in `setVercelEnv`: `printf '%s' "${value}" | vercel env add ${key}...` interpoliert `value`/`keyName` direkt in shell-command-string. Für JWT/Base64-Secrets sicher, aber Tool ist generisch (`pnpm rotate-secret <KEY>`). | **GEHEILT in Slice 255 v2:** `nodeSpawnSync('vercel', ['env','add',key,'production'], { input: value })` — keine Shell-Interpolation. Plus Rollback-Path: prevValue capture vor rm; bei add-FAIL mit removed=true → restore prevValue um Production nicht secret-less zu machen. |

### P2 (Logik / Konfiguration, 2/3 in Slice 255 geheilt)

| # | File:Line | Issue | Heal |
|---|-----------|-------|------|
| F-2 | `scripts/cron-health-check.ts:155` | **Drift-Logik produziert False-Positives bei Mid-Gameweek-State**. Bedingung `maxFinishedGw >= dbActiveGw` triggert sobald *eine* GW(N+1)-Fixture finished ist (z.B. early-kickoff Sa 13:30 PL), auch wenn Rest der GW noch läuft. Live-Test PL drift=2 MEDIUM ist genau diese Klasse. | **GEHEILT in Slice 255 v2:** Bedingung verschärft auf "ALLE Fixtures der dbActiveGw finished UND active_gw nicht advanced". Live-Test post-Heal: 0 findings (PL-False-Positive weg). |
| F-3 | `.github/workflows/nightly-audit.yml:174` | **Secret-Name-Inkonsistenz**: `secrets.SUPABASE_URL` vs rpc-security-Step (line 118) `secrets.NEXT_PUBLIC_SUPABASE_URL`. Wenn nur eine in GHA-Settings registriert: Audit silent-skip. | **GEHEILT in Slice 255 v2:** `secrets.NEXT_PUBLIC_SUPABASE_URL` (consistent mit rpc-security). Comment markiert Heal-Reason. |
| F-4 | `.github/workflows/nightly-audit.yml:215-234` | **`cron_health` nicht in aggregate-Detection**. Auto-Issue-Body sammelt cron-health-Log nicht (line 247 tools-array). Issue-Erstellung passiert über report-diff-Step (OK), aber Title/failures-String enthält `cron-health` nicht — bei multi-failure-Tag im Noise verschluckt. | **DEFERED Slice 256+** — minor priority, Issue wird via report-diff-Pfad erstellt (auch wenn Title weniger spezifisch). |

### P3 (Code-Hygiene, alle defered Slice 256)

| # | File:Line | Issue |
|---|-----------|-------|
| F-5 | `scripts/rotate-secret.ts:93` (now ~145) | Secret-Value sichtbar in `ps aux` während execSync läuft. Solo-Dev-Workstation OK, aber undokumentiert. → spawn() heilt das. **Indirekt durch F-1-Heal mitgeheilt** (spawn macht keinen subprocess mit value-in-argv). |
| F-6 | `scripts/rotate-secret.ts:108-120` | Plain-Prompt ohne echo-off — typed Secret in Terminal-Scrollback. → Author-Comment empfiehlt `--sync-from=local`-Mode als sauberen Workflow. **Code-Comment ergänzt.** |
| F-7 | `scripts/cron-health-check.ts:155` (pre-Heal) | drift=1 INFO-Finding bei normalem Mid-Gameweek-State. → **Mitgeheilt durch F-2-Heal** (komplette drift-Bedingung neu, INFO-Klasse weg). |
| F-8 | `scripts/rotate-secret.ts:55` | Regex `^${key}\\s*=...` nicht escaped für keyName mit regex-meta-chars. Für SUPABASE_SERVICE_ROLE_KEY irrelevant. **Defered Slice 256+.** |

## Sicherheits-Concerns Detail (rotate-secret.ts)

Anil hat explizit "Money-Path-Concerns" gefragt. Status nach Slice 255 v2 Heal:

1. **Shell-Injection (P1):** ✅ GEHEILT — spawnSync mit input-Option statt template-string-execSync.
2. **Shell-History-Leak:** ✅ Gut — Secret nicht in argv (kommt via Prompt oder `.env.local`-readEnvVar).
3. **ps-aux-Leak (P3):** ✅ Mitgeheilt durch P1-Heal — spawn macht keine subprocess-args mit value, value via stdin.
4. **Atomicity-Risk (Production-down bei rm-then-add-FAIL):** ✅ GEHEILT — prevValue capture vor rm, Rollback-Path bei add-FAIL mit explizitem Restore-Pfad. Bei Rollback-FAIL: laute Warning für manuelle Dashboard-Intervention.
5. **Verify-Pflicht nach Rotation:** ✅ Tool macht das (Line 180-188).

**Money-Path-Final-Status:** akzeptabel post-Heal-v2. Tool sicher für JWT-/Base64-Secrets in Solo-Dev-Workflow.

## Edge-Cases-Analyse cron-health-check.ts (post-Heal-v2)

| Szenario | Aktuelle Logik (post-Heal) | Status |
|----------|---------------------------|--------|
| Preseason: keine Fixtures der active_gw | `continue` (skip) | ✅ OK |
| Mid-GW (early-kickoff finished) | `allFinished` = false → no drift | ✅ OK (war False-Positive pre-Heal) |
| Real cron-drift: alle GW(N) finished, cron stale auf N | `allFinished=true && dbActiveGw<maxGw` → drift HIGH | ✅ OK |
| Season-end: active_gw=maxGw | `dbActiveGw < maxGw` = false → no drift | ✅ OK |
| 0 active leagues | INFO finding | ✅ OK |
| 0 fixtures (new league) | `clubIds.length === 0 → continue` | ✅ OK |

## Pattern-Match D52 Wave-3-Tooling

- ✅ npm-Script (`audit:cron-health` + :check)
- ✅ Markdown-Report in `worklog/audits/`
- ✅ Exit-Code-Switch (0=OK, 1=HIGH-drift in --check)
- ✅ Severity-Klassen HIGH/MEDIUM/INFO
- ✅ False-Positive-Rate post-Heal-v2 = 0 (logisch-korrekte Bedingung)

## Pattern-Family-Konsistenz D60

D60 (Wave-Verify-Re-Switch-Pflicht) fügt sich konsistent ein:
- D43 Type-Truth-Drift (Type-Achse)
- D46 Service-Duplicate / Orphan-Component (Component-Achse)
- D54 Build-without-Wire (Tool/Hook-Achse)
- D58 Wave-Bridge-Cleanup (Time-Axis)
- **D60 Wave-Verify-Re-Switch-Pflicht (Process-Achse)**

Cross-cutting: "Verify-Vollständigkeit" als 5. Achse von "Existenz ≠ Verwendung". ✅ Process-Decision-Quality high.

## Anil-Direktive konsequent umgesetzt (4-Layer-Architektur)

- **Layer 1 Detection:** `audit:cron-health` (CI-Integration nightly-audit.yml)
- **Layer 2 Operations:** `pnpm rotate-secret` (Atomic-Sync mit Verify + Rollback)
- **Layer 3 Process:** D60 (Re-Switch-Pflicht in Live-Verify-Standard)
- **Layer 4 Test-Infra:** integrationGlobs Erweiterung (pre-push entblockt bei revoked-key)

✅ Anil-Direktive "damit das nicht mehr passiert" konsequent abgedeckt.

## Positive

- D52-Wave-3-Tooling-Pattern korrekt eingehalten (audit:* Standard, Markdown-Report, Exit-Code-Switch, Severity-Klassen)
- D60 Process-Decision exemplarisch dokumentiert (Begründung, Alternativen erwogen, Re-Visit-Trigger, Pattern-Familie)
- IntegrationGlobs Scope grep-verifiziert (genau die 6 live-Supabase-Tests)
- Defered Item (Slice 256 StalePipelineBanner) sauber in active.md gelogged statt heimlich gedroppt
- Validation-Output gezeigt (tsc clean + 143/143 vitest grün + Live-Run-Report)
- Reviewer-Heal aggressiv durchgezogen (1 P1 + 2 P2 in selber Slice statt follow-up-Slice)

## Heal-Verifizierung post-Slice-255 v2

```
$ npx tsx scripts/cron-health-check.ts
═══ Cron Health Check ═══
Findings: 0 HIGH, 0 MEDIUM, 0 INFO
✅ Cron pipeline healthy.
```

PL-False-Positive (drift=2 MEDIUM pre-Heal) ist weg. Logik korrekt: PL hat 1 GW32-Fixture finished aber GW31 ist nicht fully-finished → kein True-Drift.

```
$ npx tsx scripts/rotate-secret.ts SUPABASE_SERVICE_ROLE_KEY --verify
✅ All locations in sync.
```

## Empfehlung

**PASS-mergeable post-Heal-v2.** F-4 (Auto-Issue-Body) + F-8 (Regex-Escape) als Slice 256+ Backlog. Anil-Direktive konsequent umgesetzt durch 4-Layer-Architektur.

**Backlog Slice 256:**
- F-4 cron_health in aggregate-Detection-Step erweitern für expliziten Auto-Issue-Title
- F-8 keyName-Regex-Escape (defensive Code-Hygiene)
- StalePipelineBanner UI-Sentinel (Item 5 aus Slice 255 Plan)
- D60 Hook-Implementation `ship-verify-completeness-gate.sh`
