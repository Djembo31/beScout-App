# Active Slice

```
status: in_progress
slice: 486
title: W6 Phase 3 — LCP-Bild-Entlastung (AVIF app-weit + ClubHero-Stadion sizes/quality)
size: S
type: Infra
welle: Mock→Pro W6 Performance/Architektur (D-03 Phase 3, datengetrieben)
proof: worklog/proofs/486-lcp-image.txt
review: worklog/reviews/486-review.md (self-review + post-Deploy-Messung)
stage: BUILD
```

## Slice 486 — W6 Phase 3 (datengetrieben aus d03-Trace)
**Befund (d03-ssr-ist-analyse, gemessen 2026-06-30):** nach 471+476 ist SSR-Prefetch bewiesen (/club LCP 4118→2951ms), aber der **verbleibende LCP-Engpass ist BILD-gebunden**: Stadion-Hero `ClubHero.tsx:97` via next/image **w=3840 (~389kB)** — `fill`+`priority`+`object-cover` aber **kein `sizes`**, decorative Background unter 3 Gradient-/Vignette-Overlays. Config: `next.config.mjs` `images:` hat NUR remotePatterns → Next-14-Default = nur WebP (AVIF inaktiv).
**Fix (clean + zero-Risiko Byte-Cut, context7-verifiziert):**
1. `next.config.mjs`: `images.formats = ['image/avif','image/webp']` — app-weit (AVIF ~30% < WebP, Fallback WebP/original).
2. `ClubHero.tsx` Stadion-Image: `sizes="100vw"` (explizit, korrekter srcset, Mobile 3840→828) + `quality={60}` (decorative bg unter Overlays → unsichtbare Kompression, großer Byte-Cut).
**Messen-vor-übertreiben:** Auflösungs-Cap (sizes desktop 3840→2048) bewusst NICHT jetzt — erst post-Deploy /club LCP messen; wenn Bild noch Bottleneck → Follow-up.
**AC:** next build grün · post-Deploy bescout.net: Stadion-Transfer (AVIF, < 389kB) + /club LCP vs 2951ms-Baseline (DevTools-Trace).
**Scope-Out:** Player/home/market-Prefetch-Replikation (abnehmender LCP-Ertrag laut Trace) · usePlayers()-Payload (separat, nicht LCP) · Auflösungs-Cap (measure-first).
