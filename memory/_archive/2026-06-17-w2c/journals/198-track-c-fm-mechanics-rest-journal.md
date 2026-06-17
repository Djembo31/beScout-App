# Frontend Journal: Slice 198 Track C — FM-Mechanics-Rest
## Gestartet: 2026-04-25
### Verstaendnis
- Was: 5 FM-Findings (5.1, 4.4, 4.5, 1.4, 3.1) schliessen (Power-User-Decision-Helpers)
- Betroffene Files: FormBars, MarketFilters, MarketContent, KaderPlayerRow, HistoryStats
- Risiken: Item #2 (Sort by Trade-Volume-7d) braucht column die nicht existiert. Item #3 (Bulk-Buy) ist Money-Path-Adjacent.

### Entscheidungen
| # | Entscheidung | Warum |
|---|-------------|-------|
| 1 | FormBars Tooltip via custom popover (ohne Radix) | Inline einfacher; bestehende Conventions, Mobile-Tap erfordert eigene State-Logic; keine neue Lib |
| 2 | Item #2 SKIP — `trades_volume_7d`-Column gibt's nicht auf `Player`-Type | Audit sagte explizit "Slice 199 DB-Migration noetig" — kein cleaner Workaround moeglich |
| 3 | Item #3 SKIP — Bulk-Buy zu komplex fuer Track C | Money-Path-Adjacent + sequentielle UI-State-Verwaltung + Modal-Flow + Vali. 4/5 sauber > 5/5 halbfertig |
| 4 | Item #4 reuse PlayerDetailModal-Pattern (`setPendingLineupPlayerId`+`setActiveTab`) | Already-existing Pattern, just inline button auf Row |
| 5 | Item #5 erweitere bestehende HistoryStats | nur 2 weitere StatPills — Avg-Rank + Best-Rank |

### Fortschritt
- [x] Item 1 (P1 — FormBars Hover-Tooltip)
- [-] Item 2 SKIPPED (Sort by Trade-Volume-7d — column missing)
- [-] Item 3 SKIPPED (Bulk-Buy — Money-Path complexity)
- [x] Item 4 (Quick-In-Lineup Action in KaderRow)
- [x] Item 5 (HistorieTab Avg-Rank/Best-Rank-Card)

### Runden-Log
- 1: implementing all items
