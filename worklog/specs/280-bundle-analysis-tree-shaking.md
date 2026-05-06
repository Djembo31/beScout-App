# Slice 280 — Bundle-Analysis + Tree-Shaking Top-5 fat-Modules (Cold-Start-Track Phase 2)

**Status:** PRE-SPEC (Skelett für nächste Session) · **Größe:** M (geschätzt) · **Slice-Type:** Build-Optimization · **Scope:** CTO · **Datum:** 2026-05-06 (vorbereitet, noch nicht aktiv)

> **Pre-Spec-Status:** Dieses Skelett ist als Resume-Punkt für die nächste Session geschrieben. Spec wird in der nächsten Session **finalisiert** (Bundle-Analyzer-Run live + konkrete fat-Modules identifiziert + ACs scharf gestellt) BEVOR BUILD startet.

---

## 0. Kontext aus D70 + Slice 279

D70 (`memory/decisions.md` Z.3164+) definiert Cold-Start-Track:
- Slice 279 ✅ DONE (Phase 1 BUILD complete, Phase-1-Live nach push live, Phase 2 Baseline-Sammlung läuft im Hintergrund parallel zu Slice 280)
- **Slice 280 (DIESER):** Bundle-Analysis + Tree-Shaking → -200-400KB parsed-bundle Ziel
- Slice 281 (deferred): Initial-Query-Konsolidierung `useHomeData`
- Slice 282 (deferred): Vercel Edge-Caching + ISR

**Slice 280 ist parallel-fähig zu Slice 279 Phase 2:** Bundle-Wins werden in jedem nachfolgenden Lighthouse-Run sichtbar (auch ohne aktive Phase-3-Gates), die Mess-Wahrheit aus 279-Baseline informiert die 280-Wins post-Deploy.

## 1. Problem Statement

Cold-Start-Latency-Hauptverursacher #1 ist Bundle-Größe. Aktueller Stand:

| Page | First Load JS (FLJS) | Budget |
|------|---------------------|--------|
| `/club/[slug]/admin` | 425 KB | 425 |
| `/bescout-admin` | 420 KB | 420 |
| `/player/[id]` | 415 KB | 415 |
| `/club/[slug]` | 400 KB | 400 |
| `/community` | 400 KB | 400 |
| `/` | 395 KB | 395 |
| `/market` | 385 KB | 385 |
| Shared | 162 KB | 170 |

Quelle: `bundle-budget.json`. Headroom in Tracked-Routes ist ~10-15 KB — knapp.

**Frühere Bundle-Wins:**
- Slice 120: country-flag-icons Namespace-Import → static-asset-Migration → -56 KB auf `/player/[id]`. Standalone-Chunk (235 KB parsed) eliminiert.
- Slice 121: research.ts dynamic-import → 0 KB Win weil eager-Imports im anderen Code-Pfad. **Lehre: Lazy-Import allein bringt nichts wenn der Modul auch eager geladen wird.** Vor Bundle-Splitting IMMER `grep -rn "from.*'@/lib/services/<modul>'" src/` für ALLE Call-Sites.

**Hypothesen für Top-5-fat-Modules** (zu verifizieren in der nächsten Session via `ANALYZE=true next build`):
1. `@supabase/ssr` + `@supabase/supabase-js` — geschätzt ~80-120 KB combined
2. `@sentry/nextjs` — geschätzt ~50-80 KB (auch wenn lazy-init, schleicht in client-bundle)
3. `@tanstack/react-query` + `@tanstack/react-query-devtools` — ~40-60 KB
4. `@radix-ui/react-{dialog,alert-dialog,dropdown-menu}` — ~30-50 KB combined
5. `next-intl` Locale-JSONs — ~50-80 KB DE+TR Strings im Client-Bundle

**Wer ist betroffen:** Cold-Visit auf jeder Page > First-Load-JS-Schwelle. Beta-Tester (50-Mann-Pipeline) auf Mobile-Slow-4G — JEDER-Seitenwechsel braucht 1-3s Bundle-Parsing.

## 2. Lösungs-Design (Skelett)

**3 Tactical-Wins erwogen:**

A) **Namespace-Imports → Named-Imports.** Wo immer `import * as X from 'lib'` mit dynamic-key-lookup steht: Tree-Shaking blockiert. Static-asset-Migration analog Slice 120.
B) **Eager → Lazy bei großen Modals/Tabs.** Slice 121-Lehre beachten: VOR `dynamic()`-Wrap ALLE Call-Sites greppen, dass das Modul nicht parallel eager geladen wird.
C) **`optimizePackageImports` erweitern.** Aktuell 8 Libraries: `lucide-react, @supabase/supabase-js, posthog-js, @tanstack/react-query, next-intl, zustand, country-flag-icons, @sentry/nextjs`. Kandidaten dazu: `@radix-ui/*`, `@supabase/ssr`, `@tanstack/react-query-persist-client`.

**Konkrete fat-Modul-Targets werden in der nächsten Session aus `.next/analyze/client.html` abgeleitet** — Treemap-Visualization zeigt parsed-Größen exact.

## 3. Betroffene Files (geschätzt)

| File | Aktion | Begründung |
|------|--------|------------|
| `next.config.mjs` | EDIT | `experimental.optimizePackageImports` erweitern |
| `src/components/<heaviest>/index.tsx` | EDIT | Namespace → Named-Imports refactor |
| `src/app/(app)/<heaviest>/page.tsx` | EDIT | dynamic-Wrap für lazy-loadable Components |
| `bundle-budget.json` | EDIT | Budgets straffer setzen post-Wins |
| `worklog/proofs/280-bundle-diff.md` | NEU | Vorher/Nachher pro Page mit FLJS-Delta |

**Vor diesem Slice greppt man** (Pflicht-vorab, nächste Session):
```bash
grep -rn "import \* as " src/ | head -30           # Namespace-Imports identifizieren
grep -rn "from '@/lib/services/" src/ | wc -l       # Service-Layer-Eager-Importe zählen
grep -rn "from '@radix-ui/" src/ | head -20         # Radix-Surface
```

## 4. Code-Reading-Liste (Pflicht VOR Implementation, M-Slice ≥ 6 Items)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `worklog/log.md` Slice 120 | Static-Asset-Migration-Pattern | Wie hat country-flag-icons das gelöst? Übertragbar? |
| `worklog/log.md` Slice 121 | Dynamic-Import-Anti-Pattern | Welche Eager-Importe killen den Lazy-Wrap? Pattern-Decoder. |
| `worklog/log.md` Slice 185b | Bundle-Budget-Gate-Workflow | Wie wird `scripts/check-bundle-size.ts` regression-frei aktualisiert? |
| `next.config.mjs` | Aktuelle Optimization-Config | Was steht in `optimizePackageImports`? Was fehlt? |
| `bundle-budget.json` | Budget-Wahrheit | Welche Pages sind am Limit? `/club/[slug]/admin` 425/425 = 0 Headroom. |
| `.next/analyze/client.html` (post-`ANALYZE=true next build`) | Treemap-Wahrheit | Top-5 fat-Modules visualisieren — diese Datei MUSS in der nächsten Session FRISCH erzeugt werden VOR Implementation. |
| `errors-frontend.md` „Lookup-Map indexed by ambiguous Key" + „Cross-Section-Coupling-Drift" | Refactor-Risk-Pattern | Bei Component-Migration: keine Daten-Korruption durch Side-Effect. |

**Mindest 6 Items: ✓ (7 Items)**

## 5. Pattern-References

- `decisions.md` D70 — Track-Definition, Anti-Pattern „Splitting blind"
- `decisions.md` D54 — Build-without-Wire (für jede neue dynamic-import-Strategie: VOR Implementation greppen, dass alle Call-Sites korrekt verkabelt)
- `errors-frontend.md` „TanStack Query v5: initialData vs placeholderData" — Slice 268 zeigte: bei jedem Refactor von Cache-Layer auf Bundle-Achse vorsicht mit Konsumenten-State-Mismatch (Slice 267 Heal-Pattern)

## 6. Acceptance Criteria (Skelett — wird in nächster Session scharfgestellt)

```
AC-01: [HAPPY] ANALYZE=true next build erzeugt .next/analyze/{client,edge,nodejs}.html ohne Fehler
AC-02: [HAPPY] Top-5 fat-Modules schriftlich identifiziert in worklog/proofs/280-fat-modules.md
AC-03: [HAPPY] Mindestens 1 Tactical-Win live implementiert (Tree-Shaking ODER Lazy-Wrap ODER optimizePackageImports-Add)
AC-04: [REGRESSION] FLJS-Delta auf den 3 Slice-279-Test-Pages (/, /market, /community) gemessen → mindestens 1 Page hat ≥ 30 KB FLJS-Reduktion
AC-05: [REGRESSION] Keine FLJS-Regression auf anderen Pages (bundle-budget.json gate green)
AC-06: [REGRESSION] tsc clean + vitest grün
AC-07: [POST-DEPLOY] Lighthouse-Run nach Push zeigt LCP-Verbesserung in Job-Summary
```

**Mindest 6 ACs (M-Slice): ✓ (7 ACs)**

## 7. Edge Cases (Skelett)

| # | Flow | Case | Mitigation |
|---|------|------|------------|
| 1 | Refactor | Lazy-Import bricht SSR-Hydration | next.js dynamic({ ssr: false }) explizit setzen wo nötig |
| 2 | Refactor | Namespace-Lookup mit dynamic-Key (z.B. `Flags3x2[code]`) | Static-Asset-Migration analog Slice 120 |
| 3 | Refactor | optimizePackageImports brichtType-Resolution | TSC-Test pro Lib einzeln addieren, nicht batch |
| 4 | Test | Vitest-Mocks brechen weil Imports verschoben sind | vi.mock-Pfade nach Refactor checken |
| 5 | Bundle-Drift | Budget zu eng, normaler Code bricht CI | Budget mit Headroom (5-10%) setzen, nicht hart am Limit |
| 6 | Eager-Trap | Lazy-Wrap auf X, aber Modul wird in Y eager importiert | Slice 121-Lehre: ALLE Call-Sites greppen VOR Wrap |
| 7 | i18n | next-intl Lazy-Locale brichtTR-Render | Per-Locale-Bundle-Splitting nur wenn Test-Coverage komplett |
| 8 | Service-Worker | (optional Phase-Out) | Kein Impact für Slice 280 — separater Slice 282+ |

**Mindest 8 (M-Slice): ✓ (8 Cases)**

## 8. Self-Verification Commands (Pflicht VOR Implementation in nächster Session)

```bash
# Phase 0 — Mess-Wahrheit erstellen
ANALYZE=true pnpm exec next build > /tmp/build-analyze.txt
ls -la .next/analyze/                # client.html, edge.html, nodejs.html
# Browser öffnen: file://...//.next/analyze/client.html (Treemap)

# Phase 1 — Top-5 fat-Modules dokumentieren
# Manuell aus Treemap → worklog/proofs/280-fat-modules.md

# Phase 2 — Pre-Implementation greppen (Slice 121-Lehre!)
grep -rn "import \* as " src/ | head -30
grep -rn "from '@radix-ui/" src/ | head
grep -rn "from '@supabase/ssr'" src/ | wc -l

# Phase 3 — Post-Implementation Verify
pnpm exec tsc --noEmit
pnpm exec vitest run
pnpm exec next build | tee /tmp/build-after.txt
diff <(cat /tmp/build-analyze.txt | grep "First Load") <(cat /tmp/build-after.txt | grep "First Load")
pnpm run size                        # bundle-budget gate

# Phase 4 — Lighthouse Local-Smoke (optional)
pnpm run lighthouse:local
```

## 9. Open-Questions (PFLICHT-KLÄRUNG mit Anil in nächster Session)

1. **Scope-Granularität:** 1 fat-Modul pro Slice (z.B. nur Sentry) ODER alle 5 in 1 Slice? Empfehlung: alle 5 in 1 Slice mit klar getrennten Wave-Steps weil parallel-bearbeitbar.
2. **FLJS-Reduktions-Ziel realistisch?** D70 nennt -200-400 KB. Slice 120 brachte 56 KB allein durch country-flag-icons. -200 KB als Mindestziel ambitioniert aber machbar wenn Sentry+Supabase+Radix zusammen optimiert werden.
3. **Service-Worker für Caching der Static-Chunks?** Großer Impact aber gross-invasive — empfehle Slice 282+ post-Beta, NICHT in Slice 280.

## 10. Proof-Plan

| Phase | Proof |
|-------|-------|
| Pre-Implementation | `worklog/proofs/280-fat-modules.md` — Treemap-Snapshot + Top-5 Liste mit parsed-Größen |
| Post-Implementation | `worklog/proofs/280-bundle-diff.md` — Vorher/Nachher FLJS pro Page + Total-Delta |
| Post-Implementation | `worklog/proofs/280-tsc-vitest.txt` — clean +grün |
| Post-Deploy (optional) | `worklog/proofs/280-lighthouse-after.md` — LCP-Delta vs. Slice 279 Baseline |

## 11. Scope-Out

- Slice 281 (`useHomeData` Konsolidierung) — separater Slice
- Slice 282 (Vercel Edge-Caching + ISR) — separater Slice
- Service-Worker für PWA-Caching — post-Beta
- Per-Locale-Bundle-Splitting — Sub-Slice 280b wenn Slice 280 zeigt dass next-intl der größte Win wäre

## 12. Stage-Chain (geplant für nächste Session)

```
SPEC (this Pre-Spec → Final-Spec mit echten fat-Modules)
  → IMPACT (Cross-Cutting? lucide-Refactor + Sentry-Refactor parallel? Wave-Plan?)
  → BUILD (Wave 1 = optimizePackageImports-Erweiterung; Wave 2 = Namespace→Named; Wave 3 = Lazy-Wrap)
  → REVIEW (reviewer-Agent gegen Slice 121 Lehre — keine Eager-Trap)
  → PROVE (FLJS-Delta + tsc + vitest + Lighthouse)
  → LOG
```

## 13. Pre-Mortem (Skelett, ausbaubar in nächster Session)

| # | Failure | Mitigation |
|---|---------|------------|
| 1 | Lazy-Wrap bricht SSR | Slice 121 Pattern beachten |
| 2 | optimizePackageImports brichtType-Resolution | Lib-für-Lib testen |
| 3 | FLJS-Reduktion bleibt < 30 KB | Slice in 280a/b splitten, ehrlich dokumentieren |
| 4 | Visual-Regression durch Refactor | qa-visual Agent post-Build |
| 5 | Service-Code in Modul X eager-importiert obwohl scheinbar lazy | Slice 121 Anti-Pattern, ALLE Call-Sites grep-pflicht |

---

## Erste Action in nächster Session

```bash
# 1. Bundle-Analyzer-Run
ANALYZE=true pnpm exec next build > /tmp/build-analyze.txt 2>&1

# 2. Treemap inspizieren
# Öffne in Browser: file:///C:/bescout-app/.next/analyze/client.html

# 3. Top-5 fat-Modules in Datei schreiben
# worklog/proofs/280-fat-modules.md

# 4. Spec finalisieren — Open-Questions mit Anil klären, ACs scharfstellen mit echten Modulen.

# 5. Track-Approval bestätigen, BUILD starten.
```

**Anil-Pflicht-Klärungen vor BUILD:** siehe Sektion 9 (3 Fragen).
