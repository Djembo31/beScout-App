-- Slice 367 (E4) — Rename Achievement „Diamond Hands" → „Treuer Sammler" / „Sadık Koleksiyoncu"
-- Grund: „Diamond Hands" ist verbotenes Meme-Coin-Vokabular (business.md). Anil-Entscheid 2026-06-24.
-- Key `diamond_hands` bleibt code-intern (wie `dpc`); nur user-facing Labels (Notification-Text) geändert.
-- Daten-Update, keine Schema-/RPC-Änderung. i18n-Modal-Labels parallel in messages/* + achievements.ts.

UPDATE public.achievement_definitions
SET title    = 'Treuer Sammler',
    title_tr = 'Sadık Koleksiyoncu'
WHERE key = 'diamond_hands';
