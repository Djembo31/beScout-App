# Review — Slice 460 (INV-31 Security-Fix: REVOKE no_guard SECDEF-RPCs)

**Reviewer:** Cold-Context-Agent · **Datum:** 2026-06-29 · **Scope:** Security §3 (CEO-approved Anil) · **time-spent:** ~14 min

## Verdict: PASS

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | LOW (hygiene/§0) | Spec §11 + disease-register | `refund_wildcards_on_leave` bleibt toter, NICHT-idempotenter Orphan (nur grant-dicht). §0-Schnitt-Regel = alter/toter Weg geschlossen ODER protokolliert; REVOKE schließt nur die authenticated-Tür, der gefährliche Body bleibt. | 1-Zeile disease-register: dead+non-idempotent+grant-dicht; bei Verdrahtung als service_role `(user,event)`-Dedup ODER DROP. → **ERLEDIGT (D-34)** |
| 2 | LOW (latent re-arm) | refund_wildcards_on_leave Body (ex-Slice-251) | Body nicht idempotent (`balance += slots` je Call, kein Dedup) + innerer earn_wildcards-Guard (`auth.uid() IS NOT NULL AND …`) bietet im **service_role-Kontext NULL Schutz** (uid=NULL → übersprungen). Künftige service_role-Leave-Handler-Verdrahtung → Double-Mint ohne Guard. | Nicht blockierend für 460. Bei Verdrahtung: Dedup `(user_id,event_id)` ODER jetzt DROP. → in D-34 mitgetrackt |
| 3 | NIT (Root-Cause) | Spec §1 | Symptom korrekt, Root-Cause nicht benannt: Slice 251 Wave 2 (`20260428120500`) ließ beim Per-Liga-Rewrite den AR-27-Guard für `refund_wildcards_on_leave` still fallen (S156-Silent-Revert); 4/5 Geschwister behielten ihn. | Root-Cause in errors-db Learning → **ERLEDIGT** |

## One-Line
Ja — ein Senior merged das: REVOKE schließt beide §3-Lecks korrekt + vollständig, body-frei, idempotent, sauber bewiesen (5 ACs live + force-rollback); einzige offene Sache (toter non-idempotenter Orphan) ist CEO-approved Scope, nur 1-Zeilen-Nachverfolgung nötig.

## Belege zu den kritischen Fragen
1. **Caller-Kette vollständig, kein übersehener authenticated-Direktcaller?** JA. `calculate_fan_rank`: EIN Production-Caller (`gameweek-sync:1594`, supabaseAdmin=service_role); `recalculateFanRank(` = nur Def+Tests (0 Prod). Trigger+Batch = SECDEF-Owner-Kontext. `refund_wildcards_on_leave`: 0 Code-Caller (src/+supabase/+scripts/).
2. **Schließt REVOKE das Leck?** JA. Beide Lecks zu; cross-user war schon durch inneren earn_wildcards-Guard blockiert.
3. **REVOKE statt Guard richtig?** Richtig für diesen Scope (minimal-invasiv, PATCH-AUDIT-risikofrei, CEO-approved), verschleiert aber die Non-Idempotenz (Findings #1/#2 → getrackt).
4. **Migration-Hygiene.** Sauber: Timestamp `20260629210000` > 458er, höchster des Tages; Greenfield-Replay-Order grant(0414)→re-grant(0428)→revoke(460); idempotent; apply_migration (kein db push).

## Positive
- Live-functiondef-Baseline (D87) statt Migrationsdatei — korrekt (calculate_fan_rank lebt nur live).
- Body-frei = null S156-PATCH-AUDIT-Risiko am 5k-Zeichen-Body.
- Proof vorbildlich: vorher/nachher-ACL + has_function_privilege (auth+anon+service_role) + needs_fix-Count + force-rollback Owner-Call + volle Suite (4→3, INV-31 grün, keine neue Failure).
- service_role explizit NICHT im REVOKE → Cron unberührt (AC-02 bewiesen).
