# Impact — Slice 338 Predictions-Feature-Removal

Konsolidierte, grep-/DB-verifizierte Consumer-Karte. Scope: **(A) Fantasy-Tippspiel-Feature** + **(B) Community-Research-Kategorie „Prediction"** (Anil 2026-06-18 „auch raus"). **Out of scope (bleibt):** ChallengeType `'prediction'`, `score_events`-CHECK (dormant `prediction_correct/wrong`), `ticket_transactions 'live_prediction'`, `daily_challenges`-CHECK.

## A) Fantasy-Tippspiel — DELETE (dediziert)
- `src/components/fantasy/PredictionsTab.tsx` (+ `__tests__/PredictionsTab.test.tsx`)
- `src/components/fantasy/PredictionCard.tsx`
- `src/components/fantasy/PredictionConsensusHint.tsx`
- `src/components/fantasy/CreatePredictionModal.tsx` (+ `__tests__/CreatePredictionModal.test.tsx`)
- `src/components/fantasy/ergebnisse/PredictionResults.tsx`
- `src/components/profile/PredictionStatsCard.tsx`
- `src/lib/services/predictions.ts` (+ `__tests__/predictions.test.ts`)
- `src/lib/queries/predictions.ts`
- `src/features/fantasy/services/predictions.queries.ts`
- `src/features/fantasy/services/predictions.mutations.ts` (+ `__tests__/predictions.test.ts`)

## A) Fantasy-Tippspiel — ENTKOPPELN (geteilt, exakte Stellen)
| File | Stelle |
|------|--------|
| `src/lib/services/notifications.ts` | :28 `prediction_resolved: 'fantasy'` (TYPE_TO_CATEGORY) + NotificationType-Union |
| `src/components/layout/NotificationDropdown.tsx` | `prediction_resolved`-Render/Icon-Zweig |
| `src/lib/notificationDeepLink.ts` | :16 `case 'prediction': return '/fantasy'` |
| `src/types/index.ts` | :1934-1951 PredictionType/Status/MatchCondition/PlayerCondition/PredictionCondition/Prediction + NotificationType-Member `prediction_resolved` |
| `src/lib/queries/keys.ts` | :336-348 `predictions:`-Key-Block |
| `src/lib/queries/index.ts` | :31 Barrel-Re-Export (8 Hooks) |
| `src/components/providers/QueryProvider.tsx` | Prediction-Persist-Ref (prüfen) |
| `src/lib/services/leaderboards.ts` | :20-49 `TopPredictorEntry` + `getTopPredictorsLeaderboard` (exklusiv Predictions-konsumiert) |
| `src/lib/services/__tests__/leaderboards.test.ts` | Slice-199 `get_top_predictors_leaderboard` describe-Blöcke |
| `src/features/fantasy/services/scoring.admin.ts` | :209-229 `resolvePredictions`-Import+Call in finalizeGameweek |
| `src/app/api/cron/gameweek-sync/route.ts` | :1614-1626 `resolve_gameweek_predictions` Cron-Step |
| `src/components/fantasy/index.ts` | :11 `export { PredictionsTab }` |
| `src/components/fantasy/ergebnisse/index.ts` | :6 `export { PredictionResults }` |
| `src/components/fantasy/MitmachenTab.tsx` | :12 Import + :142-145 Section 2 „Meine Tipps" |
| `src/components/fantasy/SpieltagTab.tsx` | Prediction-Bezug |
| `src/components/fantasy/ErgebnisseTab.tsx` | PredictionResults-Einbindung |
| `src/components/fantasy/EventCommunityTab.tsx` | Prediction-Bezug (+ B unten) |
| `src/components/fantasy/ergebnisse/PersonalResults.tsx` | Prediction-Bezug |
| `src/components/profile/AnalystTab.tsx` | :15 dynamic-Import + :306 `<PredictionStatsCard>` (Section #4) — **nur entkoppeln** |
| `src/components/profile/__tests__/AnalystTab.test.tsx` | Prediction-Asserts |
| `src/components/onboarding/OnboardingChecklist.tsx` | Prediction-Checklist-Item |
| `src/components/help/Glossary.tsx` | :26 `{ key:'prediction', category:'fantasy' }` |
| `src/lib/__tests__/db-invariants.test.ts` | Prediction-Invariante |
| `src/components/fantasy/__tests__/SpieltagTab.test.tsx`, `MitmachenTab.test.tsx` | Prediction-Asserts |
| `src/lib/services/__tests__/scoring-v2.test.ts` | Prediction-Asserts |

## B) Community-Kategorie „Prediction" — ENTKOPPELN
| File | Stelle |
|------|--------|
| `src/types/index.ts` | :40 `PostCategory` (-`'Prediction'`) + :1178 Kommentar |
| `src/components/community/PostCard.tsx` | :33 CATEGORIES-Eintrag `cat_prediction` |
| `src/components/community/__tests__/PostCard.test.tsx` | :64 `toContain('Prediction')` |
| `src/components/fantasy/EventCommunityTab.tsx` | :50 CATEGORIES-Eintrag `t('catPrediction')` |
| `src/components/player/detail/CommunityTab.tsx` | Category-Picker-Liste (Default 'Meinung' bleibt) |

## i18n (pro Key grep-verifiziert exklusiv)
- Community: `cat_prediction` (de/tr :1958), `catPrediction` (de/tr :703)
- Fantasy: `topPredictorsTitle/Hint/Volume`, Glossary `prediction`-Eintrag, alle `prediction.*`/`vorhersage`/`tipp`-Keys (de ~50, tr ~16) — **shared behalten** (z.B. `confidence`, `correct`, `points` falls woanders genutzt → pro Key `grep -rn`).
- `scripts/add-i18n-keys-batch9.js` (Einmal-Seed) — `catPrediction`-Eintrag entfernen/ignorieren.

## DB-Migration (atomar `BEGIN; … COMMIT;`) — alle Pre-Counts = 0 verifiziert
1. `DROP TABLE IF EXISTS predictions;` (1 Testzeile, 0 FK)
2. `DROP FUNCTION` × 4: `create_prediction`, `get_prediction_consensus`, `resolve_gameweek_predictions`, `get_top_predictors_leaderboard` (exakte Signaturen via `pg_get_functiondef`)
3. `notifications_type_check` recreate ohne `'prediction_resolved'`
4. `notifications_reference_type_check` recreate ohne `'prediction'`
5. `chk_posts_category` recreate ohne `'Prediction'` (`posts`-Tabelle)

## Side-Effects
- **Cache/Invalidation:** prediction-Query-Keys entfallen; ggf. Persist-Buster prüfen (kein Crash, da Default-Branch).
- **Realtime:** keine prediction-Realtime-Subscriptions.
- **Cron:** `gameweek-sync` + `finalizeGameweek` verlieren resolve-Step → Reihenfolge `close→simulate→score→clone→advance` bleibt intakt (resolve war additiv).
- **Notifications:** `prediction_resolved` nicht mehr erzeugbar; Deeplink `case 'prediction'` weg → Default `/`.
- **Reihenfolge (Pre-Mortem #3):** Code-Entkopplung zuerst (kein RPC-Aufruf mehr), DB-DROP zuletzt.

## Tooling/Doku (Achse 4+5)
- `scripts/boundary-check.ts` Prediction-Allowlist
- `orphan-component-detector.ts` KNOWN_ORPHANS / `wiring-check.ts` Allowlist
- `.claude/rules/fantasy.md` §Predictions-Block löschen
