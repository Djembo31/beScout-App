# Slice 205 — ScoutConsensus Reliability-Indicator (FM 5.2)

## Ziel
ScoutConsensus zeigt zusaetzlich zu Bull/Bear/Neutral-Counts einen Confidence-Tier-Badge ("Niedrige/Mittlere/Hohe Verlaesslichkeit") basierend auf `total`-Anzahl qualifizierter Reports — sodass User nicht "70% Bullish bei 12 Reports vs 200 fuer Mbappe" gleich gewichtet.

## Betroffene Files
- **EDIT** `src/components/player/detail/ScoutConsensus.tsx` — Reliability-Tier-Berechnung + Badge unter Summary-Row
- **EDIT** `messages/de.json` + `messages/tr.json` — `research.reliability.{low,medium,high,ariaLabel}` namespace

## Acceptance Criteria
1. Reliability-Tier abhaengig von `total`:
   - **Low:** 1-9 Reports → grauer Badge "Niedrige Verlaesslichkeit"
   - **Medium:** 10-49 Reports → amber Badge "Mittlere Verlaesslichkeit"
   - **High:** 50+ Reports → green Badge "Hohe Verlaesslichkeit"
2. Badge sitzt im Header neben "X Reports" (rechts), font klein
3. Color-Coding consistent: gray (low), amber (medium), green (high)
4. aria-label fuer Screen-Reader: "Verlaesslichkeit: <Tier> ({count} Reports)"
5. Mobile 393px: Badge nicht ueber "X Reports" oder Award-Icon-Label ueberlappen
6. i18n DE+TR komplett

## Edge Cases
- 0 Reports: bestehender `if (!consensus) return null` weiterhin → kein Badge
- 1 Report: "Niedrige Verlaesslichkeit" (richtig — Single-Source = unsicher)
- Genau 10 / 50: Boundary inclusive medium / high
- Lange Wording in TR: zwei-zeilig erlaubt
- Touch-Target-Pflicht: Badge nicht klickbar → kein Min-44px-Issue

## Proof-Plan
- `npx tsc --noEmit` clean
- git diff --stat zeigt 3 Files (1 Code + 2 i18n)

## Scope-Out
- KEINE neue Service oder RPC — `getPlayerSentimentCounts` + ResearchPostsWithAuthor[] existieren bereits
- KEINE statistische Confidence-Interval (Wilson-Score, Bayesian etc.) — simple Buckets
- KEINE Per-Tier-Tooltip oder Help-Modal
- KEINE Anpassung an SentimentGauge oder anderem Sentiment-Component
- BuyConfirmModal nutzt eigene Sentiment-Counts — bleibt unangetastet (anderer Slice)

## Decision-Notes
- **Threshold-Wahl:** 1-9 / 10-49 / 50+ entspricht typischen Power-User-Konventionen (Sorare: 10-Filter, Tradingview: 50-Confluence). Magic-Numbers ok bei isoliertem Vorkommen.
- **D46-Anwendung:** Daten kommen aus existing `ScoutConsensusProps.research: ResearchPostWithAuthor[]` — keine neue Service nötig.
