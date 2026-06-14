# Slice 317 Review — profiles_update Spalten-Whitelist

**Verdict: REWORK (minimal) → RESOLVED in-slice via 317b → PASS** · Reviewer: cold-context reviewer-Agent · time-spent: 14 min · 2026-06-14

P1 Security (DB-Trigger).

## Spec-Coverage (alle bestätigt)
- AC1 SECURITY INVOKER (`is_security_definer=false` live) — KRITISCH korrekt ✓
- AC2 BEFORE UPDATE FOR EACH ROW (`tgtype=19`) ✓
- AC3 Live-Smoke Angreifer (verified frozen, bio übernommen) ✓
- AC4 Legit-Bypass postgres ✓
- AC5 SEC-DEFINER-Writer (refresh_user_stats/top_role + sync_level_on_stats_update/level) ungestört ✓
- AC6 COMMENT mit INVOKER-Warnung ✓

## Fokus-Fragen
1. INVOKER korrekt → JA (live bewiesen). 2. Bypass wasserdicht → JA (Client kann weder SET ROLE auf priv. Rolle noch GUC via PostgREST setzen; anon+authenticated beide abgedeckt). 3. Freeze-Set vollständig → JA für privilege/trust/money; created_at ungefroren harmlos. 6. INSERT unberührt → JA. 7. Trigger-Order → JA (einziger BEFORE-UPDATE-Trigger auf profiles).

## Findings
| # | Severity | Location | Issue | Resolution |
|---|----------|----------|-------|------------|
| 1 | MEDIUM | `referral.ts:50` + spec §4/proof [5] | **Writer-Audit unvollständig** (nur SQL grepped, nicht src). `applyReferralCode` machte client-seitig authed `.update({invited_by})` → wäre durch Freeze-Trigger silent eingefroren (Silent-Fail). Dormant (0 Consumer). Behauptung "kein src-Writer" war falsch. | **RESOLVED Slice 317b:** applyReferralCode auf SEC-DEFINER-RPC `apply_referral_code` umgestellt (Root-Cause, härtet zusätzlich die vorher umgehbaren Client-Guards). Spec §3/§4 + Proof [5]/[6] korrigiert. tsc+22 Tests grün, Live-Smoke (RPC setzt invited_by trotz Trigger). |
| 2 | LOW | migration:32-44 | Silent-Freeze ohne Observability — für Angreifer-Pfad korrekt; relevant nur bei legit-Writer (=Finding #1, jetzt via RPC gelöst). | Akzeptiert (Security-Zweck). Optional künftig RAISE LOG. |
| 3 | INFO | created_at | nicht im Freeze-Set — harmlos (nicht privilege/trust-relevant). | Keine Aktion. |

## Knowledge-Capture
- `errors-db.md` D39-Sektion erweitert: Freeze-Trigger-Audits MÜSSEN src-Layer Client-`.update()` der Frozen-Cols greppen, nicht nur SQL-RPCs. Audit-Command pro col: `grep -rn "\.update(\{[^}]*<col>" src/`.
- Instanz der „Existenz ≠ vollständige Erfassung"-Familie (D43/D46/D54).

## Positive
- INVOKER-Status mit Live-Proof (nicht nur behauptet). 3 ROLLBACK-Smokes (Angreifer + postgres + GUC). COMMENT-Warnung gegen späteren DEFINER-Flip. Bypass deckt beide Client-Rollen.
