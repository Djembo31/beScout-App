# Slice 178a — `buy_player_sc` Idempotency-Integration

## Ziel

Money-Defense-in-Depth: `buy_player_sc` nutzt die generische Idempotency-Infrastruktur aus Slice 178 (`request_dedup_keys` + `check_or_reserve_dedup_key`) zur Verhinderung von Double-Spend bei Network-Retry. Schliesst den Loop, den Slice 151c.2 fuer `subscribe_to_club` inline etabliert hat — aber jetzt via wiederverwendbares Primitive.

## Betroffene Files

| File | Grund |
|------|-------|
| `supabase/migrations/20260424020000_slice_178a_buy_player_sc_idempotency.sql` | NEU — `CREATE OR REPLACE FUNCTION buy_player_sc` mit `p_idempotency_key TEXT DEFAULT NULL` Parameter |
| `src/lib/services/trading.ts` | UPDATE — `buyFromMarket` nimmt optionalen `idempotencyKey` entgegen und reicht ihn an RPC durch |
| `worklog/proofs/178a-replay.txt` | NEU — SQL-Replay-Test (zwei Calls same key → 1× wallet-deduct) |
| `worklog/reviews/178a-review.md` | NEU — Self-Review (Pattern-Wiederholung XS-Slice) |

## Acceptance Criteria

1. RPC `buy_player_sc` nimmt optionalen Parameter `p_idempotency_key TEXT DEFAULT NULL` entgegen — Caller ohne Key bekommen unveraendertes Verhalten (100% backward-compat).
2. Mit Key: erster Call reserviert via `check_or_reserve_dedup_key(p_user_id, p_idempotency_key, 300)`. Zweiter Call mit identischem `(user_id, idempotency_key)` innerhalb 300s gibt Cached-Response zurueck — kein erneutes wallet-deduct, kein zweiter Trade-Row.
3. Completion-UPDATE schreibt den JSON-Response in `request_dedup_keys.response` und setzt `status='completed'` — NACH dem INSERT von `trades` + `transactions`, vor dem RETURN.
4. Auth-Guard (`auth.uid() IS DISTINCT FROM p_user_id`) bleibt scharf — idempotency-check passiert NACH auth-guard, darf nie cross-user leaken.
5. Alle bestehenden Guards 1:1 preserved: advisory_lock, circular-trade-check, 24h-trade-limit, liquidation-check, club-admin-restriction, subscription-discount, transactions.type='trade_buy'/'trade_sell', fee-split, recalc_floor_price, credit_pbt, clubs.treasury_balance_cents.
6. REVOKE+GRANT Pattern erneuert (AR-44): `CREATE OR REPLACE` resettet Privilegien — REVOKE FROM PUBLIC/anon + GRANT authenticated erneut am Ende der Migration.
7. tsc `--noEmit` clean.
8. Service-Signatur backward-compat: bestehende Caller ohne `idempotencyKey` funktionieren unveraendert.

## Edge Cases

| Edge Case | Erwartetes Verhalten |
|-----------|----------------------|
| `p_idempotency_key = NULL` | Kein dedup-check, unveraenderter Path (backward-compat) |
| Erster Call mit Key, Success | Response gespeichert, `status='completed'`, expiry +300s |
| Erster Call mit Key, Fehler (z.B. insufficient BSD) | Response gespeichert mit `success=false`, `status='completed'` — Retry gibt identischen Fehler zurueck (nicht erneut versuchen — der Fehler ist die Wahrheit) |
| Zweiter Call identisch within 300s | Returns cached response, kein wallet-deduct, kein Trade |
| Zweiter Call identisch nach >300s expiry | Expiry-cleanup kommt per Cron (178b, pending) — bis dahin returned still cached response. Kein Risiko weil deterministic. (post-300s ist behavior auf "replay" konservativ.) |
| Gleicher Key, anderer User (cross-user retry-attack) | auth_uid_mismatch exception via check_or_reserve_dedup_key — erste Defense-Line |
| Gleiche dedup-key fuer zwei verschiedene Requests (key-collision vom Client) | Zweiter Request bekommt ersten Response — Client-Bug, aber DB-seitig safe (append-only) |
| RPC wirft Exception (z.B. circular_count >= 2 wurde via RETURN gemacht, aber unerwartet RAISE kommt) | dedup-row bleibt `status='pending'` mit `response=NULL`. Retry waehrend pending-row-existiert gibt `existing_response=NULL` zurueck. Service muss null-handle. (Edge-Case-Doku: siehe Proof-Plan Step 4.) |

## Proof-Plan

Schritt-fuer-Schritt SQL-Simulation via `mcp__supabase__execute_sql`:

1. **Setup:** pick Test-User `U1` (jarvis-qa@bescout.net) + Test-Player `P1` mit mind. 1 open sell-order. Balance capture.
2. **Call #1:** `buy_player_sc(U1, P1, 1, 'test-dedup-178a-001')` → capture response_1.
3. **Balance-Check #1:** wallet.balance sollte um `price*1 + fee` gesunken sein.
4. **Call #2 (Replay):** `buy_player_sc(U1, P1, 1, 'test-dedup-178a-001')` → capture response_2.
5. **Idempotency-Check:** `response_1 = response_2`, wallet.balance UNVERAENDERT nach Call #2, trades-count +1 (nicht +2).
6. **Dedup-Row-Check:** `SELECT status, response FROM request_dedup_keys WHERE dedup_key='test-dedup-178a-001'` → status='completed', response=JSON(response_1).
7. **Cleanup (optional):** `DELETE FROM request_dedup_keys WHERE dedup_key LIKE 'test-dedup-178a-%'` + trade reversal (manuell oder via admin).

Output: `worklog/proofs/178a-replay.txt` mit allen Queries + Responses.

## Scope-Out

- **178b** Cleanup-Cron fuer expired dedup-keys — separater Slice.
- **178c** `subscribe_to_club` inline-60s → generic-check migration — separater Slice.
- **178d** Client-side auto-generated idempotency-keys in `useSafeMutation` — separater Slice.
- **Weitere Money-RPCs** (`place_sell_order`, `buy_from_order`, `cancel_order`, `place_buy_order`, `cancel_buy_order`, `liquidate_player`, `openMysteryBox`, `subscribe_to_club`) — folgen einzeln via Pattern-Wiederholung.
- **E2E-Playwright-Test** — nicht in 178a. 178a ist DB-RPC + Service-Signatur; Client-Integration (useSafeMutation) kommt in 178d.

## Risiko-Assessment

**Money-Path, CEO-Scope.** Autonomer Grant durch CEO in aktiver Session ("voller Zugriff"). Risk-Minimierung:

- Backward-Compat via DEFAULT NULL Parameter — bestehende Caller sind nicht betroffen.
- Pattern bereits in Prod erprobt (Slice 151c.2 subscribe_to_club, seit 2026-04-23 live).
- SQL-Replay-Test VOR Commit.
- Self-Review (XS-Slice Pattern-Wiederholung, kein Reviewer-Agent noetig).
