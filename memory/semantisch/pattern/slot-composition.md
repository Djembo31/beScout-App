# Slot Composition Pattern (Shared Core + Context Wrappers)

> Quelle: AR-57 SellModal DRY Refactor (J8 Frontend)
> Konsolidiert: AutoDream v3 Run #11 (2026-04-15)

## Problem

Zwei oder mehr Components mit sehr aehnlicher UI entstehen parallel in verschiedenen Feature-Ordnern:
- `SellModal` (player/detail)
- `KaderSellModal` (features/manager/kader)

Symptome: Hardcoded Konstanten driften (FEE_RATE=0.06 vs TRADE_FEE_PCT=6), Quality-Levels differieren (preventClose nur in einem, Disclaimer nur in einem), Bug-Fixes werden nur an einer Stelle appliziert.

## Pattern: SellModalCore mit Slots

```typescript
// Core Component: alle sicherheitskritischen Concerns zentral
interface SellModalCoreProps {
  // Pflicht-Felder (Form-Core)
  listings: SellListing[]
  onConfirm: (qty: number, price: number) => Promise<void>
  isPending: boolean
  // Slot-Props fuer Context-UI
  headerSlot?: ReactNode       // Spieler-Info: player/detail vs manager/kader Context
  beforeFormSlot?: ReactNode   // z.B. Liga-Badge oder Rangliste-Info
  afterFormSlot?: ReactNode    // z.B. custom CTA oder Footer-Hint
}

function SellModalCore({ headerSlot, beforeFormSlot, afterFormSlot, ...coreProps }: SellModalCoreProps) {
  // Core uebernimmt: Form, FEE_RATE SSOT, preventClose, TradingDisclaimer, Validation, Liquidation-Guard
  return (
    <Modal open={open} preventClose={isPending}>
      {headerSlot}
      {beforeFormSlot}
      <SellForm ... />          {/* FEE_RATE einmal hier */}
      <TradingDisclaimer />     {/* IMMER im Core */}
      {afterFormSlot}
    </Modal>
  )
}

// Thin Wrapper: nur Context-UI via Slots
function SellModal({ player }: { player: Player }) {
  return (
    <SellModalCore
      headerSlot={<PlayerHeader player={player} />}
      onConfirm={handleConfirm}
      isPending={selling}
    />
  )
}
```

## Nutzen

- Zukuenftige Aenderungen (neue Fee-Struktur, neue Validation) aendern **nur den Core**
- Callsite-APIs bleiben unveraendert (keine Breaking-Changes fuer Caller)
- Compliance-Concerns (TradingDisclaimer, preventClose, FEE_RATE) koennen nicht versehentlich weggelassen werden
- Netto +187 LOC (inkl. Tests) eliminiert dauerhaftes Drift-Risiko

## Wann anwenden

- 2 Components haben >50% identischen Code
- Beide berühren Geld/Compliance/Security-Patterns
- Entstanden in verschiedenen Feature-Ordnern (parallel development)

## Audit

```bash
grep -rn "FEE_RATE\|TRADE_FEE_PCT" src/components/ src/features/
# Wenn gleicher Wert an >1 Stelle: Candidate fuer Shared Core
grep -l "SellModal\|BuyModal" src/components/ src/features/ | grep -v "Core\|test"
# Twin-Modals ohne "Core" im Namen: DRY-Refactor Kandidaten
```

## Array.sort() Mutation auf Props (begleitender Bug)

```typescript
// BAD: mutiert Props direkt — Re-Renders erzeugen andere Sort-Order als Parent erwartet
openBids.sort((a, b) => b.price - a.price)

// GOOD: Kopie zuerst
openBids.slice().sort((a, b) => b.price - a.price)
```

Audit: `grep -rn '\.sort(' src/components/ src/features/ | grep -v '\.slice()\|spread'`
