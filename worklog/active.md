# Active Slice

```
status: idle
slice: 487
title: W6 load-delay — LCP-Stadion-Preload (ReactDOM.preload) — DONE (Fetch gelöst + diagnostiziert)
size: S
type: Infra
welle: Mock→Pro W6 Performance/Architektur (D-03)
proof: worklog/proofs/487-lcp-preload.txt
review: worklog/reviews/487-review.md
stage: LOG (done)
```

## Slice 487 DONE (W6 load-delay, Option A)
- **Fix:** page.tsx (Server) → `'use client' PreloadStadium` → `ReactDOM.preload` → `<link rel=preload as=image>` im SSR-Head (srcset matcht ClubHeros `<Image>` q60/sizes exakt).
- **Live-verifiziert (chrome-devtools):** Bild jetzt Queued @700ms (war @1798ms), fertig @740ms. **Load-delay 1432→93ms, Load-duration 358→40ms** ✅. EIN Request (kein Doppel-Fetch).
- **ABER LCP unverändert (2233→2226ms):** Zeit verschob sich zu **Render-delay 1486ms (67%)** — das Bild liegt fertig herum + paintet erst, wenn ClubHero nach der **ClubContent-Hydration** rendert.
- **EHRLICH:** 487 löst das Fetch-Timing (korrekt + slow-network-Win) UND ist der **Diagnose-Beweis: die Desktop-LCP ist 100% render-/hydration-gebunden, NICHT fetch.** Kein Bild-/Fetch-Hebel mehr übrig.

## ⏭️ Einziger verbleibender LCP-Hebel = Option B (CEO-Scope, größer)
- **Stadion-Hero im SSR-HTML painten** (vor ClubContent-Hydration) ODER **ClubContent-Hydration senken** (Below-Fold-Sektionen code-splitten). Beide berühren Architektur (ClubHero parallax/onError client-entangled; ClubContent-Struktur).

## Zuletzt
- **487** (2026-06-30) — W6 LCP-Preload (S, Fetch gelöst + diagnostiziert, `d08a3dba`).
- **486** (2026-06-30) — W6 LCP-Bild AVIF (S, −45% Bytes, `b5697c63`).
- **485** (2026-06-30) — D-04 lineups DB-Integrität (L, `b28cf1a2`).

Nächstes (CEO): Option B (Hero-SSR / ClubContent-Hydration senken — der 67%-Render-Block) · ODER andere W6-Pages / W4 Follow / W5 Dead-GC / W7 Design · ODER Sentry-Instrumentierungs-Audit.
