# Slice 025 — Holdings Auto-Delete-Zero (Trigger Approach)

**Groesse:** S · **CEO-Scope:** ja (Money/Trading) · **Approval:** (b) Trigger-Approach 2026-04-17

## Ziel

Zombie-Holdings (`quantity = 0`) vermeiden via `AFTER UPDATE OF quantity ON holdings`-Trigger, der Row sofort loescht wenn `NEW.quantity = 0`. Future-Proof: alle bestehenden **und zukuenftigen** Decrement-RPCs laufen automatisch richtig, ohne Call-Site-Aenderung.

## Stand heute

- **513 holdings live, 0 zombies** — dieser Fix ist Future-Proofing, kein Cleanup.
- **3 Decrement-RPCs:** `accept_offer`, `buy_from_order`, `buy_player_sc` — UPDATE ohne DELETE-when-zero. `buy_from_ipo` ist **nur Increment** (briefing-Liste war +1 inkorrekt).
- **CHECK:** `positive_quantity CHECK (quantity >= 0)` — bleibt unveraendert.
- **liquidate_player** nutzt bereits DELETE — unveraendert.

## Betroffene Files

| File | Was |
|------|-----|
| **NEU** `supabase/migrations/YYYYMMDDHHMMSS_holdings_auto_delete_zero.sql` | Trigger-Function `delete_zero_qty_holding()` + Trigger `holdings_auto_delete_zero` AFTER UPDATE OF quantity |
| `src/lib/__tests__/db-invariants.test.ts` | INV-29: Trigger existiert + live-count `WHERE quantity = 0` = 0 |

Keine RPC-Aenderung. Kein Client-Code. Keine CHECK-Aenderung.

## Acceptance Criteria

1. **Trigger registriert:** `SELECT tgname FROM pg_trigger WHERE tgrelid='public.holdings'::regclass AND tgname='holdings_auto_delete_zero'` → 1 Row.
2. **Trigger-Function existiert:** `get_rpc_source('delete_zero_qty_holding')` enthaelt `DELETE FROM holdings` + `NEW.quantity = 0`.
3. **Idempotent Apply:** Re-apply der Migration (DROP TRIGGER IF EXISTS + CREATE) ohne Fehler.
4. **Smoke-Test live:** `UPDATE holdings SET quantity = 0 WHERE ...` auf einem test-record → row DELETED (nicht UPDATE mit qty=0 persistiert).
5. **Non-Zero-Update unbeeinflusst:** `UPDATE SET quantity = quantity - 1` bei qty=3 → qty=2, Row bleibt.
6. **Defense-in-Depth:** live-count `WHERE quantity <= 0` = 0.
7. **tsc clean + db-invariants gruen inkl. INV-29.**

## Edge Cases

1. **Concurrent: 2 parallele UPDATEs auf gleiche Row** → PostgreSQL-Row-Lock, serialisiert. Beide sehen die Row zeitlich getrennt. Trigger feuert nach jedem UPDATE, zweiter findet die Row ggf. schon geloescht → NO-OP.
2. **INSERT mit quantity = 0** — CHECK (quantity >= 0) erlaubt es. Trigger ist nur AFTER UPDATE, nicht AFTER INSERT. Edge-case aber aktuell nicht vorhanden (INSERT kommt nur aus RPC mit qty >= 1).
3. **UPDATE mit ungeaendertem quantity** (z.B. nur updated_at) → Trigger WHEN (NEW.quantity = 0) feuert nur bei echtem 0-result. Normal-UPDATEs unberuehrt.
4. **Foreign-Key-Abhaengigkeiten:** `trades` / `transactions` referenzieren holdings NICHT direkt (via player_id + user_id). Kein FK-Cascade-Risiko.
5. **RLS:** Trigger laeuft als `postgres` / Table-Owner → bypasst RLS. Sicher.
6. **holding_locks / lineups** — deren FK-Abhaengigkeiten auf holdings? Actually `holding_locks` FK ist auf player_id/user_id (nicht holdings.id). Kein Cascade.

## Proof-Plan

| Artefakt | Inhalt |
|----------|--------|
| `worklog/proofs/025-trigger-listing.txt` | `SELECT tgname, tgenabled, tgtype FROM pg_trigger WHERE tgrelid='public.holdings'::regclass` |
| `worklog/proofs/025-trigger-body.txt` | `get_rpc_source('delete_zero_qty_holding')` |
| `worklog/proofs/025-smoke-test.txt` | Smoke-Test: INSERT test-holding → UPDATE qty=0 → verify DELETED |
| `worklog/proofs/025-zombie-count.txt` | `SELECT COUNT(*) FROM holdings WHERE quantity <= 0` = 0 before + after |
| `worklog/proofs/025-tsc.txt` | tsc clean |
| `worklog/proofs/025-tests.txt` | db-invariants 27/27 inkl. INV-29 |

## Scope-Out

- **CHECK constraint-Verschaerfung** (`> 0`) — nicht noetig, Trigger bridged states atomisch.
- **RPC-Aenderungen** — bleiben unveraendert (Zero-Touch).
- **INSERT-Trigger** — nicht Teil dieses Slice (Edge-case ohne Live-Vorkommen).
- **liquidate_player** — bleibt mit explizitem DELETE (kein Konflikt).

## Slice-Groesse-Rationale: S

- 1 Migration (Trigger-Fn + Trigger)
- 1 Test-Erweiterung (INV-29)
- 0 Code-Aenderung
- Scope-Out verhindert Creep

## Rollback

```sql
DROP TRIGGER IF EXISTS holdings_auto_delete_zero ON public.holdings;
DROP FUNCTION IF EXISTS public.delete_zero_qty_holding();
```

Keine Daten-Migration, keine Rueckabwicklung noetig.

## Ready fuer BUILD.
