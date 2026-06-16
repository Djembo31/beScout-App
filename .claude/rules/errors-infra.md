---
paths:
  - ".github/**"
  - "scripts/**"
  - ".husky/**"
  - "next.config.mjs"
  - "vercel.json"
  - "*.config.ts"
  - "*.config.mjs"
---

# Errors: Build / Deploy / Ops

Stand: 2026-04-24 · Split aus `common-errors.md` (Slice 186). Siehe auch `performance.md`.

## Build / Deploy

### jsdom 28 + pnpm Hoisting — Silent Broken Tests (Slice 268b, 2026-05-04)

**Bug-Klasse:** jsdom 28 zieht transitive Dep `@asamuzakjp/css-color@5.x` ein, die intern `@csstools/css-calc` per ESM importiert. pnpm symlinkt `@csstools/css-calc` aber NICHT in `@asamuzakjp/css-color/node_modules/@csstools/`. Node's nativer ESM-Resolver respektiert die `exports`-Map des hoisted Pakets nicht und failt mit `ERR_MODULE_NOT_FOUND`. **Effekt: ALLE jsdom-basierten vitest-Tests sind silent-broken** — Test Files: 0 passed, Errors: 1 (Pool-Worker-Init-Failure), Tests: "no tests".

**Detection:**
```bash
# Aufruf einer jsdom-vitest-Test:
npx vitest run "src/lib/queries/__tests__/<X>.test.tsx"
# Output enthält:
#   Cannot find package 'C:\...\node_modules\.pnpm\@asamuzakjp+css-color@5.0.1\node_modules\@csstools\css-calc\index.js'
#   Did you mean to import "@csstools/css-calc/dist/index.mjs"?
#   Test Files: no tests · Errors: 1 error
```

**False-Heilversuche die NICHT funktionieren:**
- `vitest.config.ts` `resolve.alias['@csstools/css-calc']` → Vite-Alias greift nur für transformierten Code, nicht für Node-Internal-Resolver der jsdom selbst lädt.
- `server.deps.inline: ['@asamuzakjp/css-color', '@csstools/css-calc']` → Inline-Bundling triggert nicht weil Worker-Pool-Boot vor user-config greift.
- `pnpm install` allein → reinstalliert die gleiche broken Symlink-Struktur.

**Fix-Pattern (`.npmrc` im Repo-Root):**
```
public-hoist-pattern[]=@csstools/*
```
Plus `CI=true pnpm install` (für initiale Modules-Dir-Removal). Hoisted `@csstools/*` auf Top-Level `node_modules` → Node-Resolver findet via fallback. Side-Effect ist auf `@csstools/*` beschränkt, kein Bleed in andere Tooling.

**Verify:**
```bash
ls node_modules/@csstools/css-calc/   # Symlink existiert
npx vitest run "src/<any>.test.tsx"   # läuft jetzt
```

**Was Slice 268b heilt:** Ohne diesen Patch waren ALLE jsdom-Tests silent-broken — pre-Slice-268b waren queries/, hooks/, components/-Tests unprovable. Pre-Slice-268b CI-Pre-Push-Hook (`CI=true pnpm exec vitest run`) lief auch broken — nur dass es niemanden auffiel weil pre-push wegen `set -e` failte und das als false-positive `pre-push: OK` wahrgenommen wurde, weil das Skript nach erstem Error abbrach. **Slice 268b war erster Slice der einen brand-neuen jsdom-Test einführte und damit den Bug ans Licht zog.**

**Pattern-Lehre:** Bei jsdom-Major-Bumps (27 → 28) IMMER eine `npx vitest run "<existing-jsdom-test>"` Smoke laufen lassen. Wenn "no tests" + "Cannot find package" → pnpm hoisting greift nicht, `.npmrc` Anpassung pflicht.

**Beziehung zu D45 (Hooks > Text-Regeln):** Pre-push-Hook hat dieses Failure 5+ Tage maskiert weil `set -e` + Vitest-Pool-Failure nicht als "Tests broken" sichtbar war. Future-Improvement: pre-push Layer prüft `Test Files: <N> passed` als positives Signal, nicht nur exit-code. Kandidat für Future-Slice "pre-push-test-output-grep".

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

### LHCI/Lighthouse-Fallen-Sammlung (Slice 282b, 2026-06-12)

Vier Fallen aus dem LHCI-Auth-Fix — jede hat einzeln Stunden gekostet bzw. 5 Wochen invalide Messung verursacht:

1. **Auth-gated Pages still als /login gemessen (5 Wochen, Slice 279-282).** LHCI folgt Redirects ohne Warnung; `finalDisplayedUrl` zeigt die wahre gemessene Page. Pflicht-Verify nach JEDEM Lighthouse-Setup: `requestedUrl == finalDisplayedUrl` über alle Reports. Fix für authed Apps: `collect.puppeteerScript`-Login + `settings.disableStorageReset: true` (sonst killt der Storage-Reset die Session pro Run).
2. **Client-side-Auth-Apps: Login-State NIE via `page.url()` nach domcontentloaded prüfen.** Der Redirect kommt erst nach Hydration → false-positive „eingeloggt". Deterministisch: Session-Cookie prüfen (`page.cookies()` auf `sb-*-auth-token`).
3. **`lhci collect` (ohne upload-Step) schreibt KEINE Reports nach `.lighthouseci/`** — nur `autorun`/`upload` (filesystem) dumpt. Wer nach einem collect-Run `manifest.json` liest, liest STALE Reports des letzten autorun. Verify immer über `fetchTime` im LHR, nie `manifest[last]`.
4. **LHCI überschreibt `puppeteerLaunchOptions.executablePath`** intern mit `collect.chromePath` (`puppeteer-manager.js`: `executablePath: this._options.chromePath`) — Chrome-Pfad MUSS auf collect-Ebene stehen.

Plus GHA-Falle (gilt für ALLE Workflows): **upload-artifact@v4 `include-hidden-files: false` (Default) schließt Dot-Verzeichnisse still aus** — `.lighthouseci/` Upload produzierte 5 Wochen 0 Artifacts trotz `if: always()`; einziges Signal war `##[warning]No files were found` im Log. Bei Dot-Dir-Pfaden explizit `include-hidden-files: true`.

**Reference:** Slice 282b `worklog/proofs/282b-lhci-auth.md` + `e2e/lhci-login.cjs` + `lighthouserc.cjs`.

### Cron-Skip-Branch ohne advance_gameweek-Aufruf → chronischer GW-Drift (Slice 273+276b, 2026-05-06)

**Bug-Klasse:** Daily-Sync-Cron hat mehrere Skip-Branches die early-returnen. Wenn EINE Skip-Branch den State-Advance-Step (`advance_gameweek`, `bump_window`, `next_period`) NICHT vor dem return aufruft, bleibt der State auf der gerade fertiggestellten Period kleben. Recurrent-Bug: GW-Drift kommt nach jeder fertig-gespielten GW zurück.

**Symptom (Slice 276b 2026-05-06):**
- 4 Ligen mit `clubs.active_gameweek = last_finished_gw` (drift +1) — UI zeigt „Spieltag beendet" für gerade fertige GW.
- Cron-log zeigt 06:00 UTC `already_complete (skipped)` für alle 4 Ligen.
- Pre-Fix: Bundesliga 32→32, Serie A 35→35 trotz fixtures.status='finished' für gleichen GW.
- Slice 273 hat das DB-State manuell für 2 Ligen geheilt, Cron-Code-Fix als „Backlog" markiert → 3 Live-Bugs dazwischen → Cron-Code-Fix nie gebaut → Bug rekurrent über jede neue Match-Day-Nacht.

**Code-Pattern Anti-Pattern (`gameweek-sync/route.ts:502-544`):**
```ts
// Branch 1: alle finished + alle scored → KEIN advance, early return
if (!unscoredEvents || unscoredEvents.length === 0) {
  await logStep(activeGw, 'already_complete', 'skipped', { reason: '...' });
  return { /* keine advance, kein step für nextGw */ };
}

// Branch 2: unfinished aber alle in der Zukunft → KEIN advance, early return
if (!pastUnfinished || pastUnfinished.length === 0) {
  await logStep(activeGw, 'no_past_fixtures', 'skipped', { reason: '...' });
  return { /* keine advance */ };
}

// Branch 3 (Phase B vollständig durchlaufen): → advance_gameweek wird aufgerufen ✓
```

**Fix-Pattern (Slice 277 geplant):**

Vor jedem early-return in Skip-Branch prüfen, ob das State-Advance fällig ist. Generisch:

```ts
// Vor early-return: prüfe ob nächste Period-State fällig ist
const nextGw = activeGw + 1;
if (nextGw <= league.maxGameweeks) {
  const { data: nextGwHasFixtures } = await supabaseAdmin
    .from('fixtures')
    .select('id', { count: 'exact', head: true })
    .eq('gameweek', nextGw)
    .in('home_club_id', allLeagueClubIds)
    .limit(1);

  if (nextGwHasFixtures && nextGwHasFixtures.length > 0) {
    // Same advance_gameweek dual-write logic wie Phase B Z.1598-1616
    for (const club of clubsToProcess) {
      await supabaseAdmin.from('clubs').update({ active_gameweek: nextGw }).eq('id', club.id);
    }
    await supabaseAdmin.from('leagues').update({ active_gameweek: nextGw }).eq('id', league.id);
    await logStep(activeGw, 'advance_after_skip', 'success', { from: activeGw, to: nextGw, branch: 'already_complete' });
  }
}
```

**Detection-Query (täglich post-Cron):**

```sql
-- Drift-Detector: active_gw == last_finished UND first_open > active_gw → stuck
SELECT l.name, l.active_gameweek, ft.last_finished_gw, ft.first_open_gw,
       (ft.first_open_gw - l.active_gameweek) AS drift
FROM leagues l
LEFT JOIN (
  SELECT league_id,
    MAX(gameweek) FILTER (WHERE status IN ('finished','simulated')) AS last_finished_gw,
    MIN(gameweek) FILTER (WHERE status NOT IN ('finished','simulated')) AS first_open_gw
  FROM fixtures WHERE league_id IS NOT NULL GROUP BY league_id
) ft ON ft.league_id = l.id
WHERE ft.first_open_gw > l.active_gameweek
  AND ft.first_open_gw - l.active_gameweek <= 3;  -- ignoriere Postponed-Edge-Cases mit großem Gap
```

CI-Integration empfohlen: post-Cron-Smoke (analog `post-deploy-smoke.yml`) der diesen Query auf 0 Rows checkt → GH-Issue auf Failure.

**Backlog-as-Slice-Anti-Pattern (Process-Lehre):**

Slice 273 markierte den Cron-Code-Fix als „Backlog für separater Slice 274 nach Beta". Slice 274 wurde aber von einem **anderen** Live-Bug vereinnahmt (Form-Bars), Slice 275 von wieder einem anderen (sync-injuries), Slice 276 ein dritter (Logo). Der ursprüngliche Backlog-Item ist NIE der nächste Slice gewesen.

**Regel:** Wenn ein Slice einen Sub-Track als „Backlog für nächsten Slice" markiert, MUSS der nächste Slice exakt dieser Sub-Track sein, nicht ein neuer Live-Bug. Live-Bugs sind Slice N+2 oder via Emergency-Path. Sonst recurrent-Drift wie hier.

**Beziehung zu D54 „Build-without-Wire":** D54 dokumentierte Tools/Hooks die gebaut+nicht-verkabelt werden. Slice 276b ist die Variante „Track-A1-DB-Heal ohne Track-A2-Code-Fix" — gleiche Bug-Familie auf Process-Achse: das Slice-Done-Kriterium (siehe workflow.md §3a) MUSS umfassen, dass automatische Reproduktion ausgeschlossen ist, nicht nur dass aktueller State korrekt ist.

**Reference:** Slice 276b Hot-Fix (2026-05-06 ~12:25 UTC) — `worklog/proofs/276b-gameweek-hotfix.txt`. Cron-Code-Fix Slice 277 (geplant, Spec-Skelett `worklog/specs/277-gameweek-cron-advance-on-complete.md`).

## Cross-Cutting / Operational

### Branch-Protection enforce_admins=true ist NICHT direct-push-kompatibel (Slice 244 Phase 2 + Slice 248)

**Bug-Klasse:** GitHub Branch-Protection mit `required_status_checks` + `strict=true` + `enforce_admins=true` ist designed für PR-Merge-Workflow. Bei Solo-Dev direct-push entsteht Catch-22: Push wird abgelehnt mit "X of X required status checks are expected" + "protected branch hook declined", weil GitHub vor Push erwartet dass tip-commit alle grünen Status-Checks hat — aber CI startet erst NACH Push.

**Symptom:**
```
$ git push origin main
remote:
remote: - 4 of 4 required status checks are expected.
 ! [remote rejected]   main -> main (protected branch hook declined)
error: failed to push some refs to '...'
```

**Anti-Pattern:**
- "enforce_admins=true ist die echte Sicherheit, also setzen wir das einmal" — falsch wenn Solo-Dev ohne PR-Workflow.
- "Workaround: enforce_admins=false toggle bei jedem Push" — Selbst-Bypass-Anti-Pattern + Operational-Mehraufwand.

**Pattern (Slice 248, korrekt für Solo-Dev):**
- `enforce_admins=false` lassen (status-quo)
- 4 contexts required für PR-Workflow zukünftig
- **Pre-Push-Hook** (`.husky/pre-push`) der lokal alle Status-Checks simuliert:
  - tsc + audit:* sind in `.husky/pre-commit` (Slice 243)
  - vitest run mit `CI=true` env (skipt Integration-Tests analog CI) in pre-push
  - next build + bundle-budget bleiben in CI (zu langsam für pre-push)
- Bypass: `git push --no-verify` für Notfälle, CI als 2nd-Layer fängt Drift

**CI=true env für vitest-Parität (Slice 248):**
- `vitest.config.ts` hat `skipIntegration = !!process.env.CI`
- Lokales `pnpm exec vitest run` läuft Integration-Tests (gegen Live-Prod-Supabase)
- Pre-push muss `CI=true pnpm exec vitest run` setzen, sonst: spurious failures durch DB-State

**Reference:** Slice 244 Phase 2 (Phase-2-LOG-Push live demonstriert), Slice 248 (architektonische Lösung via pre-push-Hook). Pattern-Familie D45 (Hooks > Text-Regeln).

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
- **`tr '[:upper:]' '[:lower:]'` ist NICHT UTF-8-aware** (Slice 234, F-04). MSYS Git Bash default-Locale-`tr` lowercasing scheitert silent bei Großbuchstaben mit Umlaut: `Hör auf` → `hör auf` ✗ (kein Lowercase wenn Locale-mismatch). Klassischer Fall: capture-correction.sh Hook scannt Korrekturen-Keywords case-insensitive — User schreibt "FALSCH" oder "Hör auf" → Hook fängt nicht.
  - Fix-Pattern A: `LC_ALL=C.UTF-8`-Prefix vor `tr`-Call. `LC_ALL=C.UTF-8 tr '[:upper:]' '[:lower:]'` oder Block-Wrap: `LC_ALL=C.UTF-8 bash -c 'tr ...'`.
  - Fix-Pattern B: Dual-Pattern für Großbuchstaben — sowohl lowercase-Pattern als auch UPPERCASE-Pattern parallel matchen. `grep -iE "...|FALSCH|HÖR AUF|KORREKTUR..."`.
  - Empfehlung: Bei UTF-8-keywords beide kombinieren (LC_ALL + dual-Pattern für robustness).
  - Audit: Bei jedem `tr '[:upper:]'` ohne `LC_ALL`-Prefix in `.claude/hooks/` oder `scripts/` → Risk.

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

### Spec-Drift-im-Drift-Heal-Anti-Pattern (Slice 234)

Wiederkehrendes Anti-Pattern: Slice der Spec-Drift heilen soll, hat selbst Spec-Drift in seiner eigenen Spec-Datei. Slice 234 ("Drift-Prevention via wiring-check + Layer-3-DoD") wurde von Reviewer-Agent mit 2 Spec-Drifts gemeldet (F-01 + F-07): "10 vs 11 orphan" + "Hook-Count-Drift". Ironie: Spec über Drift-Detection war selbst undetected drifted.

- **Symptom:** L-Slice mit Meta-Process-Scope (Hook-Architektur, Process-Reform, Drift-Prevention). Spec-Tabellen oder Counts (z.B. "8 Hooks", "4 Files", "3 Phasen") in der Spec-Datei sind eingefroren während Implementation iteriert. Reviewer-Agent fängt es als CONCERNS.
- **Root-Cause:** Drift-Heal-Slices sind iterativ — während BUILD entstehen NEUE Insights die Spec-Sektionen veralten lassen. Author-Confirmation-Bias: "Ich schreibe gerade Drift-Prevention, also kann meine Spec keinen Drift haben".
- **Mitigation:** Bei L-Slices mit Meta-Process-Scope: post-BUILD vor REVIEW eine **Spec-Self-Audit-Pass** machen. Counts + Tabellen + Stage-Chain gegen aktuellen Code-Stand verifizieren. Reviewer-Agent ist letzte Falle, nicht erste.
- **Beispiel-Heal:** Slice 234 F-01: "10 echte Drift + 1 false-positive Audit-Bug" statt "10 vs 11 orphan" — Präzisierung statt Re-Count.
- **Beziehung:** D43 (Type-Truth-Drift), D46 (Orphan-Component-Drift), **D54 (Build-without-Wire-Drift)** — Pattern-Familie "Existenz ≠ Verwendung". Spec-Drift ist die Process-Achse.

### Issue-Closing != Bug-Resolved (Slice 234)

GitHub-Issue-Closing-Phasen verschleifen recurring Failure-Klassen wenn Bug nicht echt-resolved sondern nur "issue closed" wird. Slice 234 schloss 14 stale Smoke-Failure-Issues batch-mode. Ohne Master-Tracker wäre der Beta-Blocker (Player-Link-Timeout, identisch zu #14-#21) silent verschwunden — nächstes nightly-audit hätte erneut #26 erstellt.

- **Symptom:** Issue-Liste ist "clean" aber underlying Failure-Klasse persistent. Auto-Issue-Pipelines (z.B. `nightly-audit.yml` Auto-Issue) erzeugen Duplicates.
- **Anti-Pattern:** "GitHub Issue State = Bug-Resolution-State". Falsch wenn Issue-Closing aus operativen Gründen geschieht (Cleanup, Dedupe, Triage) ohne Code-Fix.
- **Fix-Pattern:** Master-Tracker-Issue für recurring Failure-Klassen erstellen. Ein dedizierter Issue mit Label `tracker` oder `recurring` der NIE geschlossen wird bis Klasse selbst gefixt ist. Auto-Issue-Hooks dedup'n via title-prefix-check gegen Tracker.
- **Implementation Slice 234:** Issue #25 als Master-Tracker für "Player-Link-Timeout in Smoke-Tests" erstellt. Auto-Issue-Pipeline checkt seitdem `gh issue list --search "Smoke-Failure"` → Comment-Update statt new-Issue.
- **Audit:** Bei jeder Auto-Issue-Pipeline: gibt es ≥1 Master-Tracker pro Failure-Klasse? Wenn nicht → Risk.

### Master-Tracker-Pre-Check Code-Pattern (Slice SO-4, 2026-05-04)

GHA-Auto-Issue-Pipeline darf nicht blind `issues.create` aufrufen — pre-check ob offener Master-Tracker mit `smoke-fail`-Label existiert, sonst Comment-an-Tracker. Codifiziert nach Sign-Off-Re-Trial #2 RISK-3 (22+ Cold-Start-Transient-Issue-Akkumulation seit 2026-04-29 trotz Slice-234-Erstellung von #25).

**Code-Snippet (für `actions/github-script@v7` `script:`):**
```js
const existing = await github.rest.issues.listForRepo({
  owner: context.repo.owner,
  repo: context.repo.repo,
  state: 'open',
  labels: 'smoke-fail,beta-blocker',  // beide Labels pflicht (Komma = AND)
  per_page: 30,
});

// Master-Heuristik: explicit-Title > ältestes-offenes
const master = existing.data.find(i =>
  /Master[- ]?Tracker|Beta[- ]?Blocker Tracker/i.test(i.title)
) ?? existing.data.sort((a, b) =>
  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
)[0];

if (master) {
  await github.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: master.number,
    body: `## 🚨 New Failure (auto-comment)\n\n${body}`,
  });
} else {
  await github.rest.issues.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    title: `🚨 Master-Tracker: <Failure-Klasse>`,
    body: `**Master-Tracker** für recurring <Klasse>. Auto-Pipeline hängt Failures als Comments dranan.\n\n## Erstes Failure\n\n${body}\n\n## Closing-Strategy\n\nClose NUR wenn N+ consecutive Runs SUCCESS.`,
    labels: ['beta-blocker', 'smoke-fail', 'master-tracker'],
  });
}
```

**Wichtig:**
- `labels` als Komma-String → AND-Match. Pre-Check matcht nur Issues mit BEIDEN labels.
- `master-tracker`-Label im neu-erstellten Issue garantiert dass nachfolgende Failures es als Master finden.
- Title-Heuristik (`Master-Tracker|Beta-Blocker Tracker`) als sekundärer Anker, falls Label-Drift.
- `sort by created_at ASC` → ältestes offene Issue als Fallback-Master.

**Audit:** `grep -A3 "issues.create" .github/workflows/*.yml | grep -v "createComment\|listForRepo"` — wenn `issues.create` ohne vorheriges `listForRepo` aufgerufen wird, ist das ein Risk-Punkt.

**Reference:** Slice SO-4 patches `post-deploy-smoke.yml` + `nightly-audit.yml` (smoke-Sub-Job) mit diesem Pattern.

### Cold-Start-Warm-Up vor Smoke-Suite (Slice SO-4, 2026-05-04)

Vercel-Lambda braucht ~10-25s Warm-Boot nach Deploy. Ohne Warm-Up trifft erster `locator.click` den 30s-Timeout während Lambda noch bootet → false-positive Smoke-Fail. Patch via curl-retry-loop VOR Playwright-Run wakes Lambda OHNE Test-Counter zu inkrementieren.

**Code-Snippet (Bash-Step in GHA-Workflow):**
```yaml
- name: Warm-Up bescout.net (Cold-Start-Mitigation)
  run: |
    set -e
    for i in 1 2 3 4 5 6; do
      echo "[warm-up] attempt $i/6 — curl https://bescout.net/"
      CODE=$(curl -fsSL -o /dev/null -w "%{http_code}" -m 30 https://bescout.net/ || echo "000")
      if [ "$CODE" = "200" ]; then
        echo "[warm-up] ✅ bescout.net responded 200 (warm)"
        sleep 5  # Settle-Time für React-Hydration
        exit 0
      fi
      echo "[warm-up] ⚠️ HTTP $CODE — retry in 10s"
      sleep 10
    done
    echo "[warm-up] ❌ bescout.net cold-boot fehlgeschlagen (60s window)"
```

**Position:** zwischen `playwright install` und `playwright test --project=smoke`.

**Wichtig:**
- 6 retries × max 30s curl + 10s sleep = max 4 min Warm-Up-Window. Genug für Vercel-Cold-Boot.
- Kein Hard-Fail bei Failure — Smoke versucht es trotzdem (Lambda könnte beim ersten Playwright-Goto warm werden).
- 5s Settle-Sleep nach 200 — gibt React-Hydration einen kleinen Puffer.

**Reference:** Slice SO-4 patches `post-deploy-smoke.yml` + `nightly-audit.yml` smoke-Sub-Job. Sign-Off-Re-Trial #2 RISK-3 → CLOSED.

### settings.json-Edit > 3 Hooks → IMPACT-Stage-Pflicht (Slice 234)

`.claude/settings.json` Hook-Registry-Edits sind architektonische Änderungen die ähnlich wie DB-Migrations Cross-Cutting-Impact haben. Slice 234 registrierte 8 Hooks gleichzeitig — Reviewer F-11 markierte das als "IMPACT-Stage hätte gerechtfertigt sein sollen".

- **Trigger-Schwelle:** ≥ 3 Hook-Registrierungen ODER 1 Hook-Removal/Replacement in einem Slice.
- **Warum IMPACT-Pflicht:** Hooks sind cross-cutting (sie bombardieren ALLE PreToolUse / PostToolUse / Stop / SessionStart Trigger). Ein bugger Hook bricht Gesamt-Workflow für Tage (siehe capture-correction.sh 19-Tage-Ausfall).
  - Risk-Klassen: (a) Hook-Order-Mismatches (PreToolUse-Reihenfolge undefined), (b) Hook-Trigger-Overlap (zwei Hooks lesen gleichen JSON-Stream und parsen falsch), (c) Performance-Regression (jeder Hook ~50-200ms × 30 Tool-Calls/Session).
- **IMPACT-Sektion bei Hook-Edits:** Liste alle Hooks die gleichen Trigger-Event teilen + verifiziere keine Order-Dependency-Annahme + benchmark Trigger-Latency.
- **Beziehung zu D45 (Hooks > Text-Regeln):** D45 ist Architektur-Win, dieser Pattern ist Process-Komplement. Beide gelten parallel.
- **Audit:** `git log --oneline -- .claude/settings.json | head -20` sollte zeigen: alle Edits mit ≥3 Hook-Mods haben IMPACT-File. Pre-Slice-234 Backlog: erste 5 Edits ohne IMPACT-File → Slice 242+ Backfill möglich.

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
