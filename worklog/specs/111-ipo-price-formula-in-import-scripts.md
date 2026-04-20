# Slice 111 — ipo_price Formel-aware bei Player-Imports (MONEY)

## Ziel (1 Satz)
Alle Player-Import-Pfade setzen `ipo_price` nach CEO-Formel `MV_EUR / 10` cents statt Flat-Default `10000`, damit neu importierte Spieler den korrekten Card-Preis haben.

## Root-Cause (Audit Slice 108 Findings)

| File:Line | Status |
|-----------|--------|
| `scripts/import-league.mjs:215` | Flat `ipo_price: 10000` — stimmt NUR bei MV = 1.000.000 € |
| `scripts/enrich-from-transfermarkt.mjs:400-401` | Gleicher Flat bei Insert obwohl `market_value_eur` auf Zeile 397 verfügbar |
| `scripts/enrich-from-transfermarkt.mjs:426-428` | MV-Update ohne `ipo_price` Re-Sync → Drift wächst bei Re-Scrape |
| `src/lib/services/players.ts:218,230` | `createPlayer()` default `ipoPriceCents = 500` — Admin-Neuanlage ignoriert MV |
| `supabase/migrations/20260331_baseline_core.sql:108` | DB-DEFAULT `ipo_price=1000` — jeder Insert ohne explizites Setzen falsch |

## Betroffene Files

- `scripts/import-league.mjs` — Insert-Payload: `ipo_price = Math.max(Math.floor(marketValueEur / 10), 0)`
- `scripts/enrich-from-transfermarkt.mjs` — Insert + Update-Pfade
- `src/lib/services/players.ts` → `createPlayer()` Default-Ableitung
- `src/app/api/admin/players-csv/import/route.ts` (CSV-Bulk-Update ohne ipo_price-Sync — optional)
- Tests: Invariant `ipo_price_cents === FLOOR(market_value_eur / 10)` für neu importierte Players

## Acceptance Criteria

1. Neu importierter Player mit `market_value_eur = 1_000_000` → `ipo_price = 100_000` cents.
2. Neu importierter Player mit `market_value_eur = 0` → `ipo_price = 0` (kein negativer Wert).
3. `enrich-from-transfermarkt` Update-Branch synct `ipo_price` nach jedem MV-Update.
4. `createPlayer()` ohne expliziten `ipoPrice`-Arg → Formel aus `marketValueEur`.
5. Integration-Test: Import 1 Test-Player → verify DB `ipo_price = MV/10`.
6. Bestehende Player werden NICHT rückwirkend geändert (nur neue Imports betroffen).

## Edge Cases

1. **MV = NULL** — Fallback auf 0 oder bestehender ipo_price (keine Zero-Price-IPO-Guard-Verletzung)
2. **MV < 10 EUR** — Integer-Division → 0 → `buy_from_ipo` Zero-Price-Guard blockt IPO-Launch (OK, niedrig-MV-Spieler brauchen eh manuellen Setup)
3. **AR-6 Layer 1 Filter**: Bulk-Launch nutzt `ipo_price >= 1000` — MVs > 10.000 € passieren automatisch, kleinere brauchen manuellen Override
4. **Re-Scrape überschreibt manuelle Admin-Korrektur** — Admin-UI sollte `ipo_price_manual_override` Flag haben (separater Slice)
5. **Backfill-Skript**: Bestehende Flat-Default-Players updaten? → Risiko: bereits gelaunchte IPOs sind unveränderlich (trading.md). Backfill NUR für Players ohne aktive IPO.

## Proof-Plan

- `worklog/proofs/111-import-before.txt` — SELECT first_name, last_name, market_value_eur, ipo_price FROM players WHERE created_at > '2026-04-20' LIMIT 20
- `worklog/proofs/111-import-after.txt` — Gleich nach Migration
- `worklog/proofs/111-invariant-check.sql` — Neue Row COUNT WHERE ipo_price != FLOOR(market_value_eur / 10)
- Unit tests für `createPlayer()` Default-Ableitung

## Scope-Out

- Backfill bestehender Players (separater Slice mit CEO-Approval)
- CSV-Import-Route ipo_price-Sync (falls bestehende Workflow bricht)
- Admin-UI "Manual ipo_price override" (post-Beta)
