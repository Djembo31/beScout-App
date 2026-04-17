-- Slice 044 Part 2 — AR-44 Guard auf cancel_scout_subscription
-- Reason: Bei Audit nach Haupt-Migration entdeckt (Audit-RPC hat erweiterte Parameter-Allowlist).
-- Ohne Guard kann ein authenticated User fremde p_subscriber_id senden und deren Abo-auto_renew auf false setzen.
-- Money-Impact: keine sofortige Debit-Op, aber verhindert zukuenftige renewal → effektiv Admin-Privilege-Violation.

CREATE OR REPLACE FUNCTION public.cancel_scout_subscription(p_subscriber_id uuid, p_subscription_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- AR-44 Guard: Nur der Subscriber selbst (oder service_role) darf canceln
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_subscriber_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  UPDATE scout_subscriptions
  SET auto_renew = false
  WHERE id = p_subscription_id AND subscriber_id = p_subscriber_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Abo nicht gefunden');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$;

COMMENT ON FUNCTION public.cancel_scout_subscription(uuid, uuid) IS
  'Slice 044 / AR-44: Body-Guard auf p_subscriber_id. Nur Subscriber selbst (oder service_role) darf aufrufen.';
