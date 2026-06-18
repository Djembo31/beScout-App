# Slice 338 Review — Predictions-Feature-Removal

**Reviewer:** Cold-Context-Reviewer-Agent (a52a279a) · **Datum:** 2026-06-18 · **Time-spent:** 14 min

## Verdict: PASS

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | `scripts/add-i18n-keys-batch9.js` | Einmal-Seed-Script enthält noch Prediction-Strings. Würde Re-Run gelöschte Keys re-injizieren. | Als dokumentiertes erlaubtes Residuum in Proof-Sweep führen (Script tot, lief einmal). Kein Merge-Blocker. → dokumentiert in `338-grep-sweep.txt`. |
| 2 | NIT | `.claude/rules/errors-frontend.md:979`, `testing.md:144-205` | Historische Bug-Pattern-Dokus (Slice 199/163) referenzieren Prediction als Beispiel — KEINE Live-Kopplung. | Belassen (Pattern-Historie). Als erlaubte Residuen in Proof geführt. |
| 3 | INFO | `src/types/index.ts:1178` | Kommentar nennt `'Gerücht'` — pre-existing Drift (nicht im Type/CHECK), NICHT von 338 verursacht. | Out-of-scope. |

## One-Line
Ja — chirurgisch saubere Dead-Feature-Removal, alle 5 Achsen erfasst, CHECK-Recreates exakt (kein Wert verloren), Cron vor DROP entkoppelt, nur kosmetische Doku-Residuen.

## Belege (Fokus 1-5)
1. **CHECK-Vollständigkeit:** notifications_type_check = 40−1 = 39 (== TS-NotificationType-Union). reference_type_check = 21−1 = 20 (alle equipment/cosmetic/referral/club/system erhalten). chk_posts_category = 4−1 = 3 (== PostCategory-Type). Alle gegen Live-Vorgänger-Migrations + TS-Types querverifiziert.
2. **Code-Kopplung:** `grep Prediction src/` = 0 (capital). Nur `ChallengeType 'prediction'` bewusst behalten. Barrels sauber. leaderboards.ts ganz entfernt, 0 verwaiste Importer.
3. **Deploy-vs-DROP:** `grep resolve_gameweek_predictions|resolvePredictions src/` = 0 → DROP kann kein 42883 auslösen.
4. **i18n:** keine geteilten Keys gelöscht, DE/TR-Parität 0/0.
5. **Community-Kategorie:** PostCategory = chk_posts_category = PostCard/EventCommunityTab/player-CommunityTab, voll konsistent.

## Offene Verifikation (Prozess-Hinweis, kein Finding)
Migration noch nicht applied → AC-03/04/05 post-apply Pflicht (AC-05 Test-Insert fängt versehentlich verlorenen Wert, da chk_posts_category-Original nicht aus Migrations-Datei kam).
