# Slice 034 — buy_player_sc transactions.type Fix + INV-Drift-Guard

**Groesse:** M · **CEO-Scope:** JA (Money-RPC) · **Typ:** P0 Hot-Fix + Regression-Guard

## Ziel

`buy_player_sc` schreibt `transactions.type='buy'/'sell'`, CHECK-constraint erlaubt nur `'trade_buy'/'trade_sell'`. Jeder Buy-Versuch crashed mit HTTP 400 (siehe Slice 032 Flow 5 + postgres-Logs). Fix: korrekte Type-Werte schreiben + INV-Test der alle RPCs scannt um aehnliche Drifts in der Zukunft sofort zu fangen.

## Bug-Beweis

postgres-Log (Slice 032 Flow 5):
```
ERROR  new row for relation "transactions" violates check constraint "transactions_type_check"
WARNING  trg trade_refresh failed: auth_uid_mismatch: Nicht berechtigt   (← separater Bug, Slice 035)
```

Live-DB:
- 16 type-Werte in Verwendung, alle valid
- `trade_buy`/`trade_sell` = je 68 Eintraege, **letzter erfolgreicher Trade: 2026-04-15** (von altem `buy_from_order`)
- `'buy'` / `'sell'` = 0 Eintraege → buy_player_sc hat **NIE** erfolgreich geschrieben

RPC-Body Audit (`pg_get_functiondef(buy_player_sc)`):
```sql
INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description) VALUES
    (p_user_id, 'buy', -v_total_cost, ...),       -- ❌
    (v_order.user_id, 'sell', v_seller_proceeds, ...);  -- ❌
```

Korrekte Vorlage in `buy_from_order` (alter RPC, korrekt):
```sql
INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description) VALUES
    (p_buyer_id, 'trade_buy', -v_total_cost, v_buyer_new_balance, v_trade_id, 'Kauf: ' || ...),
    (v_order.user_id, 'trade_sell', v_seller_receives, v_seller_new_balance, v_trade_id, 'Verkauf: ' || ...);
```

## Audit-Findings (alle transactions-INSERT RPCs)

41 RPCs schreiben in `transactions`. Drift-Liste:

| RPC | Schreibt | CHECK-Status |
|-----|----------|--------------|
| **buy_player_sc** | `'buy'`, `'sell'` | ❌ NICHT in CHECK — **Slice 034 (HIER)** |
| cast_community_poll_vote | `'poll_earning'` | ❌ NICHT (CHECK hat `'poll_earn'`) — Slice 037 |
| unlock_research | `'research_earning'` | ❌ NICHT (CHECK hat `'research_earn'`) — Slice 037 |
| calculate_ad_revenue_share | `'ad_revenue_payout'` | ❌ fehlt im CHECK — Slice 037 |
| calculate_creator_fund_payout | `'creator_fund_payout'` | ❌ fehlt im CHECK — Slice 037 |
| cast_vote | `'vote_fee'` | ❌ fehlt im CHECK — Slice 037 |
| rpc_cancel_event_entries / rpc_unlock_event_entry | `'event_entry_unlock'` | ❌ fehlt im CHECK — Slice 037 |
| subscribe_to_scout | `'scout_subscription'`, `'scout_subscription_earning'` | ❌ fehlen im CHECK — Slice 037 |
| Andere 33 RPCs | korrekte Types | ✓ |

Alle anderen Drifts sind in inaktiven oder seltenen Code-Pfaden (cast_vote, polls, scout-subscriptions). Slice 034 fokussiert auf `buy_player_sc` (live-blocker), Slice 037 wird die uebrigen 7 systematisch fixen — INV-Test (hier eingefuehrt) verriegelt den Kontrakt nachhaltig.

## Aenderungen

1. **Migration** `20260417XXXXXX_buy_player_sc_transactions_type_fix.sql`:
   - `CREATE OR REPLACE FUNCTION buy_player_sc(...)` mit identischem Body, nur:
     - `'buy'` → `'trade_buy'`
     - `'sell'` → `'trade_sell'`
     - description analog `buy_from_order` (`'Kauf: '||p_quantity||'x '||first_name||' '||last_name`)
   - REVOKE EXECUTE FROM PUBLIC, anon (AR-44)
   - GRANT EXECUTE TO authenticated

2. **Migration** `20260417XXXXXX_audit_helper_rpc_transaction_types.sql`:
   - Audit-Helper-RPC `get_rpc_transaction_types()` die alle Funktionen scannt + extrahierte type-Strings zurueckgibt.
   - SECURITY DEFINER, REVOKE all, GRANT service_role only (analog `get_rls_policy_quals`).

3. **INV-Test** `INV-30: rpc_transactions_type_in_check_constraint`:
   - Liest `pg_constraint` fuer `transactions_type_check` (alle erlaubten Werte)
   - Liest `get_rpc_transaction_types()` (alle in RPCs verwendeten Werte)
   - Diff darf nur leer sein (oder explizite Allowlist).
   - **Faengt Slice 037 Drifts AUTO** und alle zukuenftigen.

4. **Test (vitest)** `src/lib/services/__tests__/buy-player-sc.test.ts` (optional, falls Service-Layer betroffen): NICHT noetig, da Service nur RPC-Aufruf wraps.

## Acceptance Criteria

1. Live-Buy 1 SC auf bescout.net laeuft durch (kein 400, Wallet decremented korrekt)
2. `transactions` zeigt 2 neue Rows mit `type='trade_buy'` + `type='trade_sell'`
3. INV-30 Test gruen (zaehlt aktuell 8 Drift-Pattern, nach 034 noch 7)
4. activityHelpers zeigt `trade_buy`/`trade_sell` im Transaction-History (DE+TR)
5. tsc clean + alle bestehenden Tests gruen

## Proof-Plan

- `worklog/proofs/034-rpc-body-before.txt` — buy_player_sc body vor Fix
- `worklog/proofs/034-rpc-body-after.txt` — buy_player_sc body nach Fix
- `worklog/proofs/034-live-buy.png` — Screenshot Buy-Modal nach erfolgreichem Buy + Toast
- `worklog/proofs/034-live-buy.txt` — Wallet-Diff vorher/nachher + transactions-Row aus DB
- `worklog/proofs/034-inv30.txt` — INV-30 Output (zeigt verbleibende 7 Slice-037-Items als Findings, nicht als Failure — Allowlist)
- `worklog/proofs/034-tsc-vitest.txt` — tsc + Tests gruen

## Scope-Out

- Slice 035 (`trg trade_refresh auth_uid_mismatch`) — separater Trigger-Fix
- Slice 036 (`sync_event_statuses permission denied`) — separater Grant-Fix
- Slice 037 (7 weitere Drift-RPCs) — folgt direkt nach 034
- Cancel `buy_from_order` (alter RPC) entfernen — keine Code-Aufrufer mehr, aber DROP riskant (FK?). Defer.

## Risiken

- INV-30 Test wird sofort 7 weitere Drifts melden. Wir machen sie Allowlist-eintraegig damit Slice 037 sie nacheinander aufraeumt ohne den Test rot zu machen.
- buy_player_sc ist SECURITY DEFINER — REVOKE/GRANT analog buy_from_order MUSS gepairt werden.
