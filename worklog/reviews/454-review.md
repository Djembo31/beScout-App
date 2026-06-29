# Slice 454 Review — Cold-Context Reviewer-Agent

**Verdict: CONCERNS** (Core-Fix korrekt/money-sauber/byte-treu; ein unauditierter Downstream-Cascade vor CEO-Apply zu guarden) → **Finding #1 RESOLVED + bewiesen (siehe unten).**

## Findings
| # | Severity | Location | Issue | Resolution |
|---|----------|----------|-------|-----------|
| 1 | HIGH | Backfill → `sync_level_on_stats_update` (`trg_sync_level` AFTER UPD OF total_score auf user_stats) | total_score capped→uncapped. Backfill feuert Trigger 70× → `profiles.level`-Neuskalierung + irreversible „Aufstieg!"-Notifications (70/70 wechseln Level: old_max 1019→Lvl45, new 2791→Lvl74). IMPACT-skip hat Kaskade übersehen. | ✅ **GEFIXT:** Backfill guarded — `DISABLE TRIGGER trg_sync_level`, profiles.level direkt+still neu-skalieren, `ENABLE` (transaktional). **Guard-Proof:** `notif_delta=0 divergence=0 levels_rescaled=70`. |
| 2 | MED | Projektions-Trigger | aktualisiert nur 1-Row total_score, rechnet globalen `rank` (ROW_NUMBER) NICHT neu → `getLeaderboard(.order('rank'))` kurz veraltet; self-heal beim nächsten refresh_user_stats. | **AKZEPTIERT** + dokumentiert (self-heal; Re-Rank pro Score-Event zu teuer). |
| 3 | MED | `expertBadges.ts` / Profil-Rang-Display | Badge-Schwellen (≥500/Dim) + getRang bewerten jetzt scout-Skala statt capped Aktivität → existierende User sehen geänderte (höhere) Badges/Ränge = die GEWOLLTE Konvergenz mit /rankings. | **AKZEPTIERT** als Display-Konvergenz (Kern von „A"); Live-Render-Check Profil/Badges post-Deploy. |
| 4 | LOW | §6 fn_compute_user_tier REVOKE | neue Fn hat PUBLIC-Default-Grant → `FROM anon` allein reicht nicht. | ✅ **GEFIXT:** `REVOKE … FROM PUBLIC, anon`. |
| 5 | LOW | §5 Backfill INNER JOIN | user_stats-Rows ohne scout_scores behalten alte Werte (moot: 70/70 Overlap). | **AKZEPTIERT** (70/70 garantiert; next refresh setzt IF-NOT-FOUND→0). |

## Bestätigt sauber (Reviewer)
- Money-Anker (scout_scores/award_dimension_score/close_monthly_liga/airdrop) = **0 Edits** ✓
- PATCH-AUDIT refresh_user_stats byte-treu (nur die 2 erlaubten Blöcke; Stats/INSERT/rank/notification/RETURN identisch zur slice_055-Baseline) ✓
- Mapping trader→trading/manager→manager/analyst→scout konsistent mit Surface-Mappings (`useCommunityData.ts`, `ScoutCard.tsx`) ✓
- tier-Helper Schwellen identisch + IMMUTABLE ✓ · Widening sicher (kein Datenverlust, TS `number` unberührt) ✓
- Trigger rekursions-frei, `UPDATE OF` schließt non_liga_manager_season aus, money-neutral ✓
- Completeness (S453-Lehre): refresh_user_stats = einziger Score-Writer (pg_proc + src/-grep korroboriert) ✓
- UI-Overflow KEIN Problem: ScoreProgress/getRang deckt volle 0-7000+-Skala (Math.min..100) ✓

## Learning (→ errors-db.md S454)
„Denorm-Projektions-Trigger auf eine Spalte, deren **Werte-Skala** sich ändert → ALLE Downstream-Trigger/Reader DERSELBEN Spalte mit-auditieren." Hier: total_score capped→uncapped + `sync_level_on_stats_update` konsumiert mit alter Skala + erzeugt User-Notifications. Schwester zu S419/S453 (Kardinalitäts-/Writer-Achse) auf der Werte-Skala-Achse. + „Backfill-UPDATE auf Tabelle mit AFTER-Notification-Trigger → Trigger temporär DISABLE, sonst Migration spammt User-Notifications."

time-spent: 38 min
