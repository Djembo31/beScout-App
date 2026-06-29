# Slice 455 Review — D-02 Bench-Karten in holding_locks (Money/§3)

**Reviewer:** Cold-Context-Agent · **time-spent:** 38 min · **Verdict:** CONCERNS (kein Apply-Blocker)

Die Migration ist methodisch vorbildlich (PATCH-AUDIT byte-true gegen LIVE-`pg_get_functiondef` S156/D87, self-verify, idempotent, force-rollback-bewiesen) und für den sequentiellen Pfad leck-frei. Applizierbar. CONCERNS wegen 3 trackbarer Residuen (latentes Feature → kein aktuelles Leck).

## Findings

| # | Sev | Location | Issue | Fix |
|---|-----|----------|-------|-----|
| 1 | MED | `src/features/fantasy/hooks/useEventActions.ts:400-403` | `switch(msg)` Exact-Match → `insufficient_sc_bench` fällt in `default` → generisch-gewrappte statt spezifischer Toast. mapErrorToKey-Regex `/insufficient_sc/i` fängt es → KEIN Raw-Key-Leak, nur degradierte UX. S393-Klasse. | `case 'insufficient_sc_bench':` ergänzen. **→ in dieser Slice gefixt.** |
| 2 | MED | `rpc_save_lineup` Block A (check-then-insert) | TOCTOU-Race cross-event: plain SELECT (kein FOR UPDATE) → 2 gleichzeitige Saves desselben Users (Event A+B, gleiche Bench-Karte) sehen beide available=1, beide INSERT. **Vererbt** — Starter-Pfad hat dieselbe Lücke, Slice macht es NICHT schlimmer. | Follow-up `FOR UPDATE` (deckt Starter+Bench). **→ Residual disease-register D-02b.** |
| 3 | LOW | `worklog/proofs/455-bench-locks.txt` | Post-Apply functiondef-Diff (AC3 byte-treu, AC5 SECDEF/Grants/proconfig) noch [PENDING CEO-Apply]. | **→ nach CEO-Apply ergänzt.** |
| 4 | LOW | `rpc_save_lineup` proconfig=null | SECDEF ohne `SET search_path`. Pre-existing, mitigiert (alle Refs schema-qualifiziert + nur pg_catalog-Builtins). | Out-of-Scope (W0 DB-Security-Batch). Slice macht es nicht schlimmer (anon kein EXECUTE ✓). |
| 5 | NIT | `src/lib/__tests__/db-invariants.test.ts:1356` | Invariant prüft nur `'insufficient_sc'` (bleibt grün). CI-excluded (Live-DB). | Optional Bench-Assertion. |
| 6 | NIT | Migration Block A (FOREACH v_pid) | Mutiert geteilte `v_pid` (lässt sie auf letztem Bench-Element). Smoke: keine Downstream-Abhängigkeit, harmlos. | — |

## Starter-Pfad unberührt? — JA
`replace(v_src, anchor, anchor || block)` → Anker bleibt verbatim als Präfix, Block nur angehängt. AnchorA (`'insufficient_sc'`-RETURN bis `END LOOP;`) + AnchorB (`unnest(v_all_slots) WITH ORDINALITY`) byte-identisch erhalten, restlicher 25k-Body unberührt. Anker eindeutig. Self-Verify RAISE bei fehlendem Anker (fail-loud, nicht silent). Einziger Rest-Effekt = residuale `v_pid`-Mutation (Finding 6, per Smoke harmlos).

## Money-Logik leck-frei? — JA (sequentiell), Residual unter Concurrency (Finding 2)
- Nur `holding_locks` (Reservierung), kein `transactions`/Wallet-Touch → kein Zero-Sum-Risiko. wildcard_delta-Logik nach Block B byte-unverändert.
- Re-Save-Idempotenz korrekt: Block A nutzt `event_id != p_event_id` VOR dem `DELETE … event_id = p_event_id` → ignoriert eigene Alt-Locks (Selbst-Reject-Falle vermieden, gespiegelt zum Starter). Proof Schritt 6-7.
- Kein Doppel-Lock: Starter/Bench disjunkt (bench_overlaps_starter) + intern (bench_duplicate). ON CONFLICT DO NOTHING rein defensiv.
- Invariante `available = holdings − SUM(locks andere Events) ≥ v_min_sc` ⇒ nach Insert `SUM(alle Locks) ≤ holdings`.
- Bench-qty = v_min_sc korrekt (Auto-Sub = potenzieller Starter, gleiches Commitment).

## Spec-Coverage
AC1 ✅ · AC2 ✅ · AC3 ✅ (strukturell; Post-Apply-Diff pending) · AC4 ✅ · AC5 ~ (Beweis pending) · AC6 ✅

## Learnings (Knowledge-Capture)
- **errors-frontend (S393-Erweiterung):** Lineup-Reject-Codes haben ZWEI FE-Surfaces mit unterschiedlicher Match-Semantik — `useEventActions.ts` `switch(msg)` = **Exact-Match** (verfehlt Suffix-Varianten), `errorMessages.ts` mapErrorToKey = **Regex** (`/insufficient_sc/i` fängt Suffix). Bei neuem RPC-Reject-Code mit gemeinsamem Präfix BEIDE prüfen.
- **disease-register D-02b:** D-02 schließt das Bench-Reuse-Leck sequentiell; der `save_lineup`-Reservierungs-Check ist FOR-UPDATE-los → cross-event Concurrency-Race bleibt (Starter+Bench, vererbt). Getracktes Residual bis Row-Lock-Slice.
