# Slice 208 — FM 6.2 Trend-Sparkline-Mini-Chart auf /transactions

**Status:** SPEC · **Größe:** S · **Scope:** CTO · **Datum:** 2026-04-26

## Ziel

Auf `/transactions` zeigt der Aggregations-Bereich neben den 3 Summary-Cards (Earned/Spent/Net) eine kompakte Sparkline-Mini-Chart, die den **Net-Trend** über die aktive Range (7d/30d/90d/all) visualisiert. FPL "Money-Flow"-Pattern: Power-User sehen auf einen Blick, ob der Trend positiv oder negativ ist, ohne durch die Tx-Liste zu scrollen.

## Betroffene Files

| File | Aenderung |
|------|-----------|
| `src/components/transactions/TransactionsPageContent.tsx` | Neue `TrendSparkline`-Sub-Component + per-Tag-Aggregation aus `filteredCredits` + Embed nach Aggregations-Grid |
| `messages/de.json` | 2 neue Keys (`transactions.trendLabel`, `transactions.trendNet`) |
| `messages/tr.json` | 2 neue Keys (TR-symmetrisch) |

**Keine Schema-Change, keine RPC, kein Service, kein neuer Hook.** Pure-frontend additive auf existing data.

## Acceptance Criteria

1. Sparkline rendert nur wenn `filteredCredits.length >= 2` UND mindestens 2 distinct Tage vorhanden sind. Sonst: nichts gerendert (kein Empty-State-Card unter Aggregations — das wäre laut Layout zuviel Clutter; Empty-State zeigt sich bereits via existing `rows.length === 0`-Pfad).
2. Aggregation: pro-Tag `net = sum(amount)` aus `filteredCredits` (positive earned + negative spent zusammen). X-Achse = Tage über aktive Range. Y-Achse = Net pro Tag.
3. Range-Reaktivität: Sparkline aktualisiert wenn User zwischen 7d/30d/90d/all wechselt — gleiche Bucket-Logik wie existing `cutoffDate(range)`.
4. Visual-Style: SVG, keine external Lib, Pattern aus `PriceChart.tsx` (area-fill, color-coded green/red je Net-Sign zwischen Anfang/Ende, kein Crosshair, kein Tooltip — bewusst einfacher als full Chart). **Decision (post-Review Slice 208):** Lineare Polyline statt Catmull-Rom-Spline gewählt — bei 60px Höhe und bis zu 90 Buckets ist Spline-Smoothing visuell nicht differenzierbar von Linear-Path. Pragmatic-pick reduziert Code-Duplikation mit `PriceChart.tsx:27-46`. Sollte Catmull-Rom in Zukunft mehrfach verwendet werden, wird der Helper extrahiert.
5. Höhe: kompakt (~60px). Breite: full-width unter den Aggregations-Cards. Card-Wrapper mit `text-[10px]`-Label "Trend (NN Tage)".
6. Color-Coding: net positiv (Endwert ≥ Startwert) = `var(--vivid-green)`, sonst `var(--vivid-red)`. Identisch zum PriceChart-Pattern.
7. Mobile-Korrektheit: 360px Viewport, kein Overflow, SVG `preserveAspectRatio="none"` für full-width-stretch.
8. i18n DE+TR: Label "Trend ({days} Tage)" / "Trend ({days} gün)". Empty-Hint nicht nötig (siehe AC 1).
9. Range-Filter `'all'`: bucket-Anzahl auf max 90 cappen (sonst zuviele Tage bei langem Account-Alter → unleserlich). Reicht für Beta.
10. Component memoized (`React.memo`) und `useMemo` für Aggregation, da TransactionsPageContent bei jeder Range-Aenderung re-rendert.

## Edge Cases

1. **Zero transactions** — `filteredCredits.length === 0`: Sparkline hidden (AC 1).
2. **Single transaction** — 1 Tag mit 1 Tx: Sparkline hidden (mindestens 2 Tage gefordert für Trendlinie).
3. **Same-day-only** — alle Txs vom selben Tag: Sparkline hidden (kein Trend visualisierbar).
4. **Negative-only** (nur spending): jeder Tag negativ. Linie unten, area red. Korrekt color-coded (negative end <= start → red).
5. **All-positive** (nur earned): Linie oben, area green.
6. **Mixed range with gap** — Tag X +500, Tag X+5 -200, dazwischen 0: Sparkline füllt mit 0-Werten an "leeren" Tagen. Continuity wichtig.
7. **Range-Cutoff am Tagesgrenze** — `cutoffDate('30d')` rechnet `Date.now() - 30*86400000`. Tx von genau vor 30d kann je nach Stunde drin oder draussen sein. Behandlung: `>=` cutoff = inklusive.
8. **Locale tr-TR Date-Formatting** — kein User-facing Datum in Sparkline, nur Anzahl-Tage in Label. Kein Locale-Test nötig.
9. **`range='all'` mit Account < 90 Tage alt** — Bucket-Count = min(90, daysFromOldestTx).
10. **`range='all'` mit Account > 90 Tage alt** — Bucket-Count = 90 (cap), aber Aggregation muss alle filteredCredits einbeziehen, nicht nur die letzten 90 Tage. **Decision:** Cap ist auf X-Achse (90 Buckets), Y-Aggregation läuft über existing `filteredCredits`. **Ja, das heisst alte Days "schrumpfen" zu Bucket-Daten** — semantisch OK weil Sparkline nur Trend-Indikator, nicht exakte per-Tag-Werte.

## Proof-Plan

1. `npx tsc --noEmit` — clean (Pflicht).
2. `npx vitest run src/components/transactions` — alle existing Tests bleiben grün (kein Test-Update nötig, da TrendSparkline pure-additive).
3. **Manual test in Chrome DevTools MCP** gegen bescout.net (post-deploy):
   - Login als jarvis-qa@bescout.net
   - Navigiere `/transactions`
   - Range-Filter durchschalten 7d → 30d → 90d → all
   - Screenshot aus Mobile-Viewport (360px)
4. Proof-Artefakt: `worklog/proofs/208-trend-sparkline.png` (Screenshot Mobile)

## Scope-Out

- **Per-Player-P&L Aggregation** (Audit FM 6.3) — separater Slice, verlangt trades-aggregation pro player_id.
- **Tooltip / Crosshair** — bewusst nicht: Mini-Chart ist Glance-Indicator, kein Investigation-Tool. PriceChart auf Player-Detail bleibt das Detail-View-Tool.
- **Earned/Spent als getrennte Linien** — Net reicht für Glance-Trend. Stacked-Area wäre overkill.
- **Tickets-Trend** — Audit FM 6.2 redet von Money-Flow, nicht Tickets. Tickets sind separater Mental-Model-Bucket.
- **Volume-Histogram** (Audit FM 6.2 erwähnt das auch teilweise) — bereits in `PriceChart.tsx` (Slice 198b fm 5.3) verbaut. Hier nicht nochmal.
- **Server-Aggregation per RPC** — Frontend-Aggregat aus existing data reicht. RPC nur wenn zukünftiger Use-Case eine pre-aggregierte 30d-Trend-Tabelle braucht.

## Stage-Chain (geplant)

SPEC → IMPACT (skipped: pure-frontend, single-File, kein Cross-Domain) → BUILD → REVIEW (reviewer-Agent, S-Slice mit Custom-SVG-Logik = nicht trivial-Pattern-Wiederholung) → PROVE → LOG.

## Compliance-Check

- Kein Money-Path (read-only Aggregation existing data).
- Kein neuer i18n-Key-Leak-Risk (nur 2-4 stabile Strings).
- Wording: "Trend" / "Net" — neutral, kein Securities-Vokabular.
- Kein "kazanmak/win/yield/profit" Drift in TR.

## TR-Wording (Anil-Review vor Commit)

| Key | DE | TR |
|---|---|---|
| `transactions.trendLabel` | "Trend ({days} Tage)" | "Trend ({days} gün)" |
| `transactions.trendNet` | "Netto pro Tag" | "Günlük net" |

(Trend = neutrales loanword im TR, business.md-konform.)
