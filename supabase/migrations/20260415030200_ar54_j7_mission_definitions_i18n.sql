-- =============================================================================
-- AR-54 (J7, 2026-04-15) — Mission-Definitions TR-i18n
--
-- PROBLEM:
--   mission_definitions hat `title` + `description` HARDCODED deutsch.
--   TR User sieht deutschen Text überall. Beta-Blocker.
--
-- FIX:
--   1. Schema-Extension: title_tr TEXT, description_tr TEXT (nullable)
--   2. Backfill aller 25 active missions mit TR-Übersetzungen
--   3. Service/UI: locale-aware lookup (`title_tr ?? title`)
--
-- TR-Strings konservativ übersetzt, orientiert an bestehenden mysteryBox/
-- fantasy TR-Patterns. **TR-Review durch Anil empfohlen**.
-- =============================================================================

ALTER TABLE public.mission_definitions
  ADD COLUMN IF NOT EXISTS title_tr TEXT,
  ADD COLUMN IF NOT EXISTS description_tr TEXT;

-- Backfill all currently active mission definitions.
UPDATE public.mission_definitions SET title_tr = CASE key
  WHEN 'complete_challenge' THEN 'Günlük Görev'
  WHEN 'daily_buy_1' THEN '1 Scout Card Satın Al'
  WHEN 'daily_fantasy_entry' THEN 'Fantasy Etkinliğe Katıl'
  WHEN 'daily_login' THEN 'Günlük Giriş Yap'
  WHEN 'daily_post' THEN 'Bir Gönderi Oluştur'
  WHEN 'daily_sell_1' THEN '1 Scout Card Sat'
  WHEN 'daily_submit_bounty' THEN 'Görev Gönderildi'
  WHEN 'daily_trade_2' THEN '2 İşlem Tamamla'
  WHEN 'daily_unlock_research' THEN 'Araştırma Kilidini Aç'
  WHEN 'daily_vote' THEN 'Oy Ver'
  WHEN 'follow_user' THEN '1 Kullanıcıyı Takip Et'
  WHEN 'open_mystery_box' THEN 'Gizem Kutusu Aç'
  WHEN 'rate_research' THEN 'Araştırmayı Değerlendir'
  WHEN 'upvote_post' THEN '3 Gönderiyi Beğen'
  WHEN 'community_activity' THEN 'Topluluk Aktif'
  WHEN 'create_post' THEN '3 Gönderi Oluştur'
  WHEN 'daily_activity' THEN 'Günlük Aktif'
  WHEN 'fantasy_perfect_captain' THEN 'Kaptan Sezgisi'
  WHEN 'fantasy_top_3' THEN 'Top 3 Sıralama'
  WHEN 'social_activity' THEN 'Sosyal Aktif'
  WHEN 'weekly_3_lineups' THEN '3 Kadro Gönder'
  WHEN 'weekly_bounty_complete' THEN 'Görev Profesyoneli'
  WHEN 'weekly_fantasy' THEN 'Fantasy Etkinliğe Katıl'
  WHEN 'weekly_trade_5' THEN '5 Oyuncu ile İşlem Yap'
  WHEN 'write_research' THEN 'Araştırma Yaz'
  ELSE title_tr
END
WHERE active = true;

COMMENT ON COLUMN public.mission_definitions.title_tr IS
  'AR-54 (2026-04-15): TR-Übersetzung von title. NULL fallback → title (DE).';
COMMENT ON COLUMN public.mission_definitions.description_tr IS
  'AR-54 (2026-04-15): TR-Übersetzung von description. Meist identisch zu title_tr.';
