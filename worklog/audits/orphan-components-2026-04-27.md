# Orphan-Components Report — 2026-04-27

**Generated:** 2026-04-27T16:18:47.618Z
**Slice:** 228 (D46-Component-Achse automatisiert)
**Pattern-Source:** `memory/decisions.md` D46 "Erweiterung Slice 227"

## Summary

- **Components scanned:** 165
- **Orphans found:** 13
- **Test-only used:** 3

## Orphan Components

Each component below is **defined + exported** but **not imported anywhere as a JSX-tag** in non-test code. D46 Heal-Options apply: (A) delete · (B) wire · (C) defer with `@experimental` JSDoc.

### `FollowBtn`

- **File:** `src/components/community/FollowBtn.tsx`
- **JSX usages (excl. self):** 3
- **Lazy-import usages:** 0
- **Note:** Used in TESTS only — Component lebt in test-suite aber nicht in production-render-tree.

**Heal-Options (D46):**
- (A) **Delete** — wenn keine Wire-Plan existiert. Entferne File + Barrel-Export.
- (B) **Wire** — wenn klar ist auf welcher Page/Component es eingebaut werden soll.
- (C) **Defer** — JSDoc `@experimental` Tag + Backlog-Eintrag in `worklog/beta-phase.md`.

### `HomeSkeleton`

- **File:** `src/components/home/HomeSkeleton.tsx`
- **JSX usages (excl. self):** 2
- **Lazy-import usages:** 0
- **Note:** Used in TESTS only — Component lebt in test-suite aber nicht in production-render-tree.

**Heal-Options (D46):**
- (A) **Delete** — wenn keine Wire-Plan existiert. Entferne File + Barrel-Export.
- (B) **Wire** — wenn klar ist auf welcher Page/Component es eingebaut werden soll.
- (C) **Defer** — JSDoc `@experimental` Tag + Backlog-Eintrag in `worklog/beta-phase.md`.

### `CommunityValuation`

- **File:** `src/components/player/detail/CommunityValuation.tsx`
- **JSX usages (excl. self):** 0
- **Lazy-import usages:** 0

**Heal-Options (D46):**
- (A) **Delete** — wenn keine Wire-Plan existiert. Entferne File + Barrel-Export.
- (B) **Wire** — wenn klar ist auf welcher Page/Component es eingebaut werden soll.
- (C) **Defer** — JSDoc `@experimental` Tag + Backlog-Eintrag in `worklog/beta-phase.md`.

### `DpcMasteryCard`

- **File:** `src/components/player/detail/DpcMasteryCard.tsx`
- **JSX usages (excl. self):** 0
- **Lazy-import usages:** 0

**Heal-Options (D46):**
- (A) **Delete** — wenn keine Wire-Plan existiert. Entferne File + Barrel-Export.
- (B) **Wire** — wenn klar ist auf welcher Page/Component es eingebaut werden soll.
- (C) **Defer** — JSDoc `@experimental` Tag + Backlog-Eintrag in `worklog/beta-phase.md`.

### `GameweekScoreBar`

- **File:** `src/components/player/detail/GameweekScoreBar.tsx`
- **JSX usages (excl. self):** 0
- **Lazy-import usages:** 0

**Heal-Options (D46):**
- (A) **Delete** — wenn keine Wire-Plan existiert. Entferne File + Barrel-Export.
- (B) **Wire** — wenn klar ist auf welcher Page/Component es eingebaut werden soll.
- (C) **Defer** — JSDoc `@experimental` Tag + Backlog-Eintrag in `worklog/beta-phase.md`.

### `LimitOrderModal`

- **File:** `src/components/player/detail/LimitOrderModal.tsx`
- **JSX usages (excl. self):** 0
- **Lazy-import usages:** 0

**Heal-Options (D46):**
- (A) **Delete** — wenn keine Wire-Plan existiert. Entferne File + Barrel-Export.
- (B) **Wire** — wenn klar ist auf welcher Page/Component es eingebaut werden soll.
- (C) **Defer** — JSDoc `@experimental` Tag + Backlog-Eintrag in `worklog/beta-phase.md`.

### `PlayerImagePlaceholder`

- **File:** `src/components/player/detail/PlayerImagePlaceholder.tsx`
- **JSX usages (excl. self):** 0
- **Lazy-import usages:** 0

**Heal-Options (D46):**
- (A) **Delete** — wenn keine Wire-Plan existiert. Entferne File + Barrel-Export.
- (B) **Wire** — wenn klar ist auf welcher Page/Component es eingebaut werden soll.
- (C) **Defer** — JSDoc `@experimental` Tag + Backlog-Eintrag in `worklog/beta-phase.md`.

### `TradeSuccessEffect`

- **File:** `src/components/player/detail/TradeSuccessEffect.tsx`
- **JSX usages (excl. self):** 0
- **Lazy-import usages:** 0

**Heal-Options (D46):**
- (A) **Delete** — wenn keine Wire-Plan existiert. Entferne File + Barrel-Export.
- (B) **Wire** — wenn klar ist auf welcher Page/Component es eingebaut werden soll.
- (C) **Defer** — JSDoc `@experimental` Tag + Backlog-Eintrag in `worklog/beta-phase.md`.

### `HoldingsSection`

- **File:** `src/components/player/detail/trading/HoldingsSection.tsx`
- **JSX usages (excl. self):** 0
- **Lazy-import usages:** 0

**Heal-Options (D46):**
- (A) **Delete** — wenn keine Wire-Plan existiert. Entferne File + Barrel-Export.
- (B) **Wire** — wenn klar ist auf welcher Page/Component es eingebaut werden soll.
- (C) **Defer** — JSDoc `@experimental` Tag + Backlog-Eintrag in `worklog/beta-phase.md`.

### `IPOBuySection`

- **File:** `src/components/player/detail/trading/IPOBuySection.tsx`
- **JSX usages (excl. self):** 0
- **Lazy-import usages:** 0

**Heal-Options (D46):**
- (A) **Delete** — wenn keine Wire-Plan existiert. Entferne File + Barrel-Export.
- (B) **Wire** — wenn klar ist auf welcher Page/Component es eingebaut werden soll.
- (C) **Defer** — JSDoc `@experimental` Tag + Backlog-Eintrag in `worklog/beta-phase.md`.

### `TransferBuySection`

- **File:** `src/components/player/detail/trading/TransferBuySection.tsx`
- **JSX usages (excl. self):** 0
- **Lazy-import usages:** 0

**Heal-Options (D46):**
- (A) **Delete** — wenn keine Wire-Plan existiert. Entferne File + Barrel-Export.
- (B) **Wire** — wenn klar ist auf welcher Page/Component es eingebaut werden soll.
- (C) **Defer** — JSDoc `@experimental` Tag + Backlog-Eintrag in `worklog/beta-phase.md`.

### `ManagerOffersTab`

- **File:** `src/features/market/components/portfolio/OffersTab.tsx`
- **JSX usages (excl. self):** 3
- **Lazy-import usages:** 0
- **Note:** Used in TESTS only — Component lebt in test-suite aber nicht in production-render-tree.

**Heal-Options (D46):**
- (A) **Delete** — wenn keine Wire-Plan existiert. Entferne File + Barrel-Export.
- (B) **Wire** — wenn klar ist auf welcher Page/Component es eingebaut werden soll.
- (C) **Defer** — JSDoc `@experimental` Tag + Backlog-Eintrag in `worklog/beta-phase.md`.

### `BuyOrderModal`

- **File:** `src/features/market/components/shared/BuyOrderModal.tsx`
- **JSX usages (excl. self):** 0
- **Lazy-import usages:** 0

**Heal-Options (D46):**
- (A) **Delete** — wenn keine Wire-Plan existiert. Entferne File + Barrel-Export.
- (B) **Wire** — wenn klar ist auf welcher Page/Component es eingebaut werden soll.
- (C) **Defer** — JSDoc `@experimental` Tag + Backlog-Eintrag in `worklog/beta-phase.md`.

---

**Audit-Methodik-Pflicht:** Audit-Agents müssen vor P1-Klassifikation eines Component-Findings import-trace prüfen (D46-Sub-Section "Pflicht-Regel"). Tool ist Reminder + CI-Gate.
