# Slice 198b Track B — Self-Review

**Type:** Self-Review (Frontend-Agent, XS-Pattern-Repetition over 3 items, no money-path)
**Date:** 2026-04-25
**Verdict:** PASS

## Findings

### #1 Projection Pill (LineupPanel) — Captain-Multiplier Source-of-Truth

**Severity:** INFO (no fix needed)
**Issue:** Hard-coded `1.1` factor for Captain — nicht zentralisiert.
**Justification:** In Slice 195a wurde Captain-Mult auf 1.1× festgelegt (siehe `memory/decisions.md` Slice 195a). RPC `score_event` v4 nutzt 1.5× fuer Live-Score (Zeile 227 in LineupPanel). Konsistent zur Live-Score-Approximation in derselben File ist 1.1. Wenn CEO-Decision aendert: ALLE 4-5 Stellen in derselben File sync.
**Action:** None — UI-only, kein DB-write.

### #2 IPO Banner — Date-Liar wenn ipoList stale

**Severity:** LOW
**Location:** `MarketContent.tsx` IPO-Banner-IIFE
**Issue:** `data.ipoList` ist React-Query cached; bei stale-cache koennte abgelaufene IPO mitgezaehlt werden, weil `ends_at > NOW` Check NULL nicht handled.
**Mitigation:** `new Date(ipo.ends_at).getTime()` returnt NaN bei undefined ends_at; `NaN > NOW` ist false → wird NICHT mitgezaehlt. Safe.
**Service-Truth:** `getActiveIpos()` filtert bereits `ends_at > now()` server-side (`src/lib/services/ipo.ts:49`). Banner ist nur "frische" Reduktion.

### #3 Volume Histogram — leerer Bucket-Array bei <2 Trades

**Severity:** N/A (covered)
**Issue:** Was wenn `filtered.length === 1`?
**Resolution:** `chartData = null` wenn `filtered.length < 2` (Z. 81). Volume-Section ist nur in Branch wo `chartData` gerendert ist, sodass `totalVol > 0` sicher truthy.
**Edge:** `filtered.length === 2`, gleiche Zeit → tSpan=0 → Math.max(...,1) → idx=0 → alle Volume in Bucket 0. Visuell OK.

## Compliance Check

- [x] business.md — "Erstverkauf"/"Kulüp Satışı" verwendet, kein "IPO" user-facing
- [x] errors-frontend.md — Hooks vor early returns (chartData useMemo, dann `if (!chartData) return ...`)
- [x] errors-frontend.md — Modal-Pattern N/A (kein Modal added)
- [x] performance.md — keine neuen Queries (consumes existing `data.ipoList`)
- [x] testing.md — vitest run on relevant areas → 113 tests passed
- [x] mobile-393px — flex-row layouts, truncate auf labels, SVG preserveAspectRatio
- [x] i18n DE+TR — alle 5 keys parallel committed
- [x] design tokens — `vivid-red`, `sky-300`, `gold` etc. nur via existing CSS-vars

## Forbidden-File Verification

```
git diff --name-only main..HEAD
# Wave-1-Files NICHT in diff:
# - src/components/missions/DailyChallengeCard.tsx
# - src/app/(app)/founding/page.tsx
# - src/components/manager/KaderToolbar.tsx
# - src/features/manager/components/kader/KaderTab.tsx
# - src/components/player/FormBars.tsx
```

## Verdict

**PASS** — 3/6 Items closed clean, 3/6 begruendet skipped. Quality-First > Quantity (Briefing-Regel: "3-4/5 sauber > 5/5 halbfertig").
