-- ============================================
-- BeScout: Cleanup Lineups
-- Dieses Script in Supabase SQL Editor ausführen.
-- Es zeigt erst den aktuellen Zustand, dann räumt es auf.
-- ============================================

-- 1. DIAGNOSTIC: Alle Lineups anzeigen (wer ist wo angemeldet?)
SELECT
  l.event_id,
  e.name as event_name,
  e.status as event_status,
  l.user_id,
  l.formation,
  l.slot_gk, l.slot_def1, l.slot_def2, l.slot_mid1, l.slot_mid2, l.slot_att,
  l.submitted_at,
  l.locked
FROM lineups l
LEFT JOIN events e ON e.id = l.event_id
ORDER BY l.submitted_at DESC;

-- 2. CLEANUP: Alle Lineups löschen (da du dich von allem abgemeldet hast)
-- ACHTUNG: Löscht ALLE Lineups für ALLE User. Falls du nur deine löschen willst,
-- ersetze die Zeile unten mit: DELETE FROM lineups WHERE user_id = 'DEINE_USER_ID';
DELETE FROM lineups;

-- 3. current_entries in Events auf 0 zurücksetzen (da keine Lineups mehr da sind)
UPDATE events SET current_entries = 0;

-- 4. Verifizieren: Sollte 0 Zeilen zeigen
SELECT COUNT(*) as remaining_lineups FROM lineups;
