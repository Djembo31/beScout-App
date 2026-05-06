# Slice 280 — Top-5 Fat Modules (Pre-Implementation Mess-Wahrheit)

**Datum:** 2026-05-06 · **Build:** `ANALYZE=true pnpm exec next build` · **Quelle:** `.next/analyze/client.html` parsed via `scripts/analyze-bundle.js`.

## Top-Libraries by Parsed Size (Client-Bundle, summiert über alle Chunks)

| Rang | Library / Stack | Parsed KB | Bemerkung |
|------|-----------------|----------:|-----------|
| 1 | **@sentry/* gesamt** | **~1106 KB** | core 456 + browser 248 + nextjs 213 + browser-utils 189 |
| 2 | **@supabase/* gesamt** | **~733 KB** | ssr 379 + auth-js 189 + realtime 68 + storage 55 + postgrest 30 + supabase-js 11 |
| 3 | lucide-react | 384.9 | bereits in optimizePackageImports — Win unklar |
| 4 | react-dom | 377.7 | Framework, nicht optimizable |
| 5 | @tanstack/* (query) | ~199 | query-core 125 + react-query 74 |
| 6 | @radix-ui/* + @floating-ui/* | ~185 | dropdown-menu 105 + menu 21 + dismiss 15 + collection 11 + floating-ui-core 19 + dom 14 |
| 7 | next-intl + use-intl + formatjs | ~167 | use-intl 88 + formatjs 47 + next-intl 20 + intl-messageformat 12 |
| — | next | 1778 | Framework + RSC + Server-Code (verteilt über chunks) |

**Total node_modules parsed:** 6.827 KB across 70 libraries.

## First Load JS pro Page (Vorher-Snapshot)

| Page | FLJS | Budget | Headroom |
|------|------|--------|----------|
| `/` | 396 KB | 395 | **+1 KB ÜBER** |
| `/club/[slug]/admin` | 419 KB | 425 | 6 KB |
| `/bescout-admin` | 411 KB | 420 | 9 KB |
| `/player/[id]` | 411 KB | 415 | 4 KB |
| `/club/[slug]` | 395 KB | 400 | 5 KB |
| `/community` | 398 KB | 400 | 2 KB |
| `/market` | 379 KB | 385 | 6 KB |
| Shared | 162 KB | 170 | 8 KB |

**Cold-Start-Reality:** Auf Mobile-Slow-4G bei 100 KB/s parse-rate sind 396 KB ≈ 4s Bundle-Parse + Hydrate. Beta-Tester (50-Mann-Pipeline) treffen das auf jeder First-Visit.

## Top-10 Chunks by Parsed Size

| Chunk | Parsed | Inhalt |
|-------|-------:|--------|
| `1164-7dcb60476375930b.js` | **341 KB** | next-internals + @sentry/core 255 KB |
| `5796-1950741130082d00.js` | 203 KB | @supabase/ssr 379 KB ext + auth-js 189 KB |
| `8905.76f00e035ff4b3a0.js` | 196 KB | (vermutlich Sentry-Browser/Replay — minified) |
| `app/(app)/player/[id]/page-*.js` | 194 KB | Page-Code |
| `app/(app)/club/[slug]/admin/page-*.js` | 177 KB | Page-Code (Admin) |
| `460dc3e0-96f1892469af190e.js` | 169 KB | next-internals + Sentry-Debug-IDs |
| `app/(app)/bescout-admin/page-*.js` | 164 KB | Page-Code (Bescout-Admin) |
| `framework-*.js` | 137 KB | react-dom 378 KB ext (framework-shared) |
| `pages/_app-*.js` | 131 KB | @sentry/core 201 KB ext + browser-utils 88 KB |
| `main-*.js` | 116 KB | next runtime 409 KB ext |

## Call-Site-Audit (Pre-Implementation, Slice 121-Lehre)

### Sentry — 3 Konsument-Files alle mit Namespace-Import

```
src/components/providers/AuthProvider.tsx:11    import * as Sentry from '@sentry/nextjs'
src/components/providers/QueryProvider.tsx:8    import * as Sentry from '@sentry/nextjs'
src/lib/observability/captureError.ts:18        import * as Sentry from '@sentry/nextjs'
```

**Genutzte API-Surface:** `setUser`, `addBreadcrumb`, `captureException`, `captureMessage`, `SeverityLevel` (Typ).
Namespace-Import blockiert effektives Tree-Shaking laut `errors-infra.md` Slice 120 Pattern. Refactor auf Named-Imports = sicherer Win ohne Behavior-Change.

### Radix-UI — 3 Wrapper-Files, 50 Konsumenten via Barrel

```
src/components/ui/Dialog.tsx        import * as RadixDialog from '@radix-ui/react-dialog'
src/components/ui/AlertDialog.tsx   import * as RadixAlert from '@radix-ui/react-alert-dialog'
src/components/ui/DropdownMenu.tsx  import * as RadixMenu from '@radix-ui/react-dropdown-menu'
```

50 Files importieren `Dialog`/`AlertDialog`/`DropdownMenu` via `@/components/ui`-Barrel. Lazy-Wrap an den 3 Wrapper-Files würde alle Konsumenten gleichzeitig auf Lazy-Pfad ziehen.

### Lucide-React — 313 Imports (alle named)

```
grep "from 'lucide-react'" src/ | wc -l → 313
```

Alle Imports sind named (`import { X, Y } from 'lucide-react'`). Bereits in `optimizePackageImports`. 384 KB im Bundle könnte echte unique-Icon-Surface sein (313 × ~4 Icons avg = ~150-200 distinct Icons × ~2 KB each ≈ 300-400 KB). Win-Potential: niedrig ohne weitere Mess-Iteration.

## Wave-Plan (3 Waves, Risk-aufsteigend)

### Wave 1 — `optimizePackageImports`-Erweiterung (config-only, kein Code-Risk)

Add to `next.config.mjs`:
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-dialog`
- `@radix-ui/react-alert-dialog`
- `@supabase/ssr`
- `@tanstack/react-query-persist-client`

Erwartung: -10 bis -40 KB FLJS shared. Risk: tsc-Bruch bei einer der Libs (per-Lib testen, nicht batch).

### Wave 2 — Sentry Named-Imports (Code-Refactor, low Risk)

Replace `import * as Sentry from '@sentry/nextjs'` durch named imports in 3 Files:

```ts
import { setUser, addBreadcrumb, captureException, captureMessage } from '@sentry/nextjs';
import type { SeverityLevel } from '@sentry/nextjs';
```

Erwartung: -20 bis -60 KB Sentry-Surface (unbenutzte API-Bereiche werden tree-shakable). Risk: Type-Resolution-Drift, vitest-Mocks nachziehen falls vorhanden.

### Wave 3 — `dynamic()`-Wrap Radix-UI-Wrapper (deferred wenn Wave 1+2 ≥ 30 KB Win)

Wrap Dialog/AlertDialog/DropdownMenu in `dynamic(() => import(...), { ssr: false })`. Risk: User-Side Loading-Spike beim ersten Open, kleine Latency-Regression. Defer wenn Wave 1+2 das Mindest-AC-Ziel erfüllen.

## Acceptance Criteria (final)

```
AC-01: [HAPPY] ANALYZE=true next build erzeugt .next/analyze/{client,edge,nodejs}.html ohne Fehler ✓ (done pre-implementation)
AC-02: [HAPPY] Top-5 fat-Modules identifiziert in worklog/proofs/280-fat-modules.md ✓ (this file)
AC-03: [HAPPY] Wave 1 + Wave 2 implementiert (Wave 3 optional)
AC-04: [REGRESSION] Mindestens 1 von [/, /market, /community] hat ≥ 30 KB FLJS-Reduktion
AC-05: [REGRESSION] Stretch: Total-FLJS-Sum aller getrackten Pages -200 KB
AC-06: [REGRESSION] Keine FLJS-Regression auf anderen Pages (bundle-budget.json gate green)
AC-07: [REGRESSION] tsc clean + vitest grün
AC-08: [POST-DEPLOY] Lighthouse-Run nach Push zeigt LCP-Verbesserung in Job-Summary (informational, nicht hard-blocking)
```

## Open-Questions — RESOLVED

1. **Scope-Granularität:** Alle 5 fat-Module in 1 Slice mit 3 Waves (Anil-Approval 2026-05-06)
2. **FLJS-Reduktions-Ziel:** -30 KB Hard-AC + -200 KB Stretch-Goal (Anil-Approval 2026-05-06)
3. **Service-Worker:** Deferred → Slice 282+ post-Beta (Anil-Approval 2026-05-06)

## Bemerkung — Lucide nicht in Slice 280

Lucide-react ist bereits optimiert (named imports + optimizePackageImports). 384 KB ist möglicherweise echte Icon-Surface (313 imports × ~150-200 distinct Icons). Static-Asset-Migration analog Slice 120 wäre invasive (313 Konsumenten). Defer als Slice 280b wenn dedicated Win-Pfad gefunden.
