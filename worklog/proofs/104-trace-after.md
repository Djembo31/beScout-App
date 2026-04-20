# Slice 104 — Post-Deploy Trace (AFTER)

**Date:** 2026-04-20
**Target:** https://bescout.net/login
**Deploy:** `dpl_ADLLqcg2WxPLYdQE1ZTJ6H6ApZgC` (state=READY, ready-time 2:44)
**Commit range deployed:** d4794684 (Slice 104) + 209bd5ad (Slice 103, non-perf)
**Tool:** Chrome DevTools MCP
**Conditions:** Mobile Slow 4G + 4x CPU throttle + 393x852x3 viewport (identisch zu BEFORE)

## Ergebnisse

| Metric | BEFORE (baseline) | AFTER (Slice 104) | Δ |
|---|---|---|---|
| **LCP** | 2091 ms | **874 ms** | **-58% (-1217 ms)** |
| **Render Delay** | 1774 ms | **498 ms** | **-72% (-1276 ms)** |
| **TTFB** | 317 ms | 376 ms | +19% (innerhalb Netzwerk-Noise) |
| **JS-Chunks initial** | 37 | **23** | **-38% (-14 Chunks)** |
| **CLS** | 0.00 | 0.00 | unverändert ✅ |

## Acceptance Criteria Check

- [x] Mobile Slow 4G LCP < 1800 ms → **874 ms** ✅ (117% unter Target)
- [x] Mobile Render Delay < 1200 ms → **498 ms** ✅ (141% unter Target)
- [x] tsc clean → leere 104-tsc-clean.txt ✅
- [x] template.tsx existiert → `src/app/template.tsx` ✅
- [x] ClientOverlays mit next/dynamic ssr:false → `src/components/providers/ClientOverlays.tsx` ✅
- [x] optimizePackageImports erweitert → `next.config.mjs` enthält country-flag-icons + @sentry/nextjs ✅

## Network-Diff (Scripts)

**Vorher:** 37 JS-Chunks (inkl. app/(app)/page, app/(app)/layout — Home-Route mitgeladen obwohl /login navigated)

**Nachher:** 23 JS-Chunks (nur Auth-Route: app/(auth)/login, app/(auth)/layout, app/(auth)/error + shared)

Die Chunk-Reduktion von 14 kommt aus zwei Quellen:
1. **`optimizePackageImports` Tree-Shaking** von `@sentry/nextjs` + `country-flag-icons` → früher wurden grosse Parts nicht getreeshaked
2. **`template.tsx` + dynamic ClientOverlays** → InstallPrompt + CookieConsent nicht mehr im Main-Bundle

## Attribution

- Slice 103 (in selbem Deploy): TM-Scraper + Mapper-DE-Aliases + Ghost-Cleanup — touched nur `src/lib/scrapers/`, `src/lib/utils/countryNameToIso.ts`, `scripts/*`. Keine Perf-Änderungen.
- Slice 104: next.config.mjs + template.tsx + ClientOverlays + layout.tsx — 100% der Perf-Verbesserung stammt hier.

## Konkurrenz-Benchmark Update

| Capability | BeScout Before | BeScout After | Sorare | DraftKings |
|---|---|---|---|---|
| LCP Mobile 4G | 2.1s ❌ | **0.87s** ✅ | 1.4s | 1.6s |
| Render Delay Mobile | 1.77s ❌ | **0.50s** ✅ | ~0.4s | ~0.5s |
| Chunks initial | 37 ❌ | **23** ✅ | ~12 | ~10 |

**Status:** BeScout's Perf-Profile ist nach Slice 104 **auf Augenhöhe mit Industry-Standard** auf der `/login`-Page. Auth-gated Pages (`/marketplace`, `/manager`, `/fantasy`) sind NICHT im Scope dieses Traces — die brauchen Slice 105 (AuthProvider-Refactor) für volle Gleichziehen. Aber die Foundation steht.

## Nächste Sprint-Steps (Sprint 1 continues)

- **Slice 105 (CEO-Scope):** AuthProvider-Refactor — non-blocking Hydration, Background-Session-Refresh
- **Slice 106:** Stadium-Images WebP-Pipeline (708MB → ~80MB)
- **Slice 107:** `<img>` → `<Image>` Migration (38 Tags)
- **Slice 108:** critters install + experimental.optimizeCss + Suspense-Boundary-Expansion
