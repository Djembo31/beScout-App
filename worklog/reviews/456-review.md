# Slice 456 Review — D-02b holdings Row-Lock (Money/§3)

**Reviewer:** Cold-Context-Agent · **time-spent:** 22 min · **Verdict:** PASS

„A senior would merge this — surgical, fully additive, money-safe row-lock that closes the TOCTOU by construction."

## Findings
| # | Sev | Location | Issue | Fix |
|---|-----|----------|-------|-----|
| 1 | LOW | proof Sec 4 | Post-Apply-Verify war Platzhalter (Migration-DoD). | **→ gefüllt** (functiondef-Counts + SECDEF/Grants live). |
| 2 | NIT | migration Guard | Idempotenz-Sentinel `FOR UPDATE` zu breit (künftiger Slice mit anderem FOR UPDATE → fälschlich skip). | **→ auf `D-02b (Slice 456)`-Marker verengt.** |
| 3 | INFO | migration Block C | Lockt Superset (Wildcard- + Bench-Karten, falls besessen) vs INSERT-Set. Harmlos (Over-Locking safe, weiter player_id-geordnet), konservativer. | None (dokumentiert). |
| 4 | INFO | — | Nicht-besessene Karte concurrent gekauft + 2 racing Saves = nicht serialisiert. Praktisch unmöglich (Buy erzeugt/lockt die holdings-Row selbst); nicht von dieser Slice eingeführt; Live-Exposure nil. | None. |

## Schließt der Fix den Over-Commit-Race? — JA (per Konstruktion)
1. `rpc_save_lineup` ist EINZIGER `holding_locks`-INSERT-Writer (alle 16 INSERT-Hits in migrations sind rpc_save_lineup-Versionen; `src/` 0 direkte Inserts). Single-Writer-Prämisse hält.
2. Nach dem Patch nimmt JEDE Ausführung `FOR UPDATE` auf die relevanten `holdings(user,card)`-Rows VOR dem Verfügbarkeits-Read und VOR jedem Lock-INSERT.
3. holdings-Row = korrekter Rendezvous: beide Racer kontendieren auf derselben `holdings(user_id,player_id)`-Row (UNIQUE → eine Row). T2 blockt bis T1 committed; unter READ COMMITTED nimmt T2's folgender Read eine frische Snapshot inkl. T1's committetem Lock → `available` < `v_min_sc` → reject. Parent-Lock zum Serialisieren von Child-Inserts ist gültig, weil es genau EINEN Child-Writer gibt der nun immer zuerst den Parent-Lock nimmt. Smoke bestätigt das Verhalten (B → insufficient_sc_bench).

## Deadlock-Risiko? — NEIN (vernachlässigbar, self-healing)
- `ORDER BY player_id FOR UPDATE`: LockRows-Node sitzt über Sort/IndexScan → Lock-Reihenfolge = sortierte Reihenfolge (UNIQUE-Index liefert sie ohnehin). 2 concurrent Saves mit Overlap locken in identischer aufsteigender Reihenfolge → kein Zyklus.
- Cross-RPC strukturell ausgeschlossen: save_lineup lockt Rows mit gleichem `user_id`, varying player_id. Trades/Liquidation sind Single-Player (Multi-Row-Lock spannt einen Player über verschiedene User) → teilen max. EINE Row mit save_lineup → kein 2-Zyklus.
- Query legal (kein Aggregat/DISTINCT/GROUP BY auf FOR-UPDATE-Ebene; DISTINCT in der inneren IN-Subquery ohne Lock-Klausel). PERFORM acquired die Locks.
- Restrisiko = seltener Deadlock → detect+abort+retry, kein Geld-Verlust.

## §0 Schnitt-Regel
Erfüllt: der ungeschützte Read wird IN PLACE im einzigen kanonischen Writer ersetzt — kein zweiter Pfad, keine dup-registry-Schuld.

## Learning (errors-db S456)
TOCTOU auf Child-Table-INSERT (per-row unique PK, kein ON-CONFLICT-Konflikt) → `FOR UPDATE` auf die geteilte PARENT-Row, nicht die Child-Row. Gültig NUR bei genau einem Child-Writer (pg_proc-Writer-Enum), Parent-Lock VOR Child-Read; deadlock-frei via ORDER BY PK; verlässt sich auf READ COMMITTED (fresh per-statement Snapshot re-liest committete Child-Rows nach Unblock).
