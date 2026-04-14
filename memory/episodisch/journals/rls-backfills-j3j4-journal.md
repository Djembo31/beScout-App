# Backend Journal: RLS-Policies + Data-Backfills (J3/J4 CEO-Schnellbahn)

## Gestartet: 2026-04-14

### Verstaendnis
- **Was:** 5 AR-Items durchziehen (AR-13/14/20/24/30) — RLS + Data-Backfills
- **Betroffene Tabellen:** trades, transactions, orders, lineups, ipos, ipo_purchases, holdings
- **Betroffene Services:** keine direkt (nur DB-side)
- **Risiken:**
  - AR-13: Supply-Invariant muss gruen bleiben nach Backfill
  - AR-14: Service-Consumers muessen weiterhin funktionieren (own-read ok)
  - AR-20: FK Constraint Aenderung — alle current queries pruefen
  - AR-24/30: Column-Level-Grants nicht schnell reversibel → View-Pattern bevorzugt

### Reihenfolge (Safe-First)
1. **AR-14** — RLS Lockdown transactions (non-destructive, einfach)
2. **AR-20** — Orphan ipo_id Backfill + FK Aenderung (data-only + schema)
3. **AR-13** — Phantom-SCs Backfill (komplex, braucht Seed-IPO)
4. **AR-24** — trades public-whitelist (RLS-Umbau)
5. **AR-30** — lineups public-whitelist (RLS-Umbau)

### Entscheidungen
| # | Entscheidung | Warum |
|---|--------------|-------|
| 1 | AR-13: null-seller trades mit SEED-IPO + price=0 | Minimaler Foot-Print, FK-Constraint safe, macht Invariant gruen |
| 2 | AR-24/30: View-Pattern fuer public-reads | Postgres column-level-grants brauchen revoke-dance, View ist cleaner |
| 3 | Seed-Bot-Accounts ohne Trade-Aktivitaet bekommen Phantom-Trade mit seller=NULL statt INSERT INTO ipo_purchases (CEO-A), um existing ipos nicht zu brechen |

### Fortschritt
- [ ] AR-14: RLS Lockdown transactions
- [ ] AR-20: Orphan ipo_id Backfill + FK SET NULL
- [ ] AR-13: 707 Phantom-SCs Backfill
- [ ] AR-24: trades public-whitelist
- [ ] AR-30: lineups public-whitelist

### Runden-Log

**Runde 1 — AR-14 Migration geschrieben**
- File: `supabase/migrations/20260414211000_ar14_rls_transactions_lockdown.sql`
- Approach: DROP `transactions_select_public_types`, keep `transactions_select_own` only
- Downstream-Impact: Profile Timeline fuer fremde Users wird leer (Migration intention, CEO-approved)
- Verify: Wird via mcp-apply + anon-client test erfolgen

