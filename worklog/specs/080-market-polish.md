# Slice 080 — Market `/market` Polish Pass (Phase 1 Page 2/6)

## Ziel

Systematisches Durchgehen des Polish-Rubrics für die Market-Page nach bewährtem Slice-079-Pattern:
States (loading, error, empty) · Mobile 393px · A11y · Opacity · i18n DE+TR · Perf · Flow · Anti-Slop · Compliance.

## Kontext

- Phase 1 Page 2 von 6 (Home ✅ 079, Market = hier, dann Player Detail, Portfolio, Transactions, Profile).
- CTO-Autonomie: Anil hat UX-Entscheidungen delegiert ("mach es perfekt für bescout").
- Balance-Format-Konsistenz TopBar vs Hero (F2 aus Reviewer 079) mit-prüfen.
- Multi-Account-Pflicht: min. 2 Accounts (jarvis mit Holdings + test12 mit Multi-Liga) durchklicken (laut feedback_polish_multi_account.md).
- Workflow: Playwright MCP gegen bescout.net → Findings sammeln → Priorisieren → Fixen → Deploy-Verify.

## Betroffene Files (geschätzt)

- `src/app/(app)/market/page.tsx` (Shell + Tabs)
- `src/components/market/MarketKaufenTab.tsx` (Kaufen)
- `src/components/market/MarketBestandTab.tsx` (Bestand — hier lag P0 /api/players bug!)
- `src/components/market/MarketWatchlistTab.tsx` (Watchlist)
- `src/components/market/MarketOrderbookTab.tsx` (Orderbuch — falls sichtbar)
- `messages/de.json` + `messages/tr.json` (Market-Namespaces)

## Acceptance Criteria

- [ ] Alle Market-Tabs render 0 console-errors auf 393px
- [ ] Empty-States erklären was fehlt (keine leere Section, klare CTA)
- [ ] Loading/Error-States visuell distinct (Skeleton vs Error-Icon vs Empty)
- [ ] Balance-Format konsistent TopBar-vs-Hero (formatScout bei beiden)
- [ ] Compliance-Wording: Platform Credits / Scout Card / Erstverkauf (keine "Investment"/"ROI"/"Prize")
- [ ] DE + TR Sprache-Switch ohne MISSING_MESSAGE / raw-key-leak
- [ ] Mobile A11y: Tap-Targets ≥44px, Focus-Indicator sichtbar, Keyboard-Nav funktioniert
- [ ] Multi-Account: jarvis (1 Liga) + test12 (Multi-Liga) zeigen korrekte Bestand-Counts (P0 fix verified)
- [ ] Filter/Sort-State persists bei Tab-Wechsel (falls relevant)

## Scope-Out

- Trading-Logic (Buy/Sell RPCs) — CEO-Money-Scope, separater Slice falls Bug
- Player-Detail-Page — Slice 081
- Inventory-Page (`/inventory`) — Slice 082
- Orderbook Realtime — post-Pilot Feature

## Proof-Plan

1. Findings-Log `worklog/proofs/080-findings.md` mit F-Nummerierung
2. Playwright Screenshot pro Tab (Kaufen, Bestand, Watchlist) Mobile 393px
3. tsc clean + vitest
4. Deploy verify: bescout.net/market in beiden Accounts (jarvis + test12)
5. Log-Entry mit Fix-Count + Deferred-Queue-Items
