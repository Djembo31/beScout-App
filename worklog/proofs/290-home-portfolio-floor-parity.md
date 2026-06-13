# Proof — Slice 290 Home Portfolio Floor Parity

Date: 2026-06-13
Scope: Home portfolio value parity with Manager/Market floor chain.

---

## RED

Command:

```bash
pnpm exec vitest run "src/app/(app)/hooks/__tests__/useHomeData.test.ts" -t "canonical byIds live-listing floor"
```

Observed failure before implementation:

```text
FAIL src/app/(app)/hooks/__tests__/useHomeData.test.ts > useHomeData > uses canonical byIds live-listing floor for held players to match Manager/Market parity
AssertionError: expected vi.fn() to be called with arguments: [ [ 'p-1' ] ]
Received calls: [], [], []
```

Meaning: Home did not request the held player ID through byIds, so it could not use the canonical `computePlayerFloor` chain.

---

## GREEN

Same focused command after implementation:

```bash
pnpm exec vitest run "src/app/(app)/hooks/__tests__/useHomeData.test.ts" -t "canonical byIds live-listing floor"
```

Observed:

```text
Test Files  1 passed (1)
Tests       1 passed | 39 skipped (40)
```

Full focused file:

```bash
pnpm exec vitest run "src/app/(app)/hooks/__tests__/useHomeData.test.ts"
```

Observed:

```text
Test Files  1 passed (1)
Tests       40 passed (40)
```

---

## Static / audit checks

Command:

```bash
pnpm exec tsc --noEmit && pnpm audit:type-truth && pnpm audit:stale && pnpm audit:wiring:check
```

Observed:

```text
Type-Truth-Audit: PATTERN-A 0, PATTERN-B 0, PATTERN-C 0, Total 0
Audit-Stale-Check: Stale-candidates 0
Wiring-Check: Real drift 0, Known allowlisted 12
exit_code 0
```

---

## Code assertion

The new test proves:

```text
mockUsePlayersByIds(['p-1'])
holdings[0].floor = 4  // live-listing min from canonical Player
portfolioValue = 20   // qty 5 * floor 4
pnl = -5              // cost remains 25
pnlPct = -20
```

---

## Scope check

Changed runtime files:

```text
src/app/(app)/hooks/useHomeData.ts
src/app/(app)/hooks/__tests__/useHomeData.test.ts
```

No migration, no Manager/Market source edits, no `memory/session-handoff.md` change by this slice.
