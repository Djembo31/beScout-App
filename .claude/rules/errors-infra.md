---
description: Infra-Fehler — Build/Deploy, Bundle, Hooks, Beta-Ops
---

# Errors: Build / Deploy / Ops

Stand: 2026-04-24 · Split aus `common-errors.md` (Slice 186). Siehe auch `performance.md`.

## Build / Deploy

### tsconfig excludes scripts (Slice 079)
- `"include": ["**/*.ts"]` + `"exclude": [..., "e2e"]` → includet `scripts/`. Scripts importieren deps wie `playwright` die nicht in `package.json` sind.
- `tsc --noEmit` cleant lokal (`skipLibCheck: true`), **Vercel `next build` schlaegt fehl**: `Cannot find module 'playwright'`.
- Fix: `"exclude": [..., "scripts", "tmp"]`. Dev-scripts laufen via `npx tsx` weiter.
- Prevention: Nach neuen `scripts/*.ts` immer `npx next build` lokal (nicht nur tsc).

### Next.js Route-Handler Named-Exports (Slice 069)
- `export function helper()` in `src/app/api/**/route.ts` verboten. Nur HTTP-Methods (GET/POST/...) + `runtime|dynamic|revalidate|fetchCache|maxDuration|generateStaticParams|config`.
- Jeder andere Export → `next build` Type-Error `'OmitWithTag<...>'`.
- `tsc --noEmit` faengt das NICHT — Type entsteht aus generated `.next/types/app/.../route.ts` nur beim `next build`.
- Fix: Helpers nach `src/lib/scrapers/` extrahieren. Nach JEDEM route.ts-Edit → `npx next build` lokal.

### ESLint disable-comment mit undefined rule (Slice 069)
- `// eslint-disable-next-line @typescript-eslint/no-explicit-any` failt wenn Plugin nicht in eslintrc.
- Fix: typgerechter Cast (`as unknown as (k: string) => string`) statt disable-comment.

### Vercel Env + Module-Level + CSP
- `NEXT_PUBLIC_*` NIEMALS als "Sensitive" markieren → werden beim Build nicht injected.
- KEIN `createClient()` auf Module-Level → Lazy-Init via Proxy/Getter, sonst crasht Vercel Build.
- CSP `img-src`: Domains aus DB ableiten (`SELECT DISTINCT substring(image_url FROM '^https?://[^/]+')`), nicht raten.

### Vercel Hobby-Tier Silent-Build-Fail bei hourly Crons (Slice 187 + D36)
- **Symptom:** Auto-Deploy funktioniert nicht mehr nach Plan-Downgrade (Billing-Lapse, manuelle Änderung). GitHub push → Webhook → Vercel startet build → build failed silent mit `Hobby accounts are limited to daily cron jobs. This cron expression (0 * * * *) would run more than once per day. Upgrade to the Pro plan to unlock all Cron Jobs features on Vercel.`
- **Kein UI-Notification:** Vercel-Dashboard zeigt failed builds, aber keine E-Mail/Slack-Alert. `mcp__vercel__list_deployments` zeigt NEUESTE Deployment-Entries, nicht den erwarteten neuen Commit — **nur ein abwesender Build** als Signal.
- **Detection (D36-Protokoll):** Nach `git push origin main` innerhalb 2-3 min via `mcp__vercel__list_deployments` verifizieren dass Commit-SHA in der Liste ist. Wenn NICHT: `vercel deploy --prod --yes` foreground laufen lassen um die echte Fehlermeldung zu sehen.
- **Fix-Varianten:**
  - Temporär: Offending cron-schedule auf daily reduzieren (`0 * * * *` → `0 3 * * *` oder ähnlich). `vercel deploy --prod --yes` triggert sofort.
  - Permanent: Vercel-Plan auf Pro upgraden (40 Crons, hourly+). Falls intentional auf Hobby → alle `* * * * *`-patterns mit stern-stern-stern-star abschaffen, nur daily oder weniger.
- **Vercel-Hobby-Limits (Stand 2026-04):** Max 2 Crons, 1×/Tag. Pro: 40 Crons, hourly+, 300s maxDuration.
- **Prevention:** Pre-Push-Check `grep '"0 \*' vercel.json` — wenn hourly-Entry und Plan unsicher: erst Plan prüfen.
- **Audit-Command:**
  ```bash
  # Sucht potentiell-Hobby-brechende Cron-Schedules
  grep -oE '"schedule":\s*"[^"]+"' vercel.json | grep -E '\* \* \* \*|(\*|\*/1|0) \*'
  ```
- **Referenz-Incident:** 2026-04-24 — 17 Commits silent blockiert 4+ Stunden (Slice 181/b/c/d/e1/e2 + 185b + 186 + Strategy-Memo nicht live). Fix-Zeit nach Discovery: 2 min. Discovery-Zeit ohne Protokoll: 30 min (MCP-Rumsucherei). D36 dokumentiert das Post-Push-Health-Check-Protokoll.

### Bundle-Budget-Gate (Slice 185b)
- `bundle-budget.json` definiert thresholds pro Route + shared-bundle.
- `pnpm run size` oder CI-Gate in `.github/workflows/ci.yml` build-Job.
- Bei regression: `scripts/check-bundle-size.ts` exit 1.
- Budget aktualisieren nur mit Justification (neuer Feature, etc.).

### dynamic() rettet nur wenn KEIN anderer Pfad eager laedt (Slice 121)
- `const { fn } = await import('module')` in queryFn → Lazy-Chunk entsteht, aber wenn anderer Codepfad eager importiert, bleibt Modul in beiden Chunks.
- Slice 121: BuyConfirmModal lazy-importierte research.ts — Modul blieb in /market-chunk weil TradingTab eager laedt. 0 Reduktion.
- Regel: Vor "Seite X FLJS sinkt"-Versprechen: `grep -rn "from.*'@/lib/services/<modul>'" src/` → ALLE Call-Sites pruefen.
- Messen: `ANALYZE=true next build` + app-build-manifest.json.

### Namespace-Import blockiert Tree-Shaking (Slice 120)
- `import * as X from 'lib' + X[dynamic]` = namespace-import mit dynamic lookup. Webpack bundled alles. `optimizePackageImports` tree-shaked nicht.
- Slice 120: `country-flag-icons/react/3x2` namespace = 235 kB parsed. 265 Flags, ~10 gebraucht.
- Loesung: Static assets (`public/`-Kopie + `<img src>`) ODER Named imports. Dynamic lookup zwingend → Factory-Map mit `React.lazy`.
- Audit: Bundle-Analyzer Client-HTML nach chunks >200 kB suchen.

### Query-Konsolidierung ≠ LCP-Win wenn Queries parallel (Slice 109)
- N Einzel-Hooks in 1 RPC konsolidiert. Network-Log zeigt eliminierte Calls. Aber LCP-Delta -1-5%, innerhalb Rauschen.
- Root cause: React Query feuert Einzel-Hooks **parallel** beim Mount. Einsparung ist `max(1 RPC) - max(4 parallel)`, meist <50ms.
- Latenz-Gewinn nur bei: sequentielle Queries (waterfall), LCP-blocking, HTTP/1-Limits.
- Structural Wins echt: -N Roundtrips, Konsistenz, Priming-Pattern, DB-billiger.

## Cross-Cutting / Operational

### Grep-Audit-Scope-Gap bei Sub-Component-Scan (Slice 166)
- Top-Level-Grep (`grep "<Modal" src/components/`) findet nur direkt — verpasst **embedded Modals** in Cards/Tabs/Dialog-Containers.
- Slice 166: Primary fand 7 Targets. Reviewer-Gap-Audit fand 6 zusaetzliche (46%).
- Fix-Pattern:
  ```bash
  grep -rn "<Modal" src/ | grep -v "preventClose\|__tests__" | awk -F: '{print $1}' | sort -u
  grep -rn "isPending\|loading:\|saving\|submitting\|posting" <found-files>
  ```
- Regel: Full-recursive-Grep, cross-Ref mit zweit-Pattern (Mutation-State). Reviewer-Agent als Scope-Gap-Catcher.

### Data Contract Changes (NICHT als UI-Change behandeln)
- required → optional (Field, Prop, DB Column) = Contract Change → alle Consumer greppen.
- optional → required = Breaking → Migration + Backfill noetig.
- Service swallow→throw = Breaking fuer Caller. ALLE Caller greppen + try/catch auditen.
- Regel: Jede Aenderung die DB-writes beeinflusst → `/impact` ODER manueller Grep VOR Code.

### Shell / Hooks (Windows Git Bash)
- `grep -oP` mit `\K` scheitert silent (Locale: "supports only unibyte and UTF-8"). Fix: `sed -n 's/.*"key"\s*:\s*"\([^"]*\)".*/\1/p'`.
- Worktree-Agents haben KEINEN Zugriff auf `.claude/skills/` → Fallback Main-Repo-Path.

### Shell case-statement wildcard promiskuoes (Slice 145 + 146)
- `case "$COMMAND" in *"merge"*) exit 0 ;; esac` matched **jede** Commit-Message mit "merge" drin. Same-Klasse: `*"--amend"*`, `*"git commit"*`.
- Regel: Shell-case-patterns auf COMMAND-Strings MUESSEN command-token-anchorn:
  - Start: `"git merge"|"git merge "*)` (nicht `*"git merge "*`)
  - Flag in unquoted command: erst `UNQUOTED=$(echo "$CMD" | sed 's/"[^"]*"//g; s/'\''[^'\'']*'\''//g')`, dann `case "$UNQUOTED"`.

### Heredoc-Backdoor in Commit-Gates (Slice 145 + 146)
- `ship-proof-gate.sh` hatte: `case "$COMMAND" in *"<<"*) exit 0 ;; esac`. Umgeht jeder heredoc-Commit den Gate.
- Anti-Pattern: "Hook exempt bei komplex aussehendem input".
- Fix: Heredoc-Exempt weg. MSG-Extraktion via `grep -oE "(feat|fix|refactor)[(:]..."` auf COMMAND-String.

### grep `\b` Word-Boundary broken bei JSON-escaped Heredoc (Slice 146)
- PreToolUse-Hooks kriegen JSON wie `{"command":"...\\nfeat(x): msg\\nEOF..."}`. Die `\n` bleiben Literal `\`+`n` (2 chars).
- Heredoc-Body: `...\nfeat(x)...` — Char vor `feat` = `n` = word-char → `\b` matched NICHT.
- Fix: `\b` entfernen, `[(:]`-Suffix reicht als Word-Boundary-Ersatz. Alternative PCRE: `[^a-zA-Z_]`-Lookbehind.
- Regel: Bei Shell-Hooks die JSON-Stdin parsen: `\b` ist unreliable. Suffix-Anker oder Char-Class.

### Hook-Merge-Pattern (Slice 186, aus Session 2026-04-24)
- Auto-generated Dateien (wie `memory/session-handoff.md`): **nie komplett ueberschreiben**. Nutze Marker-Block-Merge.
- Pattern:
  ```
  <!-- auto:handoff-start -->
  ... auto content ...
  <!-- auto:handoff-end -->
  
  ... manual rich content ...
  ```
- Hook ersetzt nur Block zwischen Markern (awk state-machine `before → in_block → after`). Manuelle Erweiterungen unter Markern bleiben.
- Migration fuer Bestandsdateien ohne Marker: Auto-Block oben einfuegen, existierender Content darunter (mit `---`-Separator).

## Beta-Launch-Ops

### CSP blocks Sentry EU ingest (silent error-tracking failure)
- Sentry EU endpoint = `https://<org>.ingest.de.sentry.io/`.
- Vercel CSP `connect-src` muss **explizit** Sentry enthalten, sonst JS-Events silent gedroppt.
- Fix in `vercel.json`: `connect-src ... https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.de.sentry.io`.
- Detect: `grep "Refused to connect" qa-screenshots/synthetic/*/report.md`.

### Vercel "Sensitive" Flag auf NEXT_PUBLIC_* = Build-Injection-Bug
- `NEXT_PUBLIC_*` darf NIEMALS "Sensitive" sein. "Sensitive" = Build-Zeit-nicht-inject → `process.env.NEXT_PUBLIC_X = undefined` im Browser.
- Symptom: Sentry/PostHog lazy-init OK, aber `dsn === undefined` → silent "init without DSN".
- Fix-Workflow: In Vercel UI Delete + Create New (nicht Edit!). Edit-Dialog zeigt Sensitive-Vars mit `YOUR_SECRET_VALUE_GOES_HERE` Placeholder — Save ZERSTOERT die Var.

### Supabase Legacy JWT vs New API Keys (Migration 2024+)
- Legacy (`anon` + `service_role` JWT): shared-Secret-signed. "Reset JWT Secret" invalidiert **alle** JWTs inkl. user sessions — Platform-Logout = NIE im Live-Betrieb.
- New (`sb_publishable_...` + `sb_secret_...`): asymmetrisch signed. Rotation invalidiert KEINE user sessions.
- Zero-Downtime-Rotation: (1) Dashboard "New secret" parallel → (2) Update 4 Stellen: Vercel Prod + GH Secret + `.env.local` + `.env.vercel-prod` → (3) Redeploy → (4) Smoke gruen → alten revoken.

### Playwright Cookie Subdomain-Mismatch
- `context.addCookies({ domain: 'bescout.net' })` → nicht gesendet an `www.bescout.net`.
- Fix: Leading dot `.bescout.net` = valid fuer hostname + alle subdomains.
- Cookie-Timing: i18n-Cookie VOR Login → Login rendert im Target-Locale (lokalisierte Button-Namen). Fix: Login in Default-Locale, DANN Cookie.

### Vercel `deployment_status.target_url` in GHA = Preview-URL mit Auth-Wall
- `deployment_status`-Event liefert `target_url = <unique-deploy>.vercel.app`, nicht Custom-Domain. Unique-Preview hat Vercel Deployment Protection.
- Playwright laeuft in Auth-Wall → Timeout.
- Fix: In GHA `env: PLAYWRIGHT_BASE_URL: https://bescout.net`.

### GitHub Actions: Default GITHUB_TOKEN hat KEINE issues: write
- `actions/github-script@v7` mit `github.rest.issues.create({...})` failed: `"Resource not accessible by integration"`.
- Fix: `permissions: { contents: read, issues: write, actions: read }` am Workflow-Top.

### Playwright Test-Timeout-Akkumulation gegen Prod
- `test.setTimeout(180_000)` reicht NICHT fuer 10-step Suites. Jeder step mit `waitForApp()` akkumuliert bis 60s Default-Timeouts.
- Fix: Lightweight-helper ohne full React-Hydration-Wait (`waitUntil: 'domcontentloaded'` + `main-locator visible`).
- Global `test.setTimeout(300_000)` fuer Prod-Suites. Ziel: 10-Step-Smoke <15s warm, <30s cold.

### Route existence vs name assumption (Smoke-Test)
- "Mein Kader" ist Tab auf `/market`, NICHT `/kader`.
- "Spieltag" in Sidebar → Link `/fantasy`, NICHT `/fantasy/spieltag`.
- Audit vor Test-Writing: `ls src/app/(app) && grep -rn "href=\"/" src/components/navigation/`.

### Two-lockfile drift (pnpm + npm parallel)
- `pnpm-lock.yaml` + `package-lock.json` parallel → CI failed 22× konsekutiv (Slice 118-123 nicht live fuer 8 Tage).
- Fix: `rm package-lock.json`, `packageManager: "pnpm@X.Y.Z"` in package.json, CI auf `pnpm/action-setup@v4` + `pnpm install --frozen-lockfile`.
- Prevention: Branch-Protection mit `required_status_checks: [lint, build, test]`.

### Cron-Guard API-Response-Count vs DB-Count (Slice 140)
- Externe API liefert weniger Rows als DB hat, Cron nutzt API-Count als Completion → bricht zu frueh ab → DB-Rows unerreichbar.
- Slice 140: `gameweek-sync` `allDone = (API.total === API.finished)`. API-Football dropped 4/9 Fixtures → Phase B advanced, 4 blieben scheduled 30-60h in Vergangenheit.
- Fix-Pattern:
  ```ts
  const dbTruthAllDone = totalDbRows > 0 && (alreadyDone.size + newlyDone.length) >= totalDbRows;
  allDone = apiAllDone && dbTruthAllDone;
  ```
- Regel: API-Response-Count IST KEIN Proxy fuer DB-Completion.
