-- =============================================================================
-- Phase 3 (Operation Beta Ready, 2026-04-14) — Achievement-Definitions TR-i18n
--
-- PROBLEM:
--   achievement_definitions hat `title` + `description` HARDCODED deutsch.
--   Resolver wie bei mission_definitions (AR-54 J7) und equipment_definitions
--   (J11 FIX-01) fehlt fuer die 33 Achievements. TR-User sieht DE-Strings.
--
-- FIX:
--   1. Schema-Extension: title_tr TEXT, description_tr TEXT (nullable)
--   2. Backfill aller 33 Achievements mit bestehenden TR-Strings aus
--      messages/tr.json (gamification.achievement.[key] — Anil-approved in
--      vorheriger Session).
--   3. Service/UI: locale-aware lookup via `resolveAchievementTitle(def, locale)`
--      analog `resolveEquipmentName` und `resolveMissionTitle`.
--
-- TR-Quelle: messages/tr.json.gamification.achievement (bereits Anil-approved).
-- =============================================================================

ALTER TABLE public.achievement_definitions
  ADD COLUMN IF NOT EXISTS title_tr TEXT,
  ADD COLUMN IF NOT EXISTS description_tr TEXT;

-- Backfill title_tr for all 33 achievements (source: messages/tr.json)
UPDATE public.achievement_definitions SET title_tr = CASE key
  WHEN 'first_trade' THEN 'İlk Anlaşma'
  WHEN '10_trades' THEN 'Aktif Tüccar'
  WHEN '100_trades' THEN 'Ticaret Efsanesi'
  WHEN 'portfolio_10000' THEN 'Profesyonel Koleksiyoncu'
  WHEN 'smart_money' THEN 'Akıllı Para'
  WHEN 'first_event' THEN 'İlk Maç'
  WHEN '20_events' THEN 'Tecrübeli'
  WHEN 'event_winner' THEN 'Şampiyon'
  WHEN 'podium_3x' THEN 'Podyum Müdavimi'
  WHEN 'gold_standard' THEN 'Altın Standart'
  WHEN 'first_post' THEN 'İlk Görüş'
  WHEN 'first_research' THEN 'Analist'
  WHEN '10_upvotes' THEN 'Kanaat Önderi'
  WHEN 'scout_network' THEN 'İzci Ağı'
  WHEN 'complete_scout' THEN 'Tam İzci'
  WHEN '50_trades' THEN 'Profesyonel Tüccar'
  WHEN 'portfolio_1000' THEN 'Koleksiyoncu'
  WHEN 'diverse_5' THEN 'Çeşitlendirilmiş'
  WHEN 'diverse_15' THEN 'Kadro Koleksiyoncusu'
  WHEN 'sell_order' THEN 'İlk Satış'
  WHEN 'diamond_hands' THEN 'Elmas Eller'
  WHEN '3_events' THEN 'Maç Günü Hayranı'
  WHEN '5_events' THEN 'Devamlı Müşteri'
  WHEN 'verified' THEN 'Doğrulanmış'
  WHEN 'research_sold' THEN 'Çok Satan'
  WHEN '5_followers' THEN 'Yükselen Yıldız'
  WHEN '10_followers' THEN 'Influencer'
  WHEN '50_followers' THEN 'Topluluk Yıldızı'
  WHEN 'first_vote' THEN 'Oy Veren'
  WHEN '10_votes' THEN 'Demokrat'
  WHEN 'first_bounty' THEN 'Kulüp Scoutu'
  WHEN 'scout_specialist' THEN 'Keşif Uzmanı'
  WHEN 'founding_scout' THEN 'Kurucu Scout'
  ELSE title_tr
END
WHERE active = true;

-- Backfill description_tr for all 33 achievements
UPDATE public.achievement_definitions SET description_tr = CASE key
  WHEN 'first_trade' THEN 'İlk Scout Card ticaretini tamamladın'
  WHEN '10_trades' THEN '10 ticaret tamamlandı'
  WHEN '100_trades' THEN '100 ticaret tamamlandı'
  WHEN 'portfolio_10000' THEN '10.000 Credits üstü koleksiyon'
  WHEN 'smart_money' THEN 'Arka arkaya 5 başarılı işlem'
  WHEN 'first_event' THEN 'İlk fantezi etkinlik oynandı'
  WHEN '20_events' THEN '20 fantezi etkinlik oynandı'
  WHEN 'event_winner' THEN 'Bir fantezi etkinlikte üst sıralamaya ulaşıldı'
  WHEN 'podium_3x' THEN '3 kez podyuma çıkıldı'
  WHEN 'gold_standard' THEN 'Menajer''de Altın rütbeye ulaşıldı'
  WHEN 'first_post' THEN 'İlk topluluk gönderisi yazıldı'
  WHEN 'first_research' THEN 'İlk araştırma analizi yayınlandı'
  WHEN '10_upvotes' THEN 'Gönderilerde 10 beğeni alındı'
  WHEN 'scout_network' THEN '25 takipçiye ulaşıldı'
  WHEN 'complete_scout' THEN '3 boyutta da Gümüş+'
  WHEN '50_trades' THEN '50 işlem tamamlandı'
  WHEN 'portfolio_1000' THEN '1.000 Credits üstü koleksiyon'
  WHEN 'diverse_5' THEN 'Koleksiyonda 5 farklı oyuncu'
  WHEN 'diverse_15' THEN 'Koleksiyonda 15 farklı oyuncu'
  WHEN 'sell_order' THEN 'İlk satış emri oluşturuldu'
  WHEN 'diamond_hands' THEN 'Scout Card''yi satmadan 30 gün tutma'
  WHEN '3_events' THEN '3 fantezi etkinlik oynandı'
  WHEN '5_events' THEN '5 fantezi etkinlik oynandı'
  WHEN 'verified' THEN 'Profil doğrulandı'
  WHEN 'research_sold' THEN 'İlk araştırma analizi satıldı'
  WHEN '5_followers' THEN '5 takipçiye ulaşıldı'
  WHEN '10_followers' THEN '10 takipçiye ulaşıldı'
  WHEN '50_followers' THEN '50 takipçiye ulaşıldı'
  WHEN 'first_vote' THEN 'İlk oy kullanıldı'
  WHEN '10_votes' THEN '10 oy kullanıldı'
  WHEN 'first_bounty' THEN 'İlk görev tamamlandı'
  WHEN 'scout_specialist' THEN 'Ø 4.0+ değerlendirmeyle 10 keşif raporu'
  WHEN 'founding_scout' THEN 'BeScout''un ilk 50 scoutu arasında'
  ELSE description_tr
END
WHERE active = true;

COMMENT ON COLUMN public.achievement_definitions.title_tr IS
  'Phase 3 (2026-04-14): TR-Übersetzung von title. NULL fallback → title (DE). Source: messages/tr.json gamification.achievement.';
COMMENT ON COLUMN public.achievement_definitions.description_tr IS
  'Phase 3 (2026-04-14): TR-Übersetzung von description. NULL fallback → description (DE).';
