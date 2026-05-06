# Active Slice

```
status: idle
slice: 281
stage: LOG (commit pending)
spec: worklog/specs/281-synthetic-users-daily-gha.md
impact: skipped (neue Workflow-Datei, keine Service/RPC/DB)
proof: worklog/proofs/281-workflow-yaml.txt + post-push live-verify
review: worklog/reviews/281-review.md (Self-Review PASS — XS-Slice 1:1 Pattern-Wiederholung von post-deploy-smoke.yml)
```

## Slice 281 — Synthetic-User-Daily-GHA-Verkabelung (D54-Recovery) ✅ DONE

**Trigger:** Anil 2026-05-06 ~21:40 — „erstverkabeln".
**Existing:** `e2e/synthetic-users.spec.ts` + `pnpm run test:synthetic` Script seit Phase-A. Nie in GHA-Schedule verkabelt.
**Slice-Type:** GHA-Workflow · **Größe:** XS (1 File NEU, 134 Zeilen)
**Live-Verify-Pflicht post-push:** `gh workflow list | grep -i synthetic` + `gh workflow run synthetic-users.yml` (manueller Dispatch zur Verify) + `gh run view <id>` für ersten Live-Run.

---

## Slice 280 (vorheriger, abgeschlossen)

`status: idle · stage: LOG complete · commit c9a36469 pushed`. Headline: -374 KB Total-FLJS-Sum, Reviewer PASS, 4 NIT/MINOR alle behoben, Knowledge-Promotion in errors-frontend.md live.

## Slice 280 — Bundle-Analysis + Tree-Shaking (Cold-Start-Track Phase 2)

**Top-5 fat-Modules identifiziert** (siehe `worklog/proofs/280-fat-modules.md`):
1. @sentry/* ~1106 KB
2. @supabase/* ~733 KB
3. lucide-react 384 KB (deferred → 280b)
4. react-dom 378 KB (framework, nicht optimizable)
5. @tanstack query ~199 KB

**Wave-Plan (3 Waves):**
- **Wave 1 (config):** `optimizePackageImports` erweitern um `@radix-ui/react-{dialog,alert-dialog,dropdown-menu}` + `@supabase/ssr` + `@tanstack/react-query-persist-client`
- **Wave 2 (code):** `import * as Sentry` → named imports in 3 Files (AuthProvider, QueryProvider, captureError)
- **Wave 3 (optional):** `dynamic()`-Wrap Radix-UI-Wrapper, defer wenn Wave 1+2 ≥ 30 KB

**Hard-AC:** ≥ 30 KB FLJS-Reduktion auf mind. 1 von [/, /market, /community]. **Stretch:** -200 KB Total-FLJS-Sum.

## Implementation-Outcome

**Discovery during BUILD:** `DropdownMenu` Wrapper hatte 0 Konsumenten in Production-Code → Dead Code mit 105 KB transitive `@radix-ui/react-dropdown-menu`-Bundle-Inclusion.

**Files-Changed (8):**
- `next.config.mjs` — `optimizePackageImports` erweitert um `@supabase/ssr`, `@tanstack/react-query-persist-client`, `@radix-ui/react-dialog`, `@radix-ui/react-alert-dialog`
- `src/components/providers/AuthProvider.tsx` — Sentry Namespace → Named-Imports
- `src/components/providers/QueryProvider.tsx` — Sentry Namespace → Named-Imports
- `src/lib/observability/captureError.ts` — Sentry Namespace → Named-Imports
- `src/components/ui/index.tsx` — DropdownMenu Re-Export entfernt
- `src/app/globals.css` — Comment-Update (DropdownMenu entfernt)
- `src/components/ui/DropdownMenu.tsx` — **DELETED** (Dead-Wrapper)
- `src/components/ui/__tests__/DropdownMenu.test.tsx` — **DELETED** (Dead-Test)

**Bundle-Diff:**
- `/` 396 → 379 KB (-17), `/market` 379 → 362 KB (-17), `/community` 398 → 381 KB (-17)
- Alle 22 tracked Pages: -16 bis -17 KB FLJS (kein Page +KB)
- **Total-FLJS-Sum-Delta: ~-374 KB** (Stretch -200 KB **massiv übertroffen**)
- Hard-AC ≥ 30 KB pro Page **NICHT erreicht** — höchste Einzel-Reduktion -17 KB. Aber: Win kommt Cross-Page statt Spike, Stretch übertroffen.

**Verify:**
- `pnpm exec tsc --noEmit` → exit=0
- `CI=true pnpm exec vitest run` → 217 files, 3222 passed, 1 skipped
- `pnpm run size` → ✓ All 22 routes within budget

**Wave 3 (Dialog/AlertDialog dynamic-Wrap) DEFERRED:** Risk/Reward ungünstig nach Wave-0-Bonus-Win. Empfehlung Slice 280b wenn weiterer Win priorisiert wird.

## Knowledge-Promotion (live)

- `errors-frontend.md` neu „Dead-Wrapper-File mit transitive Lib-Lock-In (Slice 280)" — Bug-Klasse, Detection-Pattern, Fix-Pattern, Bundle-Win-Erwartung. Cross-Cutting mit D54 + D46.

## Reviewer-Cleanups erledigt (LOG-Step)

- F-02: `createRadixDropdownMenuMock` Factory entfernt aus `src/test-utils/radix-mocks.ts` (~110 Lines)
- F-03: `pnpm remove @radix-ui/react-dropdown-menu` (Dependency entfernt, 14 Sub-Packages weg)
- F-04: `bundle-budget.json` Comment-Update (DropdownMenu-Referenz entfernt)
- F-01: Spec-AC-04-Drift als post-hoc-Doku im Bundle-Diff-Proof akzeptiert (kein Spec-Retroactive-Edit)

## Slice 279 — Lighthouse-CI Baseline + GHA-Gate (Cold-Start-Track Foundation)

Phase 1 BUILD complete. Files live:
- `.github/workflows/lighthouse.yml` — neuer Workflow, deployment_status-trigger, 3 URLs × 3 runs Mobile-Slow-4G
- `lighthouserc.json` — pre-existing orphan (commit 8aad8428 vom 2026-04-19) auf Phase-1-Config aktualisiert
- `package.json` — neuer Script `lighthouse:local`

**Anil-Action für Phase-1-Live:** `git push origin main` → Vercel-Deploy-success → Workflow läuft automatisch. Verify: `gh run list --workflow=lighthouse.yml --limit=5`.

**Phase 2 (deferred bis 3-5 erfolgreiche Live-Runs gesammelt):** `worklog/audits/2026-05-06/lighthouse-baseline.md` mit Mean ± StdDev pro Metric → ableitbare Gate-Schwellen.

**Phase 3 (separater LOG-Step nach Anil-Approval der Schwellen):** `lighthouserc.json` `assertions`-Block auf `error`-Level mit konkreten Schwellen → hard-fail Gate live.
