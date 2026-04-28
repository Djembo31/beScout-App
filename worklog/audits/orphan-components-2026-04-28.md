# Orphan-Components Report — 2026-04-28

**Generated:** 2026-04-28T11:30:31.890Z
**Slice:** 228 (D46-Component-Achse automatisiert) · 242 (Allowlist D52 #3)
**Pattern-Source:** `memory/decisions.md` D46 "Erweiterung Slice 227"

## Summary

- **Components scanned:** 165
- **Orphans found (real drift):** 9
- **Known (allowlisted):** 4
- **Test-only used:** 3

## Orphan Components

Each component below is **defined + exported** but **not imported anywhere as a JSX-tag** in non-test code. D46 Heal-Options apply: (A) delete · (B) wire · (C) defer with `@experimental` JSDoc.

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
