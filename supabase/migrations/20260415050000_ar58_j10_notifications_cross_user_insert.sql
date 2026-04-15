-- =============================================================================
-- AR-58 (J10, 2026-04-15) — Cross-User Notifications INSERT Policy
--
-- PROBLEM (Audit J10B-01 CRITICAL Beta-Blocker):
--   `notifications_insert_own` Policy: `WITH CHECK (auth.uid() = user_id)` blockt
--   alle service-code INSERTs von fremde-user-notifications. Folge:
--   - 29 user_follows live, aber nur 11 'follow'-Notifs (38% silent-fail)
--   - 0 Trade/Offer/Bounty-Notifs trotz history
--   P2P-Kommunikation komplett tot — seit Production-Start.
--
-- FIX (Beta-pragmatisch):
--   INSERT-Policy: any authenticated user can INSERT notifications for ANY
--   user_id (target). Rate-Limit + RPC-Wrapper sind Post-Beta-Arbeit.
--
-- TRUST-MODEL: 50 Beta-Founders = vertrauenswuerdige Tester, Spam-Risiko
--   minimal. Post-Beta Migration zu `rpc_create_notification()` SECURITY
--   DEFINER mit Rate-Limits.
--
-- OWN-SELECT + UPDATE Policies bleiben unveraendert (nur own read/mark-as-read).
-- =============================================================================

DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;

CREATE POLICY "notifications_insert_any_authenticated" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

COMMENT ON POLICY "notifications_insert_any_authenticated" ON public.notifications IS
  'AR-58 (2026-04-15, Beta): Permit cross-user INSERTs für P2P-Notifs (offer/trade/follow). Rate-Limit + RPC-Wrapper sind Post-Beta.';
