# Active Slice

```
status: in_progress
slice: 487
title: W6 load-delay — LCP-Stadion-Bild server-seitig preloaden (ReactDOM.preload, /club)
size: S
type: Infra
welle: Mock→Pro W6 Performance/Architektur (D-03, load-delay-Hebel — gemessen 64% LCP)
proof: worklog/proofs/487-lcp-preload.txt
review: worklog/reviews/487-review.md (self-review + chrome-devtools-Re-Trace)
stage: BUILD
```

## Slice 487 — W6 load-delay (Option A, contained, CTO-Entscheid)
**Befund (chrome-devtools-Trace 486):** LCP 2233ms ist **load-delay-dominiert (64%)** — das Stadion-Bild wird erst @1798ms angefragt, weil ClubHero voll client-gerendert ist (nach Hydration+Daten), das `<Image priority>` also NICHT im SSR-HTML steht → kein früher Preload.
**Fix (Option A, low-risk, kein Hero-Umbau):** `page.tsx` (Server, hat die geprefetchten Club-Daten aus 471) liest `stadium_image_url`, baut den next/image-srcset (q60, deviceSizes) + rendert eine kleine `'use client'`-`PreloadStadium`-Komponente → `ReactDOM.preload(href, {as:'image', imageSrcSet, imageSizes:'100vw', fetchPriority:'high'})` emittiert `<link rel=preload>` im SSR-Head → Browser fetcht das Bild während HTML-Parse → beim Hydration-Render schon gecached → spart die Load-duration (~358ms Desktop, mehr Mobile).
**context7-verifiziert:** ReactDOM.preload = client-component-Pattern; imageSrcSet/imageSizes für responsive. URL-Format aus 486-Trace exakt (`/_next/image?url=<enc>&w=W&q=60`).
**AC:** tsc 0 · next build (Vercel) · post-Deploy chrome-devtools-Re-Trace: `<link rel=preload as=image>` im Head, Bild früh angefragt (load-delay/duration ↓), LCP vs 2233ms.
**Scope-Out:** SSR-Decouple des Hero (Option B, der 1432ms-Render-Wait) = gemessener Follow-up falls Render-Delay dann dominiert. Parallax/onError nicht angefasst.
