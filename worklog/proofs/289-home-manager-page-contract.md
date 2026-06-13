# Proof — Slice 289 Page Contract Audit

Date: 2026-06-13
Scope: docs-only audit for `/` (Home) + `/manager`

---

## Commands run (bash/POSIX)

```bash
# GeoGate presence
grep -rn "GeoGate" "src/app/(app)/page.tsx" "src/app/(app)/hooks" "src/components/home"
grep -rn "GeoGate" "src/app/(app)/manager" "src/features/manager"

# Direct Supabase client access
grep -rln "from '@/lib/supabaseClient'\|createClient\|supabaseAdmin" \
  "src/components/home" "src/app/(app)/hooks" "src/app/(app)/page.tsx"
grep -rln "from '@/lib/supabaseClient'\|createClient\|supabaseAdmin" \
  "src/features/manager" "src/app/(app)/manager"

# Test files + counts
find src/components/home "src/app/(app)/hooks" src/features/manager -name "*.test.ts*"
for f in $(find src/components/home "src/app/(app)/hooks" src/features/manager -name "*.test.ts*"); do
  printf "%s " "$f"; grep -cE '^\s*(it|test)\(' "$f"
done

# Placeholder / skip
grep -rn "expect(true).toBe(true)\|it.skip\|test.skip\|describe.skip" \
  src/components/home "src/app/(app)/hooks" src/features/manager

# Native confirm/alert
grep -rn "window.confirm\|window.alert" \
  src/components/home "src/app/(app)/page.tsx" src/features/manager

# Portfolio-floor source comparison
grep -n "portfolioValue\|h.floor\|floor_price" src/app/(app)/hooks/useHomeData.ts
grep -n "computePlayerFloor\|getFloor\|floorMap" src/features/market/hooks/useMarketData.ts
sed -n '14,21p' src/lib/playerMath.ts

# e2e coverage
grep -rn "/manager\|goto('/')" e2e/beta-smoke.spec.ts e2e/synthetic-users.spec.ts
```

---

## Observed output

GeoGate (Home scope):

```text
<no matches>
```

GeoGate (Manager scope):

```text
<no matches>
```

Direct Supabase (Home scope):

```text
<no matches>
```

Direct Supabase (Manager scope):

```text
<no matches>
```

Test counts:

```text
src/components/home/__tests__/ActionRequiredStack.test.tsx 22
src/components/home/__tests__/helpers.test.tsx 21
src/components/home/__tests__/HomeSkeleton.test.tsx 2
src/components/home/__tests__/HomeSpotlight.test.tsx 8
src/components/home/__tests__/ManagerBlock.test.tsx 20
src/components/home/__tests__/MarktPuls.test.tsx 10
src/components/home/__tests__/OnboardingChecklist.test.tsx 5
src/components/home/__tests__/OwnTopMoversStrip.test.tsx 3
src/components/home/__tests__/TopMoversStrip.test.tsx 7
src/components/home/__tests__/TrendingPlayersStrip.test.tsx 3
src/app/(app)/hooks/__tests__/useHomeData.test.ts 39
src/features/manager/components/historie/__tests__/historieHelpers.test.ts 19
src/features/manager/components/kader/__tests__/KaderSellModal.test.tsx 13
src/features/manager/queries/__tests__/eventHelpers.test.ts 7
```

Placeholder/skip in scope:

```text
<no matches>
```

Native confirm/alert in scope:

```text
<no matches>
```

Portfolio-floor divergence (the two chains):

```text
Home    useHomeData.ts:175  portfolioValue = holdings.reduce(s + h.qty * h.floor)
                            holdings: h.floor = centsToBsd(h.player.floor_price)   // scalar column (get_home_dashboard_v1)
Manager useMarketData.ts    getFloor(p) = floorMap.get(p.id) = computePlayerFloor(p)
playerMath.ts:14-21         computePlayerFloor = Math.min(...listings.map(price)) ?? prices.floor ?? 0   // live listings
```

e2e coverage:

```text
beta-smoke.spec.ts:  step 1 -> page.goto('/') status < 500, body not empty
beta-smoke.spec.ts:  step 5 -> smokeNavigate(page, '/manager', '/manager')
synthetic-users.spec.ts:  walks '/' and '/manager' (render/screenshot)
```

---

## Acceptance Criteria

AC1 `/` (Home) contract completed:
- PASS — see `worklog/audits/2026-06-13/page-contract-home-manager.md`.

AC2 `/manager` contract completed:
- PASS — see same audit.

AC3 GREEN/YELLOW/RED statuses:
- PASS — `/` GREEN with YELLOW caveat; `/manager` YELLOW.

AC4 Source-of-Truth/gates/data/mutations/query-keys/components/states/tests/debt documented:
- PASS.

AC5 Findings are follow-up slices, not fixes:
- PASS — no runtime changes; F-1..F-6 proposed as slices.

AC6 No `src/**` runtime changes:
- PASS — `git status --short` shows only docs/worklog writes from this slice plus the pre-existing, unrelated `M memory/session-handoff.md` (not touched by this slice).

---

## Verdict

PASS.
