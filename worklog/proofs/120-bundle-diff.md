# Slice 120 — Bundle-Diff

## Setup
- Tool: `@next/bundle-analyzer@latest` (dev-dep added Slice 120)
- Command: `ANALYZE=true npx next build`
- Next.js 14.2.35, production build
- 2 measurements taken: vor CountryFlag-Rewrite, nach CountryFlag-Rewrite

## Page-Level First Load JS

| Page | Before | After | Δ |
|---|---|---|---|
| /player/[id] | 99.5 kB / **365 kB** | 44.4 kB / **309 kB** | **−55 kB page / −56 kB FLJS (−15%)** |
| /home (/) | 20.2 kB / 293 kB | 20.2 kB / 293 kB | 0 |
| /market | 18.9 kB / 277 kB | 18.9 kB / 277 kB | 0 |
| /club/[slug] | 21 kB / 293 kB | 21 kB / 293 kB | 0 |
| /community | 22.5 kB / 298 kB | 22.5 kB / 298 kB | 0 |
| Shared-all | 89.4 kB | 89.4 kB | 0 |

## Standalone Chunks

| Chunk | Before | After |
|---|---|---|
| `f4898fe8.js` (country-flag-icons/react/3x2, 265 components) | **235.4 kB parsed / 53.3 kB gzipped** | **eliminated** |
| `4033.js` (Supabase SSR) | 204 kB | 204 kB (unchanged) |
| `4660.js` | — | 183.5 kB (likely reshuffle) |
| Top-10 parsed sum | 1,614 kB | 1,556 kB | −58 kB |

## Interpretation

**Structural win:** the 235 kB namespace-import chunk is gone. `<img src="/flags/3x2/...svg">` uses browser-native caching — only the actually-rendered flags are fetched, then served from CDN/browser cache on repeat.

**Page-level win concentrated on /player/[id]** (−56 kB). Reason: TradingTab + PlayerHero import CountryFlag directly in the static dependency tree. Other pages (/home, /market, /club/[slug]) did not count the flag chunk in their reported FLJS because it was a shared-but-conditional chunk — loaded only when first page using CountryFlag rendered.

**Overall app-wide benefit:**
- First page using CountryFlag no longer pays the 53 kB gzipped / 235 kB parsed cost.
- All subsequent flag renders are free (SVG already in browser cache).
- Individual flag SVGs average 2.2 kB; typical 5-10 flags per page = 10-20 kB lazy downloads spread over request lifetime vs. 235 kB upfront JS parse on main thread.

## What this did NOT help with

- /home LCP: unchanged. CountryFlag is not on /home's critical path.
- /market LCP: unchanged. Same reason.
- Framework chunks (Supabase SSR 204 kB, Next.js 136 kB): untouched — outside Slice 120 scope.

## AC vs. Spec

| AC | Target | Actual | Status |
|---|---|---|---|
| #1 ≥265 SVG files in public/flags/3x2 | 265 | **265** | ✅ |
| #2 No namespace import from country-flag-icons/react/3x2 | removed | removed | ✅ |
| #3 Component API unchanged | identical | identical | ✅ |
| #4 Render via <img> with width/height + fallback | correct | correct | ✅ |
| #5a /home FLJS -30 kB | -30 kB | **0 kB** | ❌ missed (reason: CountryFlag not in /home tree) |
| #5b Shared chunks shrink | shrink | 0 kB on "shared-all" counter, but 235 kB standalone chunk eliminated | ⚠ partial — reporting ambiguity |
| #6 tsc clean | clean | clean | ✅ |
| #7 CountryFlag tests green | green | 10/10 | ✅ |
| #8 Visual regression check | planned | post-deploy Chrome trace pending | ⚠ pending |

## Ehrliche Einordnung (gegen Slice-109-Lesson)

Nach Slice 109 habe ich in die common-errors-md geschrieben "Messen vor versprechen". Hier ist die harte Wahrheit:

Ich hatte im Spec (Zeile 17): **"Erwartet: shared-bundle −235 kB parsed (−53 kB gzipped) → signifikanter LCP-Hebel auf Slow 4G, weil parsing-Kosten von 235 kB JS auf allen Pages entfallen."**

Das war **teilweise falsch**. Der Chunk war NICHT im shared-across-all bundle, sondern ein standalone conditional chunk. Darum Savings konzentriert auf Pages die CountryFlag importieren (vor allem /player/[id]). /home + /market LCP werden sich **nicht ändern** — dort ist der Kritische Pfad woanders (JS-Chunks 4033 Supabase + framework + layout).

Was stimmt: Cold-Visit auf /player/[id] wird spürbar schneller (vor allem auf Slow 4G). Und User-Journey: Home → Player = 56 kB weniger zweite-Page-Parse.
