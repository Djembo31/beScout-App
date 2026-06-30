# Slice 487 Review — W6 load-delay LCP-Preload (self-review)

**Self-review** (Infra/Perf, kein Money, contained 2 Files). context7-verifiziert. **Perf-Proof = post-Deploy chrome-devtools-Re-Trace.**

## Verdikt: PASS (pending post-Deploy-Messung)

## Geprüft
1. **Gemessener Hebel (nicht geraten):** der 486-Trace zeigte load-delay = 64% (Bild @1798ms), Download nur 33ms → der Preload zielt exakt auf die gemessene dominante Phase. ✓
2. **context7-Pattern:** ReactDOM.preload in `'use client'`-Component (emittiert auch im SSR den `<link>`); imageSrcSet/imageSizes für responsive Preload. Nicht direkt im Server-Body (wäre falsch). ✓
3. **srcset-Korrektheit (Schlüssel-Risiko):** die Preload-URL muss ClubHeros `<Image sizes="100vw" quality={60}>`-Anfrage exakt matchen, sonst Doppel-Fetch statt Cache-Hit. URL-Format aus dem 486-Trace verifiziert (`/_next/image?url=<encodeURIComponent>&w=W&q=60`), deviceSizes = next.config-Default, q60 = ClubHero. → Match. **Post-Deploy AC: kein Doppel-Fetch.** ✓ (verifizierbar)
4. **Kein Extra-Read:** stadium_image_url aus dem 471-Prefetch via getQueryData (Cache, 0 DB-Roundtrip); Fallback `/stadiums/<slug>.jpg` bei Cache-Miss (harmlos). ✓
5. **Low-Risk:** kein Hero-/ClubContent-/Parallax-Umbau; reiner additiver Preload-Link. Worst-Case bei srcset-Mismatch = wirkungsloser Preload (kein Break). ✓
6. **Ehrliche Grenze:** A spart die Load-duration (~358ms), NICHT den 1432ms Render-Wait (= Option B, SSR-Decouple, getrackter Follow-up). Inkrementell, measure-first.

## Findings
| Sev | Issue | Status |
|-----|-------|--------|
| INFO | srcset-Match + LCP-Delta = post-Deploy chrome-devtools-Re-Trace (ohne Messung kein „Win bewiesen"). | post-Deploy |
