# Review — Slice 465 (D-37b: top_role='Admin'-Familie vollständig schließen)

**Reviewer:** Cold-Context-Agent (§3) · **Datum:** 2026-06-30 · **time-spent:** ~12 min

## Verdict: PASS

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | LOW (Proof-Gap, kein Code-Defekt) | proof AC-04/05 | set_thresholds-Smokes nutzten *invalid* thresholds → Return vor UPSERT + Recompute-Loop → der `PERFORM calculate_fan_rank`-Pfad (post-460-REVOKE) nie empirisch exerziert; `EXCEPTION WHEN OTHERS THEN CONTINUE` würde Permission-Fehler still schlucken. 465 ändert diesen Pfad NICHT (Loop byte-true) → kein Blocker. | **ERLEDIGT (nachgereicht):** Happy-Path-force-rollback mit validen Thresholds gegen Club mit 37 fan_rankings → `success=true, recalculated=37` (Recompute lief im SECDEF-Owner, rolled back). → errors-db-Learning |
| 2 | NIT (out-of-scope, pre-existing) | `src/lib/queries/sponsorStats.ts:14-17` | `if (error) { console.error(); return []; }` = Silent-Fail (common-errors §1) — React-Query cached `[]` als SUCCESS. NICHT von 465 berührt. | Eigener Slice (`throw new Error(error.message)`) → getrackt D-38. |

## One-Line
Ja — ein Senior merged das: chirurgischer permissive-only Guard-Swap, byte-true Bodies, Grants korrekt, Familie nachweislich auf 0 — die einzige offene Stelle war ein Proof-Thoroughness-Nicety (jetzt geschlossen) auf einem Pfad, den 465 gar nicht verändert.

## Belege (5 Fragen)
1. **PATCH-AUDIT:** get_sponsor RETURNS-TABLE-Signatur + RETURN QUERY (SUM/ctr) intakt, nur Guard-Zeile getauscht; set_thresholds club_admins-Branch + Validierung + UPSERT(ON CONFLICT club_id) + Recompute-Loop(BEGIN/EXCEPTION/CONTINUE) byte-true, nur erstes NOT EXISTS auf platform_admins. (Anchors statt voller Diff — bei inline-reviewbarem Body akzeptabel.)
2. **search_path='' (get_sponsor):** alle Refs qualifiziert (`public.platform_admins`/`public.sponsor_stats`/`public.sponsors`/`auth.uid()`); Guard bricht nicht (Proof gss_pa=PAST). Spalte `user_id` korrekt.
3. **calculate_fan_rank post-460-REVOKE:** SECDEF-Owner-PERFORM behält EXECUTE (460 revoked nur authenticated/anon/PUBLIC, Owner postgres + service_role bleiben). 465 ändert die Beziehung nicht. **+ empirisch bewiesen (Finding #1 Heal: recalculated=37).**
4. **Grants/AR-44:** beide REVOKE PUBLIC,anon + GRANT authenticated; get_sponsor vestigial anon entzogen ✓; service_role unberührt; Signaturen exakt.
5. **Vollständigkeit:** `family_remaining=0` (deckt sich mit S464-Audit); AC-05 club-admin past via club_admins (Sekundär unverändert). Freeze-Trigger keine False-Positives (kein `=`-Literal-Match in der Gating-Query).

## Positive
- Echter Anti-Akkretions-Abschluss: top_role='Admin'-Familie restlos zu (7 RPCs über D-36/37/37b), keine zweite Admin-Quelle bleibt.
- get_sponsor anon-REVOKE behebt ein **echtes** latentes Security-Loch (vestigial anon auf admin-read), nicht nur Konsistenz.
- Service-Consumer geprüft: fanRanking.ts Discriminated-Union-Handling sauber, Return-Shapes unverändert.

## Learnings (→ errors-db)
- Guard-only-Smoke mit *invalid* Input lässt Write-/Side-Effect-Pfad unexerziert; bei Config-RPCs mit `EXCEPTION…CONTINUE`-Recompute-Loops maskiert der Loop einen Permission-Fehler still (`success:true, recalculated:0`) → Happy-Path-force-rollback (valid input, assert side-effect-count>0) verlangen, nicht nur Guard-Reject. (Ergänzt S464.)
- sponsorStats.ts Silent-Fail → D-38 (common-errors §1).
