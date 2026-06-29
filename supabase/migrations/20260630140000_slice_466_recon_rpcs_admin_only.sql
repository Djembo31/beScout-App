-- Slice 466 — W0: Security-Map-Recon-RPCs admin-only (REVOKE anon+authenticated)
-- ---------------------------------------------------------------------------
-- CEO autonom-Go (Anil 2026-06-30 "mach autonom weiter", §3).
--
-- 2 SECDEF-Audit-RPCs an anon+authenticated granted -> leaken die Security-Landkarte:
--   get_security_definer_user_param_audit() = welche SECDEF-RPC ungeguarded (needs_fix).
--   get_rls_policy_matrix()                 = komplette RLS-Policy-Matrix.
-- Reiner Recon-Leak (kein Daten-Mutation). Konsumenten = NUR db-invariants.test.ts
-- (Z.1506/1696), laeuft als service_role (SUPABASE_SERVICE_ROLE_KEY). 0 App-/UI-Caller (grep src/).
-- REVOKE anon+authenticated -> admin-only; service_role + postgres behalten (Test unberuehrt).
-- Disease-Register §2-Triage Item 2. Kanon: errors-db S005/S095.
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.get_security_definer_user_param_audit() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_rls_policy_matrix()                 FROM anon, authenticated, PUBLIC;
