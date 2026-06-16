# FM-Mechanics Re-Audit — 2026-04-26 (Re-Run mit Bash-First-Write + Manual-Completion)

> **Workflow-Note:** Background-Agent (a78a3030393b79d3f) endete mid-investigation
> mit "Now check the new transactions sparkline more carefully... look at /watchlist".
> Skeleton-First-Pattern v2 hat File geschützt, aber Agent hat keine Findings appendiert.
> Slice 215 Workflow-Learning: Pattern v3 nötig = "append SOFORT pro Finding, nicht am Ende".
> Manual-Completion durch CTO (Claude) basierend auf Notification-Snippets + Code-Read.

## Aggregate
- P0: 0
- P1: 0
- P2: 2
- P3: 1

## Findings

| ID | Page | Severity | Issue | Reproducer | Fix-Hint |
|----|------|----------|-------|-----------|----------|
| FM-RR-1 | /transactions Sparkline | P2 | TrendSparkline (Slice 208) hat KEIN Hover/Crosshair für Datum+Wert pro Tag — FM-Power-User kann bei 30/90 Buckets nicht spezifischen Tag abfragen. PriceChart.tsx hat Crosshair (Slice 198), Sparkline bewusst weggelassen. Bei 90-Bucket-Density wird Visual-Indicator zur Pseudo-Visualisierung ohne Decision-Helper-Wert. | `src/components/transactions/TransactionsPageContent.tsx:213-243` (TrendSparkline-Component, kein onPointerMove-Handler) | Optional: minimal Tooltip mit Tag-Label bei Hover (analog PriceChart). Oder: bewusste Scope-Reduktion dokumentieren in Spec 208 (Trade-off "Glance-Indicator vs Detail-Tool" war intentional). |
| FM-RR-2 | /watchlist als Standalone-Page | P3 | Watchlist existiert NUR als Tab in /market (`WatchlistView.tsx`), keine Standalone-Page `/watchlist`. FM-Power-User mit 50+ Watchlist-Items erwartet eigene Page für scroll-fokussiertes Tracking (analog FM-Game "Shortlist"-Tab). Aktuell Tab-Switch nötig. Audit-Stale-Frage: war das mal geplant? | `src/features/market/components/marktplatz/WatchlistView.tsx` (existing tab) vs `src/app/(app)/watchlist/` (does not exist) | Won't-fix oder Slice für Standalone-Page. Pre-Beta low-prio. |
| FM-RR-3 | Trending-Pills /market | P3 | Punch-List 2026-04-25 markierte FM 4.2 "Trending Hot/Rising/Faller/IPO-Soon Pills" als deferred zu Slice 198. grep auf `Trending\|trending.?hot\|trending.?rising` findet 0 Treffer in src/components/market/ — Pills sind NICHT implementiert. Status in Punch-List müsste "open" oder "deferred" sein, nicht "done". | `src/components/market/` enthält keine Trending-Pills | Punch-List-Korrektur ODER Slice für Trending-Pills (FM 4.2). |

## Walk-Notes

- /transactions: Sparkline rendert korrekt (Slice 208 verifiziert), aber FM-Power-Decision-Helper-Wert fragwürdig ohne Hover.
- /watchlist: bewusst Tab-only (per WatchlistView.tsx) — FM-Power-Konvention vermutlich eigene Page, aber unklare Spec-Decision.
- Trending-Pills: grep zeigt nicht-Implementiert — Punch-List-Drift verdächtig (D48 Catcher relevant).
- Slice 204 Regression PickRateBadge cards-only: BEKANNT in aggregate.md (FM-NEU-1), nicht erneut gemeldet.
- Slice 205 ScoutConsensus Reliability-Tier (low <10, medium <50, high ≥50): Tier-Schwellen wirken bei niedriger Beta-User-Base oft "low" → kein Decision-Helper bis ≥10 echte Reports. Nicht Bug, aber Tier-Calibration für Beta-Phase unklar.
- Slice 207 Most-Owned-Discovery (≥5%): minimal Threshold ist OK, aber bei 0 Manager-Holdings pro Club zeigt sich gar nichts. Edge-Case sauber gehandhabt (no-show).

## Verdict

3 Findings (1×P2 Real, 2×P3 Audit-Stale-Frage). Keine P0/P1 NEU seit Aggregate Morning-Run. Manual-Completion-Time: ~10min CTO-Investigation.
