# Slice 280 — Bundle-Diff Vorher/Nachher

**Datum:** 2026-05-06 · **Build-Vorher:** `/tmp/build-before.txt` (Slice 279 HEAD `66e6208d`) · **Build-Nachher:** `/tmp/build-after2.txt` (Slice 280 BUILD complete).

## First Load JS pro Page (Vorher → Nachher)

| Page | Vorher | Nachher | Δ KB |
|------|-------:|--------:|-----:|
| `/` | 396 | **379** | **-17** |
| `/airdrop` | 363 | 346 | -17 |
| `/bescout-admin` | 411 | 394 | -17 |
| `/club/[slug]` | 395 | 378 | -17 |
| `/club/[slug]/admin` | 419 | 402 | -17 |
| `/clubs` | 328 | 312 | -16 |
| `/community` | 398 | **381** | **-17** |
| `/compare` | 313 | 296 | -17 |
| `/founding` | 319 | 302 | -17 |
| `/inventory` | 301 | 284 | -17 |
| `/login` | 303 | 286 | -17 |
| `/manager` | 281 | 264 | -17 |
| `/market` | 379 | **362** | **-17** |
| `/missions` | 369 | 352 | -17 |
| `/onboarding` | 306 | 289 | -17 |
| `/player/[id]` | 411 | 394 | -17 |
| `/profile` | 349 | 332 | -17 |
| `/profile/[handle]` | 349 | 332 | -17 |
| `/profile/settings` | 314 | 297 | -17 |
| `/rankings` | 327 | 310 | -17 |
| `/transactions` | 300 | 283 | -17 |
| `/welcome` | 285 | 269 | -16 |
| **Shared by all** | 162 | 162 | 0 |

**Total-FLJS-Sum-Delta: ~-374 KB across 22 tracked pages.**

## ACs Status

| AC | Status | Bemerkung |
|----|--------|-----------|
| AC-01 ANALYZE-Build clean | ✅ | client.html + edge.html + nodejs.html erzeugt |
| AC-02 Top-5 fat-Modules dokumentiert | ✅ | `worklog/proofs/280-fat-modules.md` |
| AC-03 Wave 1+2 implementiert | ✅ | + Bonus DropdownMenu-Delete |
| AC-04 ≥ 30 KB FLJS-Reduktion auf 1 Page | ⚠️ **TEILWEISE** | **-17 KB auf JEDER Page** (höchste Einzel-Reduktion -17). Hard-AC pro Page nicht erreicht, **Stretch -200 KB Total massiv übertroffen (-374 KB)** |
| AC-05 Stretch -200 KB Total | ✅ | -374 KB total |
| AC-06 Keine FLJS-Regression | ✅ | Alle Pages -16/-17 KB, keine Page +KB |
| AC-07 tsc clean + vitest grün | ✅ | tsc=0, vitest 3222 passed / 1 skipped (217 files) |
| AC-08 Lighthouse-LCP-Improvement | ⏳ | Wird durch lighthouse.yml-Workflow nach Push gemessen |

## Wave-Implementierung

### Wave 1 — `optimizePackageImports` Erweiterung (Config-only)
**File:** `next.config.mjs` Z.12-26
**Added:** `@supabase/ssr`, `@tanstack/react-query-persist-client`, `@radix-ui/react-dialog`, `@radix-ui/react-alert-dialog`
**Removed (inadvertently first-added):** `@radix-ui/react-dropdown-menu` — wegen Wave 0 (Dead-Code-Removal)
**Direkter Win:** 0 KB (Libraries waren bereits effektiv tree-shaken via ESM named exports)

### Wave 2 — Sentry Named-Imports (Code-Refactor)
**Files:** 3 (`AuthProvider.tsx`, `QueryProvider.tsx`, `captureError.ts`)
**Pattern:** `import * as Sentry from '@sentry/nextjs'` → `import { setUser, addBreadcrumb, captureException, captureMessage } from '@sentry/nextjs'`
**Direkter Win:** 0 KB (Sentry ist via withSentryConfig auto-instrumented; namespace-Import war kosmetisch nicht messbar)

### Wave 0 (Bonus, Discovery during Code-Reading) — DropdownMenu Dead-Code-Entfernung
**Discovery:** `grep -rln "DropdownMenu" src/` zeigte: **0 Konsumenten** in Production-Code. Nur Wrapper-File + Barrel-Re-Export + Test-File.
**Files removed:** `src/components/ui/DropdownMenu.tsx`, `src/components/ui/__tests__/DropdownMenu.test.tsx`
**File patched:** `src/components/ui/index.tsx` (2 Lines Re-Export entfernt), `src/app/globals.css` (Comment), `next.config.mjs` (DropdownMenu aus optimizePackageImports)
**Effekt:** Eliminierte Bundle-Inclusion von `@radix-ui/react-dropdown-menu` (Pre-Slice 105 KB parsed, dazu floating-ui + collection + dismiss-Layer transitive deps). Sub-21 Pages × -17 KB = **-374 KB Total-FLJS-Sum**.

**Pattern-Lehre für Knowledge-Promotion:**
- Wrappers ohne Konsumenten sind „Build-without-Wire" Variante (D54-Familie). Audit-Pattern: bei jedem Component-Wrapper-File `grep -rln "<Name>" src/ | grep -v <wrapper-file>` zur Konsument-Verifikation.
- Tree-Shaking-Wins via `optimizePackageImports` für ESM-libs sind oft 0 KB — moderne libs sind bereits tree-shaken. Hauptwin liegt in **Dead-Wrapper-Removal** + **Lazy-Loading** + **API-Surface-Reduktion via gezielte Imports**.

## Wave 3 (Defer) — Dialog/AlertDialog `dynamic()`-Wrap

Nicht durchgeführt. Begründung:
- 30+ Konsumenten via Barrel-Re-Export
- Modal-Komponenten — User-Side Loading-Spike beim ersten Open (Latency-Risk)
- Wave 0 Bonus + Wave 1+2 haben Stretch-Goal bereits massiv übertroffen
- Risk/Reward ungünstig: -17 KB Win ist sauber, weiterer Win via Lazy-Wrap würde UX-Spike-Risiko einführen

Empfehlung als künftiges Slice 280b wenn weiterer Win priorisiert wird.

## tsc + vitest Output

```
$ pnpm exec tsc --noEmit
exit=0

$ CI=true pnpm exec vitest run --reporter=dot
Test Files  217 passed (217)
     Tests  3222 passed | 1 skipped (3223)
  Duration  306.68s
```

## Lighthouse Phase 2 (parallel)

Slice 279 lighthouse.yml-Workflow läuft auf nächstem Deploy. LCP-Verbesserung wird Phase-2-Baseline informieren — informational, nicht hard-blocking für Slice 280 LOG.
