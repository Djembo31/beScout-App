# Slice 104 — Perf-Foundation: next.config Optimize + template.tsx + dynamic Root-Overlays

**Status:** spec (BUILD queued)
**Size:** S (3 Files, eine Domain)
**CEO-Scope:** false (CTO-Scope: Infrastructure + App-Router-Patterns, keine Money-Flow-Logik)
**Parallel:** Slice 103 (TM-Scrape) läuft im separaten Terminal — `active.md` nicht antasten.

## Ziel

Reduce **Render-Delay auf Mobile Slow 4G** von 1774ms auf <900ms durch drei Infrastruktur-Fixes ohne Touch auf Auth-, Money-, oder Service-Layer.

## Kontext

Chrome DevTools Performance Trace (heute, 2026-04-20) gegen `https://bescout.net/login`:
- Mobile Slow 4G + 4x CPU: **LCP 2091ms**, **Render Delay 1774ms** (85% der LCP-Zeit)
- 37 JS-Chunks initial load (Benchmark Sorare ~12)
- `country-flag-icons` + `@sentry/nextjs` nicht in `optimizePackageImports`
- Kein `experimental.optimizeCss`, kein `compress`
- Kein `template.tsx` → Provider-Tree re-mounts bei jeder Route-Transition
- `InstallPrompt` + `CookieConsent` eager im Root-Layout (sollten nach FCP kommen)

## Betroffene Files

1. **EDIT** `next.config.mjs`
   - `experimental.optimizePackageImports`: +`country-flag-icons`, +`@sentry/nextjs`
   - Begründung: Tree-Shaking für 2 weitere große Packages
   - **NICHT** `experimental.optimizeCss: true` — `critters` package nicht installiert, würde Build brechen. Auf Slice 108 verschoben (zusammen mit critters install).
   - **NICHT** `compress: true` — Next.js 14 Default ist bereits `true`, Setting wäre Redundant-Noise.
2. **NEW** `src/app/template.tsx`
   - Persistent Wrapper für Route-Transitions — Provider-Tree bleibt gemountet
   - Minimaler Overhead: `return <>{children}</>`
   - Begründung: Next.js 14 App Router Default re-mountet Layout-Tree bei Route-Change; template.tsx ist der offizielle Opt-In für Persistent-Navigation
3. **NEW** `src/components/providers/ClientOverlays.tsx`
   - `'use client'` wrapper, beinhaltet `next/dynamic({ ssr: false, loading: () => null })` für `InstallPrompt` + `CookieConsent`
   - Begründung: `next/dynamic` mit `ssr: false` geht nicht direkt in Server Component (layout.tsx ist async Server Component)
4. **EDIT** `src/app/layout.tsx`
   - Ersetzt `<InstallPrompt />` + `<CookieConsent />` durch `<ClientOverlays />`
   - Begründung: Beide sind nicht above-the-fold, brauchen keine SSR-Payload, blockieren aktuell Main-Thread bei Hydration

## Acceptance Criteria

1. `next.config.mjs`: `optimizePackageImports` enthält `country-flag-icons` + `@sentry/nextjs`
2. `src/app/template.tsx` existiert, exportiert default function mit `children: React.ReactNode`
3. `src/app/layout.tsx`: `InstallPrompt` + `CookieConsent` sind `next/dynamic`-Imports mit `ssr: false`
4. `npx tsc --noEmit` clean
5. Post-Deploy Chrome DevTools Trace gegen `https://bescout.net/login` zeigt **Mobile Slow 4G LCP < 1800ms** und **Render Delay < 1200ms** (Baseline 2091ms / 1774ms)

## Edge Cases

1. **template.tsx empty-wrapper Risk**: Minimaler Wrapper `<>{children}</>` könnte React-Suspense-Boundary verändern — wir testen Navigation /login → /datenschutz um Smooth-Transition zu bestätigen
2. **experimental.optimizeCss + Critters**: Next.js braucht `critters` package; falls fehlt → Build-Error. Check: `npm list critters`, wenn nicht installiert → entweder `npm install critters` (devDep) oder Option streichen
3. **compress auf Vercel**: Vercel nutzt bereits Brotli auf Edge. `compress: true` enabled nur Node-Server-Compression; auf Vercel No-Op. Trotzdem safe, da default=false
4. **@sentry/nextjs optimizePackageImports Risk**: Sentry hat eigene Webpack-Integration; tree-shaking könnte Source Maps oder Monitoring-Init brechen. Check: Post-Deploy Sentry-Dashboard auf fehlende Breadcrumbs
5. **next/dynamic loading-State Flicker**: `loading: () => null` rendert `null` während Chunk-Download. Bei Install/CookieConsent akzeptabel da beide nach User-Gesture (Install-Event, Scroll-Hint) auftauchen
6. **Hydration Mismatch**: template.tsx darf keine Date/Random enthalten — reiner pass-through
7. **RSC-Payload wachsen**: next/dynamic erzeugt neuen Chunk — aber spart Initial-Parse. Netto ~10-20KB Ersparnis pro Chunk
8. **Service-Worker-Update**: Kein SW-Bump nötig da nur Server-Code + Static geändert
9. **i18n-Keys**: Keine neuen Strings
10. **Mobile-Viewport**: template.tsx beeinflusst Viewport nicht

## Proof-Plan

- `worklog/proofs/104-tsc-clean.txt` — `npx tsc --noEmit` Output (sollte leer sein)
- `worklog/proofs/104-trace-before.md` — bereits gemessen (in dieser Session): LCP 2091ms, Render Delay 1774ms auf Slow 4G Mobile
- `worklog/proofs/104-trace-after.md` — nach Vercel-Deploy: neue Chrome DevTools Trace unter identischen Bedingungen (Slow 4G + 4x CPU + 393x852 Mobile)
- `worklog/proofs/104-next-config-diff.txt` — `git diff next.config.mjs src/app/layout.tsx` + `ls src/app/template.tsx`

## Scope-Out (explizit NICHT in diesem Slice)

- **AuthProvider-Refactor** (Root-Cause für die meisten Waterfalls) → Slice 105, CEO-Scope wegen Money/Security
- **Stadium-Image WebP-Pipeline** (708MB → ~80MB) → Slice 106, eigene Pipeline
- **`<img>` → `<Image>` Migration** (38 Tags) → Slice 107
- **Suspense-Boundary-Expansion** (von 7 auf ~40 Boundaries) → Slice 108
- **Server-Components Conversion** (30 'use client' reduzieren) → Slice 109, größer

## Risiken

- **Hoch**: Keine — 3 additive Infrastructure-Changes ohne Runtime-Logic-Änderung
- **Mittel**: Sentry-optimizePackageImports könnte Source-Maps brechen → Post-Deploy-Check auf Sentry-Dashboard
- **Niedrig**: critters-Package fehlt → Build-Error lokal reproduzierbar via `npx next build`

## Estimated Impact

- **Render Delay**: -30% bis -50% (1774ms → 900-1200ms)
- **Initial JS**: -8% bis -12% (37 Chunks → 32-34, + ~60-120KB weniger parsed)
- **Route-Transition-Latency**: -80% durch template.tsx (Provider-Tree bleibt mounted)
- **Overall LCP Mobile**: 2091ms → ~1400-1700ms
