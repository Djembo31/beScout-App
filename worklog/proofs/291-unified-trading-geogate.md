# Proof — Slice 291 Unified Trading GeoGate

Date: 2026-06-13
Scope: dpc_trading action guard for `/player/[id]` and `/manager`.

---

## RED

Player focused test before implementation:

```bash
pnpm exec vitest run "src/app/(app)/player/[id]/__tests__/PlayerContent.test.tsx" -t "blocks trading entrypoints"
```

Observed failure:

```text
expected mockOpenBuyModal not to be called, but it was called 1 time
```

Manager focused test before implementation:

```bash
pnpm exec vitest run "src/features/manager/components/__tests__/ManagerContent.geo.test.tsx"
```

Observed failure:

```text
expected mockRawSell not to be called, but it was called with ["p1", 1, 100]
```

---

## GREEN

Focused restricted-action tests after implementation:

```bash
pnpm exec vitest run "src/app/(app)/player/[id]/__tests__/PlayerContent.test.tsx" -t "blocks trading entrypoints"
pnpm exec vitest run "src/features/manager/components/__tests__/ManagerContent.geo.test.tsx"
```

Observed:

```text
PlayerContent focused: 1 passed
ManagerContent.geo: 1 passed
```

Affected suites:

```bash
pnpm exec vitest run \
  "src/app/(app)/player/[id]/__tests__/PlayerContent.test.tsx" \
  "src/features/manager/components/__tests__/ManagerContent.geo.test.tsx" \
  "src/features/manager/components/kader/__tests__/KaderSellModal.test.tsx"
```

Observed:

```text
Test Files 3 passed
Tests 29 passed
```

---

## Static / audit checks

```bash
pnpm exec tsc --noEmit && pnpm audit:type-truth && pnpm audit:stale && pnpm audit:wiring:check
```

Observed:

```text
Type-Truth-Audit: Total 0
Audit-Stale-Check: Stale-candidates 0
Wiring-Check: Real drift 0
exit_code 0
```

---

## Changed runtime files

```text
src/app/(app)/player/[id]/PlayerContent.tsx
src/app/(app)/player/[id]/__tests__/PlayerContent.test.tsx
src/features/manager/components/ManagerContent.tsx
src/features/manager/components/__tests__/ManagerContent.geo.test.tsx
```
