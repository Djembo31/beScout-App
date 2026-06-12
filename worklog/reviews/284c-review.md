# Review Slice 284c — Self-Review

**Typ:** Self-Review (Begründung: alle 6 Fixes folgen wörtlich den Fix-Skizzen des fm-mechanics-Domain-Experten-Audits — der Audit WAR der Cold-Context-Pass mit file:line-verifizierten Root-Causes. Anil-Direktive: token-sparend.)
**Verdict:** PASS · 2026-06-13

| Check | Ergebnis |
|---|---|
| FM-01 Parity by construction: beide Pages nutzen jetzt DENSELBEN Helper (computePlayerFloor) — kein Drift mehr möglich; 0→null-Mapping erhält ipo/avgBuy-Fallback-Semantik | ✅ |
| FM-03: getClub-Render-Nutzung = 0 (grep) → Import sauber getauscht; club_ids ≤ ~40 (Land mit 2 Ligen), weit unter .in()-Limit; queryKey enthält beide Filter | ✅ |
| FM-04: onSell-Result wird jetzt ausgewertet (success→sold, sonst skipped); deps vollständig | ✅ |
| FM-02: neq(0) zeigt auch Faller (order desc → Gainer zuerst) — FPL-konform | ✅ |
| i18n: 2 neue Keys DE+TR via Zeilen-Insertion (kein Reformat), JSON-parse ✓ — **TR-Strings für Anil-Review markiert**: bulkSellResult, noMarketMovement | ✅ |
| tsc 0 · 1238/1238 Tests (manager/rankings/market/services) | ✅ |

NOT-CHECKED: Visual-Spotcheck post-Deploy (PROVE), FM-06-Scoping (defer dokumentiert).
