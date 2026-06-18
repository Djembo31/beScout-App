-- Slice 338 — Remove Predictions feature (Fantasy-Tippspiel + Community-Kategorie 'Prediction')
-- Anil-Entscheidung 2026-06-18. Dead-Feature-Removal, DB-Achse.
--
-- Daten-Diligence (live verifiziert 2026-06-18, ALLE betroffenen Werte = 0 Rows):
--   predictions:                 1 Testzeile (2026-05-01), 0 eingehende FKs  -> DROP sicher
--   notifications type='prediction_resolved':        0 Rows
--   notifications reference_type='prediction':        0 Rows
--   posts category='Prediction':                      0 Rows (Verteilung: Analyse:1, Meinung:8, News:1)
--
-- Bewusst NICHT angefasst (anderes Feature / dormant, chirurgisch):
--   score_events_event_type_check ('prediction_correct'/'prediction_wrong' -> dormant, kein Writer nach RPC-Drop)
--   ticket_transactions_source_check ('live_prediction'), daily_challenges_question_type_check ('prediction')
--
-- Atomar: alles oder nichts. DROP ... IF EXISTS ohne CASCADE = Safety (failt bei uebersehener FK statt still mitzuloeschen).

BEGIN;

-- 1. predictions-Tabelle (1 Testzeile, 0 FK)
DROP TABLE IF EXISTS public.predictions;

-- 2. Die 4 Prediction-RPCs (exakte Signaturen via pg_get_function_identity_arguments)
DROP FUNCTION IF EXISTS public.create_prediction(p_fixture_id uuid, p_type text, p_player_id uuid, p_condition text, p_value text, p_confidence integer);
DROP FUNCTION IF EXISTS public.get_prediction_consensus(p_fixture_id uuid, p_condition text, p_player_id uuid);
DROP FUNCTION IF EXISTS public.resolve_gameweek_predictions(p_gameweek integer);
DROP FUNCTION IF EXISTS public.get_top_predictors_leaderboard(p_limit integer);

-- 3. notifications_type_check ohne 'prediction_resolved' (alle anderen Typen unveraendert)
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
  'research_unlock','research_rating','follow','fantasy_reward','poll_vote','reply','system','trade',
  'bounty_submission','bounty_approved','bounty_rejected','pbt_liquidation','offer_received','offer_accepted',
  'offer_rejected','offer_countered','dpc_of_week','tier_promotion','price_alert','mission_reward',
  'event_starting','event_closing_soon','event_scored','bounty_expiring','new_ipo_available','referral_reward',
  'tip_received','subscription_new','creator_fund_payout','ad_revenue_payout','achievement','level_up',
  'rang_up','rang_down','mastery_level_up','post_upvoted','ipo_purchase','report_resolved','poll_new'
]::text[]));

-- 4. notifications_reference_type_check ohne 'prediction'
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_reference_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_reference_type_check CHECK (reference_type = ANY (ARRAY[
  'research','event','profile','poll','bounty','player','liquidation','post','ipo','mission','tip',
  'subscription','trade','offer','achievement','equipment','cosmetic','referral','club','system'
]::text[]));

-- 5. chk_posts_category ohne 'Prediction' (Community-Research-Kategorie)
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS chk_posts_category;
ALTER TABLE public.posts ADD CONSTRAINT chk_posts_category CHECK (category = ANY (ARRAY[
  'Analyse','Meinung','News'
]::text[]));

COMMIT;
