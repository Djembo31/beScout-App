# Active Slice

```
status: idle
slice: 486
title: W6 Phase 3 — LCP-Bild-Entlastung (AVIF app-weit + ClubHero-Stadion sizes/quality) — DONE (live-verifiziert)
size: S
type: Infra
welle: Mock→Pro W6 Performance/Architektur (D-03 Phase 3, datengetrieben)
proof: worklog/proofs/486-lcp-image.txt
review: worklog/reviews/486-review.md
stage: LOG (done)
```

## Slice 486 DONE (W6 Phase 3, datengetrieben aus d03-Trace)
- **Fix:** `next.config` `formats: ['image/avif','image/webp']` (app-weit) + ClubHero-Stadion `sizes="100vw"` + `quality={60}` (decorative bg). context7-verifiziert.
- **Live-verifiziert (bescout.net, Deploy b5697c63):** Stadion jetzt AVIF + q60 (war WebP q75). **Byte-Win −45-47%** (Desktop-Retina 623→343 kB, Mobile 103→56 kB) — app-weit, da AVIF für ALLE next/image. Visuell scharf, keine q60-Degradation. (S474-SW-Falle gefangen: SW-Clear + Deploy-Poll.)
- Exakte LCP-ms-Re-Trace ehrlich nicht gemessen (buffered API leer); −45% Byte-Cut = direkter LCP-Mechanismus.
- **Measure-first:** Auflösungs-Cap (3840→2048) zurückgehalten — AVIF+q60 liefert bereits −45%; Cap nur falls Bild noch Bottleneck.

## Zuletzt
- **Slice 486** (2026-06-30) — W6 P3 LCP-Bild AVIF (S, self-review + live-Messung, `b5697c63`).
- **Slice 485** (2026-06-30) — D-04 lineups DB-Integrität (L, Reviewer R1, `b28cf1a2`).
- **Slice 484** (2026-06-30) — D-24 Securities-Wording (S, `f38cd97c`).

## chrome-devtools-Re-Trace (post-486, Desktop, ausgeloggt)
- LCP **2233 ms** (Baseline 2951 logged-in — login-konfundiert, KEINE saubere Differenz-Zuschreibung). LCP-Element = Stadion `image/avif w=1920 q60` (Change live, **Download 33 ms**).
- **Lehre:** Bild ist KEIN LCP-Bottleneck mehr; LCP ist **LOAD-DELAY-dominiert (64%, Bild @1798ms angefragt)** = D-03-Architektur. Byte-Win zahlt auf Mobile/langsame Netze. Auflösungs-Cap wäre LCP-wertlos. **Nächster Hebel = Load-delay (Hero früher discoveren/SSR), nicht mehr Bild.**

Nächstes (W6 / CEO): **Load-delay senken** (LCP-Hero früher rendern/preloaden — gemessener Hebel) · TTFB (472 getServerUser) · Player-Detail-Payload (usePlayers() ALLE ~632, separat). ODER W4 Follow / W5 Dead-Feature-GC / W7 Design-Sweep.
