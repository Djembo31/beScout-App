# Slice 413 — Welle 1.5(a/c/d/e): Markt-Kauf-RPCs vereinheitlichen

**Slice-Type:** Migration (Money/CEO — 2 SECURITY DEFINER Kauf-RPCs)
**Größe:** M
**Welle:** 1 Trading (Mock→Pro) — 1.5-Cluster Restpunkte a/c/d/e

## 1. Problem-Statement (live-verifiziert, D87, 2026-06-27)
`buy_player_sc` (Markt, picked günstigste Fremd-Order) und `buy_from_order` (gewählte Order) sind über **4 Dimensionen auseinandergedriftet** — „von allem zwei"-Root-Cause. Quelle: Live-`pg_get_functiondef` beider RPCs.

| Dim | `buy_player_sc` HEUTE | `buy_from_order` HEUTE | Ziel (Anil/CTO) |
|-----|----------------------|------------------------|-----------------|
| **1.5d Menge zu viel** | kappt still (`p_quantity := v_remaining`) | lehnt ab (`RETURN … 'Nur X SCs verfuegbar'`) | **ABLEHNEN** (Anil-Entscheid 2026-06-27) → buy_player_sc angleichen |
| **1.5a Rate-Limit/24h** | tier-basiert (gold200/silber50/bronze30/none20) | hart `>= 20` | **tier-basiert** → buy_from_order angleichen |
| **1.5c fee_config-Lookup** | `ORDER BY created_at DESC` (+global-Fallback DESC) | `ORDER BY club_id NULLS LAST` (+global ohne Order) | **`created_at DESC`** (kanonisch, = buy_player_sc/buy_from_ipo) → buy_from_order angleichen |
| **1.5e price_change_24h** | setzt es NICHT | berechnet+setzt `CASE WHEN last_price>0 …` | **beide setzen** → buy_player_sc angleichen |

## 2. Lösungs-Design (surgical, PATCH-AUDIT-treu)
**`buy_player_sc`** (Baseline = Live-Body): 2 Änderungen
- (d) `IF p_quantity > v_remaining THEN p_quantity := v_remaining;` → `IF p_quantity > v_remaining THEN RETURN json_build_object('success', false, 'error', 'Nur ' || v_remaining || ' SCs verfuegbar'); END IF;` (Wortgleich zu buy_from_order → identisches mapErrorToKey).
- (e) im `UPDATE players SET last_price=…, volume_24h=…, updated_at=now()` das `price_change_24h = CASE WHEN v_player.last_price > 0 AND v_player.last_price != v_order.price THEN ((v_order.price::NUMERIC - v_player.last_price::NUMERIC)/v_player.last_price::NUMERIC*100) ELSE 0 END` ergänzen. **Achtung:** `buy_player_sc` selektiert `v_player` NICHT mit `last_price` (nur id, club_id, first/last_name, ipo_price, is_liquidated) → SELECT-Liste um `last_price` erweitern, sonst `v_player.last_price` undefiniert.

**`buy_from_order`** (Baseline = Live-Body): 2 Änderungen
- (a) `IF v_recent_trades >= 20 THEN …` → tier-CASE wie buy_player_sc: `IF v_recent_trades >= COALESCE((SELECT CASE tier WHEN 'gold' THEN 200 WHEN 'silber' THEN 50 WHEN 'bronze' THEN 30 ELSE 20 END FROM club_subscriptions WHERE user_id = p_buyer_id AND status='active' AND expires_at > now() ORDER BY CASE tier WHEN 'gold' THEN 3 WHEN 'silber' THEN 2 WHEN 'bronze' THEN 1 END DESC LIMIT 1), 20) THEN …`
- (c) `SELECT * FROM fee_config WHERE club_id = v_player.club_id ORDER BY club_id NULLS LAST LIMIT 1;` → `… ORDER BY created_at DESC LIMIT 1;` UND Fallback `WHERE club_id IS NULL` → `WHERE club_id IS NULL ORDER BY created_at DESC LIMIT 1`.

**Alles andere byte-identisch** (auth-guard, idempotency 5-Block, advisory-lock, circular/self-trade/club-admin-guards, fee-split, escrow, `book_platform_treasury`, `credit_pbt`, trades/transactions-INSERT, recalc_floor_price, result-shape).

## 3. Betroffene Files
- `supabase/migrations/20260627180000_slice_413_market_buy_consistency.sql` (NEU, 2× CREATE OR REPLACE)
- Kein Service/Type/UI-Change (Return-Shape unverändert; Error-String 'Nur X SCs verfuegbar' mappt schon via ERROR_MAP→notEnoughDpc).

## 4. Code-Reading-Liste (erledigt, D87)
1. Live `buy_player_sc` + `buy_from_order` Bodies — Drift in 4 Dim bestätigt. ✓
2. Live `buy_from_ipo` fee_config-Lookup = `created_at DESC` → kanonische Wahl für (c). ✓
3. `errorMessages.ts:93` `/nur.*sc.*verf…/→notEnoughDpc` — 'Nur X SCs verfuegbar' wird gemappt (kein Roh-Leak). ✓
4. `buy_player_sc` v_player-SELECT-Liste — enthält KEIN last_price → muss für (e) ergänzt werden. ✓ (kritisch)

## 5. Pattern-References
- **S156 PATCH-AUDIT** — Baseline = Live-functiondef, nicht Migrationsdatei; Konstanten-Audit (Fee 600/150/100, tier 200/50/30, book_platform_treasury) post-apply.
- **S330/S359** — transactions.type unverändert (kein neuer Typ) → kein CHECK-Sync nötig.
- **AR-44** — beide sind bestehende Funktionen, CREATE OR REPLACE erhält ACL (per proacl verifizieren).

## 6. Acceptance Criteria
- **AC1** buy_player_sc: qty>verfügbar → `{success:false,'Nur X SCs verfuegbar'}` (kein still-Kappen mehr).
- **AC2** buy_player_sc: nach Kauf `players.price_change_24h` aktualisiert (force-rollback: Wert ≠ alter, korrekt berechnet).
- **AC3** buy_from_order: gold-Abo-User mit 25 Trades/24h → erlaubt (war vorher `>=20`-Reject); none-User bei 20 → Reject.
- **AC4** buy_from_order: fee_config via created_at DESC (gleiche Config wie buy_player_sc bei gleichem Club).
- **AC5** Zero-Sum beide RPCs: force-rollback `Σ(balance)+platform_net+club_ledger+Σpbt` vor==nach == 0 (Geldflüsse unverändert).
- **AC6** PATCH-AUDIT: Fee-Konstanten + Guards + book_platform_treasury + Idempotenz in beiden Bodies erhalten (functiondef ILIKE-Checks). ACL unverändert.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| fee_config: 1 Row/Club | (c) geldneutral (created_at DESC == NULLS LAST bei 1 Row) — VOR Apply zählen |
| fee_config: mehrere/Club | (c) wählt jüngste — konsistent zu anderen RPCs |
| price_change: last_price=0 | (e) → 0 (CASE ELSE), kein Div-by-0 |
| qty=verfügbar exakt | (d) kein Reject (`>` strikt), filled |
| gold-Abo abgelaufen | (a) tier-Subquery findet nichts → COALESCE 20 |

## 8. Self-Verification
- force-rollback `DO`-Block je RPC (BEGIN; INSERT-Setup; call; assert; RAISE) → AC1-AC5.
- `pg_get_functiondef` ILIKE `%price_change_24h%` (buy_player_sc, neu) · `%WHEN 'gold' THEN 200%` (buy_from_order, neu) · `%ORDER BY created_at DESC%` (buy_from_order) · `%book_platform_treasury%` (beide, erhalten).
- `SELECT COUNT(*),club_id FROM fee_config GROUP BY club_id` → Mehrfach-Config-Risiko für (c) quantifizieren.
- `proacl` beider vor==nach.

## 9. Open-Questions
- **Geklärt (Anil 2026-06-27):** 1.5d = ABLEHNEN. 1.5a/c/e = CTO-Konsistenz (tier-basiert / created_at DESC / beide setzen price_change).
- **Autonom:** Error-String mirror (wortgleich buy_from_order) statt neuem i18n-Key.

## 10. Proof-Plan
`worklog/proofs/413-market-buy-consistency.txt` — force-rollback je RPC (AC1-AC5) + functiondef-ILIKE (AC6) + fee_config-Count + proacl-Diff.

## 11. Scope-Out
- Multi-Order-Sweep (buy_player_sc gegen mehrere Orders) = NICHT Scope (Matching-Engine, eigener Slice). „Ablehnen" bezieht sich auf die EINE gematchte günstigste Order.
- 1.5(b)-RPC-interne „BSD"-Prosa (nie roh user-facing) = Hygiene-Slice optional.
- Error-String-Entdynamisierung (J3) = separate Polish.

## 12. Stage-Chain
SPEC → IMPACT (inline §3) → BUILD (1 Migration, 2 RPCs) → REVIEW (Reviewer-Agent, Money-Pflicht) → PROVE (force-rollback) → LOG.

## 13. Pre-Mortem
1. **„(e) crasht weil v_player.last_price NULL"** → SELECT-Liste MUSS last_price aufnehmen (§2 Achtung). AC2 fängt's.
2. **„(c) ändert Fee bei Mehrfach-Config"** → VOR Apply fee_config-Count prüfen; bei 1/Club geldneutral. AC5 Zero-Sum + AC4.
3. **„PATCH-AUDIT Silent-Revert"** → Baseline = exakt der oben geholte Live-Body, nur die 4 markierten Stellen ändern; ILIKE-Checks AC6.
4. **„buy_player_sc reject bricht Markt-Tab-Flow"** → Markt-Tab nutzt buy_from_order (Slice 404); buy_player_sc nur ohne orderId. Reject = ehrlicher als still-kappen.
5. **„tier-Subquery in buy_from_order Performance"** → identisch zu buy_player_sc (schon live, kein Regress).
