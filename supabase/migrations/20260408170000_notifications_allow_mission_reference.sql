-- ============================================================================
-- Notifications: allow reference_type='mission'
-- Date: 2026-04-08
-- ============================================================================
--
-- Discovery 2026-04-08 live-test: claimMissionReward creates a notification
-- with reference_type='mission', but the existing CHECK constraint only
-- allows: research, event, profile, poll, bounty, player, liquidation,
-- prediction, post, ipo. The notification INSERT failed silently (fire-and-
-- forget .catch), wallet + mission.status updates succeeded. User got reward
-- but no notification row.
--
-- Fix: drop old CHECK, re-create with 'mission' added.
-- ============================================================================

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_reference_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_reference_type_check
  CHECK (reference_type = ANY (ARRAY[
    'research'::text,
    'event'::text,
    'profile'::text,
    'poll'::text,
    'bounty'::text,
    'player'::text,
    'liquidation'::text,
    'prediction'::text,
    'post'::text,
    'ipo'::text,
    'mission'::text
  ]));
