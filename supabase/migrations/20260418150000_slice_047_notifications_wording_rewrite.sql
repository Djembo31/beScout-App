-- Slice 047 — Historische Notifications Wording umschreiben
-- Spec: worklog/specs/047-historische-notifications-wording.md
-- Date: 2026-04-18
--
-- Slice 043 fixte RPC-Bodies (Trader→Sammler, BSD→Credits).
-- Existierende notifications-rows bleiben mit alter Terminologie — das fixt diese Migration.
--
-- Analyse (2026-04-18):
--   45 rows mit "Trader" in title/body
--   3 rows mit "BSD" in title/body
--
-- Idempotenz: REPLACE ist idempotent. Zweiter Apply betrifft 0 Rows.

-- Block 1: Trader -> Sammler in title
UPDATE notifications
SET title = REPLACE(title, 'Trader', 'Sammler')
WHERE title LIKE '%Trader%';

-- Block 2: Trader -> Sammler in body
UPDATE notifications
SET body = REPLACE(body, 'Trader', 'Sammler')
WHERE body LIKE '%Trader%';

-- Block 3: BSD -> Credits in title
UPDATE notifications
SET title = REPLACE(title, 'BSD', 'Credits')
WHERE title LIKE '%BSD%';

-- Block 4: BSD -> Credits in body
UPDATE notifications
SET body = REPLACE(body, 'BSD', 'Credits')
WHERE body LIKE '%BSD%';
