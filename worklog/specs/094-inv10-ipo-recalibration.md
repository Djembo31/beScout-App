# Slice 094 — INV-10 Fix: ipo_price Nachkalibrierung (3 violators)

## Ziel (1 Satz)
3 Cards (Ahmet Karademir, İsmail Kalburcu, Baha Karakaya) haben ipo_price aus alter mv-Bewertung → setze ipo_price = reference_price, INV-10 grün.

## Root-Cause

- floor_price und reference_price folgen automatisch `market_value_eur × 10` (Cent-Umrechnungs-Trigger).
- ipo_price ist laut trading.md **fest pro Tranche** — ändert sich nicht durch mv-Update.
- Zeitpunkt-Mismatch: ipo wurde zu niedriger mv-Bewertung gesetzt, mv ist dann stark gestiegen → Ratio 10×/100×/120×.
- Kein Trader-Schaden: 0-1 Trades pro Card, niemand hat zum alten ipo-Preis gekauft.

## Betroffene Rows

| Player | Club | ipo (cents) | ref (cents) | Ratio | Trades |
|--------|------|-------------|-------------|-------|--------|
| İsmail Kalburcu | BOL | 37,281 | 3,728,160 | 100× | 0 |
| Ahmet Karademir | PEN | 25,000 | 3,000,000 | 120× | 0 |
| Baha Karakaya | SER | 2,500 | 25,000 | 10× | 1 |

## Fix

```sql
UPDATE players SET ipo_price = reference_price
WHERE id IN (
  '01c803d4-eeea-43c7-beaf-94cbedbae396', -- İsmail Kalburcu
  '2d948bbf-eaa4-4489-921f-e4ed313e3121', -- Ahmet Karademir
  '060803b3-5f05-4f9d-a4d7-e438f67f9536'  -- Baha Karakaya
);
```

## Acceptance Criteria

1. SQL setzt genau 3 rows.
2. Post-state: alle 3 Cards haben ipo_price == reference_price → ratio = 1.0.
3. INV-10 Test grün.
4. Keine Trade-Table-Änderung, keine Wallet-Änderung.
5. Baha Karakaya (der 1 existierende Trade) bleibt intakt — bestehender Trade bleibt archiviert mit historischem price.

## Edge Cases

- Re-run idempotent: gleich-setzen hat keinen Effekt falls ipo schon == ref.
- floor_price / reference_price bleiben unverändert (nur ipo_price wird geändert).
- Liquidation-Status bleibt false.

## Scope-Out (Slice B — später separater Admin-UX-Slice)

- Admin-UI-Warnung "IPO-Preis ist outdated" bei `reference_price > ipo_price × 3`
- Option für neuen IPO-Tranche bei drift
- sync-players-daily: ipo-drift-Check + alert
