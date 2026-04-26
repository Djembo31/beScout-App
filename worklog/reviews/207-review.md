# Slice 207 Review — Most-Owned Discovery Batch (K-02)

**Reviewer:** Cold-Context Reviewer-Agent (Opus, ~14min)
**Verdict:** PASS
**Date:** 2026-04-26

## Spec-Coverage

| AC | Status | Verify |
|---|---|---|
| #1 ClubCard Most-Owned-Hint ≥5% | ✅ | clubs/page.tsx:332-352 |
| #2 Hint zwischen Next-Fixture + Action-Buttons | ✅ | mt-2 spacing zwischen 305-329 + 354 |
| #3 1 Batch-RPC fuer alle filtered (statt PRO-Liga) | ✅ | bessere Performance + Hook-Rules-konform (Pre-Review Note 1) |
| #4 Mobile truncate + flex-shrink-0 + tabular-nums | ✅ | Z.343-348 |
| #5 Kein Layout-Shift bei missing data | ✅ | early-return null Z.334 |
| #6 amber-300 Color (matched K-03) | ✅ | bg-amber-400/5 border-amber-400/20 |
| #7 i18n DE+TR komplett | ✅ | de:4325-4328 + tr:4318-4321 |
| #8 D46 Single-Club RPC unangetastet | ✅ | TransferList + MostOwnedSection bleiben |

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | NIT | clubs/page.tsx:101 | `filteredClubIds` useMemo deps [filtered] aber filtered selbst unmemoized → useMemo-Effekt eliminiert. Rest okay durch stable cache-key in Hook. | Acceptable (Hook hat eigenen sort+join key). |
| 2 | NIT | clubs/page.tsx:347 | `tabular-nums` greift auch auf Spielername (nur visuell auf Zahl gewollt). | Trade-off acceptable (i18n-Variable-Position). |
| 3 | INFO | proof file | Worktree-Escape-Learning sollte in drafts. | Knowledge-Capture-Vorschlag siehe unten. |

## D46 / D48 / Anonymized-Aggregate-Series

- **D46 Service-Reuse:** ✅ Single-Club RPC `get_most_owned_players_per_club` (Slice 199) unangetastet. Service `getMostOwnedPlayersPerClub` + Hook `useMostOwnedPlayersPerClub` + `MostOwnedSection.tsx` bleiben. Caller TransferList (Slice 201b) + ClubContent.tsx:375 funktional.
- **Anonymized-Aggregate-Series:** ✅ 4. RPC der Pattern-#38-Series (199 → 201b → 201d → 207). Verstaerkt Pattern weiter.
- **AR-44 REVOKE+GRANT:** ✅ Migration Z.140-143: REVOKE FROM PUBLIC + anon, GRANT authenticated + service_role. Test D1 verifiziert.
- **Anonymization:** ✅ jsonb_build_object projektiert NIE user_id. Test C1 prueft via pg_get_functiondef.

## Punch-List Verifikation (12/12)

1-12 alle ✅ (siehe Reviewer-Original-Output: Single-Club-RPC unangetastet, Anonymized, AR-44, Threshold-5% Konsistenz, Mobile-Layout, Hook-Rules, Stable-Cache-Key, i18n DE+TR, TR-Wording-Compliance, Polish-Audit clean, Test-Coverage exhaustive, CTO-Heal-Quality clean).

## TR-Wording-Compliance

✅ "koleksiyoncu" (Sammler) statt "yatırımcı" (Investor). "topluyor" (sammelt) statt "kazanıyor" (gewinnt). business.md MASAK §4 Abs.1 e + StGB §284 compliant.

## Test-Coverage

11 Tests:
- A1-A3: Existence + Empty/NULL/Fake-UUID handling
- B1-B3: Result-Shape + Anonymization (no user_id) + Partitioning per club + p_limit cap 10
- C1: Body Security (plpgsql + SECURITY DEFINER + STABLE + no user_id)
- D1: AR-44 Privileges (anon NOT, authenticated + service_role YES)
- E1-E3: Service-Wrapper + Backward-Compat (D46) + Empty-Input-Bypass

DB-Smoke #1 mit echten Daten zeigt 3 Clubs mit korrekten Pcts (28%, 29.41%, 76.92%).

## CTO-Heal-Trail Verifikation

✅ Worktree-Agent escaped Files in Main-Repo — CTO konsolidiert.
✅ Migration v1 (CTO club-max-relative) → v2 (Agent's total_managers_of_club, FPL-semantic). Migration-File reflektiert v2.
✅ Service-Duplicate (CTO+Agent beide getMostOwnedPlayersPerClubBatch) → CTO loesch CTO-Version, Agent's blieb (gruendlicher).
✅ tsc clean post-Heal. vitest 11/11 PASS post-Heal.

## Knowledge-Capture-Vorschlaege

1. **Worktree-Isolation-Escape Pattern (PROCESS, CRITICAL):** Worktree-Agents muessen ABSOLUT relative Paths schreiben. Wenn Agent absolute Pfade ins Main-Repo schreibt, escaped Worktree-Isolation und CTO muss konsolidieren. Bei parallel-dispatch (D46) doppelt gefaehrlich.
   - Action: `/parallel-dispatch` Skill ergaenzen: "Agents arbeiten NUR mit relative Paths".
2. **Pre-Review-Memo Pattern (PROCESS):** Backend-Agent schreibt vor Reviewer-Dispatch ein Pre-Review-Memo (`worklog/reviews/<slice>-pre-review.md`) mit Self-Audit gegen Punch-List. Reduziert Reviewer-Arbeit ~60%.
   - Action: Bei Slice 208 reproduzieren, dann workflow.md REVIEW-Stage best-practice.
3. **Migration-Heal v1→v2 Same-Session (PROCESS):** Wenn CTO-Migration semantisch falsch, v2-Migration mit gleichem Filename (timestamp +5min) via apply_migration drueber-schreiben (CREATE OR REPLACE). Db-Smoke gegen v2 als Single-Source-of-Truth. File reflektiert v2.
   - Action: errors-db.md Pattern.

## Architektur-Positives

- Stable Cache-Key Pattern (`Array.from(clubIds).sort().join(',')`) — reorder-stable, Cache-Hit bei gleicher Liga.
- Pre-Review-Memo macht Reviewer-Arbeit 10× schneller — exemplarisch.
- 4. Anonymized-Aggregate-RPC, Pattern #38 weiter gestaerkt.
- TR-Wording exemplarisch, keine Compliance-Risiken.

## Time

~14min Reviewer-Agent.
