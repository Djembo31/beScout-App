# Slice 120 — country-flag-icons Bundle-Split (Eliminate 235 kB Chunk)

**Status:** spec (BUILD in-progress)
**Size:** S (3-4 Files — 1 Component rewrite + 1 test + 265 static assets)
**CEO-Scope:** false (UI Bundle-Optimization, kein Wording/Money/Security-Change)

## Ziel

Die **größte einzelne Bundle-Chunk-Quelle** auf BeScout eliminieren: `country-flag-icons/react/3x2` (235 kB parsed / 53 kB gzipped) liegt aktuell auf **jeder** Client-Page weil `CountryFlag.tsx` einen Namespace-Import macht — webpack kann nicht tree-shaken. Ersatz: statische SVG-Assets in `public/flags/3x2/` + `<img src>` Rendering.

Erwartet: shared-bundle -235 kB parsed (-53 kB gzipped) → **signifikanter LCP-Hebel auf Slow 4G**, weil parsing-Kosten von 235 kB JS auf allen Pages entfallen.

## Root Cause

```tsx
// src/components/ui/CountryFlag.tsx (current)
import * as Flags3x2 from 'country-flag-icons/react/3x2';  // ← namespace import
...
const FlagComponent = Flags3x2[exportKey];  // ← dynamic lookup
```

Webpack kann bei `import * as X + X[dynamic]` keine tree-shake machen — bundled alle 265 Flag-Komponenten. Das zeigt der Bundle-Analyzer: **`f4898fe8.js`** = 235.4 kB parsed, enthält zu 100% `country-flag-icons/modules/react/3x2/index.js`.

`optimizePackageImports: ['country-flag-icons', ...]` in `next.config.mjs` hilft bei diesem Pattern nicht.

## Lösung

**Option E** (pragmatisch, browser-native):
- `node_modules/country-flag-icons/3x2/*.svg` (265 Files, ~591 kB total, Ø 2.2 kB) nach `public/flags/3x2/` kopieren.
- `CountryFlag.tsx` rendert `<img src={\`/flags/3x2/${code}.svg\`}>` statt React-Komponente.
- `hasFlag` aus `'country-flag-icons'` Haupt-Package bleibt — ist nur ein `countries.json` Array-Lookup (1 kB).
- Resultat: **Namespace-Import entfällt**, webpack-bundle um 235 kB leichter. SVGs werden nur lazy vom Browser geholt wenn gerendert + danach ewig aus CDN/Browser-Cache.

## Betroffene Files

**Edit:**
- `src/components/ui/CountryFlag.tsx` — kompletter Rewrite, Namespace-Import raus, `<img>` rein.
- `src/components/ui/__tests__/CountryFlag.test.tsx` — Mock-Setup anpassen (wir mocken nichts mehr ausser `hasFlag` ggf.).

**Neu (static assets):**
- `public/flags/3x2/*.svg` — 265 Files aus `node_modules/country-flag-icons/3x2/` kopiert.

**Unangetastet:**
- `next.config.mjs` — `optimizePackageImports` bleibt (hilft zwar nicht, schadet aber nicht).
- Alle CountryFlag-Consumer (Component-API bleibt identisch: `<CountryFlag code="TR" size={16} />`).

## Acceptance Criteria

1. `public/flags/3x2/*.svg` enthält ≥265 SVG Files (alle ISO 3166-1 + GB-subdivision + EU-flag).
2. `src/components/ui/CountryFlag.tsx` importiert NICHT mehr `country-flag-icons/react/3x2` (nur noch `hasFlag` aus Haupt-Package).
3. Component-API unverändert — Props `{ code, size?, className? }` identisch.
4. Render-Verhalten:
   - Wenn `hasFlag(code)` true → `<img src={/flags/3x2/${code}.svg}>` mit `width`, `height`, `alt=code` für A11y.
   - Wenn `!hasFlag(code)` → Text-Badge-Fallback (wie bisher).
   - GB-Subdivisions (`GB-ENG`, `GB-SCT`, etc.): `hasFlag('GB-ENG')` returnt true, SVG-File heisst `GB-ENG.svg` (hyphen bleibt in Dateinamen).
5. Bundle-Diff via `next build`:
   - Shared chunks-Gesamtgröße vor: ~89 kB. Danach: sinkt messbar (Elimination des 53 kB gzipped Chunks).
   - `/home` First Load JS 293 kB → signifikant kleiner (mind. -30 kB FLJS).
6. `npx tsc --noEmit` clean.
7. `npx vitest run src/components/ui/__tests__/CountryFlag.test.tsx` — alle Tests grün.
8. Visual: CountryFlag rendert auf /player/\<id\> Stadium-Header weiterhin als Flag (keine Regression).

## Edge Cases

1. **404 auf fehlende Flag-Datei**: `hasFlag` prüft vor `<img src>`, damit nur echte Codes SVGs anfragen. Text-Badge-Fallback sonst.
2. **`size={16}` Prop**: `<img>` width/height explizit gesetzt. CSS-Style rundet SVG-Ecken via `rounded-sm`-class.
3. **Externe Consumer**: alle 17+ CountryFlag-Aufrufer nutzen dieselbe Prop-API — keine Änderung nötig.
4. **SSR**: `<img>` ist nativ, funktioniert server-side out of the box. Kein `'use client'` mehr nötig am Component (aber bleibt drin, weil Konsumenten client-komponenten sind).
5. **CSP `img-src`**: Relativer Pfad `/flags/...` — same-origin, kein CSP-Change.
6. **Cache-Busting**: public/ Assets werden mit default Cache-Headers served. Updates auf Flag-SVGs würden Hard-Refresh erfordern — aber SVGs sind statisch, kein Thema.
7. **High-DPI**: SVG skaliert nativ, keine @2x/@3x nötig.

## Proof-Plan

- `worklog/proofs/120-bundle-before.txt` — next-build Output VOR (aktueller Baseline, /home 293 kB)
- `worklog/proofs/120-bundle-after.txt` — next-build Output NACH
- `worklog/proofs/120-diff.md` — kB-Delta pro Page + Shared-Chunks
- `worklog/proofs/120-tsc-clean.txt` — tsc Output
- `worklog/proofs/120-vitest.txt` — Test-Run
- `worklog/proofs/120-chrome-trace.md` — LCP-Vergleich auf bescout.net / (post-deploy)

## Scope-Out

- Page-by-Page dynamic() für /home below-fold Widgets → bleibt optional Folge-Slice, falls nach 120 Gewinn gemessen ist.
- Andere Bundle-Hebel (Supabase SSR chunk 177 kB, Next.js framework): nicht angehbar ohne Framework-Wechsel.
- SVG-Optimierung (SVGO): SVGs sind schon klein (~2 kB Ø), minimal ROI.

## Risiken

1. **Broken Tests**: Der `vi.mock('country-flag-icons/react/3x2')` im existing Test wird irrelevant. Test muss rewrite für `<img>` assertion.
2. **Flag nicht angezeigt trotz Code**: Falls `hasFlag` einen Code akzeptiert aber SVG-Datei fehlt (z.B. `GB-ENG.svg`-Datei fehlt in der Kopie). Manual Smoke-Test: Osimhen (NG) + Walker-Peters (GB-ENG) + Sakaryaspor-Player (TR). Lösung bei Problem: einzelne fehlende Dateien manuell ergänzen oder Fallback-Badge akzeptieren.
3. **Image-Size-Layout-Shift**: `<img>` ohne explicit width/height kann CLS verursachen. Spec AC #4 fordert explicit `width`/`height`.
