# Review — Slice 329 Club-Treasury-Fundament

**Reviewer:** Cold-Context reviewer-Agent (a15912457d19e775a) · **Datum:** 2026-06-17 · **Scope:** Money-Migration vor Prod-Apply.

## Verdict: REWORK → **resolved** (alle Findings adressiert, Re-Verify live)

Kern-Architektur solide (kein Double-Count, race-frei, Backfill idempotent, 5-Key-Contract erhalten). 2 Grant-Regressionen (Slice-156-Klasse) waren vor Prod-Apply zu fixen.

## Findings + Resolution

| # | Sev | Issue | Resolution |
|---|-----|-------|------------|
| 1 | **BLOCKER** | `renew_club_subscription` ist CRON-ONLY (Baseline `20260417` auth_guard_hardening, CEO-locked). Migration re-`GRANT TO authenticated` + droppte `service_role` → Security-Revert + Cron-Bruch-Risiko. | **Live verifiziert:** grants = nur `postgres`+`service_role`, kein authenticated. Migration gefixt: `REVOKE ... FROM PUBLIC, anon, authenticated; GRANT TO postgres, service_role`. Kommentar mit Begründung. |
| 2 | MAJOR | `get_club_balance` droppte Baseline-Grants `postgres`/`service_role`. | **Live verifiziert:** grants = authenticated+postgres+service_role. Gefixt: `GRANT TO authenticated, postgres, service_role`. |
| — | (analog) | `subscribe_to_club` ebenso `service_role`/`postgres` gedroppt. | Gefixt: `GRANT TO authenticated, postgres, service_role` (live verifiziert). |
| 3 | MINOR | IPO/P2P-Income als `type='trade_fee'` gebucht (nicht ipo_fee/p2p_fee) → grober Audit-Trail; CHECK listet ungenutzte Typen. | Bewusst so (= identisch zur alten `SUM(trades.club_fee)`-Semantik, balance-korrekt). Als intentional kommentiert; feinere Labels = optionaler Folge-Slice. |
| 4 | NIT | clubs-Row-Lock als Serialisierungspunkt nicht dokumentiert → „Optimierungs"-Falle. | Kommentar ergänzt (nicht entfernen). |

## Verified solid (Reviewer, keine Aktion)
- **Double-Count:** kein Pfad bucht doppelt. Trades-Trigger = exakt alte `SUM(trades.club_fee)`; 4 Trade-RPCs `treasury_balance_cents +=` bleibt Dead-Write (ungelesen). `subscribe_to_club` idempotent-retry-Return VOR der Buchungszeile ✓; tier-change = 1 Deduct + 1 Credit ✓; ON CONFLICT bucht 1× ✓.
- **PATCH-AUDIT Body:** subscribe/renew byte-identisch zu Baseline + nur `book_club_treasury`-Zeile ergänzt; alle Guards (auth, dedup, inline-60s, ON CONFLICT) erhalten.
- **Race:** clubs FOR UPDATE + last-row-read = race-frei; first-insert via COALESCE(0) ✓.
- **Backfill:** NOT-EXISTS-Idempotenz korrekt; INSERT-only → kein GUC-Bypass nötig; Trigger feuert nur auf künftige trades, kein Overlap mit Snapshot; Invariante `total_earned = trade_fees + sub_revenue` hält.
- **RLS/Grants Ledger:** default-deny client; `book_club_treasury` nicht client-callable; append-only-Trigger blockt UPDATE/DELETE, erlaubt INSERT.
- **5-Key-Contract:** `get_club_balance` liefert exakt die 5 Whitelist-Keys (db-invariants L1114) → `AdminWithdrawalTab.available` unberührt.

## One-Line (Reviewer)
„Nein, nicht as-is — re-öffnet authenticated auf cron-only renew + droppt service_role; Findings #1+#2 fixen, dann ship." → **#1+#2 (+#3/#4) gefixt + live-verifiziert. Ship-ready für Prod-Apply.**
