-- Slice 317 — profiles_update Spalten-Whitelist (S7 Phase-2 #3, P1 Security)
-- Problem: RLS profiles_update = USING (auth.uid()=id) mit with_check=NULL → kein Column-Guard.
--          Direkter PostgREST .update() umgeht den Service-Whitelist → User self-set von
--          verified/top_role/plan/level/subscription_*/is_demo/referral_code/invited_by[_club]
--          (Privilege-Escalation + Verified-Checkmark-Fälschung).
-- Fix: BEFORE-UPDATE-Trigger (D39 Pattern, errors-db.md) friert sensible Spalten gegen OLD ein.
--      RLS WITH CHECK kann „Spalte unverändert" nicht ausdrücken (kein OLD-Zugriff) → Trigger.
--
-- WICHTIG: Trigger-Funktion ist SECURITY INVOKER (kein DEFINER!), damit current_user den
--          ECHTEN Aufrufer zeigt. Alle legitimen Writer (top_role-RPC + sync_level_on_stats_update)
--          sind SECURITY DEFINER → laufen als 'postgres' → current_user-Bypass automatisch.
--          Kein Patch an Bestandscode nötig (Writer-Audit Slice 317 Spec §4).
-- Freeze-Set (11): verified, top_role, plan, level, subscription_price_cents, subscription_enabled,
--          subscription_description, is_demo, referral_code, invited_by, invited_by_club.
-- Frei: handle, display_name, bio, favorite_club, favorite_club_id, language, avatar_url, region, updated_at.

CREATE OR REPLACE FUNCTION public.prevent_profile_sensitive_update()
RETURNS TRIGGER
LANGUAGE plpgsql
-- SECURITY INVOKER (default) — current_user MUSS den Aufrufer reflektieren.
AS $function$
BEGIN
  -- Bypass für privilegierte Kontexte:
  --  - GUC-Notausgang (manuelle Admin-Ops / künftige SECURITY-INVOKER-Flows)
  --  - jede Rolle die KEINE Client-Rolle ist: SECURITY-DEFINER-RPCs laufen als Owner (postgres),
  --    service_role (Cron/Admin-MCP), postgres-Superuser.
  IF current_setting('bescout.allow_profile_admin_update', true) = 'true'
     OR current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- Direkter authenticated/anon .update(): sensible Spalten silent auf OLD zurücksetzen.
  -- Legitime bio/avatar/handle-Edits bleiben unberührt; geschmuggelte Werte werden neutralisiert.
  NEW.verified                 := OLD.verified;
  NEW.top_role                 := OLD.top_role;
  NEW.plan                     := OLD.plan;
  NEW.level                    := OLD.level;
  NEW.subscription_price_cents := OLD.subscription_price_cents;
  NEW.subscription_enabled     := OLD.subscription_enabled;
  NEW.subscription_description := OLD.subscription_description;
  NEW.is_demo                  := OLD.is_demo;
  NEW.referral_code            := OLD.referral_code;
  NEW.invited_by               := OLD.invited_by;
  NEW.invited_by_club          := OLD.invited_by_club;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.prevent_profile_sensitive_update() IS
  'Slice 317: Friert sensible profiles-Spalten (verified/top_role/plan/level/subscription_*/is_demo/referral_code/invited_by[_club]) gegen direkten Client-.update() ein. Bypass: current_user NOT IN (authenticated,anon) ODER SET LOCAL bescout.allow_profile_admin_update = true. SECURITY INVOKER (kein DEFINER) — nicht ändern, sonst zeigt current_user den Owner und der Schutz fällt aus.';

DROP TRIGGER IF EXISTS trg_prevent_profile_sensitive_update ON public.profiles;
CREATE TRIGGER trg_prevent_profile_sensitive_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_sensitive_update();
