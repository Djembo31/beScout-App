# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
```

## Session 2026-04-21 End — 4 neue Slices live (nach Hotfix-Cascade)

**Hotfix `d73dc235`**: pnpm-lock.yaml sync — 8 konsekutive ERROR-Deploys gefixt (Slice 118 husky + 120 bundle-analyzer waren via npm installiert, nicht pnpm).

**Slice 125 — Sentry instrumentation.ts migration** (`718c7265`): Config-Deprecation gecleared, `/market` TTFB warm −62% (836→319ms), LCP warm −27% (3429→2492ms).

**Slice 126 — Sentry Sampling reduction** (`1cdd4d9e`): tracesSampleRate 0.1→0.01, replaysOnError 1.0→0.1. **LCP 0ms impact** — Hypothesis disproven. Sampling ≠ code-path cost. Real win: 90% Sentry-Quota-Sparen.

**Slice 127 — Close 4 failing tests** (`aee7d439`): INV-32 RLS, INV-36 11 players flagged stale, INV-38 100 players flagged stale, COMPL-reward wording fix. **47/47 green.**

## Letzter abgeschlossener Slice: 123

**useEnrichedPlayers Input-Injection** — Commit `2aa81871` gepusht.

API-Change: `useEnrichedPlayers(userId, holdings, orders)` — kein internes useHoldings/useAllOpenOrders mehr. Entfernt Race-Condition mit `useMarketUserDashboard` (Slice 122). /market cold-load: 10 → 5 Requests (-50%).

## Letzter abgeschlossener Slice: 122

**get_market_user_dashboard RPC** — Commit `69cd5dba`. 4 per-user /market queries (holdings + watchlist + incoming_offers + open_bids) in 1 SECURITY DEFINER RPC + Cache-Priming für 4 downstream keys. 3/3 DB-Invariants PASS.

## Letzter abgeschlossener Slice: 121

**/market Bundle Hygiene** — Commit `92edd866`. BuyConfirmModal research.ts lazy, useHoldingLocks isoliert. Structural win (research lazy-loaded) aber 0 kB FLJS-reported — Pattern "dynamic() bypass wenn andere Importpfade eager" in common-errors verankert.

## Letzter abgeschlossener Slice: 120

## Letzter abgeschlossener Slice: 110

**Auth+Wallet Robustness (Trading-Confidence)** — additive Provider-API Erweiterung + BuyModal/BuyOrderModal-Guards.

Ergebnis: WalletProvider erhält `isFetching`, `lastFetchOk`, `isBalanceFresh` (30s-window). AuthProvider bekommt `useAuthState()` discriminated-union helper. Confirm-Buttons in BuyModal + BuyOrderModal disablen bei stale balance, subtle i18n-Status "Saldo wird aktualisiert…". Kein Money-Flow-Change, kein LCP-Impact, backwards-kompatibel.

Test-Bilanz: 10/10 WalletProvider-Tests PASS (4 neu) · tsc clean · 2 Failures in parallel session's Slices 113/114 dokumentiert als nicht-110-Regression.

## Letzter abgeschlossener Slice: 109

**get_home_dashboard_v1 RPC (Home-Data-Consolidation)** — Commit `1c4e63d7`, Deploy `dpl_5P2uXG7vzWfHBxFkKUj6pBHRLDv8` READY.

Ergebnis (ehrlich): **Structural win** (3 Queries eliminiert) + **LCP-Win marginal** (-1.3%, innerhalb Messrauschen). Spec-Target LCP <3200ms verfehlt, Grund im log.md dokumentiert + Lesson in common-errors.md verankert.

**Nächster Slice: 110** — Auth-Robustness (balanceIsStale + Button-Guards + state machine). Kein LCP-Win erwartet, sondern Trading-Race-Condition-Schutz.

## Session 2026-04-20 Progress (8 Slices)

| Slice | Title | Result |
|-------|-------|--------|
| 101 | Stadia v3 Wikipedia Retry | ✅ +68 Stadien, 0 429-blocked (`41bb3945`) |
| 102 | Nationality Full-Name → ISO Mapper | ✅ Flag-Fix live, Osimhen + Walker-Peters verified (`053e5084` + `ba3a2fe7`) |
| 103 | TM Nationality + Ghost-Cleanup + DE-Aliases | ✅ 152/153 scraped + 106 ghost-unlinked (`209bd5ad`) |
| 104 | Perf-Foundation (parallele Session) | ✅ LCP 2091→874ms, Render 1774→498ms (`d4794684` + `b3b2b8d0`) |
| 105 | TFF1 Nationality Scrape | ✅ 33/34 scraped, 6 Ligen >99.6%, TFF1 87.7% |
| 106 | Stadium Image Compression | ✅ 2 Monster-Files 127MB → 1.4MB (-98.9%) |
| 107 | Data-Waterfall Fixes (parallele Session) | ✅ Duplicate-Calls + N+1 Fixes (`5e453aac`) |
| 108 | liquidate_player Linear Formula (CEO MONEY-Fix) | ✅ RPC + Frontend + 23 Tests, deployed live, 6/6 invariants PASS |

## Global Coverage (nach allen Slices)

- **Nationality**: 4348/4556 mapped (95.4%), 0 unmapped, 208 NULL
- **Per-Liga (visible)**: SL 100%, BL1/BL2/PL/LL/SA 99.6-99.8%, TFF1 87.7%
- **Stadia**: 135/134 files (non-TFF1 Coverage 100%)
- **Tests**: 187 Mapper + 21 Parser + 9 Flag = 217 grün
- **Repo-Health**: -125.7MB Asset-Bloat beseitigt

## Offen (Scope-Outs, post-Beta)

- **93 TFF1 ohne TM-Mapping**: brauchen Name-Search-API oder CSV-Workflow
- **43 mittelgroße Stadion-Bilder** (>5MB): weitere -571MB Einsparung möglich, XS-Slice
- **9 Edge-Cases** aus Slice 103 (Fletcher-Timeout + 8 active-ohne-TM): nächste TM-Rescrape-Welle
- **Sentry Release-Tracking, Husky Pre-commit, Pattern 9 MEDIUM-Audit**: Backlog
