---
description: Haeufigste Fehler — Navigator + Silent-Fails (die stillsten Bugs)
---

# Common Errors

Stand: 2026-04-24 · Split nach Slice 186. Konsolidiert aus Slices 001-185.

## Navigator

Spezifische Error-Patterns pro Domain:

| File | Scope |
|------|-------|
| `errors-db.md` | Supabase/Postgres, RPC-Design, Auth/Security, React-Query+Cache |
| `errors-frontend.md` | React/TS/CSS, Modal-Pattern, i18n/Locale |
| `errors-infra.md` | Build/Deploy, Bundle-Budget, Hooks, Beta-Launch-Ops |
| `errors-scraper.md` | Transfermarkt, API-Football, HTML-Parsing |

Cross-Cutting: `database.md` (Columns, CHECK), `trading.md` (Money-Regeln), `business.md` (Compliance), `performance.md` (Query-Limits), `testing.md` (vitest + Playwright), `memory/patterns.md` (#28 Ferrari-Blueprint).

---

## 0. Worktree-Isolation-Escape (Slice 207, codifiziert Slice 211)

**Bug-Klasse:** Worktree-Agent claimt completion, aber escaped Worktree-Isolation → schreibt Files in Main-Repo statt eigenen Worktree. Silent-Fail: kein git-Konflikt, der Worktree bleibt leer, downstream-Merge findet "nichts" zu mergen, Anil glaubt Slice ist fertig aber nichts ist passiert.

**Root-Cause:** Agent nutzt absolute Pfade (`C:/bescout-app/src/lib/...` oder `/home/anil/bescout-app/...`) statt relative (`src/lib/...`). Edit-Tool schreibt brav an absolut-Pfad — das ist Main-Repo, nicht Worktree.

**Detection:**
```bash
# Im Worktree:
cd <worktree-path>
git status -s    # Erwartet: edits zeigen sich. Wenn empty:
                 # → Agent hat in Main-Repo geschrieben, NICHT hier.

# Im Main-Repo (parallel):
git status -s    # Wenn unerwartete edits da sind, die der Agent claimt
                 # gemacht zu haben → Beweis fuer Escape.
```

**Mitigation (3-Layer):**
1. **Agent-Briefing-Pflicht** (siehe `.claude/skills/parallel-dispatch/SKILL.md` "WORKTREE-PFLICHT"-Block): "ALLE Files-Edits MIT RELATIVEN PFADEN. Vor 'fertig'-Claim: `cd <worktree-path> && git status -s` selbst laufen lassen."
2. **Self-Verification-Command** in Spec Sektion 1.12: `git status -s` als pflicht Audit-Command bei Worktree-Slices.
3. **Pre-Merge-Audit** (Primary-Claude): nach Agent-Completion `cd <worktree-path> && git diff --stat HEAD` laufen lassen. Empty diff = STOP, nicht mergen, Heal/Re-Dispatch.

**Reference:** Slice 207 Worktree-Heal-Story (3 Probleme aufeinander). Pattern-Draft im Handoff dokumentiert, jetzt promoted.

**Beziehung:** Cross-Cutting (trifft Backend/Frontend/Test-Writer-Agents gleichermaßen). Pattern Slice 211-D50 erweitert `/parallel-dispatch` Skill um Briefing-Block.

---

## 1. Silent Fails (die stillsten Bugs)

Diese Klasse bleibt hier, weil sie **cross-cutting** ist — trifft DB, Frontend, Scraper gleichermassen und ist der haeufigste Bug-Typ.

### Tool: `/silent-fail-audit`
- `npm run audit:silent-fail` → Report in `worklog/audits/silent-fail-YYYY-MM-DD.md`
- `npm run audit:silent-fail:check` → CI-Gate gegen `.audit-baseline.json` (HIGH-Increase = exit 1, MEDIUM-Increase = warn)
- 8 Pattern: `.in()` unchecked · `.select()` unranged · silent catch · error-swallow · data-destructure ohne error · hart-coded script state-checks · `Promise.allSettled` ohne `logSilentRejects` · `.catch(() => fallback)` ohne `logSilentCatch`
- Baseline Slice 092: 193 findings / 98 HIGH / 95 MEDIUM / HIGH-FP-Rate 0%. CI-Gate via GitHub Actions lint-job.
- Post-Fix: `.audit-baseline.json` mit neuen Zahlen committen.

### Silent-Catch ohne Observability (Slice 092)
- `.catch(() => null)` / `.catch(() => [])` → rejected Promise silent auf Fallback gemappt. Kein Log, kein Sentry.
- Fix: `.catch((err) => { logSilentCatch('module.fn', err); return null; })` aus `@/lib/observability/silentRejects`.
- Skip: `req.json().catch(() => ({}))` body-parse-Fallbacks sind legitim.
- Audit: `grep -rn '\.catch(() =>' src/ | grep -v __tests__ | grep -v logSilentCatch | grep -v 'json().catch'`

### Silent-Cast ohne Discriminator-Check (Slice 165, aus 160 Finding #2)
- `return data as { upvotes: number; ... }` direkt nach `supabase.rpc()` ohne Pruefung ob RPC-Body Error-Shape hat.
- Symptom: RPC returnt `{success: false, error: '...'}` (HTTP 200 mit Error-JSON). TypeScript-Cast luegt: Felder undefined. UI rendert NaN, kein Error-Toast.
- Kritischste Variante: RPC mit inkonsistenter Return-Shape — Success `{upvotes, downvotes}`, Error `{success: false, error}`. Discriminator = Feld-Existenz (fragil).
- Fix-Pattern:
  ```ts
  const result = data as { upvotes?: number; downvotes?: number; success?: boolean; error?: string };
  if (result.success === false || typeof result.upvotes !== 'number') {
    throw new Error(result.error ?? 'rpc_failed');
  }
  return { upvotes: result.upvotes, downvotes: result.downvotes ?? 0 };
  ```
- Regel: RPC-Services mit discriminated Union-Return MUESSEN Pre-Cast-Guard haben.
- Audit: `grep -B2 "return data as" src/lib/services/**/*.ts | grep -v "if.*success\|if.*!data\|if.*error\b"`

### `.in()` Chunking + Upstream-Query auch pruefen (Slice 082 + 086)
- `.in('col', ids)` mit >100 UUIDs liefert `data=undefined` + `error=undefined` (URL-Limit ~14KB). MUSS in 100er-Chunks split + explicit error-check.
- Bei Chunk-Fix **Loader-Query** pruefen: ist die id-Liste aus `.select().in()` mit >1000 rows? → Loader hat 1000-Cap, gleicher Silent-Fail.
- Pattern:
  ```ts
  const CHUNK = 100;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data, error } = await supabase.from('t').select().in('k', ids.slice(i, i+CHUNK));
    if (error) throw new Error(error.message);
  }
  ```

### PostgREST 1000-row cap — MONEY-CRITICAL (Slice 078/079b/133/134/135)
- `.select()` ohne `.range()` auf Tabelle >1000 rows liefert still max 1000. Kein Error.
- **`.limit(N)` ist KEIN Override-Path**: auch `.limit(10000)` cappt PostgREST bei ~1000. Nur `.range(offset, offset+999)` im Loop ist zuverlaessig.
- Fix: while-loop `.range(offset, offset+999)` bis `data.length < PAGE`.
- Audit: `grep -rn "\.from.*\.select" src/app/api/ src/lib/ | grep -v "\.range\|\.limit\|\.eq\|\.single\|\.maybeSingle"`
- Suspect: `grep -rn "\.limit([0-9]\{4,\})" src/lib/`
- Tabellen >800 rows (paginate day-one): `player_external_ids` (>5k), `players` (>4k), `fixtures`, `club_followers`.

### `.single()` vs `.maybeSingle()`
- `.single()` wirft HTTP 406 bei 0 Rows. Nur wenn Row garantiert existiert.
- Sonst `.maybeSingle()`.

### Service Error-Swallowing (2026-04-13 Hardening · 117 Fixes in 61 Services)
- `if (error) { console.error(); return null; }` → React Query cached null als SUCCESS, kein Retry, UI stuck.
- Kritischste Variante: `const { data } = await supabase...` **ohne** error-Destructuring. Komplett unsichtbar.
- Fix: `throw new Error(error.message)`. React Query retried automatisch.
- Audit: `grep -rn 'const { data } = await supabase' src/lib/services/`

### Promise.allSettled ohne Observability (Slice 088)
- `Promise.allSettled` + `r.status === 'fulfilled' ? r.value.data : []` ist graceful-degrade, aber rejected results unsichtbar → Data-Liar.
- Zwei Fix-Patterns:
  - Alles-oder-nichts: `Promise.all` + explicit `.error`-Checks.
  - Graceful degrade gewollt: `Promise.allSettled` + `logSilentRejects(label, results)` aus `@/lib/observability/silentRejects`.
- Audit: `grep -rn 'Promise.allSettled' src/ | grep -v __tests__ | grep -v logSilentRejects`

### Cron-Guard API-Response-Count vs DB-Count (Slice 140)
- Externe API liefert weniger Rows als DB hat, Cron nutzt API-Count → bricht zu frueh ab → DB-Rows unerreichbar. Siehe `errors-infra.md` Cron-Guard-Pattern fuer Fix.

### Scraper Silent-Fails (Slice 081, 078, 075)
- Default-Poisoning, Regex-Drift, Cloudflare-Block. Details: `errors-scraper.md`.

---

## Knowledge-Flywheel

Nach Bug-Fix: Pattern **sofort** in die richtige errors-*.md, nicht draft. Regel aus workflow-reference.md:

> Bug gefixt → Pattern in common-errors/errors-*.md SOFORT, kein Draft/Pending.

Bei Unklarheit wohin: cross-cutting → `common-errors.md` Section 1. Domain-spezifisch → splits.
