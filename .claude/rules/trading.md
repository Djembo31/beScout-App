---
paths:
  - "src/lib/services/trading*"
  - "src/lib/services/wallet*"
  - "src/lib/services/ipo*"
  - "src/lib/services/offers*"
  - "src/components/market/**"
  - "src/app/**/market/**"
---

## Geld-Regeln
- IMMER als BIGINT cents (1,000,000 cents = 10,000 $SCOUT)
- Alle Geld-Operationen als atomare DB Transactions (RPCs)
- Trades/Transactions append-only (kein UPDATE/DELETE auf Logs)
- `fmtScout()` fuer Formatierung, `$SCOUT` user-sichtbar
- `ipo_price` = fest, `floor_price` = MIN(sell orders)
- NIEMALS leere `.catch(() => {})` — mindestens `console.error`

## MiCA/CASP Compliance
- NIEMALS: Investment, ROI, Profit, Rendite, Dividende, Gewinn, Ownership
- IMMER: Utility Token, Platform Credits, Scout Assessment
- $SCOUT = "Platform Credits", DPC = "Digital Player Contract"

## Closed Economy (Phase 1)
- KEIN Cash-Out, KEIN P2P-Transfer, KEIN Exchange
- Kein Withdrawal-Feature bauen. Auch nicht versteckt.
