-- Slice 041 — event-entry RPCs Wrapper-Pattern Dokumentation
--
-- Discovered Slice 032b Flow 10: direkter Aufruf rpc_lock_event_entry von
-- authenticated client → 403 permission denied. Existing wrapper lock_event_entry
-- (ohne rpc_-prefix) injiziert auth.uid() und delegiert.
--
-- Pattern (vorhanden, OK):
--   public function `lock_event_entry(p_event_id)` → GRANT authenticated
--     PERFORM rpc_lock_event_entry(p_event_id, auth.uid())
--   inner `rpc_lock_event_entry(p_event_id, p_user_id)` → REVOKE authenticated
--     (verhindert auth-to-other-user-Exploit, analog AR-44)
--
-- Diese Migration: nur COMMENT-Statements zum Pattern-Erklaeren. Keine Funktionsaenderung.

COMMENT ON FUNCTION public.rpc_lock_event_entry(uuid, uuid)
IS 'Slice 041: INTERNAL — service_role only. Clients muessen das Wrapper lock_event_entry(p_event_id) aufrufen, das auth.uid() automatisch injiziert. Direct-call von authenticated wuerde 403 permission-denied werfen — bewusst (verhindert auth-to-other-user p_user_id Exploit, analog AR-44).';

COMMENT ON FUNCTION public.rpc_unlock_event_entry(uuid, uuid)
IS 'Slice 041: INTERNAL — service_role only. Clients muessen das Wrapper unlock_event_entry(p_event_id) aufrufen, das auth.uid() automatisch injiziert. Analog rpc_lock_event_entry.';

COMMENT ON FUNCTION public.rpc_cancel_event_entries(uuid)
IS 'Slice 041: ADMIN/CRON — service_role only. KEIN client-facing wrapper, da fuer admin event-cancellation oder cron-driven cleanup. Authenticated direct-call → 403 by design.';

COMMENT ON FUNCTION public.lock_event_entry(uuid)
IS 'Slice 041: PUBLIC client-wrapper. Injiziert auth.uid() und delegiert an internal rpc_lock_event_entry. SECURITY DEFINER, GRANT authenticated. Use this from clients, NOT rpc_lock_event_entry.';

COMMENT ON FUNCTION public.unlock_event_entry(uuid)
IS 'Slice 041: PUBLIC client-wrapper. Injiziert auth.uid() und delegiert an internal rpc_unlock_event_entry. Analog lock_event_entry.';
