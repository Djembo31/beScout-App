# Slice 456 — D-02b: holdings Row-Lock gegen cross-event Concurrency-Race

**Slice-Type:** Migration · **Größe:** S · **Scope:** Money/§3 (Over-Commit-Race) — selbst, Reviewer, CEO-Apply.

## 1. Problem (Reviewer-Catch S455, D-02b)
`rpc_save_lineup` Verfügbarkeits-Check (Starter-Loop + Bench-Block A) liest `holdings.quantity − SUM(holding_locks WHERE event_id != p_event_id)` per **plain SELECT** ohne Row-Lock. Zwei gleichzeitige Saves desselben Users auf verschiedene Events mit derselben Karte sehen beide `available ≥ v_min_sc` → beide INSERTen einen Lock (verschiedene PK `event_id`) → Over-Commit. Genau das Leck, das D-02 sequentiell schließt, bleibt unter Concurrency offen. **Vererbt** (Starter-Pfad hatte es schon); S455 hat es nicht verschlimmert.

## 2. Lösung (1 additiver Block C, vor den Verfügbarkeits-Checks)
Upfront Row-Lock auf alle beteiligten holdings-Rows (Starter ∪ Bench, non-null) in **deterministischer `player_id`-Ordnung** (deadlock-frei) VOR `v_min_sc :=`:
```sql
PERFORM 1 FROM public.holdings
WHERE user_id = p_user_id
  AND player_id IN (
    SELECT DISTINCT pid FROM unnest(v_all_slots || v_bench_uids) AS u(pid) WHERE pid IS NOT NULL
  )
ORDER BY player_id
FOR UPDATE;
```
**Warum korrekt:** `rpc_save_lineup` ist der EINZIGE `holding_locks`-INSERT-Writer (S453-Writer-Enum, S455 verifiziert). Beide konkurrierenden Saves müssen vor dem Verfügbarkeits-Read denselben holdings-Row FOR-UPDATE nehmen → serialisieren. T1 committed seinen Lock, T2 unblockt, liest frische `holding_locks`, rejected korrekt. holdings-Row = Rendezvous (deckt Starter+Bench, da Lock auf der Karte, nicht der Rolle). `ORDER BY player_id` = deadlock-frei bei Mehr-Karten-Overlap. Nicht-besessene Karten: kein Lock (kein Match) — aber auch nicht over-committbar (Verfügbarkeits-Check rejected sie). Methode = byte-true Patch aus Live-`pg_get_functiondef` (jetzt mit 455 A+B) via `replace()` an Anker `v_min_sc := COALESCE(...)`, self-verify, idempotent (Guard: `FOR UPDATE` schon vorhanden → skip).

## 3. Betroffene Files
- Migration `20260629180000_slice_456_holdings_row_lock.sql` (CREATE OR REPLACE via DO-Block-Patch). Kein Service/FE (kein neuer Reject-Code, kein Shape-Change).

## 4. Code-Reading (D87 — erledigt)
1. ✅ Live-`pg_get_functiondef rpc_save_lineup` (A+B present, anchor `v_min_sc :=` unique 1×, FOR UPDATE count 0).
2. ✅ Writer-Enum `holding_locks` (S455): einziger INSERT-Writer = rpc_save_lineup.
3. ✅ holdings unique (user_id, player_id) (ON CONFLICT im S455-Smoke bewiesen) → Index für FOR-UPDATE-Ordnung.

## 5. Pattern-References
PATCH-AUDIT byte-true (S156) · D87 · §3 force-rollback Money-Smoke · AR-44 (Grants bewahren) · deadlock-freier ordered FOR UPDATE.

## 6. Acceptance Criteria
- AC1: Block C 1× im functiondef (FOR UPDATE), vor dem Starter-Verfügbarkeits-Loop.
- AC2: Happy-Path unverändert — valider Save (Set1 + Bench) → ok, 8 Locks (= S455-Smoke-Verhalten).
- AC3: A+B (455) unverändert vorhanden; cross-event-Reject `insufficient_sc_bench` weiter aktiv.
- AC4: SECDEF + proconfig=null + Grants (anon kein EXECUTE) bewahrt.
- AC5: Starter-/Bench-Lock-INSERTs + alle übrigen Pfade byte-treu (nur Block C additiv).

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| Karte nicht besessen | kein FOR-UPDATE-Match → Verfügbarkeits-Check rejected (NOT FOUND), kein Over-Commit möglich |
| 2 geteilte Karten in getauschten Slots, 2 concurrent Saves | ORDER BY player_id → beide locken in gleicher Reihenfolge → kein Deadlock |
| leere Bench / leere Slots | `unnest(...) WHERE pid IS NOT NULL` → nur besessene gelockt; leer = no-op |
| concurrent Trade (holdings UPDATE) | serialisiert auf demselben holdings-Row (kurzes Fenster, korrekt) |

## 8. Self-Verification
Force-rollback: Patch via replace → functiondef enthält FOR UPDATE 1×; valider Save → ok/8 Locks; cross-event B → insufficient_sc_bench. Echte 2-Session-Concurrency via MCP-Single-Connection nicht testbar → Korrektheit per Konstruktion (einziger Writer + holdings-Rendezvous) + Reviewer.

## 9. Open-Questions
- CEO-Apply (Anil sagte „d-02b machen" = Auftrag; Apply nach Smoke+Reviewer).

## 10. Proof-Plan
`456-holdings-row-lock.txt`: force-rollback (Patch + happy-path 8 Locks + cross-event reject) + post-apply functiondef-Counts (FOR UPDATE=1, A=1, B=1, Starter-INSERT=1) + SECDEF/Grants.

## 11. Scope-Out
- Allgemeine RLS/Lock-Härtung anderer RPCs (W0). Nur der `rpc_save_lineup`-Race.

## 12. Stage-Chain
SPEC → IMPACT (skipped: 1 additiver Lock, kein Contract-Change) → BUILD → PROVE (force-rollback) → REVIEW → CEO-Apply → LOG.

## 13. Pre-Mortem
- „FOR UPDATE mit Aggregat-Subquery erlaubt?" → Lock ist eigene PERFORM-Anweisung (kein Aggregat im äußeren Query), getrennt vom Verfügbarkeits-SELECT.
- „Deadlock bei Multi-Karten-Overlap" → ORDER BY player_id deterministisch.
- „ORDER-BY-Lock-Reihenfolge nicht garantiert in exotischem Plan" → Index (user_id,player_id) liefert sortiert; Restrisiko = seltener Deadlock (abort+retry, kein Geld-Verlust).
- „Block C bricht Happy-Path" → AC2-Smoke (8 Locks unverändert).
