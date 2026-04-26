# Review Slice 208 — FM 6.2 Trend-Sparkline-Mini-Chart

**Verdict:** CONCERNS (1 MEDIUM A11y-Issue, ansonsten solider PASS)
**Time-spent:** 18 min

## Findings

| Severity | Location | Issue | Fix |
|---|---|---|---|
| MEDIUM | `TransactionsPageContent.tsx:217,223,228` | A11y-Widerspruch: SVG hat `role="img"` UND `aria-hidden="true"` gleichzeitig. `aria-hidden` deaktiviert das `role`. Card-Wrapper hat `aria-label={t('trendNet')}` aber kein `role`, also überspringt Screenreader das gesamte Chart komplett. PriceChart-Pattern (`PriceChart.tsx:218-219`) ist SVG mit `role="img"` + `aria-label={...}`, **OHNE** `aria-hidden`. | SVG: `aria-hidden="true"` entfernen, `aria-label={t('trendLabel', { days: data.length })}` direkt aufs SVG. Card-Wrapper `aria-label` weglassen (kein doppelter Label-Stack). Pattern aus `PriceChart.tsx:218-219` exakt spiegeln. |
| LOW | `TransactionsPageContent.tsx:198-200` | Spec AC 4 fordert explizit "Catmull-Rom-Spline" (PriceChart-Pattern), Code nutzt simple lineare Polyline (`M…L…`). Bei 60px Mini-Chart visuell akzeptabel, aber Spec-Drift ist undokumentiert. | Entweder: (a) Spec-Decision in `active.md` notieren ("linear gewählt da 60px H, Spline-Smoothing nicht sichtbar"), oder (b) `catmullRomPath`-Helper aus `PriceChart.tsx:27-46` extrahieren in `src/lib/utils/svgPath.ts` und in beiden nutzen (DRY). Empfehlung: Option (a) — pragmatisch. |
| LOW | `TransactionsPageContent.tsx:174-178` | `txDays`-Distinct-Check läuft im Component (Zeile 174-178), nicht in `buildDailyBuckets`. Test-Coverage für "txDays.size < 2 mit non-`all`-range" fehlt — der Test "returns empty array if dayCount < 2" prüft nur den `'all'`-Pfad. Bei `range='7d'` mit 2 Txs am gleichen Tag kommt `buildDailyBuckets` zurück mit 7 buckets, nur Component-Guard fängt das. | Funktional OK (Component returnt null). Aber zur Robustheit: Distinct-Check IN `buildDailyBuckets` ziehen ODER expliziten Test "range='7d' mit 2 same-day txs returns []" hinzufügen. |
| NIT | `__tests__/sparkline-buckets.test.ts:13-25` | Test-Fixture umgeht `balance_after` (required Field in `DbTransaction`-Type) via `as DbTransaction`-Cast. Wenn DB-Schema neue Required-Fields kriegt, bricht Cast silent. | Akzeptabel für Test-Daten, aber besser: Helper `function makeTxFixture(...): DbTransaction` mit allen required Fields, vermeidet Cast-Lüge. |
| NIT | Spec inconsistency | Spec File-Liste (Zeile 14) sagt "4 neue Keys (`transactions.trendLabel`, `trendEmpty`, `trendDays`, `trendNet`)", aber AC 8 sagt "Empty-Hint nicht nötig" und Code nutzt nur 2 Keys (`trendLabel` + `trendNet`). Code stimmt mit ACs überein, aber Spec-File-Liste ist drift. | Spec-File-Liste auf `2 neue Keys` korrigieren beim LOG-Step. |
| NIT | `TransactionsPageContent.tsx:185-187` | `Math.min(...values)` und `Math.max(...values)` mit Spread auf Array bricht bei sehr langen Arrays (>~10k items) den Stack. Mit AC-Cap von 90 Buckets ist das harmlos, aber Prinzip aus `errors-frontend.md` "Array.from / iter statt spread bei strict TS" gilt analog. | Reduce statt Spread: `values.reduce((a,b) => Math.min(a,b), Infinity)`. Mit 90-Cap aber nicht kritisch. |

## Positive

1. **`buildDailyBuckets` exportiert für Unit-Tests** — sauberes Pattern, isoliert die kritische Aggregations-Logik vom Component-Lifecycle. 9 Edge-Case-Tests decken alle ACs ab (zero, single-day, all-zero, mixed-sign, range='all'-cap, range mit gap, negative-only, all-positive, mixed-sign-same-day).
2. **`vi.useFakeTimers()` für deterministisches Day-Boundary-Testing** — pattern aus `testing.md` korrekt angewandt, FIXED_NOW = `2026-04-26T14:00:00Z` macht Tests reproduzierbar.
3. **`React.memo` + `useMemo` für Aggregation** — Spec AC 10 erfüllt, vermeidet unnötige Re-Renders bei Range-Wechsel auf Parent.
4. **CSS-Variablen für Color-Coding** (`var(--vivid-green)` / `var(--vivid-red)`) — konsistent mit `PriceChart.tsx` und `globals.css:10-11`. Kein hardcoded-Color-Drift.
5. **`vectorEffect="non-scaling-stroke"`** — korrekt gewählt bei `preserveAspectRatio="none"`, verhindert dass strokes bei width-stretch verzerren. Senior-Move.
6. **Zero-Baseline-Line dashed** (Zeile 230-241) — hilft visual-decoding bei mixed-sign data, schöne Geste.
7. **TR-Wording neutral & business.md-konform** — "Trend (NN gün)" + "Günlük net" — kein "kazanç/yatırım/kar" Drift.
8. **Pattern-Wiederholung mit PriceChart-DNA** — gleiche SVG-Struktur, reduziert kognitive Last beim Lesen.

## Spec-AC-Coverage

- **AC 1 (hidden bei <2 distinct days):** ✅
- **AC 2 (per-Tag net aus filteredCredits):** ✅
- **AC 3 (Range-Reaktivität):** ✅
- **AC 4 (Catmull-Rom-Spline, area-fill, color-coded):** ⚠️ teils — area-fill + color-coded JA, Catmull-Rom NEIN (linear). Siehe LOW #2.
- **AC 5 (kompakt 60px, full-width unter Aggregations):** ✅
- **AC 6 (Color-Coding green/red je Net-Sign):** ✅
- **AC 7 (Mobile 360px, kein Overflow, preserveAspectRatio):** ✅
- **AC 8 (i18n DE+TR):** ✅
- **AC 9 (range='all' max 90 buckets):** ✅
- **AC 10 (memoized + useMemo):** ✅
- Edge 1-10 alle erfüllt (Tests vorhanden für 1, 4, 5, 6, 9, 10).

## TR-Wording-Check

Geprüft gegen `business.md` "Erweitertes Verbots-Register":

- ✅ Kein "kazan*" (Glücksspiel-Vokabel — Slice 196 D32)
- ✅ Kein "yatırım*" / "yatırımcı" (Investment-Framing)
- ✅ Kein "kar/profit/yield/portföy"
- ✅ "Trend" = neutrales loanword, im TR-Tech-Speak akzeptiert
- ✅ "Günlük net" = pure mathematische Beschreibung
- ✅ DE-Pendant "Netto pro Tag" gleichermaßen neutral

**TR-Wording PASS — keine Compliance-Concerns.**

---

## Heal-Plan (vor Commit)

1. **MEDIUM A11y-Fix** (Pflicht): SVG `aria-hidden="true"` entfernen, `aria-label={t('trendLabel', ...)}` direkt aufs SVG. Card-Wrapper `aria-label` entfernen.
2. **LOW Catmull-Rom-Drift** (Spec-Decision): Spec-Update inline — linear gewählt da 60px H und 90-Bucket-Density Spline-Smoothing visuell nicht differenzierbar macht.
3. **NIT Spec File-Liste**: korrigieren auf "2 neue Keys".
4. NIT Math.min/max Spread + DbTransaction-Cast + txDays-in-Bucket: als Backlog dokumentieren (kein Functionality-Risk bei 90-Cap).

**Nach A11y-Fix → PASS.**
