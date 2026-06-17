# Backend Journal: expire_pending_orders filled_quantity → filled_qty

## Gestartet: 2026-04-15

### Verstaendnis
- Was: Cron-step `expire_pending_orders` wirft PG 42703 "column filled_quantity does not exist". RPC referenziert `filled_quantity` 2x, aber Live-Schema hat `filled_qty`. Pattern = AR-42 (RPC INSERT Column-Mismatch).
- Betroffene Tabellen: `public.orders` (read, FOR UPDATE, status update)
- Betroffene Services: keine Client-Services — RPC wird nur vom Cron via service_role aufgerufen.
- Cascade: keine — RPC hat keine Caller ausser `/api/cron/gameweek-sync` (global step).
- Risiken (aus Skill + common-errors.md):
  - AR-42-Pattern: CREATE OR REPLACE parst Body nicht gegen Live-Schema. Bug lebt still bis Call.
  - AR-44-Pattern: SECURITY DEFINER braucht REVOKE-Block. Original AR-51 hat korrekten REVOKE (PUBLIC + anon + authenticated). Beibehalten.

### Schema-Check (Live via OpenAPI + SAMPLE-Select, 2026-04-15)
`public.orders` columns (SSOT):
- id, user_id, player_id, side, price, quantity, filled_qty, status, created_at, expires_at

`filled_quantity` existiert NICHT. `filled_qty` ist established convention (116 occurrences in 43 files, incl. alle anderen RPCs, Types, Services, Tests).

### Bug-Reproduce (live)
```
POST /rest/v1/rpc/expire_pending_orders
→ 400 {"code":"42703","message":"column \"filled_quantity\" does not exist"}
```

### Entscheidungen
| # | Entscheidung | Warum |
|---|---|---|
| 1 | NUR `filled_quantity` → `filled_qty` im Body fixen | Minimal-Scope, Root Cause. |
| 2 | REVOKE-Block vollstaendig beibehalten (3 Zeilen: PUBLIC, anon, authenticated) | AR-51 Original hatte bereits korrekten REVOKE. Spec sagt: "RPC wird nur vom Cron (service_role) aufgerufen → REVOKE von authenticated auch, GRANT nur auf service_role". service_role hat per default EXECUTE auf alle public Funktionen — kein extra GRANT noetig. |
| 3 | Escrow-Release-Logik (balance stays, locked_balance decreases) NICHT aendern | Semantisch korrekt: `balance` = total, `locked_balance` = escrow, `available = balance - locked_balance`. place_buy_order erhoeht nur locked_balance, cancel macht GREATEST(0, locked_balance - X). Konsistent mit cancel_buy_order + expire_pending_buy_orders (20260319). |
| 4 | `buy_count` per GET DIAGNOSTICS bleibt (suboptimal: zaehlt nur letztes UPDATE-Statement = 1) | NICHT in Scope. Pre-existing AR-51 Issue, RPC liefert trotzdem `status:success`. Dokumentiere als Reviewer-Note. |
| 5 | Keine Parameter-Aenderung an RPC-Signatur | `expire_pending_orders()` hat keine Args → keine Caller-Cascade. |

### Fortschritt
- [x] Live-Schema introspected (OpenAPI + Sample-Row)
- [x] Bug live reproduziert (POST /rest/v1/rpc/expire_pending_orders → 42703)
- [x] Migration geschrieben (20260415210000_xc15_*)
- [x] SQL-Struktur validiert (8 Body-Checks gruen, REVOKE-Block korrekt)
- [x] `npx tsc --noEmit` clean (keine Client-Dateien angefasst)
- [x] Commit
- [ ] **BLOCKED BY ORCHESTRATOR:** `mcp__supabase__apply_migration` (Agent hat keinen MCP-Zugriff, nur Main-Session)
- [ ] Post-verify via MCP (nach Apply)
- [ ] Cron Manual-Trigger + status:success (nach Apply)

### Runden-Log
- Runde 1 (GRUEN): OpenAPI-Introspect → `orders.filled_qty` bestaetigt. Live-Call reproduziert PG 42703. Migration-File geschrieben mit 2x `filled_quantity`→`filled_qty` im Body. REVOKE-Block unveraendert aus AR-51 (PUBLIC + anon + authenticated). Keine Scope-Creep-Aenderungen.
- Runde 2 (GRUEN): SQL-Struktur-Validation (8 Body-Checks). TSC clean (no TS impact).
- **HANDOFF-PUNKT:** Migration liegt committed. Orchestrator MUSS via MCP applien:
  ```
  mcp__supabase__apply_migration({
    project_id: 'skzjfhvgccaeplydsunz',
    name: 'xc15_expire_pending_orders_filled_qty_column_fix',
    query: <Inhalt des Files>
  })
  ```
- Nach Apply: Direkt-Test mit `POST /rest/v1/rpc/expire_pending_orders` (service_role). Erwartet: `200` + numerischer Body (expired_count). Falls 42703 weiterhin: rollback indiziert.

### Known Pre-Existing Issues (NICHT im Scope)
- AR-51 Buy-Loop: `GET DIAGNOSTICS buy_count = ROW_COUNT` nach FOR LOOP erfasst nur das letzte UPDATE-Statement (= 1 wenn Loop lief, 0 wenn nicht). Return-Value `expired_count` ist dadurch unter-zaehlig bei mehreren expired buys. NICHT im "column does not exist" Fix-Scope — dokumentiert fuer Reviewer.

### Schema-Evidence (Live 2026-04-15)
```
ORDERS_OPENAPI_COLUMNS (from /rest/v1/ OpenAPI spec):
  id: uuid, user_id: uuid, player_id: uuid,
  side: text, price: bigint, quantity: integer,
  filled_qty: integer,    <-- DAS ist die echte Spalte
  status: text, created_at: tstz, expires_at: tstz

TRANSACTIONS_OPENAPI_COLUMNS:
  id: uuid, user_id: uuid, type: text, amount: bigint,
  balance_after: bigint, reference_id: uuid,
  description: text, created_at: tstz

WALLETS_OPENAPI_COLUMNS:
  user_id: uuid, balance: bigint, locked_balance: bigint,
  created_at: tstz, updated_at: tstz
```
Alle INSERT/UPDATE-Targets im RPC passen zu diesen Columns.

### Verify-Commands (fuer Orchestrator)
```sql
-- 1. Nach Apply: Body-Check
SELECT pg_get_functiondef('public.expire_pending_orders'::regproc)
  ~ 'filled_qty\b' AS has_correct_column,
  pg_get_functiondef('public.expire_pending_orders'::regproc)
  ~ 'filled_quantity' AS still_has_bug;
-- Expected: has_correct_column=true, still_has_bug=false (Comments-only ok)

-- 2. Live-Call: Run + return
SELECT public.expire_pending_orders();
-- Expected: integer >= 0 (count of expired orders)
```

Oder via Cron-Endpoint:
```bash
curl -X POST https://bescout.net/api/cron/gameweek-sync \
  -H "Authorization: Bearer <CRON_SECRET>"
# Erwartete Response-Entry:
# {"step":"expire_pending_orders", "status":"success", "details":{...}, ...}
```

## LEARNINGS

- **AR-42 Pattern repeated (3rd occurrence):** `CREATE OR REPLACE FUNCTION` validiert Column-Existenz nicht. AR-51 Migration wurde applied ohne Live-Call-Verify → 9h silent bug (Buy-Orders expired nicht, Escrow bleibt gelocked). Healing-Pattern: NACH jedem apply_migration fuer einen RPC MUSS ein Dry-Run-Call gegen die RPC erfolgen (wenn safe).
- **Cron-Step-Bugs sind teuer:** Sell-Branch UPDATE wird vor dem Buy-FOR-Loop compiled → crasht spaet, ganze Transaction rollback → ALLE expired orders (sell + buy) bleiben open. Ein Column-Typo hat BEIDE Branches getoetet.
- **OpenAPI-Introspection als Live-Schema-SSOT:** `/rest/v1/` root liefert vollstaendige Column-Liste + Typen ohne DDL-Access. Schneller als `\d+ orders` via MCP und funktioniert mit nur ServiceRole.
- **Agent-MCP-Gap:** Worktree-Agents haben keinen MCP-Zugriff. Fuer Migrations muss die Apply-Phase zurueck an den Orchestrator. Solo-Lauf nicht moeglich ohne DB-Password oder Admin-RPC.
- **Known Issue AR-51 Buy-Count:** Latenter Bug (nicht in Scope), dokumentiert fuer Reviewer — `GET DIAGNOSTICS ROW_COUNT` nach FOR-LOOP erfasst nur das letzte statement.
