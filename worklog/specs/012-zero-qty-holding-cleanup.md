# 012 — Zero-Qty Holding Cleanup (INV-08, EDGE-17)

## Ziel

Einmalige Data-Cleanup: 1 Orphan-Row in `holdings` mit `quantity = 0` (user=`jarvisqa`, player=`Livan Burcu`, avg_buy_price=10000, created 2026-04-15). Test INV-08 + EDGE-17 failen weil sie `quantity <= 0` als Violation treaten.

Root-Cause (NICHT in diesem Slice gefixt): Money-Flow-RPCs (`buy_player_sc`, `accept_offer`, `buy_from_order`, `buy_from_ipo`) machen `UPDATE holdings SET quantity = quantity - p_quantity` statt DELETE-when-zero. Resultierende quantity=0-Rows bleiben liegen. **RPC-Fix ist Money-Scope → CEO-Approval erforderlich** — separater Slice nach CEO-Check.

Fuer jetzt: Die eine existierende Row loeschen, um die Tests zu unblocken + Datenhygiene wiederherzustellen. Die RPC-Quelle wird als Follow-Up dokumentiert (erste neue quantity=0-Row nach diesem Slice = Beweis dass RPCs broken sind → CEO-Entscheidung).

## Klassifizierung

- **Slice-Groesse:** XS (1 Data-Migration, 1 Row)
- **Scope:** **CTO-autonom** — Data-Cleanup auf Test-User-Row ohne Value-Impact (quantity=0 = 0 DPCs = 0 SC), ohne Trade-Log-Aenderung, ohne Wallet-Veraenderung.
- **CEO-Hinweis dokumentieren:** RPC-Fix (`UPDATE → DELETE-when-zero`) ist Money-RPC-Change → CEO approval needed. Follow-Up in naechster Session wenn Anil nickt.

## Betroffene Files

| File | Aenderung |
|------|-----------|
| `supabase/migrations/20260417030000_cleanup_zero_qty_holding.sql` (NEW) | `DELETE FROM holdings WHERE quantity = 0` + Audit-Log-Kommentar |

## Acceptance Criteria

1. Migration angewandt, 1 Row geloescht.
2. `SELECT * FROM holdings WHERE quantity <= 0` → 0 Rows.
3. Vorher-Nachher-Counts dokumentiert.
4. INV-08 + EDGE-17 Tests gruen.

## Edge Cases

1. **Concurrent Race**: Zwischen Spec + Apply kauft jarvisqa wieder Livan-Burcu-DPCs → Row wird auf positiv-Quantity UPDATEt → DELETE greift nicht. Kein Problem, invariante bleibt gewahrt.
2. **Multi-Row**: Falls zwischen Spec + Apply eine weitere quantity=0-Row entsteht (RPC-Bug): Migration loescht sie auch. OK.
3. **Future orphan**: Wenn erste post-cleanup quantity=0-Row wieder entsteht → Tests failen erneut → CEO-Fix-Slice fuer RPCs triggern.

## Proof-Plan

- `worklog/proofs/012-before-after.txt` — SQL-Query vorher (1 Row) + nachher (0 Rows) + migration DELETE count
- `worklog/proofs/012-tests.txt` — INV-08 + EDGE-17 vitest run (gruen)

## Scope-Out

- **Permanent RPC-Fix** (`UPDATE → DELETE-when-zero` in trading RPCs): CEO-Scope, separater Slice.
- **Tight CHECK constraint** (`quantity > 0` statt `>= 0`): nur zusammen mit RPC-Fix sinnvoll (sonst faellt jede Sell-all-Transaction in `buy_player_sc` durch CHECK-Rollback), separater Slice.
- **Audit-Helper fuer orphan-holdings**: nice-to-have, separater Slice.

## Stages

- SPEC — dieses File
- IMPACT — inline (Data-only, 1 Row, kein Trade-Impact)
- BUILD — 1 Migration
- PROVE — before/after + tests
- LOG — commit + log.md + CEO-Hinweis im Notes
