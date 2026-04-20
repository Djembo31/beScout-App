# Active Slice

```
status: active
slice: 109
stage: SPEC → IMPACT
spec: worklog/specs/109-home-dashboard-rpc.md
impact: pending
proof: pending
```

## Slice 109 — get_home_dashboard_v1 RPC

**Ziel:** 4 per-User-Queries auf /home → 1 SECURITY DEFINER RPC. /home LCP 3792ms → <3200ms.
**Scope-In:** holdings + user_stats + tickets + highest_pass in single jsonb RPC mit AR-44 Guard.
**Scope-Out:** Wallet (RLS race) · hasFreeBoxToday (staleTime:0) · global queries · AuthProvider-Robustness → Slice 110.

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
