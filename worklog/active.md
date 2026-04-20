# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
```

## Letzter abgeschlossener Slice: 120

**country-flag-icons Bundle-Split** — Commit `d0b41cd9` gepusht.

Namespace-Import `import * as Flags3x2 from 'country-flag-icons/react/3x2'` bundled 265 Flag-Komponenten (235 kB parsed / 53 kB gzipped) als standalone-chunk. Ersetzt durch `<img src="/flags/3x2/{code}.svg">` + 265 SVGs in `public/flags/3x2/`.

Bundle-Diff: `/player/[id]` FLJS **365 → 309 kB (−56 kB, −15%)**. /home/Market unverändert (CountryFlag nicht auf deren critical path — Win konzentriert auf player-detail + club pages). Standalone flag-chunk eliminated.

Neues Pattern in `common-errors.md §8` verankert: "Namespace-Import blockiert Tree-Shaking".

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
