# Slice 179 — Transactions Append-Only (Tier A2)

**Typ:** XS-Slice DB-Migration. Money-Path: JA (CEO-Scope per User explicit grant "voller Zugriff").
**Impact:** skipped (defense-in-depth DB-invariant, no runtime impact).

---

## Ziel

`transactions` Tabelle **append-only** absichern — kein UPDATE, kein DELETE zur Runtime. Laut `CLAUDE.md` Money-Regeln bereits dokumentiert ("Trades/Transactions append-only") aber **nicht enforced** auf DB-Ebene.

**Implementation:**
1. REVOKE UPDATE, DELETE privilege von anon + authenticated (RPC mit SECURITY DEFINER bleibt operational)
2. Defense-in-depth Trigger BEFORE UPDATE OR DELETE raise exception — mit opt-in GUC `bescout.allow_transactions_mutation` fuer legitimierte one-time-backfills

---

## Betroffene Files

| # | File | Aenderung |
|---|------|-----------|
| 1 | `supabase/migrations/20260424000000_transactions_append_only.sql` | NEU — REVOKE + Trigger + GUC-opt-in |

## Acceptance Criteria

1. **A1** — REVOKE UPDATE, DELETE on public.transactions FROM anon, authenticated
2. **A2** — BEFORE UPDATE OR DELETE Trigger `transactions_append_only_guard` raises exception
3. **A3** — GUC `bescout.allow_transactions_mutation` = 'true' (SET LOCAL) erlaubt Exception-Bypass fuer legitimierte one-time-backfills
4. **A4** — INSERT unveraendert operational
5. **A5** — Post-Apply Verify: `SELECT * FROM pg_policies WHERE tablename='transactions'` zeigt SELECT-only
6. **A6** — Post-Apply Verify: `SELECT * FROM pg_trigger WHERE tgrelid = 'public.transactions'::regclass` zeigt neuen Trigger
7. **A7** — Post-Apply Verify: Direkter `UPDATE transactions SET ... WHERE id = 'x'` schlaegt fehl mit expected exception

## Proof

`worklog/proofs/179-transactions-append-only.txt` — pg_policies + pg_trigger Dumps + Negative-UPDATE-test-output.

## Risks

- **RPC-Impact:** Keine bekannten RPCs `UPDATE`/`DELETE` transactions. Falls ein SECURITY-DEFINER-RPC das doch tut → Trigger-Exception blockt den Flow. Muss vorher greppen.
- **Admin-Refund-Flow:** BeScout hat keinen Refund-Flow in V1. Falls eingefuehrt → RPC setzt `SET LOCAL bescout.allow_transactions_mutation = 'true'`.

## Time

~15 min.
