-- Slice 048 — Foundation: notifications.i18n_key + i18n_params
-- Spec: worklog/specs/048-tr-i18n-notifications-foundation.md
-- Date: 2026-04-18
--
-- Schema-Erweiterung: RPCs koennen structured (key + params) Notifications schreiben.
-- Backwards-compatible: title/body bleiben NOT NULL gesetzt als DE-Fallback.
-- Client-Pattern: if i18n_key vorhanden → tNotifTpl(key, params), sonst title/body.

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS i18n_key text,
  ADD COLUMN IF NOT EXISTS i18n_params jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN notifications.i18n_key IS
  'Slice 048: Optional i18n-Key fuer messages/{locale}.json (notifTemplates-Namespace). Wenn NULL: Client nutzt title/body als DE-Fallback.';

COMMENT ON COLUMN notifications.i18n_params IS
  'Slice 048: JSONB-Params fuer i18n_key-Substitution (z.B. {"handle": "@user", "amount": 500}).';
