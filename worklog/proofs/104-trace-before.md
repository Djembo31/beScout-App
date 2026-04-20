# Slice 104 — Baseline Trace (BEFORE)

**Date:** 2026-04-20
**Target:** https://bescout.net/login (pre-deploy state, Vercel build = pre-104)
**Tool:** Chrome DevTools MCP (via Claude Code)

## Desktop (No Throttle, Cable)

- **LCP:** 809 ms
- **TTFB:** 602 ms
- **Render Delay:** 207 ms
- **CLS:** 0.00
- **JS-Chunks loaded:** 37 (initial page load)
- **Max critical path latency:** 977 ms

Longest critical chain:
- `/login` (977 ms)
  - `/manifest.webmanifest` (753 ms)
  - `/_next/static/css/53daf66a897e3b77.css` (686 ms)
  - `/_next/static/css/3ee011751e511ba3.css` (663 ms)

No origins preconnected.

## Mobile Slow 4G + 4x CPU Throttle + 393x852 viewport (iPhone 16)

- **LCP:** 2091 ms
- **TTFB:** 317 ms (Vercel Edge cache)
- **Render Delay:** **1774 ms** (85% of LCP — main issue)
- **CLS:** 0.00

## Network Summary (First Load)

- 3 Fonts (woff2): `7b0b24f36b1a6d0b`, `806de4d605d3ad01`, `fc727f226c737876`
- 2 CSS: `3ee011751e511ba3.css`, `53daf66a897e3b77.css`
- 37 JS Chunks (webpack + main-app + 35 numeric chunks)
- 4 Icons/SVG (bescout_icon_premium, wordmark, icon-192x192, inline noise-svg)
- 1 Image: `/_next/image?url=%2Fstadiums%2Fdefault.jpg&w=3840&q=40`
- 1 Manifest: `/manifest.webmanifest`

## Root Causes Identified (pre-fix)

1. `@sentry/nextjs` + `country-flag-icons` NICHT in `optimizePackageImports` (~180KB+ nicht tree-shaken)
2. Kein `src/app/template.tsx` → Provider-Tree re-mountet bei jeder Route-Transition
3. `InstallPrompt` + `CookieConsent` eager in Root-Layout (blockieren Hydration-Thread)

## Fix Target (post-deploy)

- Mobile Slow 4G LCP: < 1800 ms (von 2091 ms)
- Mobile Render Delay: < 1200 ms (von 1774 ms)
- JS-Chunks initial: evtl. weniger durch besseres Tree-Shaking
