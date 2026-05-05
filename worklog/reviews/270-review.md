# Slice 270 Review

**Reviewer:** reviewer-Agent (cold-context, 2026-05-05)
**Verdict:** PASS

## Findings

| ID | Severity | Location | Issue | Fix |
|----|----------|----------|-------|-----|
| F-01 | LOW | `fixtures.ts:454-461` | Service trusts RPC `ORDER BY gameweek ASC` und pushet raw scores in encounter-Reihenfolge. Robust gegen RPC-Drift wäre Client-side sort. Aktuell relies-on Server-Contract — wenn jemand RPC-Order ändert, liefert Service stille falsche Reihenfolge ohne Test-Fail. | Optional: Client-side sort hardening, oder Comment ergänzen ("RPC-Order ist Contract"). DB-Smoke-Proof zeigt Order korrekt — nicht blocker. **→ Comment ergänzt vor Commit.** |
| F-02 | LOW (dokumentiert) | `getRecentScoreGameweeks` UNCHANGED | Tooltip-GW-Label-Drift: Player mit Per-Player-Window `[27..32]` zeigt Tooltip `[33..37]` (globaler MAX). User-Verwirrung. | Spec dokumentiert Trade-off (Sektion 4 + Impact B), Slice 270b geplant. Akzeptabel. **→ Slice 270b Skeleton angelegt.** |
| F-03 | INFO | Migration REVOKE-Block | `REVOKE FROM anon` redundant mit `REVOKE FROM PUBLIC` (anon erbt). Pattern OK weil GRANT TO authenticated direkt danach explicit. | Kein Fix nötig. |
| F-04 | INFO | DB-Smoke-Proof | AC-01 Spec-Schätzung "≥ 170 rows" basiert auf 34 active GAL-Spieler. Real: 27 played × 5 = 135 (129 actual). | Kosmetisch. Pattern-Lehre: ACs mit `N_played` statt `N_active` formulieren. |
| F-05 | INFO | `fixtures.ts:457` | Cast-Type ohne `position_in_window`. Slice 165 Pattern (Silent-Cast). Hier kein Money-Path, Empty-Check reicht. | Optional Diskriminator-Field nutzen. Kein Fix. |

## Pattern-Compliance

✅ AR-44 REVOKE/GRANT-Block · ✅ Slice-102 Pilot-Default-Pattern · ✅ Slice-267 D44 Map+Persist (Layer-4-Filter intakt) · ✅ Slice-165 Discriminator (throw on error, empty-check) · ✅ PostgREST 1000-row-Cap (RPC-Pfad, 15.350 ≪ 25k) · ✅ CREATE OR REPLACE idempotent · ✅ Code-Reading-Liste ≥6 Items · ✅ Edge-Cases 10 Categorien · ✅ Pre-Mortem 5 Szenarien

## Architektur-Bewertung

**Stärken:**
1. Server-side Window-Function richtige Wahl — kein 60k-Row-Transfer, Slice-102-Drift gefixt.
2. Backward-Compat: Map-Return unverändert → 5 Konsumenten profitieren ohne Edit.
3. Padding-Semantik korrekt (leading-null oldest-Ende → FormBars dashed bars).
4. Test-Coverage 4 Cases — Multi-League-Test ist direkter Regression-Guard.
5. DB-Smoke-Proof ausführlich (4 Ligen heilen sichtbar: BL 0%→85.8%, PL→84%, ES→82.3%).
6. Idempotent Migration (`CREATE OR REPLACE`).

**Schwächen:**
1. F-02 Tooltip-Drift bewusst zurückgestellt — Slice 270b zeitnah, sonst Wissen-Asymmetrie.
2. F-04 Spec-AC-01 Schätzung kosmetisch ungenau.
3. Knowledge-Flywheel-Eintrag (errors-db.md) Pre-LOG-pflicht — laut workflow.md "Bug gefixt → Pattern SOFORT".

## Empfehlung

**PASS.** Pre-LOG-Pflicht-Aktionen abarbeiten:
1. ✅ `errors-db.md` neuer Block "Per-Tenant-Window vs. Global-MAX" (Slice 102 DB-Achse).
2. ✅ Slice 270b Skeleton in `worklog/specs/` (Tooltip-GW-Drift).
3. ✅ F-01 Comment in `fixtures.ts:454`.
4. ⏳ Live-Verify post-Deploy (Chrome-DevTools-MCP Screenshots) — separate Task #7.

Slice 270 ist sauberer Server-side Refactor mit klarer Bug-Fix-Wirkung. Knowledge-Compilation vor LOG, dann Commit + Push + Live-Verify.
