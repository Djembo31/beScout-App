-- =============================================================================
-- Platform-Settings Admin-Write-Policy (Reviewer-Concern Phase 3, 2026-04-15)
--
-- PROBLEM:
--   Migration 20260415060000 hat platform_settings RLS aktiviert mit nur
--   SELECT-Policy für authenticated. BescoutAdminContent.tsx:84-89 macht
--   client-side `.upsert()` → RLS silent denied, Toast zeigt generisch
--   'settingsFailed'. Kill-Switch + Feature-Toggles defekt.
--
-- FIX:
--   INSERT + UPDATE-Policy für platform_admins (admin/operator role).
--   SELECT bleibt für authenticated (public settings wie scout_events_enabled).
-- =============================================================================

DROP POLICY IF EXISTS "platform_settings_write_admin" ON public.platform_settings;

CREATE POLICY "platform_settings_write_admin" ON public.platform_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE user_id = auth.uid() AND role IN ('admin','operator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE user_id = auth.uid() AND role IN ('admin','operator')
    )
  );

COMMENT ON POLICY "platform_settings_write_admin" ON public.platform_settings IS
  'Reviewer-Concern Phase 3: Admin INSERT/UPDATE/DELETE via platform_admins role-check.';
