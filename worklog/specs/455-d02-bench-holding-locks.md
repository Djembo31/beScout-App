# Slice 455 — D-02: Bench-Karten in holding_locks (Geld-Leck schließen)

**Slice-Type:** Migration · **Größe:** M · **Scope:** Money/§3 (Holdings-Lock = Doppel-Verwendung/Reward) — selbst, Reviewer, CEO-Apply. **Latent** (Bench-Feature aktuell unbenutzt, holding_locks=0).

## 1. Problem (Live-D87, DB skzjfhvgccaeplydsunz)
Disease-Register **D-02**: `rpc_save_lineup` lockt nur die 12 Starter, Bank nie → 1 Karte als Bench in N gleichzeitigen Events, punktet überall via Auto-Sub (echtes Wallet-Credit).
**Live verifiziert:**
- `v_slot_keys` (Z.5) = 12 Starter-Keys (`gk,def1..def4,mid1..mid4,att,att2,att3`). `v_all_slots` (Z.37-41) = die 12 Starter (`p_slot_*`). **Kein Bench.**
- Cross-Event-Verfügbarkeits-Check (Z.365-377, `FOR v_i IN 1..12`): pro Starter `v_available = holdings.quantity − SUM(holding_locks.quantity_locked WHERE event_id != p_event_id)`, reject `insufficient_sc` bei `< v_min_sc`. **Bench fehlt hier.**
- Lock-INSERT (Z.436-438): `unnest(v_all_slots)` (Starter, non-wildcard) → `holding_locks`. **Bench (`v_bench_uids`) wird NIE gelockt.**
- Bench wird sonst voll validiert (Position/Holdings≥1/Duplikat/overlaps-starter; `v_bench_uids` = validierte non-null Bench-Karten).
- `holding_locks` PK = (user_id, player_id, event_id); total_rows=0 live (Locks temporär, nur offene Events; Off-Season leer) → Leck **latent**.

## 2. Lösung (2 additive Blöcke, spiegeln Starter-Logik; Starter-Pfad byte-treu)
**A — Bench-Verfügbarkeit (nach Z.377):**
```sql
-- D-02: Bench-Karten cross-event-verfügbar (wie Starter; verhindert Mehrfach-Commit derselben Karte)
FOREACH v_pid IN ARRAY v_bench_uids LOOP
  IF v_pid IS NOT NULL THEN
    SELECT COALESCE(h.quantity, 0) - COALESCE(
      (SELECT SUM(hl.quantity_locked)::INT FROM public.holding_locks hl
       WHERE hl.user_id = p_user_id AND hl.player_id = v_pid AND hl.event_id != p_event_id), 0)
    INTO v_available FROM public.holdings h WHERE h.user_id = p_user_id AND h.player_id = v_pid;
    IF NOT FOUND OR COALESCE(v_available, 0) < v_min_sc THEN
      RETURN jsonb_build_object('ok', false, 'error', 'insufficient_sc_bench', 'player_id', v_pid, 'available', COALESCE(v_available, 0), 'required', v_min_sc);
    END IF;
  END IF;
END LOOP;
```
**B — Bench-Lock (nach dem Starter-Lock-INSERT, Z.438):**
```sql
-- D-02: Bench-Karten locken (echtes Commitment → nicht in N Events wiederverwendbar)
INSERT INTO public.holding_locks (user_id, player_id, event_id, quantity_locked)
SELECT p_user_id, pid, p_event_id, v_min_sc
FROM unnest(v_bench_uids) AS t(pid)
WHERE pid IS NOT NULL
ON CONFLICT (user_id, player_id, event_id) DO NOTHING;
```
`v_min_sc` (= Starter-Semantik) statt 1 — bewusste Wahl: Bench = potenzieller Starter (Auto-Sub) → gleiches Commitment. (DO NOTHING defensiv; overlaps-starter-Check garantiert ohnehin Unique.)

## 3. Betroffene Files
- Migration `<ts>_slice_455_bench_holding_locks.sql` (CREATE OR REPLACE `rpc_save_lineup` — Voll-Def + 2 Blöcke; PATCH-AUDIT). Kein Service/FE (neuer Reject-Code `insufficient_sc_bench` → `mapErrorToKey`-Folge prüfen).

## 4. Code-Reading (D87 — erledigt)
1. ✅ `rpc_save_lineup` Lock-Logik (v_all_slots/v_slot_keys/Verfügbarkeits-Check/Lock-INSERT) + `v_bench_uids`-Aufbau.
2. ✅ `holding_locks` Schema (PK user+player+event, qty smallint, FK event CASCADE).
3. ⬜ **VOR BUILD:** Voll-Def `rpc_save_lineup` ziehen (25k) für byte-treuen CREATE OR REPLACE + AR-44-Grants + exakte Einfügepunkte.
4. ⬜ `score_event` Auto-Sub-Zweig (bestätigen dass Bench dort punktet = der Leck-Mechanismus) + `mapErrorToKey` für `insufficient_sc_bench`.

## 5. Pattern-References
PATCH-AUDIT byte-treu (Money-RPC) · D87 · §3 force-rollback Money-Smoke · AR-44 (Grants bewahren).

## 6. Acceptance Criteria
- AC1: Karte X als Bench in Event A → locked (holding_locks row user/X/A).
- AC2: Karte X als Bench in Event B (gleiche qty owned, A noch offen) → **reject `insufficient_sc_bench`** (cross-event).
- AC3: Starter-Pfad unverändert (PATCH-AUDIT: nur die 2 Blöcke additiv; v_all_slots/v_slot_keys/Starter-Check/Starter-Lock byte-identisch).
- AC4: re-save desselben Lineups idempotent (DELETE locks for event → reinsert starter+bench).
- AC5: SECDEF + search_path + Grants bewahrt.
- AC6: Bench leer/NULL → kein Crash (WHERE pid IS NOT NULL).

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| Bench-Karte = Starter im selben Event | bereits durch `bench_overlaps_starter` rejected |
| Bench-Karte schon in anderem Event gelockt | AC2 reject |
| qty owned reicht für Starter aber nicht +Bench | Bench-Check rejected (korrekt: nicht über-committen) |
| Re-save (DELETE+reinsert) | Lock für DIESES Event vorher gelöscht → Verfügbarkeit `event_id != p_event_id` korrekt |

## 8. Self-Verification
Force-rollback Money-Smoke: 2 offene Events, Karte X (qty 1), Bench in A → lock; Bench in B → reject; ROLLBACK. Post-Apply: `pg_get_functiondef` zeigt beide Bench-Blöcke + Starter-Teil unverändert.

## 9. Open-Questions
- **Bench-Lock-qty = `v_min_sc` vs `1`** (Spec default v_min_sc = Starter-Konsistenz; CTO-Detail, kein Blocker — falls Bench nur 1 Copy binden soll → 1-Zeilen-Tweak).
- CEO-Apply (Money-SECDEF-RPC-Edit).

## 10. Proof-Plan
`455-bench-locks.txt`: force-rollback (Bench-Lock + cross-event-reject) + post-apply functiondef-Diff (2 Blöcke da, Starter byte-treu) + holding_locks-Verhalten.

## 11. Scope-Out
- Auto-Sub-Scoring-Logik selbst (score_event) — unberührt; nur der Lock-Gap.
- D-20 (bench_* 0 Rows / Feature tot) — separat; D-02 ist der präventive Lock-Fix.

## 12. Stage-Chain
SPEC → IMPACT (skipped: nur neuer Reject-Code) → BUILD (Voll-Def + 2 Blöcke) → PROVE (force-rollback) → REVIEW → CEO-Apply → LOG.

## 13. Pre-Mortem
- „Voll-Def-Reconstruction-Drift (25k)" → pg_get_functiondef-Baseline, nur 2 additive Blöcke, vor/nach-Diff.
- „Bench-Lock bricht Starter-Verfügbarkeit" → Bench-Check NACH Starter-Loop, eigene Schleife, kein v_all_slots-Eingriff.
- „min_sc=2 + Bench zu streng" → Open-Q (v_min_sc vs 1).
- „neuer Reject-Code roh in UI" → mapErrorToKey-Folge (Code-Reading #4).
