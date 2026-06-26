-- Slice 400 (E-7) — Remove deprecated 'creator' event type drift.
-- 'creator' was the predecessor of 'user' (D108). The events.type CHECK constraint
-- (events_type_check) forbids 'creator' and there are 0 'creator' events in prod.
-- The only RPC reading event_fee_config (rpc_lock_event_entry) looks up by the event's
-- actual type, never 'creator' -> this orphan row is unreachable. Money byte-identical.
DELETE FROM public.event_fee_config WHERE event_type = 'creator';

-- Tighten the secondary CHECK on event_fee_config to match events_type_check
-- (which already excludes 'creator'). Removes the last surface through which a
-- 'creator' fee row could be re-inserted. Order matters: DELETE runs first so the
-- (now absent) creator row cannot violate the narrowed constraint. Money-neutral
-- (narrows only; nothing inserts 'creator'). 'user' added by Slice 396 retained.
ALTER TABLE public.event_fee_config DROP CONSTRAINT IF EXISTS chk_event_type;
ALTER TABLE public.event_fee_config ADD CONSTRAINT chk_event_type
  CHECK (event_type = ANY (ARRAY['bescout'::text, 'club'::text, 'sponsor'::text, 'special'::text, 'user'::text]));
