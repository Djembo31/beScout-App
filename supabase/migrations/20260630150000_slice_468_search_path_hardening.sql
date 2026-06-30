-- Slice 468 — W0: search_path-Härtung (62 SECDEF-Fns) + update_club_assets anon-REVOKE
-- ---------------------------------------------------------------------------
-- CEO autonom-Go (Anil 2026-06-30 "P2-Security-Hygiene durcharbeiten", §3).
--
-- Supabase-Advisor function_search_path_mutable: 62 SECURITY-DEFINER-Fns (non-trigger,
-- public) ohne gepinntes search_path = Hijack-Vektor (Owner-Kontext + Aufrufer-search_path).
-- Betrifft auch Money-RPCs (grant_founding_pass etc.). Fix = ALTER FUNCTION SET search_path
-- TO 'public' (body-erhaltend, KEIN CREATE OR REPLACE): unqualifizierte public-Refs resolven
-- via gepinntem 'public', pg_catalog implizit, auth.* qualifiziert. Risk-Scan leer verifiziert
-- (keine Fn nutzt unqualifizierte Nicht-public-Refs: Extensions/vault/net/graphql/http/pgcrypto).
-- DO-Loop = deterministisch ueber die Selektions-Bedingung, idempotent.
--
-- + update_club_assets (SECDEF-Mutation) ist vestigial an anon granted (Guard schuetzt ohnehin;
-- app-Caller club.ts:790 = authenticated Club-Admins) -> REVOKE anon.
-- ---------------------------------------------------------------------------

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'public'
      AND p.prosecdef
      AND p.prorettype <> 'trigger'::regtype
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, '{}'::text[])) cfg WHERE cfg LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path TO ''public''', r.proname, r.args);
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.update_club_assets(uuid, uuid, text, text) FROM anon;

-- Self-verifying post-condition (Reviewer S468): greenfield-replay + Audit-Trail.
DO $$
DECLARE v_remaining int;
BEGIN
  SELECT count(*) INTO v_remaining
  FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
  WHERE ns.nspname = 'public' AND p.prosecdef AND p.prorettype <> 'trigger'::regtype
    AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}'::text[])) cfg WHERE cfg LIKE 'search_path=%');
  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'search_path-hardening incomplete: % SECDEF-non-trigger fns still mutable', v_remaining;
  END IF;
END $$;
